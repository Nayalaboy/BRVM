"""Archive official public-sector and regional-market publications.

Discovery is deliberately broad but publication is deliberately narrow:
documents enter an archive/review queue and never become public market events
until a human tags and reviews them with ``tag-event``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from sqlalchemy import select

from ..config import get_settings
from ..models import DocType, Document, GovDocument
from ..storage import RawStore
from .base import CollectContext, Collector, CollectResult

DATE_RE = re.compile(
    r"\b(?:du\s+)?(\d{1,2})(?:er)?[ /.-]+"
    r"(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|"
    r"septembre|octobre|novembre|décembre|decembre|\d{1,2})[ /.-]+(\d{4})\b",
    re.IGNORECASE,
)
COMPACT_DATE_RE = re.compile(r"(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)")
MONTHS = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "août": 8, "aout": 8,
    "septembre": 9, "octobre": 10, "novembre": 11,
    "décembre": 12, "decembre": 12,
}


@dataclass(frozen=True)
class OfficialSource:
    key: str
    listing_url: str
    country: str | None
    body: str
    doc_type: str
    link_pattern: str
    path_pattern: str
    enabled: bool = True
    direct_urls: tuple[str, ...] = ()


def parse_publication_date(text: str) -> date | None:
    compact = COMPACT_DATE_RE.search(text)
    if compact:
        try:
            return date(*(int(part) for part in compact.groups()))
        except ValueError:
            return None
    match = DATE_RE.search(" ".join(text.split()))
    if match:
        day, month_text, year = match.groups()
        month = MONTHS.get(month_text.lower(), int(month_text) if month_text.isdigit() else 0)
        try:
            return date(int(year), month, int(day))
        except ValueError:
            return None
    try:
        parsed = date_parser.parse(text, fuzzy=True, dayfirst=True)
        return parsed.date() if 2000 <= parsed.year <= date.today().year + 1 else None
    except (ValueError, OverflowError):
        return None


def discover_links(html: str, source: OfficialSource) -> list[tuple[str, str, date | None]]:
    soup = BeautifulSoup(html, "lxml")
    pattern = re.compile(source.link_pattern, re.IGNORECASE)
    path_pattern = re.compile(source.path_pattern, re.IGNORECASE)
    found: dict[str, tuple[str, str, date | None]] = {}
    listing_host = urlparse(source.listing_url).netloc
    for anchor in soup.select("a[href]"):
        href = urljoin(source.listing_url, str(anchor.get("href")))
        title = " ".join(anchor.get_text(" ", strip=True).split())
        searchable = f"{title} {href}"
        if (
            not title
            or urlparse(href).netloc != listing_host
            or not pattern.search(searchable)
            or not path_pattern.search(urlparse(href).path)
            or urlparse(href).query
            or urlparse(href).fragment
        ):
            continue
        if title.lower() in {"télécharger", "telecharger", "résultats", "resultats", "+ d'infos"}:
            title = urlparse(href).path.rstrip("/").rsplit("/", 1)[-1].removesuffix(".pdf")
            title = " ".join(title.replace("_", " ").replace("-", " ").split())
        found[href] = (href, title[:500], parse_publication_date(searchable))
    return list(found.values())


def configured_sources() -> list[OfficialSource]:
    settings = get_settings()
    sources = [
        OfficialSource(
            "ci_council", settings.ci_council_url, "CI",
            "Conseil des ministres de Côte d'Ivoire", "council_communication",
            r"conseil|\.pdf", r"/publications/conseils-des-ministres/\d+|/uploads/.+\.pdf$",
        ),
        OfficialSource(
            "sn_council", settings.sn_council_url, "SN",
            "Conseil des ministres du Sénégal", "council_communication",
            r"conseil-des-ministres|\.pdf",
            r"/publications/conseil-des-ministres/conseil-des-ministres-du-|/storage/documents/.+\.pdf$",
        ),
        OfficialSource(
            "bj_council", settings.bj_council_url, "BJ",
            "Conseil des ministres du Bénin", "council_communication",
            r"compte rendu|conseil des ministres|\.pdf",
            r"/cm/20\d{2}-\d{2}-\d{2}/?$|/uploads?/.+\.pdf$",
        ),
        OfficialSource(
            "bf_council", settings.bf_council_url, "BF",
            "Conseil des ministres du Burkina Faso", "council_communication",
            r"conseil des ministres|conseil-des-ministres|\.pdf",
            r"/conseil-des-ministres/(?:conseil-des-ministres-n\d+-du|conseil-des-ministres-du-).+20\d{2}/?$",
        ),
        OfficialSource(
            "ml_council", settings.ml_council_url, "ML",
            "Conseil des ministres du Mali", "council_communication",
            r"communiqu.+conseil des ministres|\.pdf",
            r"/communique.+conseil.+ministres",
        ),
        OfficialSource(
            "ne_council", settings.ne_council_url, "NE",
            "Conseil des ministres du Niger", "council_communication",
            r"conclusions du conseil des ministres|communique du conseil des ministres",
            r"/les-communiques-du-gouvernement/\d+-.+conseil.+ministres",
        ),
        OfficialSource(
            "tg_council", settings.tg_council_url, "TG",
            "Conseil des ministres du Togo", "council_communication",
            r"conseil des ministres|compte rendu.+conseil|\.pdf",
            r"/(?:index\.php/)?files/16/Communique-du-conseil-des-ministres/.+\.pdf$",
            direct_urls=(
                "https://www.republiquetogolaise.com/index.php/files/16/Communique-du-conseil-des-ministres/179/Conseil-des-ministres-du-22-janvier-2025.pdf",
                "https://www.republiquetogolaise.com/index.php/files/16/Communique-du-conseil-des-ministres/177/COMPTE_RENDU_DU_CONSEIL_DES_MINISTRES_DU_MARDI_05_NOVEMBRE_2024.pdf",
                "https://www.republiquetogolaise.com/index.php/files/16/Communique-du-conseil-des-ministres/157/COMMUNIQUE-CONSEIL-DES-MINISTRES-DU-LUNDI-17-OCTOBRE-2022.pdf",
            ),
        ),
        OfficialSource(
            "gw_council", settings.gw_council_url, "GW",
            "Conselho de Ministros da Guiné-Bissau", "council_communication",
            r"conselho de ministros|conselho-de-ministros",
            r"/noticias/.+conselho.+ministros",
            direct_urls=(
                "https://www.presidencia.gw/noticias/presidente-da-rep%C3%BAblica-preside-%C3%A0-reuni%C3%A3o-do-conselho-de-ministros-",
            ),
        ),
        OfficialSource(
            "brvm_notices",
            f"{settings.brvm_base_url}/fr/marche/avis-et-publications/avis",
            None, "BRVM", "market_notice", r"avis|note-d-information|prospectus|\.pdf",
            r"/sites/default/files/.+\.pdf$",
        ),
        OfficialSource(
            "umoa_titres", settings.umoa_titres_publications_url, None,
            "UMOA-Titres", "issuance_calendar",
            r"calendrier|emission|émission|bulletin|\.pdf",
            r"/fr/emission/|/fr/calendrier-des-emissions-de-|/fr/bulletin-des-statistiques|/wp-content/uploads/.+\.pdf$",
        ),
    ]
    if settings.amf_umoa_publications_url:
        sources.append(
            OfficialSource(
                "amf_umoa", settings.amf_umoa_publications_url, None,
                "AMF-UMOA", "regulatory_decision", r"décision|decision|instruction|\.pdf",
                r"\.pdf$|/decision|/instruction",
            )
        )
    return sources


# Complete UEMOA/XOF coverage. An official source may legitimately discover
# zero current documents; no media or unofficial mirror replaces it.
UEMOA_COUNTRIES = {
    "BJ": "Bénin", "BF": "Burkina Faso", "CI": "Côte d'Ivoire",
    "GW": "Guinée-Bissau", "ML": "Mali", "NE": "Niger",
    "SN": "Sénégal", "TG": "Togo",
}

COUNTRY_URL_MARKERS = {
    "benin": "BJ", "burkina-faso": "BF", "cote-divoire": "CI",
    "guinee-bissau": "GW", "mali": "ML", "niger": "NE",
    "senegal": "SN", "togo": "TG",
}


def source_country(source: OfficialSource, url: str) -> str | None:
    if source.country:
        return source.country
    if source.key == "umoa_titres":
        folded = (
            url.lower()
            .replace("é", "e")
            .replace("è", "e")
            .replace("ô", "o")
            .replace("'", "")
        )
        return next(
            (country for marker, country in COUNTRY_URL_MARKERS.items() if marker in folded),
            None,
        )
    return None


class OfficialIntelligenceCollector(Collector):
    name = "official_intelligence"

    def __init__(self, *, max_per_source: int = 30) -> None:
        self.max_per_source = max_per_source

    def collect(self, ctx: CollectContext) -> CollectResult:
        result = CollectResult(collector=self.name)
        store = RawStore()
        for source in configured_sources():
            links: list[tuple[str, str, date | None]] = []
            try:
                listing = ctx.client.get_text(source.listing_url)
                links.extend(discover_links(listing, source))
            except Exception as exc:  # noqa: BLE001 - retain direct official URLs
                result.warnings.append(f"{source.key} listing: {exc}")
                result.ok = False
            for url in source.direct_urls:
                slug = urlparse(url).path.rstrip("/").rsplit("/", 1)[-1]
                title = " ".join(slug.removesuffix(".pdf").replace("_", " ").replace("-", " ").split())
                links.append((url, title, parse_publication_date(title)))
            for url, title, publication_date in links[: self.max_per_source]:
                try:
                    if ctx.session.scalar(
                        select(GovDocument.id).where(GovDocument.capture_url == url)
                    ):
                        result.skipped += 1
                        continue
                    response = ctx.client.get(url)
                    data = response.content
                    content_type = response.headers.get("content-type", "")
                    is_pdf = "pdf" in content_type or url.lower().endswith(".pdf")
                    ext = "pdf" if is_pdf else "html"
                    stored = store.put(data, kind="official-intelligence", ext=ext)
                    document = ctx.session.scalar(
                        select(Document).where(Document.content_hash == stored.content_hash)
                    )
                    if document is None:
                        document = Document(
                            doc_type=(
                                DocType.NOTICE_INFORMATION.value
                                if source.doc_type in {"market_notice", "regulatory_decision"}
                                else DocType.OTHER.value
                            ),
                            title=title,
                            language="fr",
                            publication_date=publication_date,
                            source_url=url,
                            storage_path=stored.storage_path,
                            content_hash=stored.content_hash,
                            mime=content_type.split(";")[0] or (
                                "application/pdf" if is_pdf else "text/html"
                            ),
                            byte_size=stored.byte_size,
                            ingestion_run_id=ctx.run_id,
                        )
                        ctx.session.add(document)
                        ctx.session.flush()
                        result.documents += 1
                    ctx.session.add(
                        GovDocument(
                            source_country=source_country(source, url),
                            body=source.body,
                            publication_date=publication_date,
                            doc_type=source.doc_type,
                            title=title,
                            document_id=document.id,
                            capture_url=url,
                            official_source_url=url,
                            ingestion_run_id=ctx.run_id,
                        )
                    )
                    result.inserted += 1
                except Exception as exc:  # noqa: BLE001 - isolate individual documents
                    result.warnings.append(f"{source.key} {url}: {exc}")
                    result.ok = False
        return result
