"""Daily equity quotes from brvm.org (official closing prices)."""

from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

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

        session_date = parse_session_date(html)
        if session_date is None:
            res.ok = False
            res.warnings.append("official session date could not be parsed")
            log.error("quote_session_date_missing", url=self.url)
            return res
        res.source_date = session_date
        market_today = datetime.now(UTC).astimezone(ZoneInfo("Africa/Abidjan")).date()
        if session_date > market_today:
            res.ok = False
            res.warnings.append(
                f"official session date {session_date} is in the future"
            )
            log.error(
                "quote_session_date_future",
                session_date=session_date.isoformat(),
                market_today=market_today.isoformat(),
            )
            return res

        quotes = parse_quotes(html)
        if not quotes:
            res.ok = False
            res.warnings.append("no quotes parsed — page markup may have changed")
            log.error("no_quotes_parsed", url=self.url)
            return res

        company_rows = list(ctx.session.execute(select(Company)).scalars())
        companies = {
            c.ticker.upper(): c
            for c in company_rows
        }
        active_count = sum(1 for company in company_rows if company.is_active)
        known_quote_count = sum(1 for quote in quotes if quote.ticker in companies)
        if active_count and known_quote_count < max(1, active_count - 2):
            res.ok = False
            res.warnings.append(
                f"incomplete official board: {known_quote_count}/{active_count} active tickers"
            )
            log.error(
                "quote_board_incomplete",
                parsed=known_quote_count,
                active=active_count,
                session_date=session_date.isoformat(),
            )
            return res

        latest_stored = ctx.session.scalar(select(DailyQuote.date).order_by(DailyQuote.date.desc()).limit(1))
        if latest_stored and session_date < latest_stored:
            res.ok = False
            res.warnings.append(
                f"official session regressed from {latest_stored} to {session_date}"
            )
            log.error(
                "quote_session_regression",
                latest_stored=latest_stored.isoformat(),
                source_date=session_date.isoformat(),
            )
            return res

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
