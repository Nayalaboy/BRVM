# Aqlee Invest — Phase 0 Makefile
# Pipeline lives in ./pipeline (Python), site in ./web (Next.js).

PY := pipeline/.venv/bin/python
PIP := pipeline/.venv/bin/pip
ALEMBIC := pipeline/.venv/bin/alembic
UVICORN := pipeline/.venv/bin/uvicorn
export BRVM_DATABASE_URL ?= sqlite:///$(CURDIR)/pipeline/data/brvm.sqlite

.PHONY: bootstrap venv install migrate revision seed market-refresh daily backfill boc-inventory registry intelligence tag-event api test lint fmt clean

## One command: venv + deps + schema + real seed data
bootstrap: venv install migrate seed registry
	@echo "Bootstrap complete. Try: make daily  |  make api"

venv:
	@test -d pipeline/.venv || python3 -m venv pipeline/.venv
	@$(PIP) install -q --upgrade pip

install:
	@$(PIP) install -q -e "pipeline[dev]"

migrate:
	@cd pipeline && .venv/bin/alembic upgrade head

## Autogenerate a migration after editing models.py: make revision m="add x"
revision:
	@cd pipeline && .venv/bin/alembic revision --autogenerate -m "$(m)"

seed:
	@$(PY) -m brvm_pipeline.run seed

## Fast official-close refresh (quotes + indices + QA + metrics)
market-refresh:
	@$(PY) -m brvm_pipeline.run market-refresh

## Full daily collection: quotes + indices + dividends + BOC + recap
daily:
	@$(PY) -m brvm_pipeline.run daily

backfill:
	@$(PY) -m brvm_pipeline.run backfill $(if $(since),--since $(since),) $(if $(until),--until $(until),) $(if $(stage),--stage $(stage),) $(if $(limit),--limit $(limit),) $(if $(retry_failed),--retry-failed,) $(if $(force_reparse),--force-reparse,)

boc-inventory:
	@$(PY) -m brvm_pipeline.run boc-inventory $(if $(since),--since $(since),) $(if $(until),--until $(until),)

registry:
	@$(PY) -m brvm_pipeline.run weekly-registry

intelligence:
	@$(PY) -m brvm_pipeline.run weekly-intelligence

tag-event:
	@$(PY) -m brvm_pipeline.run tag-event --document-id "$(document_id)" --event-type "$(event_type)" --summary-fr "$(summary_fr)" $(if $(tickers),--tickers "$(tickers)",) $(if $(summary_en),--summary-en "$(summary_en)",) $(if $(event_date),--event-date "$(event_date)",) $(if $(review_status),--review-status "$(review_status)",)

## Read-only API for the website (http://localhost:8000/docs)
api:
	@cd pipeline && .venv/bin/uvicorn brvm_pipeline.api.main:app --reload --port 8000

test:
	@cd pipeline && .venv/bin/pytest -q

lint:
	@cd pipeline && .venv/bin/ruff check src tests

fmt:
	@cd pipeline && .venv/bin/ruff format src tests

clean:
	@rm -rf pipeline/.venv pipeline/data/brvm.sqlite* pipeline/data/raw
