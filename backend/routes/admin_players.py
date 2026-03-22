"""Admin player management routes."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlmodel import Session, select, text

from db import get_session
from auth import get_current_admin, get_client_ip
from models import Player, PlayerCharacter, CharacterClass, SupportTicket
from models.story_mode import PlayerStorySession
from models.narrative import Scene, Chapter, Book
from utils import sanitize_text
from audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/players", tags=["admin-players"])


@router.get("/")
async def admin_list_players(
    search: Optional[str] = None,
    status: Optional[str] = None,
    has_character: Optional[bool] = None,
    sort_by: str = "last_login_at",
    sort_order: str = "desc",
    limit: int = 20,
    offset: int = 0,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: List all players with search, filters, and summary stats.
    FR-7.1, FR-7.2, FR-7.9
    """
    query = select(Player)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Player.alias.ilike(search_term)) |
            (Player.email.ilike(search_term)) |
            (Player.firebase_uid.ilike(search_term))
        )

    if status == "banned":
        query = query.where(Player.is_banned == True)
    elif status == "active":
        query = query.where(Player.is_banned == False)

    if has_character is not None:
        if has_character:
            query = query.where(Player.characters.any())
        else:
            query = query.where(~Player.characters.any())

    sort_col = getattr(Player, sort_by, Player.last_login_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total_players = session.exec(select(func.count()).select_from(Player)).one()
    banned_players = session.exec(select(func.count()).select_from(Player).where(Player.is_banned == True)).one()

    thirty_days_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
    active_30d = session.exec(select(func.count()).select_from(Player).where(Player.last_login_at >= thirty_days_ago)).one()

    count_query = select(func.count()).select_from(query.subquery())
    total_filtered = session.exec(count_query).one()

    players = session.exec(query.offset(offset).limit(limit)).all()

    results = []
    for p in players:
        pd = p.model_dump()

        # Character info (first character — game only supports one)
        char = session.exec(
            select(PlayerCharacter).where(PlayerCharacter.player_id == p.id)
        ).first()
        if char:
            pd["character_name"] = char.character_name
            pd["character_level"] = char.level

            # Story progress from most recent session
            latest_session = session.exec(
                select(PlayerStorySession)
                .where(PlayerStorySession.player_id == p.id)
                .order_by(PlayerStorySession.updated_at.desc())
                .limit(1)
            ).first()
            if latest_session and latest_session.scene_id:
                scene = session.exec(select(Scene).where(Scene.id == latest_session.scene_id)).first()
                if scene:
                    chapter = session.exec(select(Chapter).where(Chapter.id == scene.chapter_id)).first()
                    if chapter:
                        book = session.exec(select(Book).where(Book.id == chapter.book_id)).first()
                        pd["progress"] = f"B{book.book_number} Ch{chapter.chapter_number} S{scene.scene_number}" if book else f"Ch{chapter.chapter_number} S{scene.scene_number}"
            if "progress" not in pd:
                pd["progress"] = "Not started"
        else:
            pd["character_name"] = None
            pd["character_level"] = None
            pd["progress"] = None

        results.append(pd)

    return {
        "players": results,
        "total": total_filtered,
        "summary": {
            "total": total_players,
            "banned": banned_players,
            "active_30d": active_30d,
        },
        "limit": limit,
        "offset": offset,
    }


@router.get("/{player_id}")
async def admin_get_player_detail(
    player_id: int,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: Full player detail with characters and recent tickets.
    FR-7.3, FR-7.10
    """
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    characters = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)).all()
    char_results = []
    for char in characters:
        char_class = session.get(CharacterClass, char.class_id)
        char_results.append({**char.model_dump(), "class": char_class.model_dump() if char_class else None})

    recent_tickets = session.exec(
        select(SupportTicket)
        .where(SupportTicket.player_id == player_id)
        .order_by(SupportTicket.created_at.desc())
        .limit(5)
    ).all()

    return {
        "player": player.model_dump(),
        "characters": char_results,
        "recent_tickets": [t.model_dump() for t in recent_tickets],
    }


@router.post("/{player_id}/ban")
async def admin_ban_player(
    player_id: int,
    body: dict,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: Ban a player.
    FR-7.4, FR-7.11
    """
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    reason = body.get("reason", "").strip()
    if len(reason) < 10 or len(reason) > 500:
        raise HTTPException(status_code=422, detail="Ban reason must be between 10 and 500 characters")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)

    player.is_banned = True
    player.banned_at = now
    player.banned_by = admin_email
    player.ban_reason = reason
    player.sessions_invalid_before = now
    player.updated_at = now

    session.add(player)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="player_banned",
        target_type="player",
        target_id=str(player_id),
        details={"reason": reason},
        ip_address=get_client_ip(request),
    )

    session.refresh(player)
    return player.model_dump()


@router.post("/{player_id}/unban")
async def admin_unban_player(
    player_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: Unban a player.
    FR-7.6, FR-7.12
    """
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)

    player.is_banned = False
    player.banned_at = None
    player.banned_by = None
    player.ban_reason = None
    player.updated_at = now

    session.add(player)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="player_unbanned",
        target_type="player",
        target_id=str(player_id),
        details={},
        ip_address=get_client_ip(request),
    )

    session.refresh(player)
    return player.model_dump()


@router.post("/{player_id}/logout")
async def admin_logout_player(
    player_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: Force logout a player (invalidate all current tokens).
    FR-7.13
    """
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)

    player.sessions_invalid_before = now
    player.updated_at = now

    session.add(player)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="player_force_logout",
        target_type="player",
        target_id=str(player_id),
        details={},
        ip_address=get_client_ip(request),
    )

    session.refresh(player)
    return {"message": "Player sessions invalidated", "sessions_invalid_before": player.sessions_invalid_before}


@router.patch("/{player_id}")
async def admin_update_player(
    player_id: int,
    body: dict,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: Edit player fields (alias, custom_avatar_url).
    FR-7.13
    """
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)
    changes = {}

    if "alias" in body:
        new_alias = sanitize_text(body["alias"], max_length=20)
        if new_alias:
            existing = session.exec(select(Player).where(text("LOWER(alias) = :a")).params(a=new_alias.lower())).first()
            if existing and existing.id != player_id:
                raise HTTPException(status_code=409, detail="Alias already taken")
        changes["alias"] = {"old": player.alias, "new": new_alias}
        player.alias = new_alias

    if "custom_avatar_url" in body:
        new_url = sanitize_text(body["custom_avatar_url"], max_length=500)
        changes["custom_avatar_url"] = {"old": player.custom_avatar_url, "new": new_url}
        player.custom_avatar_url = new_url

    if changes:
        player.updated_at = now
        session.add(player)
        session.commit()

        write_audit_log(
            session=session,
            admin_email=admin_email,
            action="player_edited",
            target_type="player",
            target_id=str(player_id),
            details=changes,
            ip_address=get_client_ip(request),
        )

    session.refresh(player)
    return player.model_dump()
