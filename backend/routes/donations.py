"""Player-facing donation endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from db import get_session
from auth import get_current_player
import services.donation_service as donation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/donations", tags=["donations"])


class CreateSessionRequest(BaseModel):
    amount_cents: int


class VisibilityRequest(BaseModel):
    visible: bool


@router.post("/create-session")
async def create_donation_session(
    body: CreateSessionRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return donation_service.create_donation_checkout_session(
            player.id, body.amount_cents, session
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status")
async def get_donation_status(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return donation_service.get_patron_status(player.id, session)


@router.get("/history")
async def get_donation_history(
    limit: int = 20,
    offset: int = 0,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return donation_service.get_donation_history(player.id, session, limit, offset)


@router.get("/leaderboard")
async def get_donor_leaderboard(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return donation_service.get_donor_leaderboard(session)


@router.get("/recent")
async def get_recent_donors(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return donation_service.get_recent_donors(session)


@router.put("/visibility")
async def toggle_visibility(
    body: VisibilityRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return donation_service.toggle_donor_visibility(player.id, body.visible, session)
