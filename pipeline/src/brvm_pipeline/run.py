"""Pipeline entrypoint.

    python -m brvm_pipeline.run daily            # weekday cron (18:30 GMT)
    python -m brvm_pipeline.run weekly-registry  # refresh licensed entities
    python -m brvm_pipeline.run seed             # bootstrap real fixtures
    python -m brvm_pipeline.run backfill --since 2026-01-01

Idempotent: quotes/dividends/indices upsert by natural key, documents dedupe by
hash. Each collector runs in its own transaction, so one failing source never
discards another's data. A failed run (or failed quality gate) emails an alert.
"""

from __future__ import annotations

from datetime import UTC, datetime

import typer
from sqlalchemy import func, select

from . import __version__
from .alerts import send_failure_alert
from .collectors.base import CollectContext, CollectResult
from .collectors.boc_archive import (
    BocArchiveCandidateCollector,
    BocArchiveDownloadCollector,
    BocArchiveInventoryCollector,
    BocArchiveLoadCollector,
    BocArchiveParseCollector,
)
from .collectors.boc_documents import BocDocumentsCollector
from .collectors.brvm_quotes import BrvmQuotesCollector
from .collectors.corporate_actions import BrvmDividendsCollector
from .collectors.http import PoliteClient
from .collectors.indices import BrvmIndicesCollector
from .collectors.official_intelligence import OfficialIntelligenceCollector
from .collectors.operations import OperationsCollector
from .collectors.registry import LicensedEntityCollector
from .db import session_scope
from .derived.metrics import recompute_all
from .derived.recap import build_recap
from .logging import configure_logging, get_logger
from .models import (
    Company,
    DailyQuote,
    GovDocument,
    IngestionRun,
    MarketEvent,
    MarketEventCompany,
    RunJob,
    RunStatus,
)
from .quality.checks import run_quality_checks

app = typer.Typer(add_completion=False, help="BRVM data pipeline")
log = get_logger("run")


def _open_run(job: str) -> int:
    with session_scope() as s:
        run = IngestionRun(job=job, status=RunStatus.RUNNING.value, code_version=__version__)
        s.add(run)
        s.flush()
        return run.id


def _finalize(run_id: int, status: str, stats: dict, error: str | None = None) -> None:
    with session_scope() as s:
        run = s.get(IngestionRun, run_id)
        run.status = status
        run.finished_at = datetime.now(UTC)
        run.stats = stats
        run.error = error


def _run_collectors(collectors: list, run_id: int, **ctx_kwargs) -> tuple[list[CollectResult], bool]:
    results: list[CollectResult] = []
    all_ok = True
    with PoliteClient() as client:
        for collector in collectors:
            try:
                with session_scope() as s:  # isolated transaction per collector
                    ctx = CollectContext(session=s, client=client, run_id=run_id, **ctx_kwargs)
                    res = collector.collect(ctx)
            except Exception as exc:  # noqa: BLE001 - isolate collector failures
                log.error("collector_failed", collector=collector.name, error=str(exc))
                res = CollectResult(collector=collector.name, ok=False, warnings=[str(exc)])
            results.append(res)
            all_ok = all_ok and res.ok
    return results, all_ok


def _latest_quote_date(default=None):  # noqa: ANN001
    with session_scope() as s:
        return s.execute(select(func.max(DailyQuote.date))).scalar_one_or_none() or default


@app.command()
def daily() -> None:
    """Collect quotes + indices + dividends, run QA, recompute metrics + recap."""
    configure_logging()
    run_id = _open_run(RunJob.DAILY.value)
    stats: dict = {}
    try:
        collectors = [
            BrvmQuotesCollector(),
            BrvmIndicesCollector(),
            BrvmDividendsCollector(),
            BocDocumentsCollector(),
        ]
        results, all_ok = _run_collectors(collectors, run_id)
        stats["collectors"] = {r.collector: r.as_stats() for r in results}

        as_of = _latest_quote_date()
        if as_of is None:
            raise RuntimeError("no quotes present after collection")

        with session_scope() as s:
            report = run_quality_checks(s, as_of)
        stats["quality"] = report.as_dict()

        with session_scope() as s:
            recompute_all(s, as_of)
            recap = build_recap(s, as_of, quality_passed=report.passed)
            recap_published = recap.published
            stats["recap"] = {
                "published": recap.published,
                "boc_document_id": recap.boc_document_id,
            }

        status = (
            RunStatus.SUCCESS.value
            if (all_ok and report.passed and recap_published)
            else RunStatus.PARTIAL.value
        )
        _finalize(run_id, status, stats)
        if status != RunStatus.SUCCESS.value:
            send_failure_alert(
                f"[BRVM pipeline] daily {status}",
                f"as_of={as_of}\nquality_passed={report.passed}\n"
                f"collectors_ok={all_ok}\nrecap_published={recap_published}\nstats={stats}",
            )
        log.info("daily_done", status=status, as_of=as_of.isoformat())
    except Exception as exc:  # noqa: BLE001
        _finalize(run_id, RunStatus.FAILED.value, stats, error=str(exc))
        send_failure_alert("[BRVM pipeline] daily FAILED", f"{exc}\nstats={stats}")
        log.error("daily_failed", error=str(exc))
        raise typer.Exit(code=1) from exc


@app.command("weekly-registry")
def weekly_registry() -> None:
    """Refresh the licensed-entities registry (SGIs) + curated primary operations."""
    configure_logging()
    run_id = _open_run(RunJob.WEEKLY_REGISTRY.value)
    results, all_ok = _run_collectors(
        [LicensedEntityCollector(), OperationsCollector()], run_id
    )
    stats = {"collectors": {r.collector: r.as_stats() for r in results}}
    _finalize(run_id, RunStatus.SUCCESS.value if all_ok else RunStatus.PARTIAL.value, stats)
    log.info("weekly_registry_done", ok=all_ok)


@app.command("weekly-intelligence")
def weekly_intelligence() -> None:
    """Archive new official government and regional-market publications."""
    configure_logging()
    run_id = _open_run(RunJob.WEEKLY_INTELLIGENCE.value)
    results, all_ok = _run_collectors([OfficialIntelligenceCollector()], run_id)
    stats = {"collectors": {r.collector: r.as_stats() for r in results}}
    _finalize(run_id, RunStatus.SUCCESS.value if all_ok else RunStatus.PARTIAL.value, stats)
    log.info("weekly_intelligence_done", ok=all_ok)


EVENT_TYPES = {
    "tarification",
    "fiscalité",
    "participation_etat",
    "privatisation_levee_fonds",
    "reglementation_sectorielle",
    "nomination",
}


@app.command("tag-event")
def tag_event(
    document_id: int = typer.Option(..., help="gov_documents.id to tag"),
    event_type: str = typer.Option(..., help="Controlled factual event type"),
    summary_fr: str = typer.Option(..., help="One factual sentence, no prediction"),
    tickers: str = typer.Option("", help="Comma-separated BRVM tickers"),
    summary_en: str | None = typer.Option(None),
    event_date: str | None = typer.Option(None, help="ISO date; defaults to publication date"),
    review_status: str = typer.Option("reviewed", help="pending, reviewed, or rejected"),
) -> None:
    """Human-tag one archived document; reviewed events become public."""
    if event_type not in EVENT_TYPES:
        raise typer.BadParameter(f"event-type must be one of: {', '.join(sorted(EVENT_TYPES))}")
    if review_status not in {"pending", "reviewed", "rejected"}:
        raise typer.BadParameter("review-status must be pending, reviewed, or rejected")
    if len(summary_fr.strip()) < 10 or len(summary_fr) > 500:
        raise typer.BadParameter("summary-fr must contain 10–500 characters")
    with session_scope() as s:
        gov_document = s.get(GovDocument, document_id)
        if gov_document is None:
            raise typer.BadParameter(f"government document {document_id} does not exist")
        parsed_event_date = (
            datetime.strptime(event_date, "%Y-%m-%d").date()
            if event_date
            else gov_document.publication_date
        )
        if parsed_event_date is None:
            raise typer.BadParameter("event-date is required when the document has no date")
        requested = {ticker.strip().upper() for ticker in tickers.split(",") if ticker.strip()}
        companies = list(
            s.scalars(select(Company).where(Company.ticker.in_(requested)))
        ) if requested else []
        missing = requested - {company.ticker for company in companies}
        if missing:
            raise typer.BadParameter(f"unknown ticker(s): {', '.join(sorted(missing))}")
        event = MarketEvent(
            gov_document_id=gov_document.id,
            event_date=parsed_event_date,
            event_type=event_type,
            summary_fr=summary_fr.strip(),
            summary_en=summary_en.strip() if summary_en else None,
            review_status=review_status,
            reviewed_at=datetime.now(UTC) if review_status == "reviewed" else None,
        )
        s.add(event)
        s.flush()
        for company in companies:
            s.add(MarketEventCompany(event_id=event.id, company_id=company.id))
        typer.echo(f"event {event.id} created ({review_status})")


@app.command()
def backfill(
    since: str = typer.Option(None, help="ISO date lower bound (inclusive)"),
    until: str = typer.Option(None, help="ISO date upper bound (inclusive)"),
    stage: str = typer.Option(
        "all", help="Archive stage: discover, download, parse, load, or all"
    ),
    limit: int = typer.Option(
        None, help="Maximum PDFs to download in this run (discovery is unlimited)"
    ),
    retry_failed: bool = typer.Option(False, help="Retry failed archive downloads"),
    force_reparse: bool = typer.Option(False, help="Reparse reviewed/parsed PDFs"),
) -> None:
    """Discover and cache historical official BOC PDFs, resumably."""
    configure_logging()
    valid_stages = {"discover", "download", "parse", "load", "all"}
    if stage not in valid_stages:
        raise typer.BadParameter(f"stage must be one of: {', '.join(sorted(valid_stages))}")
    run_id = _open_run(RunJob.BACKFILL.value)
    stats: dict = {}
    try:
        collectors = []
        if stage in {"discover", "all"}:
            collectors.extend(
                [BocArchiveInventoryCollector(), BocArchiveCandidateCollector()]
            )
        if stage in {"download", "all"}:
            collectors.append(
                BocArchiveDownloadCollector(limit=limit, retry_failed=retry_failed)
            )
        if stage in {"parse", "all"}:
            collectors.append(
                BocArchiveParseCollector(limit=limit, force=force_reparse)
            )
        if stage in {"load", "all"}:
            collectors.append(BocArchiveLoadCollector(limit=limit))
        results, all_ok = _run_collectors(
            collectors, run_id, since=since, until=until
        )
        stats = {"collectors": {r.collector: r.as_stats() for r in results}}
        status = RunStatus.SUCCESS.value if all_ok else RunStatus.PARTIAL.value
        _finalize(run_id, status, stats)
        log.info("backfill_done", ok=all_ok, stage=stage)
    except Exception as exc:  # noqa: BLE001
        _finalize(run_id, RunStatus.FAILED.value, stats, error=str(exc))
        log.error("backfill_failed", error=str(exc), stage=stage)
        raise typer.Exit(code=1) from exc


@app.command("boc-inventory")
def boc_inventory(
    since: str = typer.Option("2015-01-01", help="ISO date lower bound"),
    until: str = typer.Option(None, help="ISO date upper bound"),
) -> None:
    """Inventory official BOC archive URLs without downloading PDF bodies."""
    configure_logging()
    run_id = _open_run(RunJob.BOC_INVENTORY.value)
    results, ok = _run_collectors(
        [BocArchiveInventoryCollector(), BocArchiveCandidateCollector()],
        run_id,
        since=since,
        until=until,
    )
    stats = {"collectors": {r.collector: r.as_stats() for r in results}}
    _finalize(run_id, RunStatus.SUCCESS.value if ok else RunStatus.PARTIAL.value, stats)
    if not ok:
        raise typer.Exit(code=1)


@app.command()
def seed() -> None:
    """Populate the DB with the 47 real companies + dividends + synthetic history."""
    configure_logging()
    from .seed import seed as run_seed

    run_seed()


if __name__ == "__main__":
    app()
