"""Idempotent seed: the 47 real companies, ~90 weekdays of deterministic
synthetic quote history (so charts/metrics have shape before the first live
scrape), and the real net-dividend history with synthesized ex/payment dates.

`make bootstrap` runs migrations then this. Re-running only fills gaps.
"""

from __future__ import annotations

import random
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from .data.companies import COMPANIES
from .db import get_engine, session_scope
from .derived.metrics import recompute_all
from .logging import get_logger
from .models import (
    Base,
    Company,
    DailyQuote,
    Dividend,
    DividendStatus,
    IngestionRun,
    RunJob,
    RunStatus,
    Source,
)

log = get_logger("seed")

HISTORY_DAYS = 90


def _weekdays(end: date, days: int) -> list[date]:
    out: list[date] = []
    d = end - timedelta(days=days)
    while d <= end:
        if d.weekday() < 5:  # Mon–Fri
            out.append(d)
        d += timedelta(days=1)
    return out


def seed() -> None:
    Base.metadata.create_all(get_engine())  # safety net for fresh SQLite
    today = date.today()

    with session_scope() as s:
        run = IngestionRun(job=RunJob.SEED.value, source=Source.SEED.value)
        s.add(run)
        s.flush()

        for spec in COMPANIES:
            company = s.execute(
                select(Company).where(Company.ticker == spec["ticker"])
            ).scalar_one_or_none()
            if company is None:
                company = Company(
                    ticker=spec["ticker"],
                    name=spec["name"],
                    short_name=spec["name"],
                    sector=spec["sector"],
                    country=spec["country"],
                    currency="XOF",
                    shares_outstanding=spec["shares"],
                )
                s.add(company)
                s.flush()

            _seed_quotes(s, company, spec["ref_close"], today, run.id)
            _seed_dividends(s, company, spec["dividends"], today, run.id)

        run.status = RunStatus.SUCCESS.value
        run.finished_at = datetime.now(UTC)
        run.stats = {"companies": len(COMPANIES)}

    # Metrics need the quotes committed first.
    with session_scope() as s:
        recompute_all(s, today)

    log.info("seed_complete", companies=len(COMPANIES))


def _seed_quotes(s, company: Company, ref_close: float, today: date, run_id: int) -> None:  # noqa: ANN001
    if s.execute(
        select(DailyQuote.id).where(DailyQuote.company_id == company.id).limit(1)
    ).scalar_one_or_none():
        return  # already has quotes

    rng = random.Random(sum(ord(c) for c in company.ticker))
    price = float(ref_close)
    # Walk backwards from ref_close, then emit forward so the last day == ref.
    series: list[tuple[date, float, float]] = []
    for d in reversed(_weekdays(today, HISTORY_DAYS)):
        open_ = price
        drift = (rng.random() - 0.5) * 0.02
        prev = max(1.0, round(price / (1 + drift), 2))
        series.append((d, prev, open_))
        price = prev
    series.reverse()

    for d, prev, close_ in series:
        volume = int(rng.random() * 20000 + 500)
        s.add(
            DailyQuote(
                company_id=company.id,
                date=d,
                open=Decimal(str(round(prev, 2))),
                close=Decimal(str(round(close_, 2))),
                previous_close=Decimal(str(round(prev, 2))),
                volume=volume,
                value_traded=Decimal(str(round(close_ * volume, 2))),
                source=Source.SEED.value,
                ingestion_run_id=run_id,
            )
        )


def _seed_dividends(s, company: Company, dividends: dict, today: date, run_id: int) -> None:  # noqa: ANN001
    if not dividends:
        return
    if s.execute(
        select(Dividend.id).where(Dividend.company_id == company.id).limit(1)
    ).scalar_one_or_none():
        return

    years = sorted(dividends)
    latest = years[-1]
    hash_ = sum(ord(c) for c in company.ticker)
    for fy in years:
        if fy == latest:
            ex = today + timedelta(days=7 + hash_ % 60)  # upcoming
            status = DividendStatus.APPROVED.value
        else:
            ex = date(fy + 1, 4 + hash_ % 5, 1 + hash_ % 25)  # historical
            status = DividendStatus.PAID.value
        s.add(
            Dividend(
                company_id=company.id,
                fiscal_year=fy,
                amount_net=Decimal(str(dividends[fy])),
                ex_date=ex,
                payment_date=ex + timedelta(days=14),
                status=status,
                source=Source.SEED.value,
                ingestion_run_id=run_id,
            )
        )


if __name__ == "__main__":
    from .logging import configure_logging

    configure_logging()
    seed()
