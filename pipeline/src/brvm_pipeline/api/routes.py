"""Read-only endpoints consumed by the website. All responses are plain JSON
(Decimals → float, dates → ISO) with ETag caching.
"""

from __future__ import annotations

import unicodedata
from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from difflib import SequenceMatcher

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_session_factory
from ..models import (
    Company,
    CompanyMetric,
    DailyQuote,
    Dividend,
    Document,
    GovDocument,
    IndexValue,
    IngestionRun,
    LicensedEntity,
    MarketEvent,
    MarketEventCompany,
    MarketRecap,
    PrimaryOperation,
    RunStatus,
)
from .cache import etag_json

router = APIRouter()


def get_db() -> Iterator[Session]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def _f(v: Decimal | None) -> float | None:
    return float(v) if v is not None else None


def _iso(d: date | None) -> str | None:
    return d.isoformat() if d is not None else None


def _normalise(text: str) -> str:
    folded = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return " ".join("".join(c if c.isalnum() else " " for c in folded.lower()).split())


# --- Companies --------------------------------------------------------------


@router.get("/companies")
def list_companies(request: Request, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Company, CompanyMetric)
        .outerjoin(CompanyMetric, CompanyMetric.company_id == Company.id)
        .order_by(Company.ticker)
    ).all()
    payload = [
        {
            "ticker": c.ticker,
            "name": c.name,
            "sector": c.sector,
            "country": c.country,
            "currency": c.currency,
            "shares_outstanding": c.shares_outstanding,
            "last_close": _f(m.last_close) if m else None,
            "as_of_date": _iso(m.as_of_date) if m else None,
            "market_cap": _f(m.last_close * c.shares_outstanding)
            if m and m.last_close is not None and c.shares_outstanding
            else None,
            "dividend_yield": _f(m.trailing_dividend_yield) if m else None,
            "high_52w": _f(m.high_52w) if m else None,
            "low_52w": _f(m.low_52w) if m else None,
            "ytd_return": _f(m.ytd_return) if m else None,
        }
        for c, m in rows
    ]
    return etag_json(request, payload)


@router.get("/companies/{ticker}")
def company_detail(ticker: str, request: Request, db: Session = Depends(get_db)):
    company = db.execute(select(Company).where(Company.ticker == ticker.upper())).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="company not found")

    metric = db.get(CompanyMetric, company.id)
    last = db.execute(
        select(DailyQuote)
        .where(DailyQuote.company_id == company.id)
        .order_by(DailyQuote.date.desc())
        .limit(1)
    ).scalar_one_or_none()
    dividends = (
        db.execute(
            select(Dividend).where(Dividend.company_id == company.id).order_by(Dividend.fiscal_year.desc())
        )
        .scalars()
        .all()
    )
    peers = (
        db.execute(
            select(Company, CompanyMetric)
            .join(CompanyMetric, CompanyMetric.company_id == Company.id)
            .where(Company.sector == company.sector, Company.id != company.id)
            .order_by(CompanyMetric.avg_daily_value_20d.desc().nullslast())
            .limit(5)
        ).all()
        if company.sector
        else []
    )
    first_1y = (
        db.execute(
            select(DailyQuote)
            .where(
                DailyQuote.company_id == company.id,
                DailyQuote.date >= last.date - timedelta(days=365),
                DailyQuote.date <= last.date,
            )
            .order_by(DailyQuote.date.asc())
            .limit(1)
        ).scalar_one_or_none()
        if last
        else None
    )
    dividends_1y = (
        sum(
            (
                d.amount_net if d.amount_net is not None else d.amount_gross
                for d in dividends
                if d.ex_date
                and first_1y
                and first_1y.date <= d.ex_date <= last.date
                and (d.amount_net is not None or d.amount_gross is not None)
            ),
            Decimal(0),
        )
        if last and first_1y
        else Decimal(0)
    )
    price_return_1y = (
        (last.close - first_1y.close) / first_1y.close if last and first_1y and first_1y.close > 0 else None
    )
    total_return_1y = (
        (last.close - first_1y.close + dividends_1y) / first_1y.close
        if last and first_1y and first_1y.close > 0
        else None
    )
    paid_years = {d.fiscal_year for d in dividends if d.amount_net is not None or d.amount_gross is not None}
    latest_year = max(paid_years) if paid_years else None
    dividend_streak = 0
    while latest_year is not None and latest_year - dividend_streak in paid_years:
        dividend_streak += 1
    recent_events = _reviewed_events_query(db, ticker=company.ticker, limit=10)

    payload = {
        "ticker": company.ticker,
        "name": company.name,
        "sector": company.sector,
        "country": company.country,
        "currency": company.currency,
        "shares_outstanding": company.shares_outstanding,
        "description_fr": company.description_fr,
        "description_en": company.description_en,
        "last_close": _f(last.close) if last else None,
        "last_quote_date": _iso(last.date) if last else None,
        "source": last.source if last else None,
        "market_cap": _f(last.close * company.shares_outstanding)
        if last and company.shares_outstanding
        else None,
        "price_return_1y": _f(price_return_1y),
        "total_return_1y": _f(total_return_1y),
        "dividend_streak_years": dividend_streak,
        "metrics": None
        if metric is None
        else {
            "dividend_yield": _f(metric.trailing_dividend_yield),
            "high_52w": _f(metric.high_52w),
            "low_52w": _f(metric.low_52w),
            "ytd_return": _f(metric.ytd_return),
            "avg_daily_volume_20d": _f(metric.avg_daily_volume_20d),
            "avg_daily_value_20d": _f(metric.avg_daily_value_20d),
        },
        "dividends": [
            {
                "fiscal_year": d.fiscal_year,
                "amount_net": _f(d.amount_net),
                "amount_gross": _f(d.amount_gross),
                "ex_date": _iso(d.ex_date),
                "payment_date": _iso(d.payment_date),
                "status": d.status,
                "source": d.source,
                "source_url": d.source_url,
            }
            for d in dividends
        ],
        "peers": [
            {
                "ticker": peer.ticker,
                "name": peer.name,
                "last_close": _f(peer_metric.last_close),
                "dividend_yield": _f(peer_metric.trailing_dividend_yield),
                "ytd_return": _f(peer_metric.ytd_return),
                "avg_daily_value_20d": _f(peer_metric.avg_daily_value_20d),
            }
            for peer, peer_metric in peers
        ],
        "events": recent_events,
    }
    return etag_json(request, payload)


def _reviewed_events_query(
    db: Session,
    *,
    country: str | None = None,
    ticker: str | None = None,
    limit: int = 50,
) -> list[dict]:
    stmt = (
        select(MarketEvent, GovDocument)
        .join(GovDocument, GovDocument.id == MarketEvent.gov_document_id)
        .where(MarketEvent.review_status == "reviewed")
        .order_by(MarketEvent.event_date.desc(), MarketEvent.id.desc())
        .limit(limit)
    )
    if country:
        stmt = stmt.where(GovDocument.source_country == country.upper())
    if ticker:
        company_id = db.scalar(
            select(Company.id).where(Company.ticker == ticker.upper())
        )
        if company_id is None:
            return []
        stmt = stmt.join(
            MarketEventCompany,
            MarketEventCompany.event_id == MarketEvent.id,
        ).where(MarketEventCompany.company_id == company_id)
    rows = db.execute(stmt).all()
    payload = []
    for event, document in rows:
        affected = db.execute(
            select(Company.ticker)
            .join(MarketEventCompany, MarketEventCompany.company_id == Company.id)
            .where(MarketEventCompany.event_id == event.id)
            .order_by(Company.ticker)
        ).scalars().all()
        payload.append(
            {
                "id": event.id,
                "date": _iso(event.event_date),
                "event_type": event.event_type,
                "summary_fr": event.summary_fr,
                "summary_en": event.summary_en,
                "country": document.source_country,
                "body": document.body,
                "tickers": list(affected),
                "source_title": document.title,
                "source_url": document.official_source_url,
                "document_ref": f"GOV-{document.id}",
                "review_status": event.review_status,
            }
        )
    return payload


@router.get("/events")
def events_feed(
    request: Request,
    country: str | None = Query(None, min_length=2, max_length=12),
    ticker: str | None = Query(None, min_length=2, max_length=20),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Reviewed, factual official events. Pending documents are never returned."""
    return etag_json(
        request,
        _reviewed_events_query(db, country=country, ticker=ticker, limit=limit),
        max_age=300,
    )


@router.get("/quotes/{ticker}")
def quotes(
    ticker: str,
    request: Request,
    limit: int = Query(260, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    company = db.execute(select(Company).where(Company.ticker == ticker.upper())).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="company not found")
    rows = (
        db.execute(
            select(DailyQuote)
            .where(DailyQuote.company_id == company.id)
            .order_by(DailyQuote.date.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    payload = [
        {
            "date": _iso(q.date),
            "open": _f(q.open),
            "high": _f(q.high),
            "low": _f(q.low),
            "close": _f(q.close),
            "volume": q.volume,
        }
        for q in reversed(rows)  # chronological for charts
    ]
    return etag_json(request, payload)


# --- Dividends --------------------------------------------------------------


@router.get("/dividends/calendar")
def dividend_calendar(request: Request, db: Session = Depends(get_db)):
    today = date.today()

    def rows(upcoming: bool):
        cond = Dividend.ex_date >= today if upcoming else Dividend.ex_date < today
        order = Dividend.ex_date.asc() if upcoming else Dividend.ex_date.desc()
        res = db.execute(
            select(Dividend, Company, CompanyMetric)
            .join(Company, Company.id == Dividend.company_id)
            .outerjoin(CompanyMetric, CompanyMetric.company_id == Company.id)
            .where(Dividend.ex_date.is_not(None), cond)
            .order_by(order)
            .limit(200)
        ).all()
        out = []
        for d, c, m in res:
            amount = d.amount_net if d.amount_net is not None else d.amount_gross
            last_close = m.last_close if m else None
            out.append(
                {
                    "ticker": c.ticker,
                    "company": c.name,
                    "sector": c.sector,
                    "country": c.country,
                    "fiscal_year": d.fiscal_year,
                    "amount": _f(amount),
                    "yield": _f(amount / last_close) if (amount and last_close) else None,
                    "ex_date": _iso(d.ex_date),
                    "payment_date": _iso(d.payment_date),
                    "status": d.status,
                    "source": d.source,
                    "source_url": d.source_url,
                    "price_as_of": _iso(m.as_of_date) if m else None,
                }
            )
        return out

    return etag_json(request, {"upcoming": rows(True), "past": rows(False)})


# --- Market -----------------------------------------------------------------


@router.get("/movers")
def movers(request: Request, db: Session = Depends(get_db)):
    as_of = db.execute(select(func.max(DailyQuote.date))).scalar_one_or_none()
    if as_of is None:
        return etag_json(request, {"date": None, "gainers": [], "losers": [], "most_active": []})
    rows = db.execute(
        select(DailyQuote, Company)
        .join(Company, Company.id == DailyQuote.company_id)
        .where(DailyQuote.date == as_of)
    ).all()
    moves = []
    for q, c in rows:
        if q.previous_close and q.previous_close > 0:
            chg = float((q.close - q.previous_close) / q.previous_close * 100)
            value = q.value_traded or (Decimal(q.volume) * q.close if q.volume else Decimal(0))
            moves.append(
                {
                    "ticker": c.ticker,
                    "close": _f(q.close),
                    "change_pct": round(chg, 2),
                    "value_traded": _f(value),
                }
            )
    gainers = sorted(moves, key=lambda m: m["change_pct"], reverse=True)[:5]
    losers = sorted(moves, key=lambda m: m["change_pct"])[:5]
    active = sorted(moves, key=lambda m: m["value_traded"] or 0, reverse=True)[:5]
    return etag_json(
        request,
        {"date": _iso(as_of), "gainers": gainers, "losers": losers, "most_active": active},
    )


@router.get("/indices")
def indices(request: Request, db: Session = Depends(get_db)):
    as_of = db.execute(select(func.max(IndexValue.date))).scalar_one_or_none()
    rows = db.execute(select(IndexValue).where(IndexValue.date == as_of)).scalars().all() if as_of else []
    payload = {
        "date": _iso(as_of),
        "indices": [
            {"code": i.index_code, "value": _f(i.value), "change_pct": _f(i.change_pct)} for i in rows
        ],
    }
    return etag_json(request, payload)


@router.get("/recap/{recap_date}")
def recap(recap_date: date, request: Request, db: Session = Depends(get_db)):
    r = db.get(MarketRecap, recap_date)
    if r is None or not r.published:
        raise HTTPException(status_code=404, detail="no published recap for this date")
    boc = db.get(Document, r.boc_document_id) if r.boc_document_id else None
    active_tickers = set(db.execute(select(Company.ticker).where(Company.is_active)).scalars())
    quoted_tickers = set(
        db.execute(
            select(Company.ticker)
            .join(DailyQuote, DailyQuote.company_id == Company.id)
            .where(DailyQuote.date == recap_date)
        ).scalars()
    )
    non_traded = sorted(active_tickers - quoted_tickers)
    total_moves = (r.advancers or 0) + (r.decliners or 0) + (r.unchanged or 0)
    payload = {
        "date": _iso(r.date),
        "composite_value": _f(r.composite_value),
        "composite_change_pct": _f(r.composite_change_pct),
        "advancers": r.advancers,
        "decliners": r.decliners,
        "unchanged": r.unchanged,
        "top_movers": r.top_movers,
        "most_active": r.most_active,
        "source": "BOC",
        "source_url": boc.source_url if boc else None,
        "quality_passed": r.quality_passed,
        "non_traded": non_traded,
        "coverage_pct": round(len(quoted_tickers) / len(active_tickers) * 100, 1) if active_tickers else 0,
        "breadth_ratio": round((r.advancers or 0) / total_moves, 4) if total_moves else None,
    }
    return etag_json(request, payload, max_age=3600)


# --- Primary market & registry ---------------------------------------------


@router.get("/operations")
def operations(request: Request, db: Session = Depends(get_db)):
    rows = (
        db.execute(select(PrimaryOperation).order_by(PrimaryOperation.open_date.desc().nullslast()))
        .scalars()
        .all()
    )
    payload = [
        {
            "id": o.id,
            "issuer": o.issuer_name,
            "type": o.operation_type,
            "title": o.title,
            "status": o.status,
            "open_date": _iso(o.open_date),
            "close_date": _iso(o.close_date),
            "price_min": _f(o.price_min),
            "price_max": _f(o.price_max),
            "min_subscription": _f(o.min_subscription),
            "tranches": o.tranches,
            "eligibility_notes_fr": o.eligibility_notes_fr,
            "sgi_lead": o.sgi_lead,
            "notice_url": o.notice_url,
            "source_url": o.source_url,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
        }
        for o in rows
    ]
    return etag_json(request, payload)


@router.get("/verifier")
def verifier(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100),
    country: str | None = Query(None, max_length=80),
    db: Session = Depends(get_db),
):
    query = _normalise(q)
    candidates = db.execute(select(LicensedEntity)).scalars().all()
    if country:
        country_key = _normalise(country)
        candidates = [e for e in candidates if _normalise(e.country or "") == country_key]

    ranked: list[tuple[float, LicensedEntity]] = []
    for entity in candidates:
        fields = [_normalise(entity.name), _normalise(entity.approval_number or "")]
        contains = any(query in field for field in fields)
        similarity = max(SequenceMatcher(None, query, field).ratio() for field in fields)
        if contains or similarity >= 0.58:
            ranked.append((1.0 if contains else similarity, entity))
    rows = [entity for _, entity in sorted(ranked, key=lambda item: (-item[0], item[1].name))[:20]]
    payload = {
        "query": q,
        "found": len(rows) > 0,
        "results": [
            {
                "name": e.name,
                "entity_type": e.entity_type,
                "country": e.country,
                "approval_number": e.approval_number,
                "status": e.status,
                "source_url": e.source_url,
                "refreshed_at": e.registry_refreshed_at.isoformat() if e.registry_refreshed_at else None,
            }
            for e in rows
        ],
        "note": (
            "Registre indicatif. Vérifiez toujours auprès du CREPMF. "
            "L'absence de résultat ne signifie pas qu'une société n'est pas agréée."
        ),
    }
    return etag_json(request, payload)


@router.get("/status")
def data_status(request: Request, db: Session = Depends(get_db)):
    latest_quote = db.execute(select(func.max(DailyQuote.date))).scalar_one_or_none()
    latest_index = db.execute(select(func.max(IndexValue.date))).scalar_one_or_none()
    latest_registry = db.execute(select(func.max(LicensedEntity.registry_refreshed_at))).scalar_one_or_none()
    latest_success = db.execute(
        select(IngestionRun)
        .where(IngestionRun.status == RunStatus.SUCCESS.value)
        .order_by(IngestionRun.finished_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    active_count = db.scalar(select(func.count()).select_from(Company).where(Company.is_active))
    quoted_count = (
        db.scalar(select(func.count()).select_from(DailyQuote).where(DailyQuote.date == latest_quote))
        if latest_quote
        else 0
    )
    payload = {
        "generated_at": datetime.now(UTC).isoformat(),
        "latest_quote_date": _iso(latest_quote),
        "latest_index_date": _iso(latest_index),
        "latest_registry_refresh": latest_registry.isoformat() if latest_registry else None,
        "last_successful_run": latest_success.finished_at.isoformat()
        if latest_success and latest_success.finished_at
        else None,
        "active_companies": active_count or 0,
        "quoted_companies": quoted_count or 0,
        "coverage_pct": round((quoted_count or 0) / active_count * 100, 1) if active_count else 0,
        "status": "healthy"
        if latest_quote and active_count and (quoted_count or 0) >= active_count - 2
        else "degraded",
    }
    return etag_json(request, payload, max_age=60)


@router.get("/intelligence")
def intelligence_feed(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Factual market signals with explicit provenance.

    This endpoint deliberately describes observable events only. It never
    assigns buy/sell labels, predicts prices, or invents explanations.
    """
    items: list[dict] = []
    latest_quote = db.execute(select(func.max(DailyQuote.date))).scalar_one_or_none()

    if latest_quote:
        quotes = db.execute(
            select(DailyQuote, Company, CompanyMetric)
            .join(Company, Company.id == DailyQuote.company_id)
            .outerjoin(CompanyMetric, CompanyMetric.company_id == Company.id)
            .where(DailyQuote.date == latest_quote)
        ).all()
        changes: list[tuple[Decimal, DailyQuote, Company]] = []
        for quote, company, metric in quotes:
            if quote.previous_close and quote.previous_close > 0:
                change = (quote.close - quote.previous_close) / quote.previous_close * 100
                changes.append((change, quote, company))
            if (
                quote.volume is not None
                and metric
                and metric.avg_daily_volume_20d
                and metric.avg_daily_volume_20d > 0
                and Decimal(quote.volume) >= metric.avg_daily_volume_20d * Decimal("2.5")
            ):
                multiple = Decimal(quote.volume) / metric.avg_daily_volume_20d
                items.append(
                    _signal(
                        signal_id=f"volume-{latest_quote}-{company.ticker}",
                        kind="unusual_volume",
                        event_date=latest_quote,
                        ticker=company.ticker,
                        title_fr=f"Volume inhabituel sur {company.ticker}",
                        title_en=f"Unusual volume in {company.ticker}",
                        summary_fr=(
                            f"{quote.volume:,} titres échangés, soit {multiple:.1f}× "
                            "la moyenne des 20 dernières séances."
                        ),
                        summary_en=(
                            f"{quote.volume:,} securities traded, {multiple:.1f}× "
                            "the trailing 20-session average."
                        ),
                        source="BRVM",
                        source_url="https://www.brvm.org/fr/cours-actions/0",
                        importance="important",
                    )
                )

        for change, quote, company in sorted(changes, key=lambda row: abs(row[0]), reverse=True)[:8]:
            direction_fr = "progressé" if change >= 0 else "reculé"
            direction_en = "advanced" if change >= 0 else "declined"
            items.append(
                _signal(
                    signal_id=f"move-{latest_quote}-{company.ticker}",
                    kind="market_move",
                    event_date=latest_quote,
                    ticker=company.ticker,
                    title_fr=f"{company.ticker} : {change:+.2f} % sur la séance",
                    title_en=f"{company.ticker}: {change:+.2f}% in the session",
                    summary_fr=(
                        f"Le titre a {direction_fr} de {change:+.2f} % et clôturé "
                        f"à {_f(quote.close):,.0f} FCFA."
                    ),
                    summary_en=(
                        f"The security {direction_en} {change:+.2f}% and closed "
                        f"at {_f(quote.close):,.0f} FCFA."
                    ),
                    source="BRVM",
                    source_url="https://www.brvm.org/fr/cours-actions/0",
                    importance="important" if abs(change) >= 3 else "normal",
                )
            )

    today = date.today()
    dividend_cutoff = today - timedelta(days=45)
    dividends = db.execute(
        select(Dividend, Company)
        .join(Company, Company.id == Dividend.company_id)
        .where(
            Dividend.ex_date.is_not(None),
            Dividend.ex_date >= dividend_cutoff,
            Dividend.ex_date <= today + timedelta(days=60),
        )
        .order_by(Dividend.ex_date.asc())
        .limit(18)
    ).all()
    for dividend, company in dividends:
        amount = dividend.amount_net if dividend.amount_net is not None else dividend.amount_gross
        amount_label = f"{_f(amount):,.2f}" if amount is not None else "—"
        timing_fr = "à venir" if dividend.ex_date and dividend.ex_date >= today else "récent"
        timing_en = "upcoming" if dividend.ex_date and dividend.ex_date >= today else "recent"
        items.append(
            _signal(
                signal_id=f"dividend-{dividend.id}",
                kind="dividend",
                event_date=dividend.ex_date or dividend.announcement_date or today,
                ticker=company.ticker,
                title_fr=f"Dividende {timing_fr} · {company.ticker}",
                title_en=f"{timing_en.title()} dividend · {company.ticker}",
                summary_fr=(
                    f"{amount_label} FCFA net par action; détachement le "
                    f"{_iso(dividend.ex_date)}"
                    + (f", paiement le {_iso(dividend.payment_date)}." if dividend.payment_date else ".")
                ),
                summary_en=(
                    f"{amount_label} FCFA net per share; ex-date "
                    f"{_iso(dividend.ex_date)}"
                    + (f", payment {_iso(dividend.payment_date)}." if dividend.payment_date else ".")
                ),
                source=dividend.source.upper(),
                source_url=dividend.source_url,
                importance="important" if dividend.ex_date and dividend.ex_date >= today else "normal",
            )
        )

    operations = db.execute(
        select(PrimaryOperation)
        .where(PrimaryOperation.status.in_(["announced", "open"]))
        .order_by(PrimaryOperation.close_date.asc().nullslast())
    ).scalars()
    for operation in operations:
        items.append(
            _signal(
                signal_id=f"operation-{operation.id}",
                kind="operation",
                event_date=operation.open_date or operation.created_at.date(),
                ticker=None,
                title_fr=operation.title,
                title_en=operation.title,
                summary_fr=(
                    f"{operation.operation_type.upper()} {operation.status}; "
                    f"souscriptions jusqu'au {_iso(operation.close_date) or '—'}."
                ),
                summary_en=(
                    f"{operation.operation_type.upper()} {operation.status}; "
                    f"subscriptions close {_iso(operation.close_date) or '—'}."
                ),
                source="CREPMF / BRVM",
                source_url=operation.notice_url or operation.source_url,
                importance="important",
            )
        )

    documents = db.execute(
        select(Document)
        .where(Document.publication_date >= today - timedelta(days=30))
        .order_by(Document.publication_date.desc())
        .limit(30)
    ).scalars()
    for document in documents:
        items.append(
            _signal(
                signal_id=f"document-{document.id}",
                kind="official_document",
                event_date=document.publication_date or today,
                ticker=None,
                title_fr=document.title,
                title_en=document.title,
                summary_fr=f"Nouveau document officiel · {document.doc_type.replace('_', ' ')}.",
                summary_en=f"New official document · {document.doc_type.replace('_', ' ')}.",
                source="BRVM",
                source_url=document.source_url,
                importance="normal",
            )
        )

    kind_priority = {
        "unusual_volume": 5,
        "market_move": 4,
        "operation": 3,
        "dividend": 2,
        "official_document": 1,
    }
    items.sort(
        key=lambda item: (
            kind_priority.get(item["kind"], 0),
            item["importance"] == "important",
            item["date"],
        ),
        reverse=True,
    )
    return etag_json(
        request,
        {
            "generated_at": datetime.now(UTC).isoformat(),
            "as_of": _iso(latest_quote),
            "methodology": (
                "Observable events only; no recommendations or inferred causes. "
                "Each item links to its available source."
            ),
            "items": items[:limit],
        },
        max_age=300,
    )


def _signal(
    *,
    signal_id: str,
    kind: str,
    event_date: date,
    ticker: str | None,
    title_fr: str,
    title_en: str,
    summary_fr: str,
    summary_en: str,
    source: str,
    source_url: str | None,
    importance: str,
) -> dict:
    return {
        "id": signal_id,
        "kind": kind,
        "date": event_date.isoformat(),
        "ticker": ticker,
        "title_fr": title_fr,
        "title_en": title_en,
        "summary_fr": summary_fr,
        "summary_en": summary_en,
        "source": source,
        "source_url": source_url,
        "importance": importance,
    }
