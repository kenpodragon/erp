"""
Async fire-and-forget player activity event logger.

Writes to `activity_events` in a background task so it never blocks
API response latency. If the write fails, the error is logged but
NOT propagated to the caller (FR-9.3).

Usage:
    from events import log_activity_event
    log_activity_event(
        request=request,
        player_id=player.id,
        event_type="player_login",
        event_data={"character_count": 1},
    )
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from sqlmodel import Session

from db import engine
from models import ActivityEvent

logger = logging.getLogger(__name__)


def _write_event(
    player_id: int | None,
    event_type: str,
    event_data: dict | None,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    """Synchronous DB write — runs in a thread pool via asyncio.to_thread."""
    try:
        with Session(engine) as session:
            entry = ActivityEvent(
                player_id=player_id,
                event_type=event_type,
                event_data=event_data,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.now(timezone.utc),
            )
            session.add(entry)
            session.commit()
    except Exception:
        logger.exception(
            "Failed to write activity event: type=%s player_id=%s",
            event_type,
            player_id,
        )


def log_activity_event(
    request: Request,
    player_id: int | None,
    event_type: str,
    event_data: dict[str, Any] | None = None,
) -> None:
    """
    Schedule a fire-and-forget background write to `activity_events`.

    Safe to call from any async endpoint — schedules a task on the running
    event loop and returns immediately. Never raises.
    """
    ip_address: str | None = None
    user_agent: str | None = None

    try:
        forwarded = request.headers.get("X-Forwarded-For")
        ip_address = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else None
        )
        user_agent = request.headers.get("User-Agent")
    except Exception:
        pass

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            asyncio.to_thread(
                _write_event,
                player_id,
                event_type,
                event_data,
                ip_address,
                user_agent,
            )
        )
    except Exception:
        logger.exception(
            "Failed to schedule activity event task: type=%s player_id=%s",
            event_type,
            player_id,
        )
