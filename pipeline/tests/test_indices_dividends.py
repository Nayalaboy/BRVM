"""Parser tests for the indices and dividend-notice pages (real saved HTML)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from brvm_pipeline.collectors.corporate_actions import _norm
from brvm_pipeline.collectors.indices import index_code
from brvm_pipeline.parsers.brvm_html import (
    parse_dividend_notices,
    parse_french_date,
    parse_indices,
)

FX = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def indices_html() -> str:
    return (FX / "brvm_indices.html").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def notices_html() -> str:
    return (FX / "brvm_dividend_notices.html").read_text(encoding="utf-8")


def test_indices_composite(indices_html: str) -> None:
    by_code = {index_code(r.name): r for r in parse_indices(indices_html)}
    # The *current* level (Fermeture), not the previous close.
    assert by_code["BRVM_COMPOSITE"].value == Decimal("484.32")
    assert by_code["BRVM_COMPOSITE"].change_pct == Decimal("0.56")
    assert by_code["BRVM_30"].value == Decimal("230.73")
    # Total-return index must not collide with the plain composite.
    assert "BRVM_COMPOSITE_TR" in by_code
    assert by_code["BRVM_COMPOSITE_TR"].value == Decimal("192.27")


def test_index_code_normalisation() -> None:
    assert index_code("BRVM - COMPOSITE") == "BRVM_COMPOSITE"
    assert index_code("BRVM – COMPOSITE TOTAL RETURN") == "BRVM_COMPOSITE_TR"
    assert index_code("BRVM-30") == "BRVM_30"
    assert index_code("BRVM - SERVICES FINANCIERS") == "BRVM_SERVICES_FINANCIERS"


def test_parse_french_date() -> None:
    assert parse_french_date("6 août 2026") == date(2026, 8, 6)
    assert parse_french_date("31 juillet 2026") == date(2026, 7, 31)
    assert parse_french_date("") is None


def test_dividend_notices(notices_html: str) -> None:
    rows = {r.company: r for r in parse_dividend_notices(notices_html)}
    assert len(rows) == 10
    nsbc = rows["NSBC"]
    assert nsbc.fiscal_year == 2025
    assert nsbc.amount == Decimal("768.16")
    assert nsbc.ex_date == date(2026, 8, 3)
    assert nsbc.payment_date == date(2026, 8, 4)
    # Amount cell "570 FCFA" and French decimal both parse.
    assert rows["SOGB"].amount == Decimal("570")
    assert rows["LNB"].amount == Decimal("164.1709")


def test_norm_keeps_country_words() -> None:
    # Country words must survive so subsidiaries stay distinguishable.
    assert "senegal" in _norm("TOTAL SENEGAL S.A.")
    assert _norm("TOTAL SENEGAL S.A.") != _norm("TOTAL CI")
