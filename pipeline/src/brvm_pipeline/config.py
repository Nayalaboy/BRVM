"""Runtime configuration, sourced from environment variables (12-factor).

Local default is a SQLite file so `make bootstrap` works with zero services;
production sets DATABASE_URL to a Postgres DSN. Everything else (source URLs,
throttle, email alerts, object storage) is env-tunable with safe defaults.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# pipeline/ package root (…/pipeline), used for default local data paths.
PACKAGE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="BRVM_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database -----------------------------------------------------------
    # SQLite locally; set BRVM_DATABASE_URL=postgresql+psycopg://… in prod.
    database_url: str = Field(
        default=f"sqlite:///{PACKAGE_ROOT / 'data' / 'brvm.sqlite'}"
    )
    sql_echo: bool = False

    # --- Raw document storage ----------------------------------------------
    # Local filesystem by default; set storage_backend=s3 + s3_* for R2/S3.
    storage_backend: str = "local"  # "local" | "s3"
    raw_dir: Path = PACKAGE_ROOT / "data" / "raw"
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None  # e.g. Cloudflare R2 endpoint
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None

    # --- Source endpoints (overridable for tests / mirrors) -----------------
    brvm_base_url: str = "https://www.brvm.org"
    ci_council_url: str = (
        "https://www.gouv.ci/publications/documents/Conseils%20des%20Ministres"
    )
    sn_council_url: str = (
        "https://primature.sn/publications/conseil-des-ministres"
    )
    bj_council_url: str = "https://sgg.gouv.bj/comptes-rendus-conseils-ministres/"
    bf_council_url: str = "https://gouvernement.gov.bf/?s=conseil+des+ministres"
    ml_council_url: str = (
        "https://gouvernement.ml/category/conseil-des-ministres/"
    )
    ne_council_url: str = (
        "https://www.gouv.ne/index.php/les-communiques-du-gouvernement"
    )
    tg_council_url: str = "https://www.republiquetogolaise.com/communiques/listes"
    gw_council_url: str = "https://www.presidencia.gw/noticias"
    umoa_titres_publications_url: str = (
        "https://www.umoatitres.org/fr/category/publications/"
    )
    amf_umoa_publications_url: str | None = None
    # Politeness: minimum seconds between requests to the same host.
    request_min_interval_s: float = 1.5
    request_timeout_s: float = 30.0
    request_max_retries: int = 4
    user_agent: str = (
        "AqleeInvestBot/0.1 (+https://aqlee.invest; contact@aqlee.invest) "
        "BRVM public-data collector"
    )
    respect_robots: bool = True

    # --- Alerting (pipeline failures) --------------------------------------
    resend_api_key: str | None = None
    alert_email_to: str | None = None
    alert_email_from: str = "Aqlee Invest Pipeline <pipeline@aqlee.invest>"

    # --- Lightweight authentication ----------------------------------------
    auth_sync_secret: str | None = None
    auth_app_url: str = "http://localhost:3000"
    auth_email_from: str = "Aqlee Invest <connexion@aqlee.invest>"
    auth_magic_link_ttl_minutes: int = 20
    auth_dev_mode: bool = False

    # --- API ---------------------------------------------------------------
    api_cors_origins: str = "*"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
