"""Command-line entry point for the ingestion worker.

Usage:
    brvm-ingest status          # show pending documents in the queue
    brvm-ingest process         # (step 2) extract, chunk and embed pending PDFs
"""

from __future__ import annotations

import os

import psycopg
import typer

app = typer.Typer(help="BRVM document ingestion worker")


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "postgresql://brvm:brvm@localhost:5432/brvm")


@app.command()
def status() -> None:
    """Show the ingestion queue grouped by status."""
    with psycopg.connect(_database_url()) as conn:
        rows = conn.execute(
            "SELECT status, count(*) FROM documents GROUP BY status ORDER BY status"
        ).fetchall()
    if not rows:
        typer.echo("No documents in the queue.")
        return
    for doc_status, count in rows:
        typer.echo(f"{doc_status:12} {count}")


@app.command()
def process() -> None:
    """Extract, chunk and embed pending documents (ships in step 2)."""
    typer.echo(
        "Not implemented yet — the RAG ingestion pipeline (PDF extraction, "
        "OCR fallback, table-aware chunking, pgvector embeddings) ships in step 2."
    )
    raise typer.Exit(code=1)


if __name__ == "__main__":
    app()
