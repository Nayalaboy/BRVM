"""Discovery and checkpointing for the historical BRVM BOC archive."""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup
from sqlalchemy import select

from ..config import get_settings
from ..logging import get_logger
from ..models import (
    ArchiveItem,
    ArchiveStatus,
    Company,
    DailyQuote,
    DocType,
    Document,
    IngestionIssue,
    QuoteObservation,
)
from ..parsers.boc_pdf import PARSER_VERSION, parse_boc_quotes
from ..storage import RawStore
from .base import CollectContext, CollectResult
from .boc_documents import _publication_date

log = get_logger("collector.boc_archive")

PUBLIC_ARCHIVE_PATH = "/fr/bulletins-officiels-de-la-cote"
FINANCIAL_ARCHIVE_URL = "https://bfin.brvm.org/boc/boc_jour.aspx"
FINANCIAL_PDF_ROOT = "https://bfin.brvm.org/boc/BOC_JOUR"
_BOC_TEXT = re.compile(r"\b(?:bulletin\s+officiel|boc)\b", re.IGNORECASE)


@dataclass(frozen=True)
class ArchiveLink:
    source: str
    session_date: date | None
    title: str
    discovery_url: str
    source_url: str
    needs_resolution: bool = False


def canonical_url(url: str) -> str:
    """Remove fragments while retaining query strings used by archive endpoints."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, parts.query, ""))


def parse_archive_links(html: str, page_url: str, source: str) -> list[ArchiveLink]:
    """Extract BOC PDF links and BRVM publication pages from an archive page."""
    soup = BeautifulSoup(html, "lxml")
    links: list[ArchiveLink] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        href = str(anchor["href"]).strip()
        label = anchor.get_text(" ", strip=True)
        container = anchor.find_parent(["tr", "li", "article", "div"])
        context = " ".join(
            value
            for value in (
                label,
                anchor.get("title", ""),
                container.get_text(" ", strip=True) if container else "",
                href,
            )
            if value
        )
        absolute = canonical_url(urljoin(page_url, href))
        is_pdf = urlsplit(absolute).path.lower().endswith(".pdf")
        if not is_pdf:
            path = urlsplit(absolute).path.lower()
            is_publication = (
                path.startswith("/fr/node/")
                or path.startswith("/fr/bulletin-officiel-de-la-cote-du-")
            )
            if not is_publication or not _BOC_TEXT.search(context):
                continue
        if absolute in seen:
            continue
        seen.add(absolute)
        title = label or context or absolute.rsplit("/", 1)[-1]
        links.append(
            ArchiveLink(
                source=source,
                session_date=_publication_date(context, absolute),
                title=title[:500],
                discovery_url=page_url,
                source_url=absolute,
                needs_resolution=not is_pdf,
            )
        )
    return links


def resolve_publication_page(
    html: str, publication_url: str, source: str, fallback: ArchiveLink
) -> list[ArchiveLink]:
    """Resolve a BRVM publication node to its attached PDF(s)."""
    candidates = [
        item
        for item in parse_archive_links(html, publication_url, source)
        if not item.needs_resolution
    ]
    return [
        ArchiveLink(
            source=item.source,
            session_date=item.session_date or fallback.session_date,
            title=fallback.title if fallback.title else item.title,
            discovery_url=publication_url,
            source_url=item.source_url,
        )
        for item in candidates
    ]


class BocArchiveInventoryCollector:
    """Inventory official archive entries without downloading the PDFs."""

    name = "boc_archive_inventory"

    def __init__(
        self,
        *,
        max_pages: int = 400,
        empty_page_limit: int = 2,
        include_financial_archive: bool = True,
    ) -> None:
        self.base = get_settings().brvm_base_url.rstrip("/")
        self.max_pages = max_pages
        self.empty_page_limit = empty_page_limit
        self.include_financial_archive = include_financial_archive

    def _public_links(self, ctx: CollectContext) -> tuple[list[ArchiveLink], list[str]]:
        links: list[ArchiveLink] = []
        warnings: list[str] = []
        seen_urls: set[str] = set()
        empty_pages = 0
        for page in range(self.max_pages):
            page_url = f"{self.base}{PUBLIC_ARCHIVE_PATH}"
            if page:
                page_url = f"{page_url}?page={page}"
            try:
                html = ctx.client.get_text(page_url)
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"archive page {page} unavailable: {exc}")
                break
            page_links = parse_archive_links(html, page_url, "brvm_publications")
            new_links = [item for item in page_links if item.source_url not in seen_urls]
            if not new_links:
                empty_pages += 1
                if empty_pages >= self.empty_page_limit:
                    break
                continue
            empty_pages = 0
            for item in new_links:
                seen_urls.add(item.source_url)
                if not item.needs_resolution:
                    links.append(item)
                    continue
                try:
                    detail = ctx.client.get_text(item.source_url)
                    resolved = resolve_publication_page(
                        detail, item.source_url, item.source, item
                    )
                    if not resolved:
                        warnings.append(f"no PDF attachment on {item.source_url}")
                    links.extend(resolved)
                except Exception as exc:  # noqa: BLE001
                    warnings.append(f"publication page unavailable {item.source_url}: {exc}")
        return links, warnings

    def _financial_links(self, ctx: CollectContext) -> tuple[list[ArchiveLink], list[str]]:
        try:
            html = ctx.client.get_text(FINANCIAL_ARCHIVE_URL)
        except Exception as exc:  # noqa: BLE001
            return [], [f"financial archive unavailable: {exc}"]
        return (
            parse_archive_links(html, FINANCIAL_ARCHIVE_URL, "brvm_financial_database"),
            [],
        )

    def collect(self, ctx: CollectContext) -> CollectResult:
        result = CollectResult(collector=self.name)
        links, warnings = self._public_links(ctx)
        if self.include_financial_archive:
            financial, financial_warnings = self._financial_links(ctx)
            links.extend(financial)
            warnings.extend(financial_warnings)

        lower = date.fromisoformat(ctx.since) if ctx.since else None
        upper = date.fromisoformat(ctx.until) if ctx.until else None
        unique = {(item.source, item.source_url): item for item in links}
        for item in unique.values():
            if lower and item.session_date and item.session_date < lower:
                continue
            if upper and item.session_date and item.session_date > upper:
                continue
            existing = ctx.session.execute(
                select(ArchiveItem).where(
                    ArchiveItem.source == item.source,
                    ArchiveItem.source_url == item.source_url,
                )
            ).scalar_one_or_none()
            if existing:
                changed = False
                if existing.session_date is None and item.session_date is not None:
                    existing.session_date = item.session_date
                    changed = True
                if existing.discovery_url != item.discovery_url:
                    existing.discovery_url = item.discovery_url
                    changed = True
                if changed:
                    existing.ingestion_run_id = ctx.run_id
                    result.updated += 1
                else:
                    result.skipped += 1
                continue
            ctx.session.add(
                ArchiveItem(
                    source=item.source,
                    session_date=item.session_date,
                    title=item.title,
                    discovery_url=item.discovery_url,
                    source_url=item.source_url,
                    status=ArchiveStatus.DISCOVERED.value,
                    ingestion_run_id=ctx.run_id,
                )
            )
            result.inserted += 1

        result.warnings.extend(warnings)
        result.ok = bool(unique)
        if not unique:
            result.warnings.append("no official BOC archive entries discovered")
        log.info(
            "boc_archive_inventory_done",
            discovered=len(unique),
            inserted=result.inserted,
            updated=result.updated,
            warnings=len(result.warnings),
        )
        return result


def iter_weekdays(since: date, until: date):
    """Yield weekday candidates; exchange holidays are resolved during download."""
    current = since
    while current <= until:
        if current.weekday() < 5:
            yield current
        current += timedelta(days=1)


class BocArchiveCandidateCollector:
    """Checkpoint deterministic bfin archive URLs for a bounded date range."""

    name = "boc_archive_candidates"

    def collect(self, ctx: CollectContext) -> CollectResult:
        result = CollectResult(collector=self.name)
        lower = date.fromisoformat(ctx.since or "2015-01-01")
        upper = date.fromisoformat(ctx.until) if ctx.until else date.today()
        if upper < lower:
            raise ValueError("until must be on or after since")
        existing_urls = set(
            ctx.session.scalars(
                select(ArchiveItem.source_url).where(
                    ArchiveItem.source == "brvm_financial_database",
                    ArchiveItem.session_date >= lower,
                    ArchiveItem.session_date <= upper,
                )
            )
        )
        for session_date in iter_weekdays(lower, upper):
            source_url = f"{FINANCIAL_PDF_ROOT}/BOC_{session_date:%Y%m%d}.pdf"
            if source_url in existing_urls:
                result.skipped += 1
                continue
            ctx.session.add(
                ArchiveItem(
                    source="brvm_financial_database",
                    session_date=session_date,
                    title=f"Bulletin Officiel de la Cote du {session_date:%Y-%m-%d}",
                    discovery_url=f"{FINANCIAL_ARCHIVE_URL}#verified-url-convention",
                    source_url=source_url,
                    status=ArchiveStatus.DISCOVERED.value,
                    ingestion_run_id=ctx.run_id,
                )
            )
            result.inserted += 1
        return result


class BocArchiveDownloadCollector:
    """Download inventoried PDFs into the content-addressed raw store."""

    name = "boc_archive_download"

    def __init__(self, *, limit: int | None = None, retry_failed: bool = False) -> None:
        self.limit = limit
        self.retry_failed = retry_failed
        self.store = RawStore()

    def collect(self, ctx: CollectContext) -> CollectResult:
        result = CollectResult(collector=self.name)
        statuses = [ArchiveStatus.DISCOVERED.value]
        if self.retry_failed:
            statuses.append(ArchiveStatus.FAILED.value)
        statement = (
            select(ArchiveItem)
            .where(ArchiveItem.status.in_(statuses))
            .order_by(ArchiveItem.session_date.asc().nulls_last(), ArchiveItem.id)
        )
        if ctx.since:
            statement = statement.where(
                (ArchiveItem.session_date.is_(None))
                | (ArchiveItem.session_date >= date.fromisoformat(ctx.since))
            )
        if ctx.until:
            statement = statement.where(
                (ArchiveItem.session_date.is_(None))
                | (ArchiveItem.session_date <= date.fromisoformat(ctx.until))
            )
        if self.limit is not None:
            statement = statement.limit(self.limit)

        for item in ctx.session.scalars(statement):
            item.attempts += 1
            item.ingestion_run_id = ctx.run_id
            try:
                data = ctx.client.get_bytes(item.source_url)
                if not data.startswith(b"%PDF"):
                    raise ValueError("response is not a PDF")
                stored = self.store.put(data, kind="boc", ext="pdf")
                document = ctx.session.execute(
                    select(Document).where(Document.content_hash == stored.content_hash)
                ).scalar_one_or_none()
                language = _document_language(item.source_url)
                if document is None:
                    document = Document(
                        doc_type=DocType.BOC_BULLETIN.value,
                        title=item.title,
                        language=language,
                        publication_date=item.session_date,
                        source_url=item.source_url,
                        storage_path=stored.storage_path,
                        content_hash=stored.content_hash,
                        mime="application/pdf",
                        byte_size=stored.byte_size,
                        page_count=_pdf_page_count(data),
                        ingestion_run_id=ctx.run_id,
                    )
                    ctx.session.add(document)
                    ctx.session.flush()
                    result.documents += 1
                elif document.language != language:
                    document.language = language
                item.document_id = document.id
                item.status = ArchiveStatus.DOWNLOADED.value
                item.downloaded_at = datetime.now(UTC)
                item.last_error = None
                result.updated += 1
            except Exception as exc:  # noqa: BLE001
                item.status = ArchiveStatus.FAILED.value
                item.last_error = str(exc)[:2000]
                result.warnings.append(f"{item.source_url}: {exc}")

        result.ok = not result.warnings
        return result


def _pdf_page_count(data: bytes) -> int | None:
    try:
        from pypdf import PdfReader

        return len(PdfReader(io.BytesIO(data)).pages)
    except Exception:  # noqa: BLE001
        return None


def _document_language(url: str) -> str:
    filename = urlsplit(url).path.rsplit("/", 1)[-1].lower()
    return "en" if "_eng_" in filename or filename.startswith("boc_eng") else "fr"


class BocArchiveParseCollector:
    """Parse downloaded PDFs into staged quote observations."""

    name = "boc_archive_parse"

    def __init__(self, *, limit: int | None = None, force: bool = False) -> None:
        self.limit = limit
        self.force = force

    def collect(self, ctx: CollectContext) -> CollectResult:
        result = CollectResult(collector=self.name)
        statuses = [ArchiveStatus.DOWNLOADED.value]
        if self.force:
            statuses.extend(
                [
                    ArchiveStatus.PARSED.value,
                    ArchiveStatus.REVIEW.value,
                    ArchiveStatus.SKIPPED.value,
                ]
            )
        statement = (
            select(ArchiveItem)
            .where(
                ArchiveItem.status.in_(statuses),
                ArchiveItem.document_id.is_not(None),
                ArchiveItem.session_date.is_not(None),
            )
            .order_by(ArchiveItem.session_date, ArchiveItem.id)
        )
        if ctx.since:
            statement = statement.where(
                ArchiveItem.session_date >= date.fromisoformat(ctx.since)
            )
        if ctx.until:
            statement = statement.where(
                ArchiveItem.session_date <= date.fromisoformat(ctx.until)
            )
        if self.limit is not None:
            statement = statement.limit(self.limit)

        companies = {company.ticker: company for company in ctx.session.scalars(select(Company))}
        for item in ctx.session.scalars(statement):
            document = ctx.session.get(Document, item.document_id)
            try:
                if document is None or not document.storage_path:
                    raise ValueError("archive item has no stored document")
                if _document_language(item.source_url) != "fr":
                    item.status = ArchiveStatus.SKIPPED.value
                    item.last_error = "non-French duplicate retained in raw archive"
                    for issue in ctx.session.scalars(
                        select(IngestionIssue).where(
                            IngestionIssue.archive_item_id == item.id,
                            IngestionIssue.review_status == "open",
                        )
                    ):
                        issue.review_status = "resolved"
                        issue.resolved_at = datetime.now(UTC)
                    result.skipped += 1
                    continue
                if document.storage_path.startswith("s3://"):
                    raise ValueError("S3 document reads are not implemented yet")
                rows = parse_boc_quotes(
                    Path(document.storage_path).read_bytes(),
                    session_date=item.session_date,
                    known_tickers=set(companies),
                )
                if len(rows) < 15:
                    raise ValueError(
                        f"only {len(rows)} known equity rows parsed; layout requires review"
                    )
                for row in rows:
                    company = companies[row.ticker]
                    observation = ctx.session.execute(
                        select(QuoteObservation).where(
                            QuoteObservation.archive_item_id == item.id,
                            QuoteObservation.company_id == company.id,
                        )
                    ).scalar_one_or_none()
                    values = {
                        "session_date": row.session_date,
                        "close": row.close,
                        "previous_close": row.previous_close,
                        "open": row.open,
                        "volume": row.volume,
                        "value_traded": row.value_traded,
                        "source_page": row.page,
                        "source_section": row.section,
                        "parser_version": PARSER_VERSION,
                        "raw_fields": list(row.raw_fields),
                        "validation_status": "validated",
                        "validation_error": None,
                    }
                    if observation is None:
                        ctx.session.add(
                            QuoteObservation(
                                archive_item_id=item.id,
                                company_id=company.id,
                                **values,
                            )
                        )
                        result.inserted += 1
                    else:
                        for key, value in values.items():
                            setattr(observation, key, value)
                        result.updated += 1
                item.status = ArchiveStatus.PARSED.value
                item.parser_version = PARSER_VERSION
                item.parsed_at = datetime.now(UTC)
                item.last_error = None
            except Exception as exc:  # noqa: BLE001
                item.status = ArchiveStatus.REVIEW.value
                item.parser_version = PARSER_VERSION
                item.last_error = str(exc)[:2000]
                issue = ctx.session.execute(
                    select(IngestionIssue).where(
                        IngestionIssue.issue_type == "unsupported_boc_layout",
                        IngestionIssue.archive_item_id == item.id,
                    )
                ).scalar_one_or_none()
                if issue is None:
                    ctx.session.add(
                        IngestionIssue(
                            issue_type="unsupported_boc_layout",
                            session_date=item.session_date,
                            archive_item_id=item.id,
                            explanation=str(exc),
                            details={"document_id": item.document_id},
                        )
                    )
                result.warnings.append(f"{item.session_date}: {exc}")
        result.ok = not result.warnings
        return result


class BocArchiveLoadCollector:
    """Load validated staged observations into canonical daily quotes."""

    name = "boc_archive_load"

    def __init__(self, *, limit: int | None = None) -> None:
        self.limit = limit

    def collect(self, ctx: CollectContext) -> CollectResult:
        result = CollectResult(collector=self.name)
        statement = (
            select(ArchiveItem)
            .where(ArchiveItem.status == ArchiveStatus.PARSED.value)
            .order_by(ArchiveItem.session_date, ArchiveItem.id)
        )
        if ctx.since:
            statement = statement.where(
                ArchiveItem.session_date >= date.fromisoformat(ctx.since)
            )
        if ctx.until:
            statement = statement.where(
                ArchiveItem.session_date <= date.fromisoformat(ctx.until)
            )
        if self.limit is not None:
            statement = statement.limit(self.limit)
        for item in ctx.session.scalars(statement):
            observations = list(
                ctx.session.scalars(
                    select(QuoteObservation).where(
                        QuoteObservation.archive_item_id == item.id,
                        QuoteObservation.validation_status == "validated",
                    )
                )
            )
            if not observations:
                item.status = ArchiveStatus.REVIEW.value
                item.last_error = "no validated quote observations"
                result.warnings.append(f"{item.session_date}: no validated observations")
                continue
            for observation in observations:
                quote = ctx.session.execute(
                    select(DailyQuote).where(
                        DailyQuote.company_id == observation.company_id,
                        DailyQuote.date == observation.session_date,
                    )
                ).scalar_one_or_none()
                values = {
                    "open": observation.open,
                    "close": observation.close,
                    "previous_close": observation.previous_close,
                    "volume": observation.volume,
                    "value_traded": observation.value_traded,
                    "source": "brvm",
                    "ingestion_run_id": ctx.run_id,
                    "document_id": item.document_id,
                    "source_page": observation.source_page,
                    "source_section": observation.source_section,
                }
                if quote is None:
                    ctx.session.add(
                        DailyQuote(
                            company_id=observation.company_id,
                            date=observation.session_date,
                            high=None,
                            low=None,
                            **values,
                        )
                    )
                    result.inserted += 1
                else:
                    for key, value in values.items():
                        setattr(quote, key, value)
                    result.updated += 1
            item.status = ArchiveStatus.LOADED.value
            item.loaded_at = datetime.now(UTC)
            item.last_error = None
        result.ok = not result.warnings
        return result
