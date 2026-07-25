"""Dividend corporate actions from the official BRVM "Paiement de dividendes"
notices. These give the net dividend per share, the exercice (fiscal year) and
the détachement/paiement dates — authoritative, and cross-checkable against
RichBourse/Sikafinance later.

Company matching is by normalised name with a small alias table for the tricky
cases; unmatched notices are warned and skipped rather than mis-attributed.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date

from sqlalchemy import select

from ..config import get_settings
from ..logging import get_logger
from ..models import Company, Dividend, DividendStatus, Source
from ..parsers.brvm_html import parse_dividend_notices
from .base import CollectContext, Collector, CollectResult

log = get_logger("collector.dividends")

# Emetteur label (as shown on the BRVM notices) → our ticker. Keys are lightly
# normalised (accents/punctuation stripped, country words KEPT so TotalEnergies
# SN ≠ CI and Ecobank TG ≠ CI). Covers the emetteur codes seen on the notices
# page; unknown emetteurs fall through to ticker/name matching, then are skipped.
_ALIASES = {
    "sogb": "SOGC", "lnb": "LNBB", "biic": "BICB", "sib": "SIBC",
    "cie ci": "CIEC", "cie": "CIEC", "eci": "CIEC",
    "ecobank tg": "ETIT", "ecobank togo": "ETIT", "eti": "ETIT",
    "ecobank ci": "ECOC",
    "total senegal": "TTLS", "total sn": "TTLS", "totalenergies senegal": "TTLS",
    "total ci": "TTLC", "totalenergies ci": "TTLC",
    "servair abidjan ci": "ABJC", "servair abidjan": "ABJC", "servair": "ABJC",
    "sgci": "SGBC", "sgbci": "SGBC", "societe generale ci": "SGBC",
    "bicici": "BICC", "bici ci": "BICC",
    "sodeci": "SDCC", "sode ci": "SDCC",
    "vivo energy": "SHEC", "vivo energy ci": "SHEC",
    "cfao motors": "CFAC", "tractafric motors": "PRSC", "smb": "SMBC",
    "sitab": "STBC", "nestle ci": "NTLC", "nestle": "NTLC", "nei ceda": "NEIC",
    "nsia banque": "NSBC", "agl": "SDSC", "africa global logistics": "SDSC",
    "coris bank": "CBIBF", "oragroup": "ORGT", "onatel": "ONTBF",
    "sonatel": "SNTS", "orange ci": "ORAC",
    "boa benin": "BOAB", "boa burkina": "BOABF", "boa burkina faso": "BOABF",
    "boa ci": "BOAC", "boa cote d ivoire": "BOAC", "boa mali": "BOAM",
    "boa niger": "BOAN", "boa senegal": "BOAS",
    "solibra": "SLBC", "saph": "SPHC", "palmci": "PALC", "palm ci": "PALC",
    "sucrivoire": "SCRC", "filtisac": "FTSC", "sicable": "CABC", "uniwax": "UNXC",
    "unilever ci": "UNLC", "setao": "STAC", "sicor": "SICC", "bernabe": "BNBC",
    "safca": "SAFC",
}


def _norm(text: str) -> str:
    """Light normalisation: strip accents, drop 'S.A.', collapse to words —
    but KEEP country words so subsidiaries stay distinguishable."""
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode().lower()
    text = re.sub(r"\bs\.?\s?a\.?\b", " ", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


class BrvmDividendsCollector(Collector):
    name = "brvm_dividends"

    def __init__(self) -> None:
        self.base = get_settings().brvm_base_url

    @property
    def url(self) -> str:
        return f"{self.base}/fr/esv/paiement-de-dividendes"

    def _index(self, ctx: CollectContext) -> tuple[dict[str, Company], dict[str, Company]]:
        by_ticker: dict[str, Company] = {}
        by_name: dict[str, Company] = {}
        for c in ctx.session.execute(select(Company)).scalars():
            by_ticker[c.ticker.upper()] = c
            by_name[_norm(c.name)] = c
            if c.short_name:
                by_name.setdefault(_norm(c.short_name), c)
        return by_ticker, by_name

    def _match(
        self, notice_name: str, by_ticker: dict[str, Company], by_name: dict[str, Company]
    ) -> Company | None:
        key = _norm(notice_name)
        if key in _ALIASES:
            return by_ticker.get(_ALIASES[key])
        # Emetteur shown as a ticker (e.g. NSBC, BOABF).
        up = re.sub(r"[^A-Z0-9]", "", notice_name.upper())
        if up in by_ticker:
            return by_ticker[up]
        return by_name.get(key)

    def collect(self, ctx: CollectContext) -> CollectResult:
        res = CollectResult(collector=self.name)
        html = ctx.client.get_text(self.url)
        notices = parse_dividend_notices(html)
        if not notices:
            res.warnings.append("no dividend notices parsed")
            log.warning("no_dividend_notices", url=self.url)
            return res

        by_ticker, by_name = self._index(ctx)
        today = date.today()

        for n in notices:
            company = self._match(n.company, by_ticker, by_name)
            if company is None or n.fiscal_year is None:
                res.warnings.append(f"unmatched dividend notice: {n.company!r}")
                res.skipped += 1
                continue

            status = (
                DividendStatus.PAID.value
                if n.payment_date and n.payment_date <= today
                else DividendStatus.APPROVED.value
            )
            # One dividend per company per exercice on the BRVM: match on
            # (company, fiscal_year) so the authoritative notice supersedes a
            # seeded/synthesized row rather than creating a duplicate.
            existing = ctx.session.execute(
                select(Dividend)
                .where(
                    Dividend.company_id == company.id,
                    Dividend.fiscal_year == n.fiscal_year,
                )
                .order_by(Dividend.id)
            ).scalars().first()

            if existing is None:
                ctx.session.add(
                    Dividend(
                        company_id=company.id,
                        fiscal_year=n.fiscal_year,
                        amount_net=n.amount,
                        ex_date=n.ex_date,
                        payment_date=n.payment_date,
                        status=status,
                        source=Source.BRVM.value,
                        source_url=self.url,
                        ingestion_run_id=ctx.run_id,
                    )
                )
                res.inserted += 1
            else:
                existing.amount_net = n.amount or existing.amount_net
                existing.ex_date = n.ex_date or existing.ex_date
                existing.payment_date = n.payment_date or existing.payment_date
                existing.status = status
                existing.source = Source.BRVM.value
                existing.source_url = self.url
                res.updated += 1

        log.info("dividends_collected", inserted=res.inserted, updated=res.updated, skipped=res.skipped)
        return res
