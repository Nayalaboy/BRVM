"""Authentication write boundary used by the Auth.js web layer."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import AuthMagicLink, AuthUser
from .routes import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class MagicLinkRequest(BaseModel):
    email: str
    locale: str = "fr"


class MagicLinkConsume(BaseModel):
    email: str
    token: str
    locale: str = "fr"


class UserUpsert(BaseModel):
    email: str
    name: str | None = None
    image: str | None = None
    locale: str = "fr"


def _email(value: str) -> str:
    normalized = value.strip().lower()
    if len(normalized) > 320 or "@" not in normalized or normalized.startswith("@"):
        raise HTTPException(status_code=422, detail="invalid email")
    return normalized


def _locale(value: str) -> str:
    return "en" if value == "en" else "fr"


def _user_payload(user: AuthUser) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "image": user.image,
        "locale": user.locale,
        "role": user.role,
    }


def _upsert_user(
    db: Session,
    *,
    email: str,
    locale: str,
    name: str | None = None,
    image: str | None = None,
) -> AuthUser:
    user = db.execute(select(AuthUser).where(AuthUser.email == email)).scalar_one_or_none()
    if user is None:
        user = AuthUser(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            image=image,
            locale=locale,
            email_verified_at=datetime.now(UTC),
        )
        db.add(user)
    else:
        user.locale = locale
        user.email_verified_at = user.email_verified_at or datetime.now(UTC)
        if name:
            user.name = name
        if image:
            user.image = image
    db.commit()
    db.refresh(user)
    return user


def _send_magic_link(email: str, locale: str, url: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        if settings.auth_dev_mode:
            return
        raise HTTPException(status_code=503, detail="email authentication unavailable")
    subject = "Votre lien de connexion Aqlee" if locale == "fr" else "Your Aqlee sign-in link"
    intro = (
        "Cliquez sur ce lien pour vous connecter à Aqlee Invest."
        if locale == "fr"
        else "Click this link to sign in to Aqlee Invest."
    )
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json={
            "from": settings.auth_email_from,
            "to": [email],
            "subject": subject,
            "text": f"{intro}\n\n{url}\n\nCe lien expire dans 20 minutes.",
        },
        timeout=20,
    )
    try:
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="email delivery failed") from exc


@router.post("/magic/request", status_code=202)
def request_magic_link(payload: MagicLinkRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    email = _email(payload.email)
    locale = _locale(payload.locale)
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.auth_magic_link_ttl_minutes)
    db.add(
        AuthMagicLink(
            email=email,
            token_hash=token_hash,
            locale=locale,
            expires_at=expires_at,
        )
    )
    db.commit()
    prefix = "/en" if locale == "en" else ""
    link = (
        f"{settings.auth_app_url.rstrip('/')}{prefix}/connexion/verification"
        f"?email={quote(email)}&token={quote(raw_token)}"
    )
    _send_magic_link(email, locale, link)
    response = {"ok": True}
    if settings.auth_dev_mode:
        response["dev_url"] = link
    return response


@router.post("/magic/consume")
def consume_magic_link(payload: MagicLinkConsume, db: Session = Depends(get_db)):
    email = _email(payload.email)
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    now = datetime.now(UTC)
    magic = db.execute(
        select(AuthMagicLink).where(
            AuthMagicLink.email == email,
            AuthMagicLink.token_hash == token_hash,
            AuthMagicLink.consumed_at.is_(None),
            AuthMagicLink.expires_at > now,
        )
    ).scalar_one_or_none()
    if magic is None:
        raise HTTPException(status_code=401, detail="invalid or expired link")
    magic.consumed_at = now
    user = _upsert_user(db, email=email, locale=_locale(payload.locale))
    return _user_payload(user)


@router.post("/users/upsert")
def upsert_oauth_user(
    payload: UserUpsert,
    x_aqlee_auth_secret: str | None = Header(None),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not settings.auth_sync_secret or not secrets.compare_digest(
        x_aqlee_auth_secret or "", settings.auth_sync_secret
    ):
        raise HTTPException(status_code=401, detail="invalid service credential")
    user = _upsert_user(
        db,
        email=_email(payload.email),
        locale=_locale(payload.locale),
        name=payload.name,
        image=payload.image,
    )
    return _user_payload(user)
