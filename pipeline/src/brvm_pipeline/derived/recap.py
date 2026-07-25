"""Build the verified daily Market Map (recap) from stored, quality-checked
data. Every figure is derived from the day's quotes + the BRVM Composite level,
and linked to the BOC bulletin document for traceability. The recap is only
marked ``published`` when the day's quality checks passed.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..logging import get_logger
from ..models import Company, DailyQuote, DocType, Document, IndexValue, MarketRecap

log = get_logger("recap")


def build_recap(session: Session, as_of: date, *, quality_passed: bool) -> MarketRecap:
    quotes = list(
        session.execute(select(DailyQuote).where(DailyQuote.date == as_of)).scalars()
    )
    tickers = {c.id: c.ticker for c in session.execute(select(Company)).scalars()}

    advancers = decliners = unchanged = 0
    moves: list[tuple[str, Decimal]] = []
    actives: list[tuple[str, Decimal]] = []
    for q in quotes:
        ticker = tickers.get(q.company_id, str(q.company_id))
        if q.previous_close and q.previous_close > 0:
            chg = (q.close - q.previous_close) / q.previous_close
            moves.append((ticker, chg))
            if chg > 0:
                advancers += 1
            elif chg < 0:
                decliners += 1
            else:
                unchanged += 1
        value = q.value_traded or (Decimal(q.volume) * q.close if q.volume else Decimal(0))
        actives.append((ticker, value))

    top_movers = [
        {"ticker": t, "change_pct": float(round(c * 100, 2))}
        for t, c in sorted(moves, key=lambda x: abs(x[1]), reverse=True)[:5]
    ]
    most_active = [
        {"ticker": t, "value_traded": float(v)}
        for t, v in sorted(actives, key=lambda x: x[1], reverse=True)[:5]
    ]

    composite = session.execute(
        select(IndexValue).where(
            IndexValue.index_code == "BRVM_COMPOSITE", IndexValue.date == as_of
        )
    ).scalar_one_or_none()

    boc = session.execute(
        select(Document.id)
        .where(Document.doc_type == DocType.BOC_BULLETIN.value, Document.publication_date == as_of)
        .limit(1)
    ).scalar_one_or_none()

    recap = session.get(MarketRecap, as_of) or MarketRecap(date=as_of)
    recap.composite_value = composite.value if composite else None
    recap.composite_change_pct = composite.change_pct if composite else None
    recap.advancers = advancers
    recap.decliners = decliners
    recap.unchanged = unchanged
    recap.top_movers = top_movers
    recap.most_active = most_active
    recap.boc_document_id = boc
    recap.quality_passed = quality_passed
    # A "verified" recap must pass QA and be traceable to the official BOC for
    # the same session. Missing provenance leaves the row available for a later
    # idempotent rebuild, but it is never exposed by the API.
    recap.published = quality_passed and boc is not None
    if recap not in session:
        session.add(recap)

    log.info(
        "recap_built",
        date=as_of.isoformat(),
        advancers=advancers,
        decliners=decliners,
        unchanged=unchanged,
        published=recap.published,
    )
    return recap
