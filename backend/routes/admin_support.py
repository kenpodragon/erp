"""Admin support ticket management routes."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import Player, SupportTicket, SupportReply
from audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/support", tags=["admin-support"])

VALID_PRIORITIES = {"low", "normal", "high", "critical"}
VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}


@router.get("/tickets")
async def admin_list_tickets(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_admin: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 20,
    offset: int = 0,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: List all tickets with filters and pagination.
    FR-6.7, FR-6.16
    """
    query = select(SupportTicket)

    if status:
        query = query.where(SupportTicket.status == status)
    if category:
        query = query.where(SupportTicket.category == category)
    if priority:
        query = query.where(SupportTicket.priority == priority)
    if assigned_admin:
        query = query.where(SupportTicket.assigned_admin == assigned_admin)

    sort_col = getattr(SupportTicket, sort_by, SupportTicket.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    count_q = select(func.count()).select_from(SupportTicket)
    if status:
        count_q = count_q.where(SupportTicket.status == status)
    if category:
        count_q = count_q.where(SupportTicket.category == category)
    if priority:
        count_q = count_q.where(SupportTicket.priority == priority)
    if assigned_admin:
        count_q = count_q.where(SupportTicket.assigned_admin == assigned_admin)
    total = session.exec(count_q).one()

    tickets = session.exec(query.offset(offset).limit(limit)).all()

    results = []
    for t in tickets:
        player = session.get(Player, t.player_id)
        has_new = (
            t.admin_last_viewed_at is None or
            (t.updated_at is not None and t.updated_at > t.admin_last_viewed_at)
        )
        results.append({
            **t.model_dump(),
            "player_alias": player.alias if player else None,
            "player_email": player.email if player else None,
            "has_new_activity": has_new,
        })

    return {
        "tickets": results,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/tickets/{ticket_id}")
async def admin_get_ticket_detail(
    ticket_id: int,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: Full ticket detail with all replies (including internal notes).
    FR-6.8
    """
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.admin_last_viewed_at = datetime.now(timezone.utc)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    player = session.get(Player, ticket.player_id)

    replies = session.exec(
        select(SupportReply)
        .where(SupportReply.ticket_id == ticket_id)
        .order_by(SupportReply.created_at.asc())
    ).all()

    return {
        "ticket": {
            **ticket.model_dump(),
            "player_alias": player.alias if player else None,
            "player_email": player.email if player else None,
            "player_id": ticket.player_id,
        },
        "replies": [r.model_dump() for r in replies],
    }


@router.patch("/tickets/{ticket_id}")
async def admin_update_ticket(
    ticket_id: int,
    body: dict,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin: Update ticket priority, status, assignment.
    FR-6.8, FR-6.17
    """
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)
    changes = {}

    if "priority" in body:
        new_priority = body["priority"]
        if new_priority not in VALID_PRIORITIES:
            raise HTTPException(status_code=422, detail=f"Priority must be one of: {', '.join(sorted(VALID_PRIORITIES))}")
        changes["priority"] = {"old": ticket.priority, "new": new_priority}
        ticket.priority = new_priority

    if "status" in body:
        new_status = body["status"]
        if new_status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail=f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        changes["status"] = {"old": ticket.status, "new": new_status}
        ticket.status = new_status
        if new_status == "resolved":
            ticket.resolved_at = now
        elif new_status == "closed":
            ticket.closed_at = now

    if "assigned_admin" in body:
        changes["assigned_admin"] = {"old": ticket.assigned_admin, "new": body["assigned_admin"]}
        ticket.assigned_admin = body["assigned_admin"]

    ticket.updated_at = now
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    for change_type, detail in changes.items():
        write_audit_log(
            session=session,
            admin_email=admin_email,
            action=f"ticket_{change_type}_changed",
            target_type="ticket",
            target_id=str(ticket_id),
            details=detail,
            ip_address=get_client_ip(request),
        )

    session.refresh(ticket)
    return ticket.model_dump()


@router.post("/tickets/{ticket_id}/replies")
async def admin_reply_to_ticket(
    ticket_id: int,
    body: dict,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin posts a reply visible to the player.
    FR-6.8, FR-6.14
    """
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=422, detail="Reply content is required")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)

    reply = SupportReply(
        ticket_id=ticket.id,
        author_type="admin",
        author_email=admin_email,
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


@router.post("/tickets/{ticket_id}/notes")
async def admin_add_internal_note(
    ticket_id: int,
    body: dict,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Admin adds an internal note (not visible to player).
    FR-6.8, FR-6.18
    """
    ticket = session.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=422, detail="Note content is required")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)

    note = SupportReply(
        ticket_id=ticket.id,
        author_type="admin",
        author_email=admin_email,
        content=content,
        is_internal_note=True,
        created_at=now,
    )
    session.add(note)

    ticket.updated_at = now
    session.add(ticket)
    session.commit()
    session.refresh(note)

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="ticket_note_added",
        target_type="ticket",
        target_id=str(ticket_id),
        details={"note_id": note.id},
        ip_address=get_client_ip(request),
    )

    session.refresh(note)
    return note.model_dump()
