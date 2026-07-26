"""BOC archive checkpoints and row-level provenance.

Revision ID: 2f6c4d9a1b72
Revises: 69a0b56289f3
Create Date: 2026-07-25
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2f6c4d9a1b72"
down_revision: str | None = "69a0b56289f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "archive_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("discovery_url", sa.String(length=700), nullable=False),
        sa.Column("source_url", sa.String(length=700), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("parser_version", sa.String(length=40), nullable=True),
        sa.Column("discovered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("downloaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("loaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingestion_run_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["ingestion_run_id"], ["ingestion_runs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "source_url", name="uq_archive_source_url"),
    )
    op.create_index(
        "ix_archive_session_status",
        "archive_items",
        ["session_date", "status"],
        unique=False,
    )
    op.create_table(
        "ingestion_issues",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("issue_type", sa.String(length=50), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=True),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("archive_item_id", sa.Integer(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("review_status", sa.String(length=20), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["archive_item_id"], ["archive_items.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "issue_type",
            "session_date",
            "company_id",
            "archive_item_id",
            name="uq_ingestion_issue_scope",
        ),
    )
    op.create_index(
        "ix_ingestion_issue_date_status",
        "ingestion_issues",
        ["session_date", "review_status"],
        unique=False,
    )
    with op.batch_alter_table("daily_quotes") as batch_op:
        batch_op.add_column(sa.Column("document_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("source_page", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column("source_section", sa.String(length=120), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_daily_quotes_document_id",
            "documents",
            ["document_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("daily_quotes") as batch_op:
        batch_op.drop_constraint("fk_daily_quotes_document_id", type_="foreignkey")
        batch_op.drop_column("source_section")
        batch_op.drop_column("source_page")
        batch_op.drop_column("document_id")
    op.drop_index("ix_ingestion_issue_date_status", table_name="ingestion_issues")
    op.drop_table("ingestion_issues")
    op.drop_index("ix_archive_session_status", table_name="archive_items")
    op.drop_table("archive_items")
