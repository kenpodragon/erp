"""Admin marketplace endpoints: listings, trades, stats, moderation (3.5)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session
from sqlalchemy import text

from db import get_session
from auth import get_current_admin
from audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/marketplace", tags=["admin-marketplace"])


# =============================================================================
# Request Models
# =============================================================================

class ReverseTradeRequest(BaseModel):
    reason: str


# =============================================================================
# GET /api/admin/marketplace/listings
# =============================================================================

@router.get("/listings")
async def list_listings(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    player_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List marketplace listings with optional filters and pagination."""
    conditions = []
    params: dict = {}

    if status:
        conditions.append("ml.status = :status")
        params["status"] = status
    if player_id:
        conditions.append("ml.seller_id = :player_id")
        params["player_id"] = player_id
    if search:
        conditions.append("(ml.item_type ILIKE :search OR ml.item_snapshot::text ILIKE :search)")
        params["search"] = f"%{search}%"

    where_clause = (" AND " + " AND ".join(conditions)) if conditions else ""

    count_row = session.execute(
        text(f"SELECT COUNT(*) FROM marketplace_listings ml WHERE 1=1{where_clause}"),
        params,
    ).scalar()

    params["limit"] = page_size
    params["offset"] = (page - 1) * page_size

    rows = session.execute(
        text(
            f"SELECT ml.*, p.display_name AS seller_name "
            f"FROM marketplace_listings ml "
            f"LEFT JOIN players p ON p.id = ml.seller_id "
            f"WHERE 1=1{where_clause} "
            f"ORDER BY ml.created_at DESC "
            f"LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    listings = [dict(r._mapping) for r in rows]

    return {
        "listings": listings,
        "total": count_row,
        "page": page,
        "page_size": page_size,
    }


# =============================================================================
# DELETE /api/admin/marketplace/listings/{listing_id}
# =============================================================================

@router.delete("/listings/{listing_id}")
async def remove_listing(
    listing_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Force-remove a marketplace listing. Returns item to seller and creates notification."""
    listing_row = session.execute(
        text("SELECT * FROM marketplace_listings WHERE id = :lid"),
        {"lid": listing_id},
    ).fetchone()

    if not listing_row:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = dict(listing_row._mapping)

    if listing["status"] != "active":
        raise HTTPException(status_code=400, detail=f"Listing is already {listing['status']}")

    # Mark listing as removed
    session.execute(
        text("UPDATE marketplace_listings SET status = 'removed', updated_at = NOW() WHERE id = :lid"),
        {"lid": listing_id},
    )

    # Return item to seller
    session.execute(
        text(
            "UPDATE player_artifacts SET is_listed = FALSE, updated_at = NOW() "
            "WHERE id = :ref_id AND player_id = :pid"
        ),
        {"ref_id": listing["item_ref_id"], "pid": listing["seller_id"]},
    )

    # Create notification for seller
    session.execute(
        text(
            "INSERT INTO marketplace_notifications "
            "(player_id, notification_type, title, message, related_listing_id, created_at) "
            "VALUES (:pid, 'listing_removed', 'Listing Removed', "
            "'Your marketplace listing has been removed by an administrator.', :lid, NOW())"
        ),
        {"pid": listing["seller_id"], "lid": listing_id},
    )

    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="remove_marketplace_listing",
        target_type="marketplace_listing",
        target_id=str(listing_id),
        details={"seller_id": listing["seller_id"], "item_type": listing["item_type"]},
    )

    return {"status": "ok", "message": f"Listing {listing_id} removed and item returned to seller"}


# =============================================================================
# GET /api/admin/marketplace/trades
# =============================================================================

@router.get("/trades")
async def list_trades(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    player_id: Optional[int] = Query(None),
    min_amount: Optional[int] = Query(None),
    max_amount: Optional[int] = Query(None),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List marketplace trades with optional filters and pagination."""
    conditions = []
    params: dict = {}

    if player_id:
        conditions.append("(mt.buyer_id = :player_id OR mt.seller_id = :player_id)")
        params["player_id"] = player_id
    if min_amount is not None:
        conditions.append("mt.price_shards >= :min_amount")
        params["min_amount"] = min_amount
    if max_amount is not None:
        conditions.append("mt.price_shards <= :max_amount")
        params["max_amount"] = max_amount

    where_clause = (" AND " + " AND ".join(conditions)) if conditions else ""

    count_row = session.execute(
        text(f"SELECT COUNT(*) FROM marketplace_trades mt WHERE 1=1{where_clause}"),
        params,
    ).scalar()

    params["limit"] = page_size
    params["offset"] = (page - 1) * page_size

    rows = session.execute(
        text(
            f"SELECT mt.*, "
            f"bp.display_name AS buyer_name, sp.display_name AS seller_name "
            f"FROM marketplace_trades mt "
            f"LEFT JOIN players bp ON bp.id = mt.buyer_id "
            f"LEFT JOIN players sp ON sp.id = mt.seller_id "
            f"WHERE 1=1{where_clause} "
            f"ORDER BY mt.created_at DESC "
            f"LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()

    trades = [dict(r._mapping) for r in rows]

    return {
        "trades": trades,
        "total": count_row,
        "page": page,
        "page_size": page_size,
    }


# =============================================================================
# GET /api/admin/marketplace/stats
# =============================================================================

@router.get("/stats")
async def get_marketplace_stats(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return aggregate marketplace statistics."""
    stats_row = session.execute(
        text(
            "SELECT "
            "  COALESCE(SUM(price_shards), 0) AS total_volume, "
            "  COALESCE(AVG(price_shards), 0) AS avg_price, "
            "  COALESCE(SUM(tax_shards), 0) AS total_tax_burned "
            "FROM marketplace_trades"
        )
    ).fetchone()

    active_count = session.execute(
        text("SELECT COUNT(*) FROM marketplace_listings WHERE status = 'active'")
    ).scalar()

    return {
        "total_volume": int(stats_row.total_volume) if stats_row else 0,
        "avg_price": round(float(stats_row.avg_price), 2) if stats_row else 0,
        "total_tax_burned": int(stats_row.total_tax_burned) if stats_row else 0,
        "active_listings_count": active_count or 0,
    }


# =============================================================================
# GET /api/admin/marketplace/player/{player_id}
# =============================================================================

@router.get("/player/{player_id}")
async def get_player_marketplace_activity(
    player_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return a player's marketplace activity: listings, trades, salvage."""
    # Listings
    listing_rows = session.execute(
        text(
            "SELECT * FROM marketplace_listings WHERE seller_id = :pid ORDER BY created_at DESC LIMIT 100"
        ),
        {"pid": player_id},
    ).fetchall()
    listings = [dict(r._mapping) for r in listing_rows]

    # Trades (as buyer or seller)
    trade_rows = session.execute(
        text(
            "SELECT * FROM marketplace_trades "
            "WHERE buyer_id = :pid OR seller_id = :pid "
            "ORDER BY created_at DESC LIMIT 100"
        ),
        {"pid": player_id},
    ).fetchall()
    trades = [dict(r._mapping) for r in trade_rows]

    # Salvage activity
    salvage_rows = session.execute(
        text(
            "SELECT * FROM salvage_log WHERE player_id = :pid ORDER BY created_at DESC LIMIT 100"
        ),
        {"pid": player_id},
    ).fetchall()
    salvage = [dict(r._mapping) for r in salvage_rows]

    return {
        "player_id": player_id,
        "listings": listings,
        "trades": trades,
        "salvage": salvage,
    }


# =============================================================================
# POST /api/admin/marketplace/reverse-trade/{trade_id}
# =============================================================================

@router.post("/reverse-trade/{trade_id}")
async def reverse_trade(
    trade_id: int,
    body: ReverseTradeRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Reverse a completed trade: return item to seller, debit buyer, credit seller."""
    trade_row = session.execute(
        text("SELECT * FROM marketplace_trades WHERE id = :tid"),
        {"tid": trade_id},
    ).fetchone()

    if not trade_row:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade = dict(trade_row._mapping)

    if trade.get("claim_status") == "reversed":
        raise HTTPException(status_code=400, detail="Trade has already been reversed")

    buyer_id = trade["buyer_id"]
    seller_id = trade["seller_id"]
    price = trade["price_shards"]
    tax = trade.get("tax_shards", 0)

    # Return item to seller (mark as not listed, transfer ownership back)
    if trade.get("item_ref_id"):
        session.execute(
            text(
                "UPDATE player_artifacts SET player_id = :seller_id, is_listed = FALSE, updated_at = NOW() "
                "WHERE id = :ref_id"
            ),
            {"seller_id": seller_id, "ref_id": trade["item_ref_id"]},
        )

    # Debit buyer (they got the item, now give shards back)
    seller_received = price - tax
    session.execute(
        text(
            "UPDATE player_meta_progression SET shard_balance = shard_balance + :amount WHERE player_id = :pid"
        ),
        {"amount": price, "pid": buyer_id},
    )

    # Debit seller (they received shards, now take them back)
    session.execute(
        text(
            "UPDATE player_meta_progression SET shard_balance = shard_balance - :amount WHERE player_id = :pid"
        ),
        {"amount": seller_received, "pid": seller_id},
    )

    # Mark trade as reversed
    session.execute(
        text("UPDATE marketplace_trades SET claim_status = 'reversed', updated_at = NOW() WHERE id = :tid"),
        {"tid": trade_id},
    )

    # Notify both parties
    for pid, msg in [
        (buyer_id, f"A marketplace trade has been reversed by an administrator. Reason: {body.reason}"),
        (seller_id, f"A marketplace trade has been reversed by an administrator. Reason: {body.reason}"),
    ]:
        session.execute(
            text(
                "INSERT INTO marketplace_notifications "
                "(player_id, notification_type, title, message, related_trade_id, created_at) "
                "VALUES (:pid, 'trade_reversed', 'Trade Reversed', :msg, :tid, NOW())"
            ),
            {"pid": pid, "msg": msg, "tid": trade_id},
        )

    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="reverse_marketplace_trade",
        target_type="marketplace_trade",
        target_id=str(trade_id),
        details={
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "price_shards": price,
            "reason": body.reason,
        },
    )

    return {
        "status": "ok",
        "message": f"Trade {trade_id} reversed",
        "buyer_refunded": price,
        "seller_debited": seller_received,
    }
