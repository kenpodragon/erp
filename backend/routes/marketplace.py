"""Player-facing marketplace endpoints: browse, buy, sell, salvage, notifications (3.5)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session

from db import get_session
from auth import get_current_player
from services.rate_limiter import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


# =============================================================================
# Request Models
# =============================================================================

class CreateListingRequest(BaseModel):
    item_type: str
    item_ref_id: int
    price_shards: int


class BuyRequest(BaseModel):
    listing_id: int


class CancelRequest(BaseModel):
    listing_id: int


class AdjustPriceRequest(BaseModel):
    listing_id: int
    new_price: int


class SalvageRequest(BaseModel):
    item_type: str
    item_ref_id: int


class BulkSalvageRequest(BaseModel):
    items: list[dict]  # each has item_type + item_ref_id


class SalvagePreviewRequest(BaseModel):
    items: list[dict]


class ClaimRequest(BaseModel):
    trade_id: int
    action: str
    replace_item_id: Optional[int] = None


class MarkReadRequest(BaseModel):
    notification_ids: list[int]


# =============================================================================
# GET /api/marketplace/browse
# =============================================================================

@router.get("/browse")
async def browse_listings(
    item_type: Optional[str] = Query(None),
    rarity: Optional[str] = Query(None),
    gear_slot: Optional[str] = Query(None),
    min_price: Optional[int] = Query(None),
    max_price: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("price_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _rl=Depends(rate_limit("marketplace_browse", 30)),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Browse active marketplace listings with filters and pagination."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service

    filters = {
        "item_type": item_type,
        "rarity": rarity,
        "gear_slot": gear_slot,
        "min_price": min_price,
        "max_price": max_price,
        "search": search,
        "sort": sort,
        "page": page,
        "page_size": page_size,
    }

    try:
        return marketplace_service.get_browse_listings(filters, page, page_size, session)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/marketplace/list
# =============================================================================

@router.post("/list")
async def create_listing(
    body: CreateListingRequest,
    _rl=Depends(rate_limit("marketplace_list", 10)),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Create a new marketplace listing."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service
    from services.marketplace_service import MarketplaceError

    try:
        result = marketplace_service.create_listing(
            player.id, body.item_type, body.item_ref_id, body.price_shards, session
        )
        session.commit()
        return result
    except MarketplaceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# =============================================================================
# POST /api/marketplace/buy
# =============================================================================

@router.post("/buy")
async def buy_listing(
    body: BuyRequest,
    _rl=Depends(rate_limit("marketplace_buy", 10)),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Purchase a marketplace listing."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service
    from services.marketplace_service import MarketplaceError

    try:
        result = marketplace_service.buy_listing(player.id, body.listing_id, session)
        session.commit()
        return result
    except MarketplaceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# =============================================================================
# POST /api/marketplace/cancel
# =============================================================================

@router.post("/cancel")
async def cancel_listing(
    body: CancelRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Cancel an active listing and return the item to the seller."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service
    from services.marketplace_service import MarketplaceError

    try:
        result = marketplace_service.cancel_listing(player.id, body.listing_id, session)
        session.commit()
        return result
    except MarketplaceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# =============================================================================
# POST /api/marketplace/adjust-price
# =============================================================================

@router.post("/adjust-price")
async def adjust_price(
    body: AdjustPriceRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Adjust the price of an active listing."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service
    from services.marketplace_service import MarketplaceError

    try:
        result = marketplace_service.adjust_price(player.id, body.listing_id, body.new_price, session)
        session.commit()
        return result
    except MarketplaceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))


# =============================================================================
# GET /api/marketplace/my-listings
# =============================================================================

@router.get("/my-listings")
async def get_my_listings(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Get the current player's active and expired listings."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service

    return marketplace_service.get_my_listings(player.id, session)


# =============================================================================
# GET /api/marketplace/trade-history
# =============================================================================

@router.get("/trade-history")
async def get_trade_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: str = Query("all"),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Get trade history (sales, purchases, or all)."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service

    return marketplace_service.get_trade_history(player.id, page, page_size, type, session)


# =============================================================================
# GET /api/marketplace/notifications
# =============================================================================

@router.get("/notifications")
async def get_notifications(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Get unread marketplace notifications for the current player."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_notification_service as marketplace_notification_service

    return marketplace_notification_service.get_unread_notifications(player.id, session)


# =============================================================================
# POST /api/marketplace/notifications/read
# =============================================================================

@router.post("/notifications/read")
async def mark_notifications_read(
    body: MarkReadRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Mark marketplace notifications as read."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_notification_service as marketplace_notification_service

    try:
        result = marketplace_notification_service.mark_read(player.id, body.notification_ids, session)
        session.commit()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/marketplace/salvage
# =============================================================================

@router.post("/salvage")
async def salvage_item(
    body: SalvageRequest,
    _rl=Depends(rate_limit("marketplace_salvage", 10)),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Salvage a single item for components/shards."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.salvage_service as salvage_service

    try:
        result = salvage_service.salvage_single(player.id, body.item_type, body.item_ref_id, session)
        session.commit()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/marketplace/salvage-bulk
# =============================================================================

@router.post("/salvage-bulk")
async def salvage_bulk(
    body: BulkSalvageRequest,
    _rl=Depends(rate_limit("marketplace_salvage", 10)),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Salvage multiple items at once."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.salvage_service as salvage_service

    try:
        result = salvage_service.salvage_bulk(player.id, body.items, session)
        session.commit()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/marketplace/salvage-preview
# =============================================================================

@router.post("/salvage-preview")
async def salvage_preview(
    body: SalvagePreviewRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Preview salvage value for a set of items without salvaging."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.salvage_service as salvage_service

    try:
        return salvage_service.get_salvage_value(player.id, body.items, session)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# POST /api/marketplace/claim
# =============================================================================

@router.post("/claim")
async def claim_trade(
    body: ClaimRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Claim or resolve a completed trade (accept item, replace, etc.)."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    import services.marketplace_service as marketplace_service
    from services.marketplace_service import MarketplaceError

    try:
        result = marketplace_service.resolve_claim(
            player.id, body.trade_id, body.action, body.replace_item_id, session
        )
        session.commit()
        return result
    except MarketplaceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
