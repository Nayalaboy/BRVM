from __future__ import annotations

from datetime import date
from decimal import Decimal

from brvm_pipeline.parsers.boc_pdf import parse_classic_row, parse_semantic_row


def test_parse_classic_traded_row() -> None:
    fields = [
        "FTSC",
        "FILTISAC CI",
        "2 681",
        "79 163 825",
        "29 500",
        "29 500",
        "29 700",
        "29 528",
        "0.68%",
        "0.68%",
        "29 700",
    ]
    row = parse_classic_row(
        fields,
        session_date=date(2015, 1, 5),
        page=2,
        known_tickers={"FTSC"},
    )
    assert row is not None
    assert row.close == Decimal("29700")
    assert row.previous_close == Decimal("29500")
    assert row.open == Decimal("29500")
    assert row.volume == 2681
    assert row.value_traded == Decimal("79163825")


def test_parse_classic_no_trade_row_uses_published_reference() -> None:
    fields = [
        "CABC",
        "SICABLE CI",
        "102 000",
        "NC",
        "NC",
        "NC",
        "102 000",
        "94 350",
        "109 650",
    ]
    row = parse_classic_row(
        fields,
        session_date=date(2015, 1, 5),
        page=2,
        known_tickers={"CABC"},
    )
    assert row is not None
    assert row.close == Decimal("102000")
    assert row.previous_close == Decimal("102000")
    assert row.open is None
    assert row.volume == 0


def test_unknown_ticker_is_not_inferred() -> None:
    assert (
        parse_classic_row(
            ["XXXX", "UNKNOWN", "1", "100", "100", "100", "100"],
            session_date=date(2015, 1, 5),
            page=2,
            known_tickers={"FTSC"},
        )
        is None
    )


def test_parse_2018_semantic_row() -> None:
    row = parse_semantic_row(
        [
            "SNTS",
            "SONATEL SN",
            "22 505",
            "22 500",
            "22 500",
            "-0,02 %",
            "601",
            "13 521 640",
            "22 500",
        ],
        session_date=date(2018, 1, 15),
        page=2,
        known_tickers={"SNTS"},
    )
    assert row is not None
    assert row.close == Decimal("22500")
    assert row.open == Decimal("22500")
    assert row.volume == 601
    assert row.value_traded == Decimal("13521640")


def test_parse_2023_sector_prefixed_row() -> None:
    row = parse_semantic_row(
        [
            "SPU",
            "SNTS",
            "SONATEL SN",
            "16 100",
            "16 100",
            "16 050",
            "-0,31 %",
            "7 823",
            "125 260 295",
            "16 050",
        ],
        session_date=date(2023, 3, 8),
        page=2,
        known_tickers={"SNTS"},
    )
    assert row is not None
    assert row.close == Decimal("16050")
    assert row.volume == 7823
    assert row.value_traded == Decimal("125260295")


def test_parse_semantic_no_trade_row() -> None:
    row = parse_semantic_row(
        ["IND", "SIVC", "AIR LIQUIDE CI", "420", "NC", "NC", "0,00 %", "420"],
        session_date=date(2018, 1, 15),
        page=2,
        known_tickers={"SIVC"},
    )
    assert row is not None
    assert row.close == Decimal("420")
    assert row.volume == 0
