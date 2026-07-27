"""Market-session freshness rules shared by the API and pipeline.

BRVM pages publish end-of-day data, not an intraday stream.  The official
pages normally settle shortly after 15:15 GMT.  Before that publication
window, the previous business day's close is expected.  After it, a
successful same-day source check is authoritative (and also handles exchange
holidays without maintaining a fragile holiday calendar locally).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

MARKET_TIMEZONE = ZoneInfo("Africa/Abidjan")
SOURCE_PUBLICATION_CUTOFF = time(15, 25)


@dataclass(frozen=True)
class MarketFreshness:
    freshness: str
    market_state: str
    expected_session_date: date | None
    business_days_behind: int | None
    reason: str

    def as_dict(self) -> dict:
        payload = asdict(self)
        payload["expected_session_date"] = (
            self.expected_session_date.isoformat()
            if self.expected_session_date is not None
            else None
        )
        return payload


def _as_market_time(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(MARKET_TIMEZONE)


def previous_business_day(value: date) -> date:
    candidate = value - timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate -= timedelta(days=1)
    return candidate


def business_days_behind(latest: date, expected: date) -> int:
    if latest >= expected:
        return 0
    count = 0
    cursor = latest + timedelta(days=1)
    while cursor <= expected:
        if cursor.weekday() < 5:
            count += 1
        cursor += timedelta(days=1)
    return count


def evaluate_market_freshness(
    *,
    latest_quote: date | None,
    latest_index: date | None,
    source_session_date: date | None = None,
    source_checked_at: datetime | None = None,
    now: datetime | None = None,
) -> MarketFreshness:
    """Classify the latest stored close against the official publication cycle."""

    market_now = _as_market_time(now or datetime.now(UTC))
    today = market_now.date()
    is_weekend = today.weekday() >= 5
    market_state = (
        "weekend"
        if is_weekend
        else (
            "pre_close"
            if market_now.time().replace(tzinfo=None) < SOURCE_PUBLICATION_CUTOFF
            else "post_close"
        )
    )

    source_checked_today = bool(
        source_session_date
        and source_checked_at
        and _as_market_time(source_checked_at).date() == today
        and source_session_date <= today
    )
    if source_checked_today:
        expected = source_session_date
    elif is_weekend or market_state == "pre_close":
        expected = previous_business_day(today)
    else:
        expected = today

    if latest_quote is None or latest_index is None:
        return MarketFreshness(
            freshness="unavailable",
            market_state=market_state,
            expected_session_date=expected,
            business_days_behind=None,
            reason="missing_market_data",
        )

    lag = max(
        business_days_behind(latest_quote, expected),
        business_days_behind(latest_index, expected),
    )
    if latest_quote != latest_index:
        return MarketFreshness(
            freshness="delayed",
            market_state=market_state,
            expected_session_date=expected,
            business_days_behind=lag,
            reason="quote_index_session_mismatch",
        )
    if lag:
        return MarketFreshness(
            freshness="delayed",
            market_state=market_state,
            expected_session_date=expected,
            business_days_behind=lag,
            reason="expected_session_missing",
        )
    if market_state == "pre_close":
        freshness = "awaiting_close"
        reason = "awaiting_official_close"
    elif source_checked_today:
        freshness = "current"
        reason = "official_source_checked"
    elif market_state == "weekend":
        freshness = "current"
        reason = "latest_business_day_available"
    else:
        freshness = "current"
        reason = "expected_session_available"
    return MarketFreshness(
        freshness=freshness,
        market_state=market_state,
        expected_session_date=expected,
        business_days_behind=0,
        reason=reason,
    )
