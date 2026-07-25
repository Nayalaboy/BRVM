"""Primary-market operations collector.

Loads the human-curated, verified operations (see data/operations.py) and
upserts them into ``primary_operations``. Kept as a Collector so it fits the
same run/QA/provenance machinery and can later be swapped for a URL-based
source without changing callers.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select

from ..data.operations import OPERATIONS
from ..logging import get_logger
from ..models import PrimaryOperation
from .base import CollectContext, Collector, CollectResult

log = get_logger("collector.operations")


def _d(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


class OperationsCollector(Collector):
    name = "primary_operations"

    def collect(self, ctx: CollectContext) -> CollectResult:
        res = CollectResult(collector=self.name)
        for spec in OPERATIONS:
            existing = ctx.session.execute(
                select(PrimaryOperation).where(
                    PrimaryOperation.issuer_name == spec["issuer_name"],
                    PrimaryOperation.title == spec["title"],
                )
            ).scalar_one_or_none()

            fields = dict(
                issuer_name=spec["issuer_name"],
                operation_type=spec.get("operation_type", "ipo"),
                title=spec["title"],
                status=spec.get("status", "announced"),
                open_date=_d(spec.get("open_date")),
                close_date=_d(spec.get("close_date")),
                price_min=spec.get("price_min"),
                price_max=spec.get("price_max"),
                min_subscription=spec.get("min_subscription"),
                tranches=spec.get("tranches"),
                eligibility_notes_fr=spec.get("eligibility_notes_fr"),
                sgi_lead=spec.get("sgi_lead"),
                notice_url=spec.get("notice_url"),
                source_url=spec.get("source_url"),
            )
            if existing is None:
                ctx.session.add(PrimaryOperation(**fields))
                res.inserted += 1
            else:
                for k, v in fields.items():
                    setattr(existing, k, v)
                res.updated += 1

        log.info("operations_loaded", inserted=res.inserted, updated=res.updated)
        return res
