"""Interne Bearer-Token-Absicherung + einfaches In-Memory-Rate-Limit."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import Header, HTTPException, Request, status


def bearer_dependency(expected_token: str | None):
    async def _dep(
        authorization: str | None = Header(default=None, alias="Authorization"),
    ) -> None:
        if expected_token is None:
            # Kein Token konfiguriert → API läuft im lokalen Entwicklungsmodus offen.
            return
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")
        provided = authorization.removeprefix("Bearer ").strip()
        if provided != expected_token:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid token")

    return _dep


class SlidingWindowRateLimiter:
    """Trivialer In-Memory-Zähler pro (Bucket, Client-Kennung). Für Produktion
    durch Redis-basiertes Limit ersetzen."""

    def __init__(self, window_seconds: float = 60.0) -> None:
        self.window_seconds = window_seconds
        self._events: dict[tuple[str, str], Deque[float]] = defaultdict(deque)

    def check(self, bucket: str, key: str, limit_per_window: int) -> None:
        now = time.monotonic()
        events = self._events[(bucket, key)]
        cutoff = now - self.window_seconds
        while events and events[0] < cutoff:
            events.popleft()
        if len(events) >= limit_per_window:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"rate limit exceeded for {bucket}",
            )
        events.append(now)


def client_key(request: Request) -> str:
    if request.client is None:
        return "unknown"
    return request.client.host or "unknown"
