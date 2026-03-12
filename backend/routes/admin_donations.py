"""Admin donation endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from db import get_session
from auth import get_current_admin
import services.donation_service as donation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/donations", tags=["admin-donations"])


@router.get("")
async def list_donations(
    player_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return donation_service.admin_get_donations(session, player_id, limit, offset)


@router.get("/stats")
async def donation_stats(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return donation_service.admin_get_donation_stats(session)


@router.get("/player/{player_id}")
async def player_donation_history(
    player_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return donation_service.admin_get_player_donations(player_id, session)
