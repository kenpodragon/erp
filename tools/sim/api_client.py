"""
Async HTTP client wrapping all game endpoints for the simulation bot.

Uses X-Spoof-Player-Id header for auth bypass in dev mode
(requires ALLOW_AUTH_BYPASS=true env + ops.auth_bypass_enabled=true in DB).
"""

import asyncio
import logging
import time
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


class GameAPIClient:
    """Async client for all ERP game API endpoints."""

    def __init__(self, base_url: str, player_id: int = 5) -> None:
        self.base_url = base_url.rstrip("/")
        self.player_id = player_id
        self._client: Optional[httpx.AsyncClient] = None

        # Metrics
        self._request_count: int = 0
        self._error_count: int = 0
        self._response_times: list[float] = []

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={"X-Spoof-Player-Id": str(self.player_id)},
                timeout=httpx.Timeout(30.0),
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "GameAPIClient":
        await self._ensure_client()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()

    def get_metrics(self) -> dict[str, Any]:
        return {
            "request_count": self._request_count,
            "error_count": self._error_count,
            "response_times": list(self._response_times),
            "avg_response_time": (
                sum(self._response_times) / len(self._response_times)
                if self._response_times
                else 0.0
            ),
        }

    # -- Internal request helper -----------------------------------------------

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[dict] = None,
        max_retries: int = 3,
    ) -> dict[str, Any]:
        client = await self._ensure_client()
        last_exc: Optional[Exception] = None

        for attempt in range(max_retries):
            self._request_count += 1
            start = time.monotonic()
            try:
                resp = await client.request(method, path, json=json)
                elapsed = time.monotonic() - start
                self._response_times.append(elapsed)

                logger.debug(
                    "%s %s -> %d (%.3fs)", method, path, resp.status_code, elapsed
                )

                if resp.status_code >= 500:
                    self._error_count += 1
                    last_exc = httpx.HTTPStatusError(
                        f"Server error {resp.status_code}",
                        request=resp.request,
                        response=resp,
                    )
                    backoff = 2**attempt * 0.5
                    logger.warning(
                        "5xx on %s %s (attempt %d/%d), retrying in %.1fs",
                        method, path, attempt + 1, max_retries, backoff,
                    )
                    await asyncio.sleep(backoff)
                    continue

                resp.raise_for_status()
                return resp.json()

            except httpx.TimeoutException as exc:
                elapsed = time.monotonic() - start
                self._response_times.append(elapsed)
                self._error_count += 1
                logger.warning(
                    "Timeout on %s %s (attempt %d/%d)",
                    method, path, attempt + 1, max_retries,
                )
                last_exc = exc
                backoff = 2**attempt * 0.5
                await asyncio.sleep(backoff)
                continue

            except httpx.HTTPStatusError:
                raise

            except Exception as exc:
                elapsed = time.monotonic() - start
                self._response_times.append(elapsed)
                self._error_count += 1
                logger.error("Unexpected error on %s %s: %s", method, path, exc)
                raise

        # All retries exhausted
        raise last_exc  # type: ignore[misc]

    # -- Auth ------------------------------------------------------------------

    async def login(self) -> dict[str, Any]:
        """POST /api/auth/login -- login using spoof header."""
        return await self._request("POST", "/api/auth/login")

    # -- Story Mode ------------------------------------------------------------

    async def get_game_configs(self) -> dict[str, Any]:
        """GET /api/game/story/configs -- game configs for combat engine."""
        return await self._request("GET", "/api/game/story/configs")

    async def get_scene_narrative(self, scene_id: int) -> dict[str, Any]:
        """GET /api/game/story/scenes/{scene_id}/narrative -- story beats."""
        return await self._request(
            "GET", f"/api/game/story/scenes/{scene_id}/narrative"
        )

    async def get_scene_enemies(self, scene_id: int) -> dict[str, Any]:
        """GET /api/game/story/scenes/{scene_id}/enemies -- enemies for scene."""
        return await self._request(
            "GET", f"/api/game/story/scenes/{scene_id}/enemies"
        )

    async def start_session(self, scene_id: int) -> dict[str, Any]:
        """POST /api/game/story/session/start -- start a combat session."""
        return await self._request(
            "POST", "/api/game/story/session/start", json={"scene_id": scene_id}
        )

    async def get_session(self, session_id: int) -> dict[str, Any]:
        """GET /api/game/story/session/{session_id} -- get session state."""
        return await self._request(
            "GET", f"/api/game/story/session/{session_id}"
        )

    async def tick(
        self,
        session_id: int,
        *,
        clicks: int,
        elapsed_ms: int,
        zone: int,
        wave: int,
        gold_delta: float,
        waves_completed_delta: int,
    ) -> dict[str, Any]:
        """POST /api/game/story/session/{session_id}/tick -- send combat tick."""
        return await self._request(
            "POST",
            f"/api/game/story/session/{session_id}/tick",
            json={
                "clicks": clicks,
                "elapsed_ms": elapsed_ms,
                "zone": zone,
                "wave": wave,
                "gold_delta": gold_delta,
                "waves_completed_delta": waves_completed_delta,
            },
        )

    async def upgrade(
        self,
        session_id: int,
        *,
        upgrade_type: str,
        target_id: Optional[int] = None,
        quantity: int = 1,
    ) -> dict[str, Any]:
        """POST /api/game/story/session/{session_id}/upgrade -- purchase upgrade."""
        return await self._request(
            "POST",
            f"/api/game/story/session/{session_id}/upgrade",
            json={
                "upgrade_type": upgrade_type,
                "target_id": target_id,
                "quantity": quantity,
            },
        )

    async def activate_skill(
        self, session_id: int, *, skill_id: int
    ) -> dict[str, Any]:
        """POST /api/game/story/session/{session_id}/skill -- activate a skill."""
        return await self._request(
            "POST",
            f"/api/game/story/session/{session_id}/skill",
            json={"skill_id": skill_id},
        )

    async def update_narrative_progress(
        self, session_id: int, *, progress_pct: float
    ) -> dict[str, Any]:
        """POST /api/game/story/session/{session_id}/narrative -- update narrative."""
        return await self._request(
            "POST",
            f"/api/game/story/session/{session_id}/narrative",
            json={"progress_pct": progress_pct},
        )

    async def complete_session(self, session_id: int) -> dict[str, Any]:
        """POST /api/game/story/session/{session_id}/complete -- finish session."""
        return await self._request(
            "POST", f"/api/game/story/session/{session_id}/complete"
        )

    # -- Training --------------------------------------------------------------

    async def start_training(
        self, *, skill_id: int, action_id: int
    ) -> dict[str, Any]:
        """POST /api/game/training/start -- begin idle training."""
        return await self._request(
            "POST",
            "/api/game/training/start",
            json={"skill_id": skill_id, "action_id": action_id},
        )

    async def stop_training(self) -> dict[str, Any]:
        """POST /api/game/training/stop -- stop idle training."""
        return await self._request("POST", "/api/game/training/stop")

    async def get_training_status(self) -> dict[str, Any]:
        """GET /api/game/training/status -- current training state."""
        return await self._request("GET", "/api/game/training/status")

    async def get_offline_report(self) -> dict[str, Any]:
        """GET /api/game/training/offline-report -- offline gains."""
        return await self._request("GET", "/api/game/training/offline-report")

    # -- Character -------------------------------------------------------------

    async def get_character_stats(self) -> dict[str, Any]:
        """GET /api/game/character/stats -- computed stat block."""
        return await self._request("GET", "/api/game/character/stats")

    async def get_character_level(self) -> dict[str, Any]:
        """GET /api/game/character/level -- level, XP, XP-to-next."""
        return await self._request("GET", "/api/game/character/level")

    async def get_skill_tree(self) -> dict[str, Any]:
        """GET /api/game/skills/tree -- full skill tree."""
        return await self._request("GET", "/api/game/skills/tree")

    # -- Game ------------------------------------------------------------------

    async def get_map(self) -> dict[str, Any]:
        """GET /api/game/map -- full book/chapter/scene hierarchy."""
        return await self._request("GET", "/api/game/map")

    async def get_classes(self) -> dict[str, Any]:
        """GET /api/game/classes -- available character classes."""
        return await self._request("GET", "/api/game/classes")
