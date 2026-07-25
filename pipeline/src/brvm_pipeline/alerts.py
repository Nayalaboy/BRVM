"""Failure alerting via Resend (HTTP API, no SMTP). No-ops when unconfigured so
local runs never fail on a missing key.
"""

from __future__ import annotations

import httpx

from .config import get_settings
from .logging import get_logger

log = get_logger("alerts")


def send_failure_alert(subject: str, body: str) -> bool:
    settings = get_settings()
    if not settings.resend_api_key or not settings.alert_email_to:
        log.warning("alert_skipped_unconfigured", subject=subject)
        return False
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": settings.alert_email_from,
                "to": [settings.alert_email_to],
                "subject": subject,
                "text": body,
            },
            timeout=20,
        )
        resp.raise_for_status()
        log.info("alert_sent", subject=subject)
        return True
    except httpx.HTTPError as exc:
        log.error("alert_send_failed", error=str(exc))
        return False
