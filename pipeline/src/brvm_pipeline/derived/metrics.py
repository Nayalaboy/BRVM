"""Derived per-company metrics, recomputed each daily run:
trailing dividend yield, 52-week high/low, YTD return, 20-day average volume
and value traded. Stored in ``company_metrics`` (one row per company).
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..logging import get_logger
from ..models import Company, CompanyMetric, DailyQuote, Dividend

log = get_logger("derived")


def recompute_all(session: Session, as_of: date) -> int:
    updated = 0
    for company in session.execute(select(Company)).scalars():
        m = _compute_for_company(session, company, as_of)
        if m is None:
            continue
        existing = session.get(CompanyMetric, company.id)
        if existing is None:
            session.add(m)
        else:
            for attr in (
                "as_of_date", "last_close", "trailing_dividend_yield",
                "high_52w", "low_52w", "ytd_return",
                "avg_daily_volume_20d", "avg_daily_value_20d",
            ):
                setattr(existing, attr, getattr(m, attr))
        updated += 1
    log.info("metrics_recomputed", count=updated, as_of=as_of.isoformat())
    return updated


def _compute_for_company(session: Session, company: Company, as_of: date) -> CompanyMetric | None:
    last = session.execute(
        select(DailyQuote)
        .where(DailyQuote.company_id == company.id, DailyQuote.date <= as_of)
        .order_by(DailyQuote.date.desc())
        .limit(1)
    ).scalar_one_or_none()
    if last is None:
        return None

    year_ago = as_of - timedelta(days=365)
    window = list(
        session.execute(
            select(DailyQuote)
            .where(
                DailyQuote.company_id == company.id,
                DailyQuote.date >= year_ago,
                DailyQuote.date <= as_of,
            )
            .order_by(DailyQuote.date.desc())
        ).scalars()
    )
    closes = [q.close for q in window if q.close is not None]
    high_52w = max(closes) if closes else None
    low_52w = min(closes) if closes else None

    # 20 most recent sessions for ADV / average value traded.
    last20 = window[:20]
    vols = [q.volume for q in last20 if q.volume is not None]
    vals = [q.value_traded for q in last20 if q.value_traded is not None]
    adv20 = Decimal(sum(vols)) / Decimal(len(vols)) if vols else None
    adval20 = (sum(vals) / Decimal(len(vals))) if vals else None

    # YTD return from the first session of the current year.
    jan1 = date(as_of.year, 1, 1)
    first_of_year = session.execute(
        select(DailyQuote.close)
        .where(
            DailyQuote.company_id == company.id,
            DailyQuote.date >= jan1,
            DailyQuote.date <= as_of,
        )
        .order_by(DailyQuote.date.asc())
        .limit(1)
    ).scalar_one_or_none()
    ytd = (
        (last.close - first_of_year) / first_of_year
        if first_of_year and first_of_year > 0
        else None
    )

    # Trailing 12-month dividend yield: sum of net dividends with an ex-date in
    # the last year (fallback: most recent fiscal year), divided by last close.
    ttm_net = session.execute(
        select(Dividend.amount_net).where(
            Dividend.company_id == company.id,
            Dividend.ex_date.is_not(None),
            Dividend.ex_date >= year_ago,
            Dividend.ex_date <= as_of,
            Dividend.amount_net.is_not(None),
        )
    ).scalars().all()
    ttm_sum = sum(ttm_net) if ttm_net else _latest_fy_dividend(session, company.id)
    yield_ = (ttm_sum / last.close) if (ttm_sum and last.close and last.close > 0) else None

    return CompanyMetric(
        company_id=company.id,
        as_of_date=as_of,
        last_close=last.close,
        trailing_dividend_yield=yield_,
        high_52w=high_52w,
        low_52w=low_52w,
        ytd_return=ytd,
        avg_daily_volume_20d=adv20,
        avg_daily_value_20d=adval20,
    )


def _latest_fy_dividend(session: Session, company_id: int) -> Decimal | None:
    row = session.execute(
        select(Dividend.amount_net)
        .where(Dividend.company_id == company_id, Dividend.amount_net.is_not(None))
        .order_by(Dividend.fiscal_year.desc())
        .limit(1)
    ).scalar_one_or_none()
    return row
