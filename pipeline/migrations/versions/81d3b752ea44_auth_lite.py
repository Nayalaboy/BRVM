"""Add lightweight user and magic-link tables.

Revision ID: 81d3b752ea44
Revises: 7a31e90d4c21
Create Date: 2026-07-26
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "81d3b752ea44"
down_revision: str | None = "7a31e90d4c21"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "auth_users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.Column("image", sa.String(length=700), nullable=True),
        sa.Column("locale", sa.String(length=2), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auth_users_email", "auth_users", ["email"], unique=True)
    op.create_table(
        "auth_magic_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("locale", sa.String(length=2), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_auth_magic_email_created",
        "auth_magic_links",
        ["email", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_auth_magic_email_created", table_name="auth_magic_links")
    op.drop_table("auth_magic_links")
    op.drop_index("ix_auth_users_email", table_name="auth_users")
    op.drop_table("auth_users")
