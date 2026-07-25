"""Parser tests against a real brvm.org "Cours des actions" page (FR)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from brvm_pipeline.parsers.brvm_html import (
    parse_number,
    parse_quotes,
    parse_session_date,
)

FIXTURE = Path(__file__).parent / "fixtures" / "brvm_cours_actions.html"


@pytest.fixture(scope="module")
def html() -> str:
    return FIXTURE.read_text(encoding="utf-8")


def test_parse_session_date(html: str) -> None:
    assert parse_session_date(html) == date(2026, 7, 22)


def test_parse_quotes_count(html: str) -> None:
    rows = parse_quotes(html)
    assert len(rows) == 47  # the full BRVM board


def test_parse_quotes_known_values(html: str) -> None:
    rows = {r.ticker: r for r in parse_quotes(html)}
    snts = rows["SNTS"]
    assert snts.name.upper().startswith("SONATEL")
    assert snts.close == Decimal("31500")
    assert snts.volume == 3044
    # ETI is the penny stock — sanity-checks decimal/space handling.
    assert rows["ETIT"].close == Decimal("70")
    assert rows["ETIT"].volume == 1042412


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("31 500", Decimal("31500")),
        ("1 234,56", Decimal("1234.56")),
        ("139,7677", Decimal("139.7677")),
        ("-", None),
        ("", None),
        ("7,43%", Decimal("7.43")),
    ],
)
def test_parse_number(raw: str, expected) -> None:
    assert parse_number(raw) == expected
