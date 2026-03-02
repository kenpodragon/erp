"""Admin access control and permissions routes."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_current_owner, get_client_ip
from models import Player, AdminWhitelistEmail, AdminWhitelistIP
from audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin-access"])


@router.get("/ping")
async def admin_ping(token: dict = Depends(get_current_admin)):
    """Stub — verifies admin auth pipeline is working end-to-end."""
    return {
        "message": "Admin access confirmed",
        "admin_email": token.get("email"),
    }


@router.get("/me")
async def admin_get_me(token: dict = Depends(get_current_admin)):
    """Return current admin profile and role info."""
    return {
        "email": token.get("email"),
        "is_owner": token.get("is_owner", False),
        "player": token.get("player")
    }


@router.get("/permissions/admins")
async def admin_list_system_admins(
    token: dict = Depends(get_current_owner),
    session: Session = Depends(get_session)
):
    """List all players with system admin or owner flags."""
    admins = session.exec(select(Player).where((Player.is_system_admin == True) | (Player.is_owner == True))).all()
    return admins


@router.patch("/players/{player_id}/permissions")
async def admin_update_permissions(
    player_id: int,
    body: dict,
    request: Request,
    token: dict = Depends(get_current_owner),
    session: Session = Depends(get_session)
):
    """
    Owner: Update system_admin or game_admin flags.
    Prevents updating is_owner via API.
    """
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    admin_email = token.get("email", "unknown")
    now = datetime.now(timezone.utc)
    changes = {}

    if "is_system_admin" in body:
        new_val = bool(body["is_system_admin"])
        if player.is_system_admin != new_val:
            changes["is_system_admin"] = {"old": player.is_system_admin, "new": new_val}
            player.is_system_admin = new_val

    if "is_game_admin" in body:
        new_val = bool(body["is_game_admin"])
        if player.is_game_admin != new_val:
            changes["is_game_admin"] = {"old": player.is_game_admin, "new": new_val}
            player.is_game_admin = new_val

    if changes:
        player.updated_at = now
        session.add(player)
        session.commit()

        write_audit_log(
            session=session,
            admin_email=admin_email,
            action="permissions_updated",
            target_type="player",
            target_id=str(player_id),
            details=changes,
            ip_address=get_client_ip(request),
        )

    session.refresh(player)
    return player.model_dump()


@router.get("/access-control")
async def admin_get_access_control(
    request: Request,
    token: dict = Depends(get_current_owner),
    session: Session = Depends(get_session)
):
    """Owner: List whitelisted emails and IPs + current requester info."""
    emails = session.exec(select(AdminWhitelistEmail)).all()
    ips = session.exec(select(AdminWhitelistIP)).all()

    return {
        "emails": emails,
        "ips": ips,
        "current_ip": get_client_ip(request),
        "current_email": token.get("email")
    }


@router.post("/access-control/emails")
async def admin_add_whitelist_email(
    body: dict,
    token: dict = Depends(get_current_owner),
    session: Session = Depends(get_session)
):
    """Owner: Add email to admin whitelist."""
    email = body.get("email", "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Valid email is required")

    existing = session.get(AdminWhitelistEmail, email)
    if existing:
        return existing

    new_entry = AdminWhitelistEmail(
        email=email,
        added_by=token.get("email"),
        created_at=datetime.now(timezone.utc)
    )
    session.add(new_entry)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email"),
        action="whitelist_email_added",
        target_type="access_control",
        target_id=email,
        details={},
        ip_address=None
    )

    return new_entry


@router.delete("/access-control/emails/{email}")
async def admin_remove_whitelist_email(
    email: str,
    token: dict = Depends(get_current_owner),
    session: Session = Depends(get_session)
):
    """Owner: Remove email from whitelist (cannot remove self)."""
    email = email.lower()
    if email == token.get("email", "").lower():
        raise HTTPException(status_code=400, detail="You cannot remove your own email from the whitelist")

    entry = session.get(AdminWhitelistEmail, email)
    if not entry:
        raise HTTPException(status_code=404, detail="Email not found in whitelist")

    session.delete(entry)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email"),
        action="whitelist_email_removed",
        target_type="access_control",
        target_id=email,
        details={}
    )
    return {"message": "Email removed"}


@router.post("/access-control/ips")
async def admin_add_whitelist_ip(
    body: dict,
    token: dict = Depends(get_current_owner),
    session: Session = Depends(get_session)
):
    """Owner: Add IP to admin whitelist."""
    ip = body.get("ip", "").strip()
    note = body.get("note", "").strip()
    if not ip:
        raise HTTPException(status_code=422, detail="IP address is required")

    existing = session.get(AdminWhitelistIP, ip)
    if existing:
        return existing

    new_entry = AdminWhitelistIP(
        ip_address=ip,
        note=note,
        added_by=token.get("email"),
        created_at=datetime.now(timezone.utc)
    )
    session.add(new_entry)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email"),
        action="whitelist_ip_added",
        target_type="access_control",
        target_id=ip,
        details={"note": note}
    )
    return new_entry


@router.delete("/access-control/ips/{ip}")
async def admin_remove_whitelist_ip(
    ip: str,
    request: Request,
    token: dict = Depends(get_current_owner),
    session: Session = Depends(get_session)
):
    """Owner: Remove IP from whitelist (cannot remove current IP)."""
    if ip == get_client_ip(request):
        raise HTTPException(status_code=400, detail="You cannot remove your current IP from the whitelist")

    entry = session.get(AdminWhitelistIP, ip)
    if not entry:
        raise HTTPException(status_code=404, detail="IP not found in whitelist")

    session.delete(entry)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email"),
        action="whitelist_ip_removed",
        target_type="access_control",
        target_id=ip,
        details={}
    )
    return {"message": "IP removed"}
