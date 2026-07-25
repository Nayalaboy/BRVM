"""Read-only FastAPI consumed by the website.

    uvicorn brvm_pipeline.api.main:app

Endpoints are cache-friendly (ETag + short max-age). All money is FCFA. This
service never writes; the pipeline owns all mutations.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..config import get_settings
from .routes import router

DISCLAIMER = {
    "fr": (
        "Informations fournies à titre informatif et éducatif uniquement. "
        "Ne constituent pas un conseil en investissement personnalisé. "
        "Les performances passées ne préjugent pas des performances futures."
    ),
    "en": (
        "Information provided for informational and educational purposes only. "
        "This is not personalized investment advice. "
        "Past performance does not guarantee future results."
    ),
}


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Aqlee Invest — BRVM data API",
        version="0.1.0",
        description="Read-only BRVM market data (quotes, dividends, indices, registry).",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.api_cors_origins.split(",")],
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.get("/disclaimer")
    def disclaimer() -> dict:
        return DISCLAIMER

    app.include_router(router)
    return app


app = create_app()
