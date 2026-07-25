"""Daily equity quotes from brvm.org (official closing prices)."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select

from ..config import get_settings
from ..logging import get_logger
from ..models import Company, DailyQuote, Source
from ..parsers.brvm_html import parse_quotes, parse_session_date
from .base import CollectContext, Collector, CollectResult

log = get_logger("collector.quotes")


class BrvmQuotesCollector(Collector):
    name = "brvm_quotes"

    def __init__(self) -> None:
        self.base = get_settings().brvm_base_url

    @property
    def url(self) -> str:
        return f"{self.base}/fr/cours-actions/0"

    def collect(self, ctx: CollectContext) -> CollectResult:
        res = CollectResult(collector=self.name)
        html = ctx.client.get_text(self.url)

        session_date = parse_session_date(html) or date.today()
        quotes = parse_quotes(html)
        if not quotes:
            res.ok = False
            res.warnings.append("no quotes parsed — page markup may have changed")
            log.error("no_quotes_parsed", url=self.url)
            return res

        companies = {
            c.ticker.upper(): c
            for c in ctx.session.execute(select(Company)).scalars()
        }

        for q in quotes:
            company = companies.get(q.ticker)
            if company is None:
                res.warnings.append(f"unknown ticker {q.ticker}")
                res.skipped += 1
                continue

            existing = ctx.session.execute(
                select(DailyQuote).where(
                    DailyQuote.company_id == company.id,
                    DailyQuote.date == session_date,
                )
            ).scalar_one_or_none()

            if existing is None:
                ctx.session.add(
                    DailyQuote(
                        company_id=company.id,
                        date=session_date,
                        open=q.open,
                        high=None,   # not published on this page
                        low=None,
                        close=q.close,
                        previous_close=q.previous,
                        volume=q.volume,
                        value_traded=None,
                        source=Source.BRVM.value,
                        ingestion_run_id=ctx.run_id,
                    )
                )
                res.inserted += 1
            else:
                existing.open = q.open
                existing.close = q.close
                existing.previous_close = q.previous
                existing.volume = q.volume
                existing.ingestion_run_id = ctx.run_id
                res.updated += 1

        log.info(
            "quotes_collected",
            date=session_date.isoformat(),
            inserted=res.inserted,
            updated=res.updated,
            skipped=res.skipped,
        )
        return res
