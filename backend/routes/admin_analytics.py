"""Admin analytics and audit log routes."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin
from models import (
    Player, PlayerProgress, SupportTicket,
    ActivityEvent, AdminAuditLog,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin-analytics"])


def _parse_range_days(range_str: str, default: int = 30) -> int:
    """Convert '7d' / '30d' / '90d' strings to an integer day count."""
    mapping = {"7d": 7, "30d": 30, "90d": 90}
    return mapping.get(range_str, default)


@router.get("/analytics/overview")
async def admin_analytics_overview(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Overview card stats: total players, active counts, new registrations, open tickets.
    FR-9.6, FR-9.12
    """
    now = datetime.now(timezone.utc)

    total_players = session.exec(select(func.count(Player.id))).one()
    active_24h = session.exec(
        select(func.count(Player.id)).where(Player.last_login_at >= now - timedelta(hours=24))
    ).one()
    active_7d = session.exec(
        select(func.count(Player.id)).where(Player.last_login_at >= now - timedelta(days=7))
    ).one()
    active_30d = session.exec(
        select(func.count(Player.id)).where(Player.last_login_at >= now - timedelta(days=30))
    ).one()

    reg_today = session.exec(
        select(func.count(Player.id)).where(
            Player.created_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)
        )
    ).one()
    reg_week = session.exec(
        select(func.count(Player.id)).where(Player.created_at >= now - timedelta(days=7))
    ).one()
    reg_month = session.exec(
        select(func.count(Player.id)).where(Player.created_at >= now - timedelta(days=30))
    ).one()

    open_tickets = session.exec(
        select(func.count(SupportTicket.id)).where(SupportTicket.status == "open")
    ).one()

    # Avg Resolution Time (for tickets resolved in last 30 days)
    resolved_last_30d = session.exec(
        select(SupportTicket)
        .where(SupportTicket.status.in_(["resolved", "closed"]))
        .where(SupportTicket.resolved_at >= now - timedelta(days=30))
    ).all()

    avg_res_time_seconds = 0
    if resolved_last_30d:
        total_time = sum(
            ((t.resolved_at.replace(tzinfo=timezone.utc) if t.resolved_at.tzinfo is None else t.resolved_at) -
             (t.created_at.replace(tzinfo=timezone.utc) if t.created_at.tzinfo is None else t.created_at)).total_seconds()
            for t in resolved_last_30d
        )
        avg_res_time_seconds = total_time / len(resolved_last_30d)

    return {
        "players": {
            "total": total_players,
            "active_24h": active_24h,
            "active_7d": active_7d,
            "active_30d": active_30d,
        },
        "registrations": {
            "today": reg_today,
            "this_week": reg_week,
            "this_month": reg_month,
        },
        "tickets": {
            "open": open_tickets,
            "avg_resolution_time_seconds": avg_res_time_seconds,
        },
    }


@router.get("/analytics/dau")
async def admin_analytics_dau(
    range: str = "30d",
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Daily active users (unique players with a player_login event) over N days.
    FR-9.7, FR-9.13
    """
    days = _parse_range_days(range)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = session.exec(
        select(
            func.date(ActivityEvent.created_at).label("day"),
            func.count(func.distinct(ActivityEvent.player_id)).label("count"),
        )
        .where(ActivityEvent.event_type == "player_login")
        .where(ActivityEvent.created_at >= since)
        .group_by(func.date(ActivityEvent.created_at))
        .order_by(func.date(ActivityEvent.created_at))
    ).all()

    return {"range": range, "data": [{"date": str(r.day)[:10], "count": r.count} for r in rows]}


@router.get("/analytics/registrations")
async def admin_analytics_registrations(
    range: str = "30d",
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    New player registrations per day over N days.
    FR-9.8, FR-9.14
    """
    days = _parse_range_days(range)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    rows = session.exec(
        select(
            func.date(Player.created_at).label("day"),
            func.count(Player.id).label("count"),
        )
        .where(Player.created_at >= since)
        .group_by(func.date(Player.created_at))
        .order_by(func.date(Player.created_at))
    ).all()

    return {"range": range, "data": [{"date": str(r.day)[:10], "count": r.count} for r in rows]}


@router.get("/analytics/chapter-distribution")
async def admin_analytics_chapter_distribution(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Player count per chapter (from player_progress).
    FR-9.9, FR-9.15
    """
    rows = session.exec(
        select(
            PlayerProgress.book_number,
            PlayerProgress.chapter_number,
            func.count(PlayerProgress.id).label("count"),
        )
        .group_by(PlayerProgress.book_number, PlayerProgress.chapter_number)
        .order_by(PlayerProgress.book_number, PlayerProgress.chapter_number)
    ).all()

    return {
        "data": [
            {"book": r.book_number, "chapter": r.chapter_number, "count": r.count}
            for r in rows
        ]
    }


@router.get("/analytics/events")
async def admin_analytics_events(
    event_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Recent activity events, optionally filtered by event_type (paginated).
    FR-9.10, FR-9.16
    """
    query = select(ActivityEvent)
    count_query = select(func.count(ActivityEvent.id))

    if event_type:
        query = query.where(ActivityEvent.event_type == event_type)
        count_query = count_query.where(ActivityEvent.event_type == event_type)

    total = session.exec(count_query).one()
    events = session.exec(
        query.order_by(ActivityEvent.created_at.desc()).offset(offset).limit(min(limit, 200))
    ).all()

    # Enrich with player alias
    result = []
    for ev in events:
        alias = None
        if ev.player_id:
            p = session.get(Player, ev.player_id)
            alias = p.alias or p.google_display_name if p else None
        result.append({**ev.model_dump(), "player_alias": alias})

    return {"total": total, "offset": offset, "limit": limit, "events": result}


@router.get("/audit-log")
async def admin_audit_log(
    admin: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin audit log entries, filterable and paginated. Immutable (read-only).
    FR-9.11, FR-9.17
    """
    query = select(AdminAuditLog)
    count_query = select(func.count(AdminAuditLog.id))

    if admin:
        query = query.where(AdminAuditLog.admin_email.ilike(f"%{admin}%"))
        count_query = count_query.where(AdminAuditLog.admin_email.ilike(f"%{admin}%"))
    if action:
        query = query.where(AdminAuditLog.action == action)
        count_query = count_query.where(AdminAuditLog.action == action)
    if target_type:
        query = query.where(AdminAuditLog.target_type == target_type)
        count_query = count_query.where(AdminAuditLog.target_type == target_type)

    total = session.exec(count_query).one()
    entries = session.exec(
        query.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(min(limit, 200))
    ).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "entries": [e.model_dump() for e in entries],
    }
