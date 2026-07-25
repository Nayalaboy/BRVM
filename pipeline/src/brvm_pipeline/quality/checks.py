"""Data-quality checks run after collection, before publishing derived data or
the daily recap. Results are attached to the ingestion_run and gate the recap.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..logging import get_logger
from ..models import Company, DailyQuote

log = get_logger("quality")


@dataclass
class QualityReport:
    checked_date: str
    negative_prices: list[str] = field(default_factory=list)
    volume_outliers: list[dict] = field(default_factory=list)
    missing_tickers: list[str] = field(default_factory=list)
    passed: bool = True

    def as_dict(self) -> dict:
        return {
            "checked_date": self.checked_date,
            "negative_prices": self.negative_prices,
            "volume_outliers": self.volume_outliers,
            "missing_tickers": self.missing_tickers,
            "passed": self.passed,
        }


def run_quality_checks(
    session: Session,
    as_of: date,
    *,
    z_threshold: float = 4.0,
    volume_lookback: int = 60,
    max_missing_tickers: int = 2,
) -> QualityReport:
    """Negative-price, volume-outlier (z-score on log volume), missing-ticker.

    The z-score detector is deliberately simple and swappable (a SARIMA-based
    detector can replace ``_volume_zscore`` without touching callers).
    """
    report = QualityReport(checked_date=as_of.isoformat())

    todays = list(
        session.execute(select(DailyQuote).where(DailyQuote.date == as_of)).scalars()
    )
    by_company = {q.company_id: q for q in todays}

    # 1) Negative / non-positive prices.
    tickers = {c.id: c.ticker for c in session.execute(select(Company)).scalars()}
    for q in todays:
        for field_name in ("open", "high", "low", "close"):
            val = getattr(q, field_name)
            if val is not None and val <= 0:
                report.negative_prices.append(f"{tickers.get(q.company_id)}:{field_name}={val}")

    # 2) Volume outliers vs each company's own recent history.
    since = as_of - timedelta(days=volume_lookback)
    for company_id, today_q in by_company.items():
        if today_q.volume is None:
            continue
        hist = list(
            session.execute(
                select(DailyQuote.volume).where(
                    DailyQuote.company_id == company_id,
                    DailyQuote.date >= since,
                    DailyQuote.date < as_of,
                    DailyQuote.volume.is_not(None),
                    DailyQuote.volume > 0,
                )
            ).scalars()
        )
        z = _volume_zscore(int(today_q.volume), [int(v) for v in hist])
        if z is not None and abs(z) >= z_threshold:
            report.volume_outliers.append(
                {"ticker": tickers.get(company_id), "volume": int(today_q.volume), "z": round(z, 2)}
            )

    # 3) Active companies with no quote today (missing-ticker detection).
    active = [c for c in session.execute(select(Company)).scalars() if c.is_active]
    for c in active:
        if c.id not in by_company:
            report.missing_tickers.append(c.ticker)

    # A small allowance covers an exceptional suspension or delayed listing
    # update. Anything broader indicates an incomplete scrape and must not
    # produce a market-wide recap.
    too_many_missing = len(report.missing_tickers) > max_missing_tickers
    report.passed = not report.negative_prices and not too_many_missing

    log.info("quality_checked", **report.as_dict())
    return report


def _volume_zscore(today: int, history: list[int]) -> float | None:
    """Z-score of log(1+volume) against the trailing window."""
    if len(history) < 5:
        return None
    logs = [math.log1p(v) for v in history]
    mean = sum(logs) / len(logs)
    var = sum((x - mean) ** 2 for x in logs) / (len(logs) - 1)
    sd = math.sqrt(var)
    if sd == 0:
        return None
    return (math.log1p(today) - mean) / sd
