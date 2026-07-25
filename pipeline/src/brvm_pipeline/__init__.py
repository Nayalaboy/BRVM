"""BRVM investing-intelligence data pipeline.

Phase 0 deliverable A: collect daily quotes, dividends, corporate actions,
indices and documents from official BRVM sources, store them in a relational
database (SQLite locally, Postgres in prod), compute derived metrics, and
expose a read-only FastAPI consumed by the public website.

This package OWNS the database schema (SQLAlchemy models + Alembic migrations).
"""

__version__ = "0.1.0"
