"""Stage parsed historical quote observations.

Revision ID: 7a31e90d4c21
Revises: 2f6c4d9a1b72
Create Date: 2026-07-25
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7a31e90d4c21"
down_revision: str | None = "2f6c4d9a1b72"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "quote_observations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("archive_item_id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("close", sa.Numeric(18, 4), nullable=False),
        sa.Column("previous_close", sa.Numeric(18, 4), nullable=True),
        sa.Column("open", sa.Numeric(18, 4), nullable=True),
        sa.Column("volume", sa.BigInteger(), nullable=False),
        sa.Column("value_traded", sa.Numeric(18, 4), nullable=True),
        sa.Column("source_page", sa.Integer(), nullable=False),
        sa.Column("source_section", sa.String(length=120), nullable=False),
        sa.Column("parser_version", sa.String(length=40), nullable=False),
        sa.Column("raw_fields", sa.JSON(), nullable=False),
        sa.Column("validation_status", sa.String(length=20), nullable=False),
        sa.Column("validation_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["archive_item_id"], ["archive_items.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "archive_item_id",
            "company_id",
            name="uq_quote_observation_item_company",
        ),
    )
    op.create_index(
        "ix_quote_observation_date_status",
        "quote_observations",
        ["session_date", "validation_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_quote_observation_date_status", table_name="quote_observations"
    )
    op.drop_table("quote_observations")
