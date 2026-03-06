"""Admin chat management endpoints (REC 2.6.4)."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import Player
from models.player import PlayerSettings
from models.chat import ChatChannel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/chat", tags=["admin_chat"])


# --- Helpers ---

def _require_admin(token: dict):
    """Verify the caller is an admin."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Admin check is handled by the auth middleware for /api/admin/ routes
    return player


# --- Channel Endpoints ---

@router.get("/channels")
def list_channels(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)
    channels = session.exec(select(ChatChannel)).all()
    return [
        {
            "id": ch.id,
            "name": ch.name,
            "channel_type": ch.channel_type,
            "is_active": ch.is_active,
            "created_at": ch.created_at.isoformat() if ch.created_at else None,
        }
        for ch in channels
    ]


class ChannelToggle(BaseModel):
    is_active: bool

@router.patch("/channels/{channel_id}")
def toggle_channel(
    channel_id: str,
    body: ChannelToggle,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)
    channel = session.get(ChatChannel, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    if channel_id == "global" and not body.is_active:
        raise HTTPException(status_code=400, detail="Cannot disable global channel")
    channel.is_active = body.is_active
    session.add(channel)
    session.commit()
    return {"ok": True, "is_active": channel.is_active}


# --- Player Mute Endpoints ---

class MuteRequest(BaseModel):
    player_id: int
    muted: bool
    until: str | None = None  # ISO datetime string or None for permanent

@router.post("/mute")
def mute_player(
    body: MuteRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)
    player = session.get(Player, body.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    ps = player.settings
    if not ps:
        ps = PlayerSettings(player_id=player.id)
        session.add(ps)
    ps.chat_muted = body.muted
    ps.chat_muted_until = body.until
    session.add(ps)
    session.commit()
    return {"ok": True, "chat_muted": body.muted, "chat_muted_until": body.until}


@router.get("/player/{player_id}/status")
def get_player_chat_status(
    player_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    ps = player.settings
    return {
        "player_id": player_id,
        "chat_muted": ps.chat_muted if ps else False,
        "chat_muted_until": ps.chat_muted_until if ps else None,
    }
