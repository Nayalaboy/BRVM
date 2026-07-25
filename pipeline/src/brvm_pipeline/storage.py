"""Raw document storage with content-hash dedupe.

Files are keyed by their sha256, so re-downloading the same BOC bulletin never
creates a duplicate. Local filesystem by default; an S3/R2 backend is used in
prod (same interface). Returns a ``StoredObject`` with the hash + storage path.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from .config import Settings, get_settings


@dataclass(frozen=True)
class StoredObject:
    content_hash: str
    storage_path: str  # local path or s3://bucket/key
    byte_size: int
    already_present: bool


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class RawStore:
    """Content-addressed store: raw/<type>/<hash[:2]>/<hash>.<ext>."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def put(self, data: bytes, *, kind: str, ext: str = "pdf") -> StoredObject:
        digest = sha256_hex(data)
        rel = f"{kind}/{digest[:2]}/{digest}.{ext.lstrip('.')}"
        if self.settings.storage_backend == "s3":
            return self._put_s3(data, rel, digest)
        return self._put_local(data, rel, digest)

    def _put_local(self, data: bytes, rel: str, digest: str) -> StoredObject:
        dest = Path(self.settings.raw_dir) / rel
        if dest.exists():
            return StoredObject(digest, str(dest), dest.stat().st_size, True)
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".tmp")
        tmp.write_bytes(data)
        tmp.replace(dest)  # atomic
        return StoredObject(digest, str(dest), len(data), False)

    def _put_s3(self, data: bytes, rel: str, digest: str) -> StoredObject:
        import boto3  # imported lazily; only needed for the s3 backend

        s3 = boto3.client(
            "s3",
            endpoint_url=self.settings.s3_endpoint_url,
            aws_access_key_id=self.settings.s3_access_key_id,
            aws_secret_access_key=self.settings.s3_secret_access_key,
        )
        bucket = self.settings.s3_bucket
        key = rel
        # Head first for dedupe (avoids re-upload).
        try:
            head = s3.head_object(Bucket=bucket, Key=key)
            return StoredObject(digest, f"s3://{bucket}/{key}", head["ContentLength"], True)
        except Exception:  # noqa: BLE001 - not-found or transient; fall through to put
            pass
        s3.put_object(Bucket=bucket, Key=key, Body=data)
        return StoredObject(digest, f"s3://{bucket}/{key}", len(data), False)
