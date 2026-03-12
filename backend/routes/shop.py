"""Player-facing shop endpoints: catalog, purchases, cosmetics, boosters."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from sqlalchemy import text

from db import get_session
from auth import get_current_player
from services.shop_service import ShopError
import services.shop_service as shop_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/shop", tags=["shop"])


# =============================================================================
# Request Models
# =============================================================================

class PurchaseRequest(BaseModel):
    item_id: int

class PurchaseBundleRequest(BaseModel):
    bundle_id: int

class EquipRequest(BaseModel):
    item_id: int

class UnequipRequest(BaseModel):
    slot: str

class BoosterPingRequest(BaseModel):
    elapsed_seconds: int


# =============================================================================
# GET /api/shop/catalog
# =============================================================================

@router.get("/catalog")
async def get_catalog(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return shop_service.get_catalog(player.id, session)


# =============================================================================
# POST /api/shop/purchase
# =============================================================================

@router.post("/purchase")
async def purchase_item(
    body: PurchaseRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return shop_service.purchase_item(player.id, body.item_id, session)
    except ShopError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/shop/purchase-bundle
# =============================================================================

@router.post("/purchase-bundle")
async def purchase_bundle(
    body: PurchaseBundleRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return shop_service.purchase_bundle(player.id, body.bundle_id, session)
    except ShopError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/shop/equip
# =============================================================================

@router.post("/equip")
async def equip_cosmetic(
    body: EquipRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return shop_service.equip_cosmetic(player.id, body.item_id, session)
    except ShopError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/shop/unequip
# =============================================================================

@router.post("/unequip")
async def unequip_cosmetic(
    body: UnequipRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return shop_service.unequip_cosmetic(player.id, body.slot, session)
    except ShopError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# GET /api/shop/collection
# =============================================================================

@router.get("/collection")
async def get_collection(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return shop_service.get_player_collection(player.id, session)


# =============================================================================
# GET /api/shop/boosters
# =============================================================================

@router.get("/boosters")
async def get_active_boosters(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return shop_service.get_active_boosters(player.id, session)


# =============================================================================
# POST /api/shop/booster-ping
# =============================================================================

@router.post("/booster-ping")
async def booster_ping(
    body: BoosterPingRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check for active story session
    story_row = session.execute(
        text("SELECT id FROM player_story_sessions WHERE player_id = :pid AND status = 'active' LIMIT 1"),
        {"pid": player.id},
    ).first()

    # Check for active idle training session
    idle_row = session.execute(
        text("SELECT id FROM idle_training_sessions WHERE player_id = :pid AND status = 'active' LIMIT 1"),
        {"pid": player.id},
    ).first()

    if not story_row and not idle_row:
        raise HTTPException(status_code=400, detail="No active session — booster timer paused.")

    try:
        return shop_service.increment_booster_time(player.id, body.elapsed_seconds, session)
    except ShopError as e:
        raise HTTPException(status_code=400, detail=str(e))
