from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from brvm_pipeline.api.main import app
from brvm_pipeline.api.routes import get_db
from brvm_pipeline.models import (
    Base,
    Company,
    CompanyMetric,
    DailyQuote,
    EntityStatus,
    EntityType,
    IngestionRun,
    LicensedEntity,
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
