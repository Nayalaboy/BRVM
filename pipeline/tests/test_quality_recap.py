from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from brvm_pipeline.collectors.boc_documents import _publication_date
from brvm_pipeline.derived.recap import build_recap
from brvm_pipeline.models import Base, Company, DailyQuote, DocType, Document
from brvm_pipeline.quality.checks import run_quality_checks

AS_OF = date(2026, 7, 24)


def _session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def _add_market(session: Session, company_count: int, quoted_count: int) -> None:
    for number in range(company_count):
        company = Company(ticker=f"T{number:03}", name=f"Company {number}")
        session.add(company)
        session.flush()
        if number < quoted_count:
            session.add(
                DailyQuote(
                    company_id=company.id,
                    date=AS_OF,
                    close=Decimal("1000"),
                    previous_close=Decimal("990"),
                    volume=100,
                )
            )
    session.flush()


def test_quality_gate_rejects_more_than_two_missing_tickers() -> None:
    with _session() as session:
        _add_market(session, company_count=47, quoted_count=44)
        report = run_quality_checks(session, AS_OF)
        assert len(report.missing_tickers) == 3
        assert report.passed is False


def test_quality_gate_allows_small_explicit_tolerance() -> None:
    with _session() as session:
        _add_market(session, company_count=47, quoted_count=45)
        report = run_quality_checks(session, AS_OF)
        assert len(report.missing_tickers) == 2
        assert report.passed is True


def test_recap_requires_same_day_boc_document() -> None:
    with _session() as session:
        _add_market(session, company_count=1, quoted_count=1)
        recap = build_recap(session, AS_OF, quality_passed=True)
        assert recap.published is False
        assert recap.boc_document_id is None

        document = Document(
            doc_type=DocType.BOC_BULLETIN.value,
            title="BOC 24-07-2026",
            publication_date=AS_OF,
            content_hash="a" * 64,
        )
        session.add(document)
        session.flush()

        recap = build_recap(session, AS_OF, quality_passed=True)
        assert recap.published is True
        assert recap.boc_document_id == document.id


def test_boc_publication_date_from_title_or_url() -> None:
    assert _publication_date("BOC du 24-07-2026", "https://example.test/boc.pdf") == AS_OF
    assert _publication_date("Bulletin", "https://example.test/BOC_2026-07-24.pdf") == AS_OF
    assert _publication_date("BOC n° 142", "https://example.test/boc.pdf") is None
