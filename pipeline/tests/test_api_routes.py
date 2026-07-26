from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from brvm_pipeline.api.main import app
from brvm_pipeline.api.routes import get_db
from brvm_pipeline.config import get_settings
from brvm_pipeline.models import (
    Base,
    Company,
    CompanyMetric,
    DailyQuote,
    Document,
    EntityStatus,
    EntityType,
    GovDocument,
    IngestionRun,
    LicensedEntity,
    MarketEvent,
    MarketEventCompany,
    RunJob,
    RunStatus,
)


def _client() -> tuple[TestClient, Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = Session(engine)
    company = Company(
        ticker="TEST",
        name="Test Banque",
        sector="Finance",
        country="Côte d'Ivoire",
        shares_outstanding=1_000_000,
    )
    session.add(company)
    session.flush()
    session.add_all(
        [
            DailyQuote(
                company_id=company.id,
                date=date(2026, 7, 24),
                close=Decimal("2500"),
                previous_close=Decimal("2450"),
                volume=100,
            ),
            CompanyMetric(
                company_id=company.id,
                as_of_date=date(2026, 7, 24),
                last_close=Decimal("2500"),
                avg_daily_value_20d=Decimal("250000"),
            ),
            LicensedEntity(
                name="Société Générale Capital Securities",
                entity_type=EntityType.SGI.value,
                country="Côte d'Ivoire",
                approval_number="SGI-001",
                status=EntityStatus.ACTIVE.value,
            ),
            IngestionRun(
                job=RunJob.DAILY.value,
                status=RunStatus.SUCCESS.value,
                finished_at=datetime(2026, 7, 24, 19, tzinfo=UTC),
            ),
        ]
    )
    session.commit()

    def override_db():
        yield session

    app.dependency_overrides[get_db] = override_db
    return TestClient(app), session


def test_company_contract_includes_research_and_freshness_fields() -> None:
    client, session = _client()
    response = client.get("/companies/TEST")
    assert response.status_code == 200
    body = response.json()
    assert body["last_quote_date"] == "2026-07-24"
    assert body["market_cap"] == 2_500_000_000
    assert body["price_return_1y"] == 0
    assert body["total_return_1y"] == 0
    assert body["metrics"]["avg_daily_value_20d"] == 250_000
    session.close()


def test_verifier_handles_accents_typos_and_approval_numbers() -> None:
    client, session = _client()
    assert client.get("/verifier", params={"q": "Societe Generale Capital"}).json()["found"]
    assert client.get("/verifier", params={"q": "SGI-001"}).json()["found"]
    session.close()


def test_status_reports_market_coverage() -> None:
    client, session = _client()
    response = client.get("/status")
    assert response.status_code == 200
    assert response.json()["coverage_pct"] == 100
    assert response.json()["status"] == "healthy"
    session.close()


def test_intelligence_feed_is_factual_and_source_backed() -> None:
    client, session = _client()
    response = client.get("/intelligence")
    assert response.status_code == 200
    body = response.json()
    move = next(item for item in body["items"] if item["kind"] == "market_move")
    assert move["ticker"] == "TEST"
    assert move["source"] == "BRVM"
    assert move["source_url"].startswith("https://www.brvm.org/")
    assert "recommendations" in body["methodology"]
    session.close()


def test_events_endpoint_only_publishes_reviewed_events_with_provenance() -> None:
    client, session = _client()
    company = session.query(Company).filter_by(ticker="TEST").one()
    document = Document(
        title="Conseil des ministres du 24 juillet 2026",
        content_hash="a" * 64,
        source_url="https://example.gouv.ci/official.pdf",
    )
    session.add(document)
    session.flush()
    gov_document = GovDocument(
        source_country="CI",
        body="Conseil des ministres de Côte d'Ivoire",
        publication_date=date(2026, 7, 24),
        doc_type="council_communication",
        title=document.title,
        document_id=document.id,
        capture_url=document.source_url,
        official_source_url=document.source_url,
    )
    session.add(gov_document)
    session.flush()
    reviewed = MarketEvent(
        gov_document_id=gov_document.id,
        event_date=date(2026, 7, 24),
        event_type="nomination",
        summary_fr="Le Conseil a procédé à une nomination officielle.",
        review_status="reviewed",
    )
    pending = MarketEvent(
        gov_document_id=gov_document.id,
        event_date=date(2026, 7, 24),
        event_type="nomination",
        summary_fr="Cette ligne ne doit pas être publiée.",
        review_status="pending",
    )
    session.add_all([reviewed, pending])
    session.flush()
    session.add(MarketEventCompany(event_id=reviewed.id, company_id=company.id))
    session.commit()

    body = client.get("/events", params={"ticker": "TEST"}).json()
    assert len(body) == 1
    assert body[0]["review_status"] == "reviewed"
    assert body[0]["tickers"] == ["TEST"]
    assert body[0]["source_url"] == document.source_url
    assert body[0]["document_ref"] == f"GOV-{gov_document.id}"
    assert len(client.get("/companies/TEST").json()["events"]) == 1
    session.close()


def test_magic_link_is_single_use_and_creates_pipeline_owned_user() -> None:
    client, session = _client()
    settings = get_settings()
    previous_dev_mode = settings.auth_dev_mode
    settings.auth_dev_mode = True
    try:
        requested = client.post(
            "/auth/magic/request",
            json={"email": "Test.User@example.com", "locale": "en"},
        )
        assert requested.status_code == 202
        query = parse_qs(urlparse(requested.json()["dev_url"]).query)
        payload = {
            "email": query["email"][0],
            "token": query["token"][0],
            "locale": "en",
        }
        consumed = client.post("/auth/magic/consume", json=payload)
        assert consumed.status_code == 200
        assert consumed.json()["email"] == "test.user@example.com"
        assert consumed.json()["locale"] == "en"
        assert client.post("/auth/magic/consume", json=payload).status_code == 401
    finally:
        settings.auth_dev_mode = previous_dev_mode
        session.close()
