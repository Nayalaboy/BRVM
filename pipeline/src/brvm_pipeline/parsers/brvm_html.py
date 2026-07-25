"""Pure parsers for brvm.org server-rendered HTML (no I/O → unit-testable).

The BRVM "Cours des actions" page is a plain Drupal HTML table:
    Symbole | Nom | Volume | Cours veille | Cours Ouverture | Cours Clôture | Variation
Numbers use a space thousands separator (incl. NBSP/thin space) and a comma
decimal. Session date is in <p class="header-seance">…</p>. This structure was
verified live against both the FR and EN pages.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from bs4 import BeautifulSoup

_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
    "juillet": 7, "août": 8, "aout": 8, "septembre": 9, "octobre": 10, "novembre": 11,
    "décembre": 12, "decembre": 12,
}

# Strip whitespace (incl. NBSP / thin / narrow-NBSP that BRVM uses as
# thousands separators) and percent signs before parsing a number.
_NUM_CLEAN = re.compile(r"[\s%]")


@dataclass(frozen=True)
class QuoteRow:
    ticker: str
    name: str
    volume: int | None
    previous: Decimal | None
    open: Decimal | None
    close: Decimal
    change_pct: Decimal | None


@dataclass(frozen=True)
class IndexRow:
    name: str
    value: Decimal
    change_pct: Decimal | None


@dataclass(frozen=True)
class DividendNoticeRow:
    company: str
    fiscal_year: int | None
    amount: Decimal | None
    ex_date: date | None
    payment_date: date | None


def parse_number(text: str) -> Decimal | None:
    cleaned = _NUM_CLEAN.sub("", (text or "").strip()).replace(",", ".")
    if cleaned in ("", "-", "—"):
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _to_int(d: Decimal | None) -> int | None:
    return int(d) if d is not None else None


def parse_session_date(html: str) -> date | None:
    """Extract the session date from <p class="header-seance">…</p>."""
    soup = BeautifulSoup(html, "lxml")
    el = soup.select_one(".header-seance")
    if not el:
        return None
    m = re.search(r"(\d{1,2})\s+([A-Za-zûéèôàî]+),?\s+(\d{4})", el.get_text(" ", strip=True))
    if not m:
        return None
    day, month_name, year = int(m.group(1)), m.group(2).lower(), int(m.group(3))
    month = _MONTHS.get(month_name)
    return date(year, month, day) if month else None


def _looks_like_ticker(text: str) -> bool:
    return bool(re.fullmatch(r"[A-Z]{2,6}", text.strip()))


def parse_quotes(html: str) -> list[QuoteRow]:
    """Parse the equities quote table (Symbole … Cours Clôture)."""
    soup = BeautifulSoup(html, "lxml")
    table = _find_table(soup, must_have=("symbol", "symbole"), and_have=("closing", "clôture", "cloture"))
    if table is None:
        return []

    rows: list[QuoteRow] = []
    body = table.find("tbody") or table
    for tr in body.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) < 6 or not _looks_like_ticker(cells[0]):
            continue
        close = parse_number(cells[5])
        if close is None:
            continue
        rows.append(
            QuoteRow(
                ticker=cells[0].upper(),
                name=cells[1],
                volume=_to_int(parse_number(cells[2])),
                previous=parse_number(cells[3]),
                open=parse_number(cells[4]),
                close=close,
                change_pct=parse_number(cells[6]) if len(cells) > 6 else None,
            )
        )
    return rows


def parse_indices(html: str) -> list[IndexRow]:
    """Parse the BRVM indices tables.

    Real columns (verified live): Nom | Fermeture précédente | Fermeture |
    Variation (%) | Variation 31 décembre (%). The *current* level is the
    "Fermeture" column (not "Fermeture précédente"), and change is the first
    "Variation (%)". Columns are located by header so a reordering won't break
    us; positional fallbacks (2, 3) are used if headers are missing. There are
    several such tables (main indices + sector indices); all are parsed, with
    de-duplication by name.
    """
    soup = BeautifulSoup(html, "lxml")
    out: list[IndexRow] = []
    seen: set[str] = set()
    for table in soup.find_all("table"):
        headers = [
            th.get_text(" ", strip=True).lower()
            for th in (table.find("thead") or table).find_all("th")
        ]
        if not headers or "nom" not in headers[0] or not any("fermeture" in h for h in headers):
            continue

        close_idx = next((i for i, h in enumerate(headers) if h.strip() == "fermeture"), 2)
        var_idx = next(
            (
                i
                for i, h in enumerate(headers)
                if "variation" in h and "%" in h and "décembre" not in h and "31" not in h
            ),
            3,
        )
        body = table.find("tbody") or table
        for tr in body.find_all("tr"):
            cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
            if len(cells) <= close_idx or not cells[0] or cells[0] in seen:
                continue
            value = parse_number(cells[close_idx])
            if value is None:
                continue
            seen.add(cells[0])
            change = parse_number(cells[var_idx]) if var_idx < len(cells) else None
            out.append(IndexRow(name=cells[0], value=value, change_pct=change))
    return out


def parse_dividend_notices(html: str) -> list[DividendNoticeRow]:
    """Parse the "Paiement de dividendes" notices table.

    Real columns (verified live): Emetteur | Obligation | Action | Exercice
    comptable | Date de paiement | Date ex-dividende | Montant du dividende net
    | Avis. Dates are French ("6 août 2026"); the amount is like "570 FCFA".
    Columns are located by header so a reordering won't break us; bond-only
    rows (no net amount) are skipped.
    """
    soup = BeautifulSoup(html, "lxml")
    table = _find_table(soup, must_have=("emetteur", "émetteur"), and_have=("dividende",))
    if table is None:
        return []

    headers = [
        th.get_text(" ", strip=True).lower()
        for th in (table.find("thead") or table).find_all("th")
    ]

    def col(*keywords: str, default: int | None = None) -> int | None:
        for i, h in enumerate(headers):
            if all(k in h for k in keywords):
                return i
        return default

    i_emetteur = col("emetteur") or col("émetteur") or 0
    i_exercice = col("exercice")
    i_net = col("montant", "net")
    i_ex = col("ex-dividende") or col("ex", "dividende") or col("détachement")
    i_pay = col("paiement")

    out: list[DividendNoticeRow] = []
    body = table.find("tbody") or table
    for tr in body.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if not cells:
            continue
        company = cells[i_emetteur].strip()
        amount = _cell_number(cells, i_net)
        if not company or amount is None:
            continue  # header row or bond-only line
        out.append(
            DividendNoticeRow(
                company=company,
                fiscal_year=_cell_year(cells, i_exercice),
                amount=amount,
                ex_date=_cell_date(cells, i_ex),
                payment_date=_cell_date(cells, i_pay),
            )
        )
    return out


# --- helpers ---------------------------------------------------------------


def _header_text(table) -> str:  # noqa: ANN001
    thead = table.find("thead")
    scope = thead or table
    return " ".join(th.get_text(" ", strip=True) for th in scope.find_all("th")).lower()


def _find_table(soup, must_have: tuple[str, ...], and_have: tuple[str, ...]):  # noqa: ANN001
    for table in soup.find_all("table"):
        header = _header_text(table)
        if any(m in header for m in must_have) and any(a in header for a in and_have):
            return table
    return None


def _parse_slash_date(text: str) -> date | None:
    m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", text or "")
    if not m:
        return None
    d, mo, y = (int(g) for g in m.groups())
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def parse_french_date(text: str) -> date | None:
    """'6 août 2026' / '31 juillet 2026' → date; falls back to dd/mm/yyyy."""
    m = re.search(r"(\d{1,2})\s+([A-Za-zûéèôàîÀ-ÿ]+)\.?\s+(\d{4})", text or "")
    if not m:
        return _parse_slash_date(text)
    day, month = int(m.group(1)), _MONTHS.get(m.group(2).lower())
    if not month:
        return None
    try:
        return date(int(m.group(3)), month, day)
    except ValueError:
        return None


def _cell_number(cells: list[str], idx: int | None) -> Decimal | None:
    if idx is None or idx >= len(cells):
        return None
    # Strip letters ("FCFA") so the numeric token remains, then parse.
    return parse_number(re.sub(r"[A-Za-zÀ-ÿ]", "", cells[idx]))


def _cell_year(cells: list[str], idx: int | None) -> int | None:
    n = _cell_number(cells, idx)
    return int(n) if n is not None else None


def _cell_date(cells: list[str], idx: int | None) -> date | None:
    if idx is None or idx >= len(cells):
        return None
    return parse_french_date(cells[idx])
