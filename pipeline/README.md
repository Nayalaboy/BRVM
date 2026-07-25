# Aqlee Invest — Data Pipeline (Deliverable A)

Python 3.12 pipeline that collects BRVM market data from official sources into a
relational DB (SQLite locally, Postgres in prod), computes derived metrics, and
serves a **read-only FastAPI** consumed by the website.

> Informational product, **not investment advice**. Every collected figure is
> traceable to its source; derived figures never overwrite a source of record.

## Quick start

```bash
make bootstrap     # venv + deps + migrations + real seed (47 companies, dividends)
make daily         # collect quotes + indices + dividends, QA, metrics, recap
make api           # http://localhost:8000/docs  (read-only API for the site)
make test          # parser + logic tests
```

Local DB is `pipeline/data/brvm.sqlite`. In prod set
`BRVM_DATABASE_URL=postgresql+psycopg://…` and everything else is identical.

## Architecture

```
collectors/  fetch → parse → upsert, one class per source (Collector interface)
parsers/     pure HTML/PDF parsers (no I/O → unit-tested against real fixtures)
quality/     negative-price, volume z-score outliers, missing-ticker detection
derived/     dividend yield, 52w hi/lo, YTD, ADV20  +  the daily Market recap
api/         FastAPI read layer with ETag caching
run.py       orchestrator: `daily | backfill | weekly-registry | seed`
models.py    SQLAlchemy 2.0 — the single source of truth for the schema
```

Each collector runs in its **own transaction**, so one failing source never
discards another's data. Runs are recorded in `ingestion_runs` (status + stats +
error). A failed run or a failed quality gate emails an alert (Resend).

### Data sources
| Data | Source | Notes |
|---|---|---|
| Daily quotes | brvm.org `/fr/cours-actions/0` | verified against a real page (47 rows) |
| Indices | brvm.org `/fr/indices` | verified; Composite/30/Prestige/Principal + sectors |
| Dividends | brvm.org `/fr/esv/paiement-de-dividendes` | verified; net/share, exercice, ex/pay dates; one row per company·exercice |
| Primary operations | curated `data/operations.py` | human-verified against the note d'information |
| BOC bulletins | brvm.org listing (`BRVM_BOC_LISTING_PATH`) | PDF download, hash-dedupe; listing path needs confirming |
| Licensed SGIs | CREPMF list (`BRVM_REGISTRY_URL`) | weekly; seed fallback until set |

Politeness: robots.txt is respected, requests throttled (`BRVM_REQUEST_MIN_INTERVAL_S`,
default 1.5s/host), retried with backoff, and sent with an identifiable UA.

## Runbook

**Add a company.** Append it to `src/brvm_pipeline/data/companies.py` (ticker,
name, sector, country, shares, reference close, dividends) and run `make seed`.
Once it appears on brvm.org, the daily collector keeps it current automatically.

**Add a primary operation (IPO/APE).** Fill the template in
`src/brvm_pipeline/data/operations.py` from the official *note d'information*
(every field verified), then `make registry`. Leave it empty rather than ship an
unverified operation — `/operations` returns `[]` safely.

**Backfill.** `make backfill since=2026-01-01`. brvm.org only serves the latest
session, so deep OHLCV history needs a history source (tracked follow-up); this
target re-runs collectors idempotently and recomputes metrics over what exists.

**Change the schema.** Edit `models.py`, then
`make revision m="describe change"` → review the generated file in
`migrations/versions/` → `make migrate`.

**Deploy (target <$20/mo).**
- DB: Neon/Supabase Postgres (free) → set `BRVM_DATABASE_URL`.
- Cron: the `pipeline-daily` GitHub Action (weekdays 18:30 GMT) runs
  `alembic upgrade head` + `python -m brvm_pipeline.run daily`. Add repo secrets
  `DATABASE_URL`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`.
- Registry refresh: schedule `make registry` weekly (or a second Action).
- BOC PDFs: set `BRVM_STORAGE_BACKEND=s3` + `BRVM_S3_*` for Cloudflare R2 (free).
- API: deploy `brvm_pipeline.api.main:app` (Fly.io/Railway free tier, or Vercel
  Python functions). It is stateless and read-only.

## Configuration (env, prefix `BRVM_`)
`DATABASE_URL`, `STORAGE_BACKEND`, `RAW_DIR`, `S3_*`, `BRVM_BASE_URL`,
`REQUEST_MIN_INTERVAL_S`, `REQUEST_TIMEOUT_S`, `RESPECT_ROBOTS`,
`RESEND_API_KEY`, `ALERT_EMAIL_TO`, `REGISTRY_URL`, `BOC_LISTING_PATH`.
