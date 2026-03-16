"""Reusable sliding-window rate limiter for API endpoints (REC 3.5 §12.4).

Usage in route files:
    from services.rate_limiter import rate_limit

    @router.post("/buy")
    async def buy_listing(
        body: BuyRequest,
        _rl=Depends(rate_limit("marketplace_buy", 10)),
        token: dict = Depends(get_current_player),
        session: Session = Depends(get_session),
    ):
"""

import time
from typing import Dict, List, Optional, Tuple

from fastapi import Depends, HTTPException

from auth import get_current_player


class EndpointRateLimiter:
    """In-memory sliding-window rate limiter keyed by (player_id, tag)."""

    def __init__(self):
        self._timestamps: Dict[Tuple[int, str], List[float]] = {}

    def check(self, player_id: int, tag: str, max_per_minute: int) -> Tuple[bool, int]:
        """Check if request is allowed.

        Returns (allowed, retry_after_seconds).
        """
        now = time.time()
        window_start = now - 60.0
        key = (player_id, tag)

        stamps = self._timestamps.get(key, [])
        stamps = [t for t in stamps if t > window_start]
        self._timestamps[key] = stamps

        if len(stamps) >= max_per_minute:
            retry_after = int(stamps[0] - window_start) + 1
            return False, max(retry_after, 1)

        stamps.append(now)
        return True, 0


# Module-level singleton
_limiter = EndpointRateLimiter()


def rate_limit(tag: str, max_per_minute: int):
    """Factory returning a FastAPI Depends-compatible rate limit checker.

    FastAPI caches Depends(get_current_player) per-request, so the token
    is resolved once even when used in both the rate limiter and the endpoint.
    """
    async def _check(token: dict = Depends(get_current_player)):
        player = token.get("player")
        if not player:
            return  # auth will fail separately via the endpoint's own Depends
        allowed, retry_after = _limiter.check(player.id, tag, max_per_minute)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded ({max_per_minute}/min). Try again shortly.",
                headers={"Retry-After": str(retry_after)},
            )
    return _check


def get_limiter() -> EndpointRateLimiter:
    """Expose the singleton for testing."""
    return _limiter
