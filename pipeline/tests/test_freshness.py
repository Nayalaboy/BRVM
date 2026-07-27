from __future__ import annotations

from datetime import UTC, date, datetime
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from brvm_pipeline.collectors.base import CollectResult
from brvm_pipeline.collectors.brvm_quotes import BrvmQuotesCollector
from brvm_pipeline.collectors.indices import BrvmIndicesCollector
from brvm_pipeline.freshness import evaluate_market_freshness
from brvm_pipeline.run import _market_session_from


def test_friday_close_is_expected_before_monday_publication() -> None:
    result = evaluate_market_freshness(
        latest_quote=date(2026, 7, 24),
        latest_index=date(2026, 7, 24),
        now=datetime(2026, 7, 27, 14, 0, tzinfo=UTC),
    )
    assert result.freshness == "awaiting_close"
    assert result.expected_session_date == date(2026, 7, 24)
    assert result.business_days_behind == 0


def test_friday_close_is_delayed_after_monday_publication_cutoff() -> None:
    result = evaluate_market_freshness(
        latest_quote=date(2026, 7, 24),
        latest_index=date(2026, 7, 24),
        now=datetime(2026, 7, 27, 16, 0, tzinfo=UTC),
    )
    assert result.freshness == "delayed"
    assert result.expected_session_date == date(2026, 7, 27)
    assert result.business_days_behind == 1


def test_same_day_official_check_handles_exchange_holiday() -> None:
    result = evaluate_market_freshness(
        latest_quote=date(2026, 7, 24),
        latest_index=date(2026, 7, 24),
        source_session_date=date(2026, 7, 24),
        source_checked_at=datetime(2026, 7, 27, 16, 5, tzinfo=UTC),
        now=datetime(2026, 7, 27, 16, 10, tzinfo=UTC),
    )
    assert result.freshness == "current"
    assert result.expected_session_date == date(2026, 7, 24)
    assert result.reason == "official_source_checked"


def test_quote_index_session_mismatch_is_never_current() -> None:
    result = evaluate_market_freshness(
        latest_quote=date(2026, 7, 27),
        latest_index=date(2026, 7, 24),
        now=datetime(2026, 7, 27, 16, 0, tzinfo=UTC),
    )
    assert result.freshness == "delayed"
    assert result.reason == "quote_index_session_mismatch"


def test_latest_friday_close_is_current_during_weekend() -> None:
    result = evaluate_market_freshness(
        latest_quote=date(2026, 7, 24),
        latest_index=date(2026, 7, 24),
        now=datetime(2026, 7, 26, 16, 0, tzinfo=UTC),
    )
    assert result.freshness == "current"
    assert result.market_state == "weekend"
    assert result.expected_session_date == date(2026, 7, 24)


def test_missing_index_data_is_unavailable() -> None:
    result = evaluate_market_freshness(
        latest_quote=date(2026, 7, 24),
        latest_index=None,
        now=datetime(2026, 7, 27, 14, 0, tzinfo=UTC),
    )
    assert result.freshness == "unavailable"
    assert result.reason == "missing_market_data"


@pytest.mark.parametrize(
    ("collector", "parser_path"),
    [
        (BrvmQuotesCollector(), "brvm_pipeline.collectors.brvm_quotes.parse_session_date"),
        (BrvmIndicesCollector(), "brvm_pipeline.collectors.indices.parse_session_date"),
    ],
)
def test_collectors_fail_closed_when_official_date_is_missing(
    collector,
    parser_path: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = Mock()
    client.get_text.return_value = "<html></html>"
    module_name, attribute = parser_path.rsplit(".", 1)
    module = __import__(module_name, fromlist=[attribute])
    monkeypatch.setattr(module, attribute, lambda _html: None)
    result = collector.collect(
        SimpleNamespace(client=client, session=Mock(), run_id=1)
    )
    assert result.ok is False
    assert result.source_date is None


def test_current_run_rejects_quote_index_session_mismatch() -> None:
    results = [
        CollectResult(collector="brvm_quotes", source_date=date(2026, 7, 27)),
        CollectResult(collector="brvm_indices", source_date=date(2026, 7, 24)),
    ]
    with pytest.raises(RuntimeError, match="session mismatch"):
        _market_session_from(results)
