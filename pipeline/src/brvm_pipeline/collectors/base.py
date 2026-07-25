"""Common collector interface.

Every collector implements ``collect(ctx) -> CollectResult``. The orchestrator
(``run.py``) owns the ingestion_run row, the DB session and the HTTP client, and
passes them in via ``CollectContext`` so collectors stay focused on
fetch → parse → upsert and are individually testable.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from .http import PoliteClient


@dataclass
class CollectContext:
    session: Session
    client: PoliteClient
    run_id: int
    # Optional bounds for backfills (inclusive ISO dates); None = latest only.
    since: str | None = None
    until: str | None = None


@dataclass
class CollectResult:
    collector: str
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    documents: int = 0
    warnings: list[str] = field(default_factory=list)
    ok: bool = True

    def as_stats(self) -> dict:
        return {
            "inserted": self.inserted,
            "updated": self.updated,
            "skipped": self.skipped,
            "documents": self.documents,
            "warnings": self.warnings,
            "ok": self.ok,
        }


class Collector(ABC):
    #: stable identifier used in logs and ingestion_runs.stats
    name: str = "collector"

    @abstractmethod
    def collect(self, ctx: CollectContext) -> CollectResult: ...
