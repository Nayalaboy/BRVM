"""BOC (Bulletin Officiel de la Cote) PDF collector.

Downloads BOC bulletin PDFs (and other official notices) linked from a listing
page, stores them content-addressed (hash dedupe), and records a `documents`
row. Re-runs are cheap: an already-stored hash is skipped.

The listing URL is configurable because BRVM occasionally reorganises its
document sections; point ``BRVM_BOC_LISTING_PATH`` at the current page.
"""

from __future__ import annotations

import io
import os
import re
from datetime import date
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from sqlalchemy import select

from ..config import get_settings
from ..logging import get_logger
from ..models import DocType, Document
from ..parsers.brvm_html import parse_french_date
from ..storage import RawStore
from .base import CollectContext, Collector, CollectResult

log = get_logger("collector.boc")


class BocDocumentsCollector(Collector):
    name = "boc_documents"

    def __init__(self, listing_path: str | None = None, doc_type: str = DocType.BOC_BULLETIN.value) -> None:
        self.base = get_settings().brvm_base_url
        # Override via env when BRVM moves the section.
        self.listing_path = listing_path or os.environ.get(
            "BRVM_BOC_LISTING_PATH", "/fr/marche/bulletin-officiel-de-la-cote"
        )
        self.doc_type = doc_type
        self.store = RawStore()

    @property
    def url(self) -> str:
        return f"{self.base}{self.listing_path}"

    def _pdf_links(self, html: str) -> list[tuple[str, str]]:
        soup = BeautifulSoup(html, "lxml")
        out: list[tuple[str, str]] = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.lower().endswith(".pdf"):
                out.append((urljoin(self.url, href), a.get_text(" ", strip=True) or href))
        return out

    def collect(self, ctx: CollectContext) -> CollectResult:
        res = CollectResult(collector=self.name)
        try:
            html = ctx.client.get_text(self.url)
        except Exception as exc:  # noqa: BLE001
            res.ok = False
            res.warnings.append(f"BOC listing unreachable ({self.url}): {exc}")
            log.warning("boc_listing_unreachable", url=self.url, error=str(exc))
            return res

        links = self._pdf_links(html)
        if not links:
            res.ok = False
            res.warnings.append("no PDF links found on BOC listing")
            return res

        for pdf_url, title in links:
            data = ctx.client.get_bytes(pdf_url)
            stored = self.store.put(data, kind="boc", ext="pdf")
            publication_date = _publication_date(title, pdf_url)

            existing = ctx.session.execute(
                select(Document).where(Document.content_hash == stored.content_hash)
            ).scalar_one_or_none()
            if existing:
                # Repair records created before publication-date extraction was
                # added, so an idempotent daily run can make them traceable.
                if existing.publication_date is None and publication_date is not None:
                    existing.publication_date = publication_date
                    existing.ingestion_run_id = ctx.run_id
                    res.updated += 1
                res.skipped += 1
                continue

            ctx.session.add(
                Document(
                    doc_type=self.doc_type,
                    title=title[:500],
                    language="fr",
                    publication_date=publication_date,
                    source_url=pdf_url,
                    storage_path=stored.storage_path,
                    content_hash=stored.content_hash,
                    mime="application/pdf",
                    byte_size=stored.byte_size,
                    page_count=_page_count(data),
                    ingestion_run_id=ctx.run_id,
                )
            )
            res.documents += 1

        log.info("boc_collected", documents=res.documents, skipped=res.skipped)
        return res


def _page_count(data: bytes) -> int | None:
    try:
        from pypdf import PdfReader

        return len(PdfReader(io.BytesIO(data)).pages)
    except Exception:  # noqa: BLE001 - corrupt/encrypted PDF shouldn't fail the run
        return None


def _publication_date(title: str, url: str) -> date | None:
    """Extract the session date from common BOC titles and filenames.

    BRVM has used both day-first filenames and ISO dates. Restrict parsing to
    explicit three-part dates so bulletin sequence numbers are never mistaken
    for publication dates.
    """
    text = f"{title} {url}"
    patterns = (
        (r"(?<!\d)(20\d{2})[-_/](\d{1,2})[-_/](\d{1,2})(?!\d)", True),
        (r"(?<!\d)(\d{1,2})[-_. /](\d{1,2})[-_. /](20\d{2})(?!\d)", False),
    )
    for pattern, year_first in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        parts = [int(value) for value in match.groups()]
        try:
            if year_first:
                return date(parts[0], parts[1], parts[2])
            return date(parts[2], parts[1], parts[0])
        except ValueError:
            continue

    # French textual dates occasionally appear in the link label.
    match = re.search(
        r"(?<!\d)(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+20\d{2})(?!\d)",
        text,
    )
    if match:
        return parse_french_date(match.group(1))
    return None
