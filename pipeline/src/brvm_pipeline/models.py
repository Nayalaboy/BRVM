"""SQLAlchemy 2.0 ORM models — the single source of truth for the schema.

Design notes
------------
* Integer surrogate PKs (portable across SQLite/Postgres).
* ``Numeric`` for money (FCFA/XOF); never float. Amounts are per-share.
* All ingested rows carry provenance: ``source`` + ``ingestion_run_id``.
* Timestamps are timezone-aware UTC.
* Enums are stored as plain strings (``str`` Enums) so SQLite stays simple and
  new values don't require a migration dance; validity is enforced in code.

Cross-checked against the real BRVM market: ~47 listed equities, prices in
FCFA, weekday sessions, IRVM withholding on dividends (hence gross + net).
"""

from __future__ import annotations

import enum
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


# Money: 18 digits, 4 decimals (per-share amounts can be sub-FCFA, e.g. ETI).
Money = Numeric(18, 4)


# --- Enums (stored as strings) ---------------------------------------------


class Source(enum.StrEnum):
    BRVM = "brvm"
    SIKAFINANCE = "sikafinance"
    RICHBOURSE = "richbourse"
    CREPMF = "crepmf"
    MANUAL = "manual"
    SEED = "seed"


class DocType(enum.StrEnum):
    BOC_BULLETIN = "boc_bulletin"
    PRESS_RELEASE = "press_release"
    NOTICE_INFORMATION = "notice_information"
    ANNUAL_REPORT = "annual_report"
    EARNINGS = "earnings"
    AGM_NOTICE = "agm_notice"
    OTHER = "other"


class DividendStatus(enum.StrEnum):
    ANNOUNCED = "announced"
    PROPOSED = "proposed"
    APPROVED = "approved"
    PAID = "paid"


class RunJob(enum.StrEnum):
    DAILY = "daily"
    BACKFILL = "backfill"
    WEEKLY_REGISTRY = "weekly_registry"
    SEED = "seed"


class RunStatus(enum.StrEnum):
    RUNNING = "running"
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class OperationType(enum.StrEnum):
    IPO = "ipo"
    APE = "ape"          # Appel Public à l'Épargne
    OPV = "opv"
    BOND = "bond"


class OperationStatus(enum.StrEnum):
    ANNOUNCED = "announced"
    OPEN = "open"
    CLOSED = "closed"
    SETTLED = "settled"
    CANCELLED = "cancelled"


class EventType(enum.StrEnum):
    AGM = "agm"
    EGM = "egm"
    CONVOCATION = "convocation"
    EARNINGS_RELEASE = "earnings_release"
    COUPON = "coupon"
    OTHER = "other"


class EntityType(enum.StrEnum):
    SGI = "sgi"          # Société de Gestion et d'Intermédiation
    SGP = "sgp"          # Société de Gestion de Patrimoine
    APPORTEUR = "apporteur"
    OPCVM_MGR = "opcvm_mgr"
    OTHER = "other"


class EntityStatus(enum.StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    WITHDRAWN = "withdrawn"


# --- Core reference ---------------------------------------------------------


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    isin: Mapped[str | None] = mapped_column(String(12), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    short_name: Mapped[str | None] = mapped_column(String(120))
    sector: Mapped[str | None] = mapped_column(String(80))
    country: Mapped[str | None] = mapped_column(String(80))
    currency: Mapped[str] = mapped_column(String(3), default="XOF")
    shares_outstanding: Mapped[int | None] = mapped_column(BigInteger)
    website: Mapped[str | None] = mapped_column(String(300))
    description_fr: Mapped[str | None] = mapped_column(Text)
    description_en: Mapped[str | None] = mapped_column(Text)
    listing_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    quotes: Mapped[list[DailyQuote]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    dividends: Mapped[list[Dividend]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    metrics: Mapped[CompanyMetric | None] = relationship(
        back_populates="company", cascade="all, delete-orphan", uselist=False
    )


class DailyQuote(Base):
    __tablename__ = "daily_quotes"
    __table_args__ = (
        UniqueConstraint("company_id", "date", name="uq_quote_company_date"),
        Index("ix_quote_date", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date)
    open: Mapped[Decimal | None] = mapped_column(Money)
    high: Mapped[Decimal | None] = mapped_column(Money)
    low: Mapped[Decimal | None] = mapped_column(Money)
    close: Mapped[Decimal] = mapped_column(Money)
    previous_close: Mapped[Decimal | None] = mapped_column(Money)
    volume: Mapped[int | None] = mapped_column(BigInteger)
    value_traded: Mapped[Decimal | None] = mapped_column(Money)  # FCFA turnover
    source: Mapped[str] = mapped_column(String(20), default=Source.BRVM.value)
    ingestion_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("ingestion_runs.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    company: Mapped[Company] = relationship(back_populates="quotes")


class Dividend(Base):
    __tablename__ = "dividends"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "fiscal_year", "ex_date", name="uq_div_company_year_ex"
        ),
        Index("ix_div_company", "company_id"),
        Index("ix_div_ex_date", "ex_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE")
    )
    fiscal_year: Mapped[int] = mapped_column(Integer)
    amount_gross: Mapped[Decimal | None] = mapped_column(Money)
    amount_net: Mapped[Decimal | None] = mapped_column(Money)  # after IRVM
    currency: Mapped[str] = mapped_column(String(3), default="XOF")
    announcement_date: Mapped[date | None] = mapped_column(Date)
    ex_date: Mapped[date | None] = mapped_column(Date)
    payment_date: Mapped[date | None] = mapped_column(Date)
    agm_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default=DividendStatus.ANNOUNCED.value)
    source: Mapped[str] = mapped_column(String(20), default=Source.BRVM.value)
    source_url: Mapped[str | None] = mapped_column(String(500))
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL")
    )
    ingestion_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("ingestion_runs.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    company: Mapped[Company] = relationship(back_populates="dividends")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint("content_hash", name="uq_doc_content_hash"),
        Index("ix_doc_company", "company_id"),
        Index("ix_doc_type_date", "doc_type", "publication_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL")
    )
    doc_type: Mapped[str] = mapped_column(String(30), default=DocType.OTHER.value)
    title: Mapped[str] = mapped_column(String(500))
    language: Mapped[str] = mapped_column(String(2), default="fr")
    publication_date: Mapped[date | None] = mapped_column(Date)
    source_url: Mapped[str | None] = mapped_column(String(700))
    storage_path: Mapped[str | None] = mapped_column(String(700))
    content_hash: Mapped[str] = mapped_column(String(64))  # sha256 hex
    mime: Mapped[str | None] = mapped_column(String(120))
    byte_size: Mapped[int | None] = mapped_column(BigInteger)
    page_count: Mapped[int | None] = mapped_column(Integer)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    ingestion_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("ingestion_runs.id", ondelete="SET NULL")
    )


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job: Mapped[str] = mapped_column(String(30))
    source: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(12), default=RunStatus.RUNNING.value)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stats: Mapped[dict] = mapped_column(JSON, default=dict)  # counts, check results
    error: Mapped[str | None] = mapped_column(Text)
    code_version: Mapped[str | None] = mapped_column(String(40))


class CompanyMetric(Base):
    """Derived, recomputed each daily run (one row per company)."""

    __tablename__ = "company_metrics"

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True
    )
    as_of_date: Mapped[date | None] = mapped_column(Date)
    last_close: Mapped[Decimal | None] = mapped_column(Money)
    trailing_dividend_yield: Mapped[Decimal | None] = mapped_column(Numeric(8, 6))
    high_52w: Mapped[Decimal | None] = mapped_column(Money)
    low_52w: Mapped[Decimal | None] = mapped_column(Money)
    ytd_return: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    avg_daily_volume_20d: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    avg_daily_value_20d: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    company: Mapped[Company] = relationship(back_populates="metrics")


class IndexValue(Base):
    """Market index levels (BRVM Composite, BRVM 30, sector indices…)."""

    __tablename__ = "index_values"
    __table_args__ = (
        UniqueConstraint("index_code", "date", name="uq_index_code_date"),
        Index("ix_index_date", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    index_code: Mapped[str] = mapped_column(String(40))  # BRVM_COMPOSITE, BRVM_30…
    date: Mapped[date] = mapped_column(Date)
    value: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    change_pct: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    source: Mapped[str] = mapped_column(String(20), default=Source.BRVM.value)
    ingestion_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("ingestion_runs.id", ondelete="SET NULL")
    )


class PrimaryOperation(Base):
    """IPOs / APEs / bond issues on the primary market (informational)."""

    __tablename__ = "primary_operations"

    id: Mapped[int] = mapped_column(primary_key=True)
    issuer_name: Mapped[str] = mapped_column(String(200))
    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL")
    )
    operation_type: Mapped[str] = mapped_column(String(10), default=OperationType.IPO.value)
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(12), default=OperationStatus.ANNOUNCED.value)
    open_date: Mapped[date | None] = mapped_column(Date)
    close_date: Mapped[date | None] = mapped_column(Date)
    price_min: Mapped[Decimal | None] = mapped_column(Money)
    price_max: Mapped[Decimal | None] = mapped_column(Money)
    min_subscription: Mapped[Decimal | None] = mapped_column(Money)
    tranches: Mapped[list | None] = mapped_column(JSON)  # [{name, eligibility, ...}]
    eligibility_notes_fr: Mapped[str | None] = mapped_column(Text)
    sgi_lead: Mapped[str | None] = mapped_column(String(200))
    notice_url: Mapped[str | None] = mapped_column(String(700))
    source_url: Mapped[str | None] = mapped_column(String(700))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class CorporateEvent(Base):
    __tablename__ = "corporate_events"
    __table_args__ = (Index("ix_event_date", "event_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL")
    )
    event_type: Mapped[str] = mapped_column(String(20), default=EventType.OTHER.value)
    title: Mapped[str] = mapped_column(String(300))
    event_date: Mapped[date | None] = mapped_column(Date)
    description_fr: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(700))
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LicensedEntity(Base):
    """Official CREPMF / BRVM registry of SGIs and agreed intermediaries."""

    __tablename__ = "licensed_entities"
    __table_args__ = (
        UniqueConstraint("approval_number", name="uq_entity_approval"),
        Index("ix_entity_name", "name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    entity_type: Mapped[str] = mapped_column(String(20), default=EntityType.SGI.value)
    country: Mapped[str | None] = mapped_column(String(80))
    approval_number: Mapped[str | None] = mapped_column(String(60))
    approval_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(12), default=EntityStatus.ACTIVE.value)
    website: Mapped[str | None] = mapped_column(String(300))
    source_url: Mapped[str | None] = mapped_column(String(700))
    registry_refreshed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class MarketRecap(Base):
    """Verified daily Market Map, traceable to the BOC bulletin.

    Never surfaced by the API unless ``quality_passed`` and ``published``.
    """

    __tablename__ = "market_recaps"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    composite_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    composite_change_pct: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    advancers: Mapped[int | None] = mapped_column(Integer)
    decliners: Mapped[int | None] = mapped_column(Integer)
    unchanged: Mapped[int | None] = mapped_column(Integer)
    top_movers: Mapped[list | None] = mapped_column(JSON)   # [{ticker, change_pct}]
    most_active: Mapped[list | None] = mapped_column(JSON)  # [{ticker, value_traded}]
    boc_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL")
    )
    quality_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class NewsletterSignup(Base):
    """Double-opt-in mirror; the email provider remains system of record.

    ``operation_id`` is set for per-operation IPO reminders (/operations).
    """

    __tablename__ = "newsletter_signups"
    __table_args__ = (
        UniqueConstraint("email", "operation_id", name="uq_signup_email_operation"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320))
    locale: Mapped[str] = mapped_column(String(2), default="fr")
    profile: Mapped[str | None] = mapped_column(String(20))  # diaspora|resident|professional
    status: Mapped[str] = mapped_column(String(12), default="pending")  # pending|confirmed
    operation_id: Mapped[int | None] = mapped_column(
        ForeignKey("primary_operations.id", ondelete="CASCADE")
    )
    provider_id: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
