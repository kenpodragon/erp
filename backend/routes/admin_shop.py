"""Admin shop management routes: items, bundles, player inventory, refunds."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin
from audit import write_audit_log
from models.shop import ShopItem, ShopBundle, ShopBundleItem, PlayerShopItem
from services.shop_service import ShopError, admin_refund_item

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/shop", tags=["admin-shop"])


# =============================================================================
# Request Models
# =============================================================================

class CreateShopItemRequest(BaseModel):
    item_key: str
    name: str
    description: Optional[str] = None
    category: str  # skin, flair, badge, avatar, booster
    price_shards: int
    icon_asset_key: Optional[str] = None
    class_restriction: Optional[int] = None
    item_metadata: Optional[dict] = None
    is_active: bool = True
    is_featured: bool = False
    featured_from: Optional[str] = None
    featured_until: Optional[str] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    sort_order: int = 0


class UpdateShopItemRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_shards: Optional[int] = None
    icon_asset_key: Optional[str] = None
    item_metadata: Optional[dict] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    featured_from: Optional[str] = None
    featured_until: Optional[str] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    sort_order: Optional[int] = None


class CreateBundleRequest(BaseModel):
    bundle_key: str
    name: str
    description: Optional[str] = None
    price_shards: int
    original_price_shards: int
    discount_pct: int = 20
    icon_asset_key: Optional[str] = None
    item_ids: list[int]  # shop_item IDs to include
    is_active: bool = True
    sort_order: int = 0


class UpdateBundleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_shards: Optional[int] = None
    original_price_shards: Optional[int] = None
    discount_pct: Optional[int] = None
    icon_asset_key: Optional[str] = None
    item_ids: Optional[list[int]] = None  # if provided, replaces contents
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class AdminRefundRequest(BaseModel):
    item_id: int
    reason: str


# =============================================================================
# Helpers
# =============================================================================

DATETIME_FIELDS = (
    "featured_from", "featured_until", "available_from", "available_until",
)


def _parse_optional_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse an ISO datetime string, returning None if blank/None."""
    if not value:
        return None
    return datetime.fromisoformat(value)


# =============================================================================
# 1. Shop Items — CRUD
# =============================================================================

@router.get("/items")
async def list_shop_items(
    request: Request,
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all shop items with optional filters and pagination."""
    query = select(ShopItem)
    if category is not None:
        query = query.where(ShopItem.category == category)
    if is_active is not None:
        query = query.where(ShopItem.is_active == is_active)
    query = query.order_by(ShopItem.sort_order, ShopItem.id)
    query = query.offset((page - 1) * page_size).limit(page_size)

    items = session.exec(query).all()
    return {"items": [item.dict() for item in items], "page": page, "page_size": page_size}


@router.post("/items")
async def create_shop_item(
    body: CreateShopItemRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new shop item."""
    item = ShopItem(
        item_key=body.item_key,
        name=body.name,
        description=body.description,
        category=body.category,
        price_shards=body.price_shards,
        icon_asset_key=body.icon_asset_key,
        class_restriction=body.class_restriction,
        item_metadata=body.item_metadata,
        is_active=body.is_active,
        is_featured=body.is_featured,
        featured_from=_parse_optional_datetime(body.featured_from),
        featured_until=_parse_optional_datetime(body.featured_until),
        available_from=_parse_optional_datetime(body.available_from),
        available_until=_parse_optional_datetime(body.available_until),
        sort_order=body.sort_order,
    )
    session.add(item)
    session.commit()
    session.refresh(item)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="create_shop_item",
        target_type="shop_item",
        target_id=str(item.id),
        details={"item_key": item.item_key, "category": item.category, "price_shards": item.price_shards},
    )

    return {"item": item.dict()}


@router.put("/items/{item_id}")
async def update_shop_item(
    item_id: int,
    body: UpdateShopItemRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a shop item. Only fields that are not None are updated."""
    item = session.get(ShopItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Shop item not found")

    changes = {}
    for field, value in body.dict(exclude_unset=True).items():
        if value is None:
            continue
        if field in DATETIME_FIELDS:
            parsed = _parse_optional_datetime(value)
            setattr(item, field, parsed)
            changes[field] = value
        else:
            setattr(item, field, value)
            changes[field] = value

    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()
    session.refresh(item)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="update_shop_item",
        target_type="shop_item",
        target_id=str(item_id),
        details=changes,
    )

    return {"item": item.dict()}


@router.delete("/items/{item_id}")
async def delete_shop_item(
    item_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Soft-delete a shop item by setting is_active = False."""
    item = session.get(ShopItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Shop item not found")

    item.is_active = False
    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="delete_shop_item",
        target_type="shop_item",
        target_id=str(item_id),
        details={"soft_delete": True},
    )

    return {"status": "ok", "message": f"Shop item {item_id} deactivated"}


# =============================================================================
# 2. Bundles — CRUD
# =============================================================================

@router.get("/bundles")
async def list_bundles(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all bundles with their contained items."""
    bundles = session.exec(
        select(ShopBundle).order_by(ShopBundle.sort_order, ShopBundle.id)
    ).all()

    results = []
    for bundle in bundles:
        # Fetch junction rows with joined shop items
        junction_rows = session.exec(
            select(ShopBundleItem)
            .where(ShopBundleItem.bundle_id == bundle.id)
            .order_by(ShopBundleItem.sort_order)
        ).all()

        contents = []
        for jrow in junction_rows:
            si = session.get(ShopItem, jrow.shop_item_id)
            if si:
                contents.append(si.dict())

        bundle_dict = bundle.dict()
        bundle_dict["contents"] = contents
        results.append(bundle_dict)

    return {"bundles": results}


@router.post("/bundles")
async def create_bundle(
    body: CreateBundleRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new bundle with its item contents."""
    bundle = ShopBundle(
        bundle_key=body.bundle_key,
        name=body.name,
        description=body.description,
        price_shards=body.price_shards,
        original_price_shards=body.original_price_shards,
        discount_pct=body.discount_pct,
        icon_asset_key=body.icon_asset_key,
        is_active=body.is_active,
        sort_order=body.sort_order,
    )
    session.add(bundle)
    session.commit()
    session.refresh(bundle)

    # Create junction rows
    for idx, item_id in enumerate(body.item_ids):
        junction = ShopBundleItem(
            bundle_id=bundle.id,
            shop_item_id=item_id,
            sort_order=idx,
        )
        session.add(junction)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="create_bundle",
        target_type="shop_bundle",
        target_id=str(bundle.id),
        details={"bundle_key": bundle.bundle_key, "item_ids": body.item_ids},
    )

    return {"bundle": bundle.dict(), "item_ids": body.item_ids}


@router.put("/bundles/{bundle_id}")
async def update_bundle(
    bundle_id: int,
    body: UpdateBundleRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a bundle. If item_ids is provided, replace the bundle contents."""
    bundle = session.get(ShopBundle, bundle_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    changes = {}
    for field, value in body.dict(exclude_unset=True).items():
        if value is None or field == "item_ids":
            continue
        setattr(bundle, field, value)
        changes[field] = value

    bundle.updated_at = datetime.now(timezone.utc)
    session.add(bundle)

    # Replace bundle contents if item_ids provided
    if body.item_ids is not None:
        old_rows = session.exec(
            select(ShopBundleItem).where(ShopBundleItem.bundle_id == bundle_id)
        ).all()
        for row in old_rows:
            session.delete(row)
        session.flush()

        for idx, item_id in enumerate(body.item_ids):
            junction = ShopBundleItem(
                bundle_id=bundle_id,
                shop_item_id=item_id,
                sort_order=idx,
            )
            session.add(junction)
        changes["item_ids"] = body.item_ids

    session.commit()
    session.refresh(bundle)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="update_bundle",
        target_type="shop_bundle",
        target_id=str(bundle_id),
        details=changes,
    )

    return {"bundle": bundle.dict()}


# =============================================================================
# 3. Player Inventory & Refunds
# =============================================================================

@router.post("/player/{player_id}/refund")
async def refund_player_item(
    player_id: int,
    body: AdminRefundRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Admin-initiated refund of a player's shop item."""
    try:
        result = admin_refund_item(player_id, body.item_id, body.reason, session)
    except ShopError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="admin_refund_shop_item",
        target_type="shop_item",
        target_id=str(body.item_id),
        details={"player_id": player_id, "reason": body.reason},
    )

    return result


@router.get("/player/{player_id}/items")
async def list_player_items(
    player_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List a player's owned shop items."""
    rows = session.exec(
        select(PlayerShopItem, ShopItem)
        .join(ShopItem, PlayerShopItem.shop_item_id == ShopItem.id)
        .where(PlayerShopItem.player_id == player_id)
        .order_by(PlayerShopItem.purchased_at.desc())
    ).all()

    items = []
    for player_item, shop_item in rows:
        entry = player_item.dict()
        entry["shop_item"] = shop_item.dict()
        items.append(entry)

    return {"player_id": player_id, "items": items}
