"""Licensed-entities registry (SGIs / SGPs / apporteurs) — refreshed weekly.

Tries the official CREPMF/BRVM list first (set ``BRVM_REGISTRY_URL``); if that's
not configured/reachable, loads the conservative bootstrap seed so /verifier has
data. Every row records ``registry_refreshed_at`` and its ``source_url``.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

from bs4 import BeautifulSoup
from sqlalchemy import select

from ..data.licensed_entities import OFFICIAL_LIST_URL, SGIS
from ..logging import get_logger
from ..models import EntityStatus, EntityType, LicensedEntity, Source
from .base import CollectContext, Collector, CollectResult

log = get_logger("collector.registry")


class LicensedEntityCollector(Collector):
    name = "licensed_entities"

    def __init__(self) -> None:
        self.registry_url = os.environ.get("BRVM_REGISTRY_URL")

    def collect(self, ctx: CollectContext) -> CollectResult:
        res = CollectResult(collector=self.name)
        now = datetime.now(UTC)

        rows = self._fetch_live(ctx) if self.registry_url else None
        if rows:
            source = Source.CREPMF.value
            source_url = self.registry_url
        else:
            if self.registry_url:
                res.warnings.append("official registry unreachable — using seed fallback")
            rows = [
                {"name": n, "country": c, "entity_type": t, "status": s}
                for (n, c, t, s) in _dedupe(SGIS)
            ]
            source = Source.SEED.value
            source_url = OFFICIAL_LIST_URL

        for r in rows:
            existing = ctx.session.execute(
                select(LicensedEntity).where(LicensedEntity.name == r["name"])
            ).scalar_one_or_none()
            if existing is None:
                ctx.session.add(
                    LicensedEntity(
                        name=r["name"],
                        entity_type=r.get("entity_type", EntityType.SGI.value),
                        country=r.get("country"),
                        approval_number=r.get("approval_number"),
                        status=r.get("status", EntityStatus.ACTIVE.value),
                        source_url=source_url,
                        registry_refreshed_at=now,
                    )
                )
                res.inserted += 1
            else:
                existing.status = r.get("status", existing.status)
                existing.country = r.get("country", existing.country)
                existing.registry_refreshed_at = now
                res.updated += 1

        log.info("registry_refreshed", source=source, inserted=res.inserted, updated=res.updated)
        return res

    def _fetch_live(self, ctx: CollectContext) -> list[dict] | None:
        """Parse the official list table. Best-effort; returns None on failure."""
        try:
            html = ctx.client.get_text(self.registry_url)
        except Exception as exc:  # noqa: BLE001
            log.warning("registry_fetch_failed", url=self.registry_url, error=str(exc))
            return None
        soup = BeautifulSoup(html, "lxml")
        out: list[dict] = []
        for table in soup.find_all("table"):
            for tr in table.find_all("tr"):
                cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
                if not cells or not cells[0]:
                    continue
                out.append(
                    {
                        "name": cells[0],
                        "approval_number": cells[1] if len(cells) > 1 else None,
                        "country": cells[2] if len(cells) > 2 else None,
                        "entity_type": EntityType.SGI.value,
                        "status": EntityStatus.ACTIVE.value,
                    }
                )
        return out or None


def _dedupe(rows: list[tuple[str, str, str, str]]) -> list[tuple[str, str, str, str]]:
    seen: set[str] = set()
    out: list[tuple[str, str, str, str]] = []
    for r in rows:
        if r[0] not in seen:
            seen.add(r[0])
            out.append(r)
    return out
