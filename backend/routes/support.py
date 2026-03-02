"""Player support ticket routes."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import Player, SupportTicket, SupportReply
from utils import sanitize_text
from events import log_activity_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/support", tags=["support"])

VALID_TICKET_CATEGORIES = {"bug_report", "account_issue", "payment_issue", "feedback", "other"}


def _auto_close_ticket(ticket: SupportTicket, session: Session) -> None:
    """Auto-close a resolved ticket if 7+ days have passed since resolved_at."""
    if ticket.status == "resolved" and ticket.resolved_at:
        delta = datetime.now(timezone.utc) - ticket.resolved_at.replace(tzinfo=timezone.utc) if ticket.resolved_at.tzinfo is None else datetime.now(timezone.utc) - ticket.resolved_at
        if delta.days >= 7:
            ticket.status = "closed"
            ticket.closed_at = datetime.now(timezone.utc)
            ticket.updated_at = datetime.now(timezone.utc)
            session.add(ticket)
            session.commit()
            session.refresh(ticket)


@router.post("/tickets")
async def create_ticket(
    request: Request,
    body: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Player creates a support ticket.
    FR-6.2, FR-6.11
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    category = body.get("category", "").strip()
    subject = sanitize_text(body.get("subject", ""), max_length=100)
    description = sanitize_text(body.get("description", ""), max_length=5000)

    if category not in VALID_TICKET_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Category must be one of: {', '.join(sorted(VALID_TICKET_CATEGORIES))}")

    if not subject or len(subject) < 5:
        raise HTTPException(status_code=422, detail="Subject must be between 5 and 100 characters")

    if not description or len(description) < 20:
        raise HTTPException(status_code=422, detail="Description must be between 20 and 5000 characters")

    now = datetime.now(timezone.utc)

    ticket = SupportTicket(
        player_id=player.id,
        category=category,
        priority="normal",
        subject=subject,
        status="open",
        created_at=now,
        updated_at=now,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    reply = SupportReply(
        ticket_id=ticket.id,
        author_type="player",
        author_id=player.id,
        content=description,
        is_internal_note=False,
        created_at=now,
    )
    session.add(reply)
    session.commit()
    session.refresh(ticket)
    session.refresh(reply)

    log_activity_event(request, player.id, "support_ticket_created", {
        "ticket_id": ticket.id,
        "category": category,
    })

    return {
        "ticket": ticket.model_dump(),
        "reply": reply.model_dump(),
    }


@router.get("/tickets")
async def list_my_tickets(
    status: Optional[str] = None,
    limit: int = 20, offset: int = 0,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    List the authenticated player's support tickets (paginated).
    FR-6.3, FR-6.12
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    query = select(SupportTicket).where(SupportTicket.player_id == player.id)
    if status:
        query = query.where(SupportTicket.status == status)
    query = query.order_by(SupportTicket.updated_at.desc())

    count_query = select(func.count()).select_from(SupportTicket).where(SupportTicket.player_id == player.id)
    if status:
        count_query = count_query.where(SupportTicket.status == status)
    total = session.exec(count_query).one()

    tickets = session.exec(query.offset(offset).limit(limit)).all()

    for t in tickets:
        _auto_close_ticket(t, session)

    results = []
    for t in tickets:
        td = t.model_dump()
        td["has_new_activity"] = (
            t.player_last_viewed_at is None or
            (t.updated_at is not None and t.updated_at > t.player_last_viewed_at)
        )
        results.append(td)

    return {
        "tickets": results,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/tickets/{ticket_id}")
async def get_ticket_detail(
    ticket_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Ticket detail + replies (player view — no internal notes).
    FR-6.4, FR-6.13
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    ticket = session.get(SupportTicket, ticket_id)
    if not ticket or ticket.player_id != player.id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    _auto_close_ticket(ticket, session)

    ticket.player_last_viewed_at = datetime.now(timezone.utc)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    replies = session.exec(
        select(SupportReply)
        .where(SupportReply.ticket_id == ticket_id)
        .where(SupportReply.is_internal_note == False)
        .order_by(SupportReply.created_at.asc())
    ).all()

    return {
        "ticket": ticket.model_dump(),
        "replies": [r.model_dump() for r in replies],
    }


@router.post("/tickets/{ticket_id}/replies")
async def add_ticket_reply(
    ticket_id: int,
    body: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Player adds a reply to their ticket.
    FR-6.4, FR-6.14
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    ticket = session.get(SupportTicket, ticket_id)
    if not ticket or ticket.player_id != player.id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status not in ("open", "in_progress"):
        raise HTTPException(status_code=400, detail="Cannot reply to a ticket that is resolved or closed. Reopen it first.")

    content = sanitize_text(body.get("content", ""), max_length=5000)
    if not content or len(content) < 20:
        raise HTTPException(status_code=422, detail="Reply must be between 20 and 5000 characters")

    now = datetime.now(timezone.utc)

    reply = SupportReply(
        ticket_id=ticket.id,
        author_type="player",
        author_id=player.id,
        content=content,
        is_internal_note=False,
        created_at=now,
    )
    session.add(reply)

    ticket.updated_at = now
    session.add(ticket)
    session.commit()
    session.refresh(reply)

    return reply.model_dump()


@router.patch("/tickets/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: int,
    body: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Player reopens a resolved or closed ticket.
    FR-6.5, FR-6.15
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    ticket = session.get(SupportTicket, ticket_id)
    if not ticket or ticket.player_id != player.id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status not in ("resolved", "closed"):
        raise HTTPException(status_code=400, detail="Only resolved or closed tickets can be reopened")

    reason = sanitize_text(body.get("reason", ""), max_length=500)
    if not reason or len(reason) < 10:
        raise HTTPException(status_code=422, detail="Reopen reason must be between 10 and 500 characters")

    now = datetime.now(timezone.utc)

    ticket.status = "in_progress"
    ticket.resolved_at = None
    ticket.closed_at = None
    ticket.updated_at = now
    session.add(ticket)

    reply = SupportReply(
        ticket_id=ticket.id,
        author_type="player",
        author_id=player.id,
        content=f"[Reopened] {reason}",
        is_internal_note=False,
        created_at=now,
    )
    session.add(reply)
    session.commit()
    session.refresh(ticket)
    session.refresh(reply)

    return {
        "ticket": ticket.model_dump(),
        "reply": reply.model_dump(),
    }


@router.patch("/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: int,
    body: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Player closes their own ticket with an optional note.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    ticket = session.get(SupportTicket, ticket_id)
    if not ticket or ticket.player_id != player.id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status == "closed":
        raise HTTPException(status_code=400, detail="Ticket is already closed")

    now = datetime.now(timezone.utc)

    note = sanitize_text(body.get("note", ""), max_length=500)
    if note:
        reply = SupportReply(
            ticket_id=ticket.id,
            author_type="player",
            author_id=player.id,
            content=f"[Closed by player] {note}",
            is_internal_note=False,
            created_at=now,
        )
        session.add(reply)

    ticket.status = "closed"
    ticket.closed_at = now
    ticket.updated_at = now
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    return {"ticket": ticket.model_dump()}
