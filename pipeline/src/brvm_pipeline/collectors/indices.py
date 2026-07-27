"""Market index levels (BRVM Composite, BRVM 30, BRVM Prestige, sectors).

Best-effort against brvm.org/…/indices. Index names are normalised to stable
codes; unknown names are stored under a slugified code so nothing is lost.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from ..config import get_settings
from ..logging import get_logger
from ..models import IndexValue, Source
from ..parsers.brvm_html import parse_indices, parse_session_date
from .base import CollectContext, Collector, CollectResult

log = get_logger("collector.indices")

# Order matters: more specific patterns first (total-return before composite).
_CODES = [
    ("composite total return", "BRVM_COMPOSITE_TR"),
    ("composite", "BRVM_COMPOSITE"),
    ("prestige", "BRVM_PRESTIGE"),
    ("principal", "BRVM_PRINCIPAL"),
    ("brvm 30", "BRVM_30"),
]


def index_code(name: str) -> str:
    # Normalise dashes/spacing so "BRVM-30", "BRVM – COMPOSITE", etc. all match.
    low = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    for key, code in _CODES:
        if key in low:
            return code
    slug = re.sub(r"\s+", "_", re.sub(r"^brvm\s+", "", low)).upper()
    return f"BRVM_{slug}"[:40]


class BrvmIndicesCollector(Collector):
    name = "brvm_indices"

    def __init__(self) -> None:
        self.base = get_settings().brvm_base_url

    @property
    def url(self) -> str:
        return f"{self.base}/fr/indices"

    def collect(self, ctx: CollectContext) -> CollectResult:
        res = CollectResult(collector=self.name)
        html = ctx.client.get_text(self.url)
        session_date = parse_session_date(html)
        if session_date is None:
            res.ok = False
            res.warnings.append("official index session date could not be parsed")
            log.error("index_session_date_missing", url=self.url)
            return res
        res.source_date = session_date
        market_today = datetime.now(UTC).astimezone(ZoneInfo("Africa/Abidjan")).date()
        if session_date > market_today:
            res.ok = False
            res.warnings.append(
                f"official index session date {session_date} is in the future"
            )
            log.error(
                "index_session_date_future",
                session_date=session_date.isoformat(),
                market_today=market_today.isoformat(),
            )
            return res

        rows = parse_indices(html)
        if not rows:
            res.ok = False
            res.warnings.append("no indices parsed (markup may have changed)")
            log.error("no_indices_parsed", url=self.url)
            return res
        codes = {index_code(row.name) for row in rows}
        required = {"BRVM_COMPOSITE", "BRVM_30"}
        if not required.issubset(codes):
            res.ok = False
            missing = ", ".join(sorted(required - codes))
            res.warnings.append(f"required official indices missing: {missing}")
            log.error("required_indices_missing", missing=missing)
            return res

        latest_stored = ctx.session.scalar(
            select(IndexValue.date).order_by(IndexValue.date.desc()).limit(1)
        )
        if latest_stored and session_date < latest_stored:
            res.ok = False
            res.warnings.append(
                f"official index session regressed from {latest_stored} to {session_date}"
            )
            log.error(
                "index_session_regression",
                latest_stored=latest_stored.isoformat(),
                source_date=session_date.isoformat(),
            )
            return res

        for r in rows:
            code = index_code(r.name)
            existing = ctx.session.execute(
                select(IndexValue).where(
                    IndexValue.index_code == code, IndexValue.date == session_date
                )
            ).scalar_one_or_none()
            if existing is None:
                ctx.session.add(
                    IndexValue(
                        index_code=code,
                        date=session_date,
                        value=r.value,
                        change_pct=r.change_pct,
                        source=Source.BRVM.value,
                        ingestion_run_id=ctx.run_id,
                    )
                )
                res.inserted += 1
            else:
                existing.value = r.value
                existing.change_pct = r.change_pct
                res.updated += 1

        log.info("indices_collected", inserted=res.inserted, updated=res.updated)
        return res
