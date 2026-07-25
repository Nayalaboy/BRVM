"""A polite HTTP client shared by all collectors.

* One minimum-interval throttle per host (respects the site under load).
* robots.txt consulted and cached per host (disable with respect_robots=False).
* Exponential-backoff retry on transient errors (via tenacity).
* Realistic, identifiable User-Agent with contact info.
"""

from __future__ import annotations

import time
import urllib.robotparser
from urllib.parse import urlparse

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from ..config import Settings, get_settings
from ..logging import get_logger

log = get_logger("http")

_TRANSIENT = (httpx.TransportError, httpx.HTTPStatusError)


class PoliteClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._last_request: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
        self._client = httpx.Client(
            headers={"User-Agent": self.settings.user_agent},
            timeout=self.settings.request_timeout_s,
            follow_redirects=True,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> PoliteClient:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    # --- politeness --------------------------------------------------------
    def _throttle(self, host: str) -> None:
        last = self._last_request.get(host)
        if last is not None:
            elapsed = time.monotonic() - last
            wait = self.settings.request_min_interval_s - elapsed
            if wait > 0:
                time.sleep(wait)
        self._last_request[host] = time.monotonic()

    def _allowed(self, url: str) -> bool:
        if not self.settings.respect_robots:
            return True
        parts = urlparse(url)
        host = parts.netloc
        if host not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            robots_url = f"{parts.scheme}://{host}/robots.txt"
            try:
                resp = self._client.get(robots_url)
                if resp.status_code == 200:
                    rp.parse(resp.text.splitlines())
                else:
                    rp = None  # no robots.txt → allow
            except httpx.HTTPError:
                rp = None
            self._robots[host] = rp
        rp = self._robots[host]
        return True if rp is None else rp.can_fetch(self.settings.user_agent, url)

    # --- request -----------------------------------------------------------
    @retry(
        retry=retry_if_exception_type(_TRANSIENT),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(4),
        reraise=True,
    )
    def get(self, url: str) -> httpx.Response:
        if not self._allowed(url):
            raise PermissionError(f"robots.txt disallows fetching {url}")
        self._throttle(urlparse(url).netloc)
        resp = self._client.get(url)
        resp.raise_for_status()
        return resp

    def get_text(self, url: str) -> str:
        return self.get(url).text

    def get_bytes(self, url: str) -> bytes:
        return self.get(url).content
