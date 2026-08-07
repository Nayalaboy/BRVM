# AGENTS.md

## Cursor Cloud specific instructions

Aqlee Invest is a monorepo with **two services** that run together for full local
testing (see `README.md` and `pipeline/README.md` for the canonical commands):

| Service | Dir | Dev command | URL |
|---|---|---|---|
| Pipeline read-only API (FastAPI, Python 3.12, SQLite) | `pipeline/` | `make api` | http://localhost:8000 (`/docs`, `/health`) |
| Public website (Next.js 16, React 19) | `web/` | `pnpm dev` | http://localhost:3000 |

The website reads **only** from the pipeline API (never the DB). Start the API
first, then the web dev server. Default `PIPELINE_API_URL` is `http://localhost:8000`.

### Non-obvious gotchas

- **`make migrate` needs the `pipeline/data/` directory to already exist.** Alembic's
  `pipeline/migrations/env.py` connects to SQLite directly and does NOT create the
  parent directory (only the app's `db.py` does). On a fresh checkout the dir is
  absent (it is gitignored), so migrations fail with `unable to open database file`.
  Run `mkdir -p pipeline/data` before `make migrate`/`make bootstrap`. The update
  script already does this.
- **Local DB setup / seeding is not in the update script** (it's data/migration, not
  a dependency refresh). To (re)create and populate the local SQLite DB, run
  `make bootstrap` (venv + deps + migrate + seed + registry). This seeds 47 companies,
  real dividends, and 15 licensed SGIs — all from local fixtures, **no network
  required** (`make registry` falls back to seed data offline). The DB file lives at
  `pipeline/data/brvm.sqlite` and persists in the VM snapshot.
- **`python3.12-venv` is a system dependency** required to create the pipeline venv.
  It is installed in the VM snapshot; if `python3 -m venv` fails on a fresh machine,
  `sudo apt-get install -y python3.12-venv`.
- **`pnpm lint` is a no-op** for `web` (there is no `lint` script in `web/package.json`;
  Turbo reports "No tasks were executed"). Use `pnpm typecheck` and `pnpm test` for the
  web quality gates. Pipeline linting is `make lint` (ruff).

### Quality commands

- Pipeline: `make test` (pytest), `make lint` (ruff) — run from repo root.
- Web: `pnpm typecheck`, `pnpm test` (vitest), `pnpm build` — run from repo root.
