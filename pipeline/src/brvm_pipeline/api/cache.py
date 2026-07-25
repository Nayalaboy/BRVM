"""ETag caching helper. JSON-encodes the payload, hashes it into a weak ETag,
returns 304 when the client's If-None-Match matches, else a JSONResponse with
ETag + Cache-Control headers.
"""

from __future__ import annotations

import hashlib
import json

from fastapi import Request, Response
from fastapi.responses import JSONResponse


def etag_json(request: Request, payload: object, *, max_age: int = 300) -> Response:
    body = json.dumps(payload, default=str, ensure_ascii=False, sort_keys=True)
    etag = 'W/"' + hashlib.sha256(body.encode("utf-8")).hexdigest()[:32] + '"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})
    return JSONResponse(
        content=payload,
        headers={"ETag": etag, "Cache-Control": f"public, max-age={max_age}"},
    )
