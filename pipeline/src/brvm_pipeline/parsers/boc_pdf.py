"""Pure parsers for historical BOC equity tables.

The BRVM has changed the PDF layout several times. Parsers are deliberately
versioned and conservative: an unsupported layout returns no rows and is sent
to review by the collector rather than producing inferred market data.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from pypdf import PdfReader

PARSER_VERSION = "multi-layout-v2"
_WIDE_GAP = re.compile(r"\s{2,}")
_TICKER = re.compile(r"^[A-Z0-9]{4,6}$")
_NO_QUOTE = {"NC", "SP", "DIF", "-", "ND"}


@dataclass(frozen=True)
class BocQuote:
    ticker: str
    session_date: date
    close: Decimal
    previous_close: Decimal | None
    open: Decimal | None
    volume: int
    value_traded: Decimal | None
    page: int
    section: str
    raw_fields: tuple[str, ...]


def parse_money(value: str) -> Decimal | None:
    cleaned = value.strip().replace("\u202f", " ").replace("\xa0", " ")
    if cleaned.upper() in _NO_QUOTE or not cleaned:
        return None
    cleaned = cleaned.replace(" ", "").replace(",", ".")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def parse_integer(value: str) -> int | None:
    number = parse_money(value)
    if number is None or number != number.to_integral_value():
        return None
    return int(number)


def parse_classic_row(
    fields: list[str],
    *,
    session_date: date,
    page: int,
    known_tickers: set[str],
) -> BocQuote | None:
    """Parse the 2015-era BOC layout extracted with pypdf layout mode."""
    if len(fields) < 7 or fields[0] not in known_tickers or not _TICKER.fullmatch(fields[0]):
        return None
    ticker = fields[0]
    # Traded row:
    # ticker, title, volume, value, previous, open, close, average, ...
    volume = parse_integer(fields[2])
    value = parse_money(fields[3])
    previous = parse_money(fields[4])
    opened = parse_money(fields[5])
    close = parse_money(fields[6])
    if volume is not None and value is not None and previous is not None and close is not None:
        return BocQuote(
            ticker=ticker,
            session_date=session_date,
            close=close,
            previous_close=previous,
            open=opened,
            volume=volume,
            value_traded=value,
            page=page,
            section="MARCHE DES ACTIONS",
            raw_fields=tuple(fields),
        )

    # No-trade/suspended row:
    # ticker, title, previous, NC|SP, NC|SP, NC|SP, reference, ...
    previous = parse_money(fields[2])
    markers = {value.upper() for value in fields[3:6]}
    reference = parse_money(fields[6])
    if previous is not None and markers & _NO_QUOTE and reference is not None:
        return BocQuote(
            ticker=ticker,
            session_date=session_date,
            close=reference,
            previous_close=previous,
            open=None,
            volume=0,
            value_traded=Decimal(0),
            page=page,
            section="MARCHE DES ACTIONS",
            raw_fields=tuple(fields),
        )
    return None


def parse_semantic_row(
    fields: list[str],
    *,
    session_date: date,
    page: int,
    known_tickers: set[str],
) -> BocQuote | None:
    """Parse the semantic quote layout used from at least 2018 through 2025.

    From 2023 onward the row starts with a three-letter sector code. The
    financial fields retain the same order, so the prefix is removed first.
    """
    normalized = fields
    if (
        len(fields) >= 3
        and len(fields[0]) == 3
        and fields[0].isalpha()
        and fields[1] in known_tickers
    ):
        normalized = fields[1:]
    if (
        len(normalized) < 7
        or normalized[0] not in known_tickers
        or not _TICKER.fullmatch(normalized[0])
    ):
        return None

    ticker = normalized[0]
    previous = parse_money(normalized[2])
    opened = parse_money(normalized[3])
    close = parse_money(normalized[4])
    if previous is None:
        return None

    # Traded row:
    # ticker, title, previous, open, close, variation, volume, value, reference
    if close is not None and len(normalized) >= 9:
        volume = parse_integer(normalized[6])
        value = parse_money(normalized[7])
        reference = parse_money(normalized[8])
        if volume is None or value is None or reference is None:
            return None
        return BocQuote(
            ticker=ticker,
            session_date=session_date,
            close=close,
            previous_close=previous,
            open=opened,
            volume=volume,
            value_traded=value,
            page=page,
            section="MARCHE DES ACTIONS",
            raw_fields=tuple(fields),
        )

    # No-trade/suspended row omits volume and value:
    # ticker, title, previous, NC|SP, NC|SP, variation, reference, ...
    markers = {value.upper() for value in normalized[3:5]}
    reference = parse_money(normalized[6])
    if markers & _NO_QUOTE and reference is not None:
        return BocQuote(
            ticker=ticker,
            session_date=session_date,
            close=reference,
            previous_close=previous,
            open=None,
            volume=0,
            value_traded=Decimal(0),
            page=page,
            section="MARCHE DES ACTIONS",
            raw_fields=tuple(fields),
        )
    return None


def parse_boc_quotes(
    data: bytes,
    *,
    session_date: date,
    known_tickers: set[str],
) -> list[BocQuote]:
    """Parse supported BOC layouts and return unique ticker observations."""
    reader = PdfReader(io.BytesIO(data))
    parsed: dict[str, BocQuote] = {}
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text(extraction_mode="layout") or ""
        # Classic quote pages contain these semantic headers. This also avoids
        # parsing the order-book table later in the bulletin.
        normalized = text.upper().replace("É", "E")
        if "SEANCE DE COTATION" not in normalized or "COURS DU JOUR" not in normalized:
            continue
        for line in text.splitlines():
            fields = _WIDE_GAP.split(line.strip())
            kwargs = {
                "session_date": session_date,
                "page": page_number,
                "known_tickers": known_tickers,
            }
            row = parse_semantic_row(fields, **kwargs) or parse_classic_row(
                fields, **kwargs
            )
            if row is not None:
                parsed[row.ticker] = row
    return list(parsed.values())
