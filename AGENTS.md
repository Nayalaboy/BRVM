# AGENTS.md

## Cursor Cloud specific instructions

Monorepo with two independent components (see `README.md` for full docs):

- `pipeline/` — Python 3.12 FastAPI + SQLAlchemy/Alembic data pipeline. Owns the DB schema, serves a **read-only** API on `http://localhost:8000`.
- `web/` — Next.js 16 (App Router, next-intl FR/EN) public site on `http://localhost:3000`. Consumes ONLY the pipeline API, never the DB directly.

The update script already installs dependencies (Python venv at `pipeline/.venv` + `pnpm install`). Standard commands live in the root `Makefile` (pipeline) and `package.json`/`web/package.json` (web). Notes below are the non-obvious bits.

### Pipeline (Python)

- Everything runs through the `Makefile` targets, which invoke `pipeline/.venv/bin/*` directly (no `source activate` needed).
- **Startup gotcha:** Alembic's `migrations/env.py` opens the SQLite engine directly and does NOT create the `pipeline/data/` directory, so a fresh checkout hits `sqlite3.OperationalError: unable to open database file`. Run `mkdir -p pipeline/data` once before `make migrate` / `make bootstrap` / `make seed`. (The `pipeline/data/` dir is gitignored, so it will be missing on every fresh VM.)
- First-time data setup: `make bootstrap` (venv + deps + migrate + seed + registry). If deps are already installed, the minimal DB setup is `mkdir -p pipeline/data && make migrate && make seed && make registry`. Seed loads real data (47 companies, dividends, 15 SGIs) so the site is populated offline.
- Run the API: `make api` (uvicorn `--reload` on port 8000; docs at `/docs`).
- Lint: `make lint` (ruff). Tests: `make test` (pytest, offline — uses fixtures/respx, no network).
- The daily/market collectors (`make daily`, `make market-refresh`) hit brvm.org over the network and are not needed for local dev; the seed data is sufficient.

### Web (Next.js)

- Runs with zero config: `PIPELINE_API_URL` defaults to `http://localhost:8000`, so just start the API first, then `pnpm dev`.
- Commands (root, via turbo): `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm test` (vitest). There is **no** `pnpm lint` task defined for `web` — `pnpm typecheck` is the type/lint gate (matches CI in `.github/workflows/ci.yml`).
- `pnpm build` regenerates `web/next-env.d.ts`; leave that change uncommitted.
- Email capture (newsletter) and Google auth are no-ops in dev unless `EMAIL_PROVIDER`/`RESEND_*`/`AUTH_*` env vars are set; no public content is gated by login.

### System dependency

- The base image lacks `python3.12-venv`; it is installed via `apt` during environment setup (persisted in the snapshot, not in the update script).
