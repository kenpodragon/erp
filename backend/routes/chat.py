"""Chat WebSocket and REST endpoints (REC 2.6.4)."""

import logging
import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlmodel import Session, select
from firebase_admin import exceptions as firebase_exceptions

from db import engine, get_session
from auth import verify_firebase_token
from models import Player, PlayerCharacter
from models.player import PlayerSettings
from models.chat import ChatChannel
from models.story_mode import GameConfig
from services.chat import manager
from utils import check_profanity

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


def _get_config_int(session: Session, key: str, default: int) -> int:
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    try:
        return int(float(cfg.value_json))
    except (TypeError, ValueError):
        return default


@router.websocket("/ws/chat")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time chat."""
    player = None

    # Firebase token verification
    try:
        decoded = verify_firebase_token(token)
    except (ValueError, firebase_exceptions.FirebaseError):
        await websocket.close(code=4001, reason="Invalid token")
        return

    with Session(engine) as session:
        player = session.exec(
            select(Player).where(Player.firebase_uid == decoded["uid"])
        ).first()

    if not player:
        await websocket.close(code=4002, reason="Player not found")
        return

    # Capture player_id while still in scope (scalar is safe on detached instance)
    player_id = player.id

    # Look up player info in a fresh session
    with Session(engine) as session:
        p = session.get(Player, player_id)
        player_name = (p.alias or p.google_display_name or "Anonymous") if p else "Anonymous"
        player_level = 1

        # Get character info
        char = session.exec(
            select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
        ).first()
        if char:
            player_name = char.character_name or player_name
            player_level = char.level or 1

        # Check if muted (query directly to avoid detached-instance error)
        ps = session.exec(
            select(PlayerSettings).where(PlayerSettings.player_id == player_id)
        ).first()
        if ps and ps.chat_muted:
            muted_until = ps.chat_muted_until
            if muted_until is None or muted_until > datetime.now(timezone.utc).isoformat():
                await websocket.close(code=4003, reason="You are muted")
                return

        # Get config
        heartbeat_interval = _get_config_int(session, "chat_heartbeat_interval_s", 30)

    await manager.connect(player_id, websocket)

    # Send history on connect
    try:
        history = manager.get_history()
        await websocket.send_json({"type": "history", "messages": history})
    except Exception:
        manager.disconnect(player_id, websocket)
        return

    # Heartbeat task
    async def heartbeat():
        while True:
            try:
                await asyncio.sleep(heartbeat_interval)
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    heartbeat_task = asyncio.create_task(heartbeat())

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "pong":
                continue

            if data.get("type") == "message":
                content = str(data.get("content", "")).strip()
                if not content or len(content) > 500:
                    continue

                # Rate limit check
                if not manager.chat_rate_limiter.is_allowed(player_id):
                    await manager.send_personal(player_id, {
                        "type": "error",
                        "message": "You are sending messages too fast. Please slow down."
                    })
                    continue

                # Profanity filter
                filtered_content = check_profanity(content)

                message = {
                    "type": "message",
                    "player_id": player_id,
                    "player_name": player_name,
                    "player_level": player_level,
                    "content": filtered_content,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "is_system": False,
                }

                await manager.broadcast(message)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Chat WebSocket error for player %d: %s", player_id, e)
    finally:
        heartbeat_task.cancel()
        manager.disconnect(player_id, websocket)
