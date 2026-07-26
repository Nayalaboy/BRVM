"""government and market intelligence

Revision ID: c1f24e6a9b30
Revises: 81d3b752ea44
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c1f24e6a9b30"
down_revision: str | None = "81d3b752ea44"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "gov_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_country", sa.String(12)),
        sa.Column("body", sa.String(160), nullable=False),
        sa.Column("publication_date", sa.Date()),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("capture_url", sa.String(700), nullable=False),
        sa.Column("official_source_url", sa.String(700), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ingestion_run_id", sa.Integer()),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["ingestion_run_id"], ["ingestion_runs.id"], ondelete="SET NULL"
        ),
        sa.UniqueConstraint("capture_url", name="uq_gov_document_capture_url"),
    )
    op.create_index("ix_gov_document_date", "gov_documents", ["publication_date"])
    op.create_index(
        "ix_gov_document_country_body",
        "gov_documents",
        ["source_country", "body"],
    )
    op.create_table(
        "market_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("gov_document_id", sa.Integer(), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("event_type", sa.String(60), nullable=False),
        sa.Column("summary_fr", sa.String(500), nullable=False),
        sa.Column("summary_en", sa.String(500)),
        sa.Column("review_status", sa.String(20), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["gov_document_id"], ["gov_documents.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_market_event_date_status",
        "market_events",
        ["event_date", "review_status"],
    )
    op.create_index(
        "ix_market_event_document", "market_events", ["gov_document_id"]
    )
    op.create_table(
        "market_event_companies",
        sa.Column("event_id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), primary_key=True),
        sa.ForeignKeyConstraint(["event_id"], ["market_events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_market_event_company_company",
        "market_event_companies",
        ["company_id"],
    )


def downgrade() -> None:
    op.drop_table("market_event_companies")
    op.drop_table("market_events")
    op.drop_table("gov_documents")
