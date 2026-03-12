"""Dreamwalker's Bazaar marketplace logic: listing, buying, cancellation, expiry (3.5)."""

import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlmodel import Session, select, func
from sqlalchemy import text

from models.marketplace import (
    MarketplaceListing, MarketplaceTrade,
    MarketplacePriceHistory,
)
from models.home_base import PlayerArtifact
from models.inventory import PlayerInventory, InventoryItem
from models.story_mode import GameConfig, PlayerMetaProgression
from models.player import PlayerCharacter

logger = logging.getLogger(__name__)


# =============================================================================
# Exceptions
# =============================================================================

class MarketplaceError(Exception):
    """Raised for marketplace business-logic failures."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


# =============================================================================
# Helpers
# =============================================================================

def _get_player(player_id: int, session: Session):
    """Read player row via raw SQL (includes migration-053 columns)."""
    result = session.execute(
        text(
            "SELECT id, account_flag, marketplace_slots_purchased "
            "FROM players WHERE id = :pid"
        ),
        {"pid": player_id},
    )
    row = result.fetchone()
    if row is None:
        raise MarketplaceError("Player not found.", 404)
    return row


def _get_player_character(player_id: int, session: Session) -> Optional[PlayerCharacter]:
    """Get the player's active character."""
    return session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
    ).first()


def _get_player_meta(player_id: int, session: Session) -> PlayerMetaProgression:
    """Get player meta progression (shard balance, essence, etc.)."""
    meta = session.get(PlayerMetaProgression, player_id)
    if meta is None:
        raise MarketplaceError("Player progression data not found.", 404)
    return meta


def _get_config_float(key: str, default: float, session: Session) -> float:
    """Get a game_config value as float."""
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    try:
        return float(cfg.value_json)
    except (TypeError, ValueError):
        return default


def _get_config_int(key: str, default: int, session: Session) -> int:
    """Get a game_config value as int."""
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    try:
        return int(cfg.value_json)
    except (TypeError, ValueError):
        return default


def _log_price_history(
    listing_id: int,
    price: int,
    action: str,
    session: Session,
    old_price: Optional[int] = None,
) -> None:
    """Insert a MarketplacePriceHistory record."""
    entry = MarketplacePriceHistory(
        listing_id=listing_id,
        price=price,
        old_price=old_price,
        action=action,
        changed_at=datetime.now(timezone.utc),
    )
    session.add(entry)


def _listing_to_dict(listing: MarketplaceListing) -> dict:
    """Convert a MarketplaceListing to a dict for API response."""
    return {
        "id": listing.id,
        "seller_id": listing.seller_id,
        "buyer_id": listing.buyer_id,
        "item_type": listing.item_type,
        "item_ref_id": listing.item_ref_id,
        "item_name": listing.item_name,
        "item_rarity": listing.item_rarity,
        "item_stats": listing.item_stats,
        "item_icon_key": listing.item_icon_key,
        "item_gear_slot": listing.item_gear_slot,
        "is_curated": listing.is_curated,
        "price_shards": listing.price_shards,
        "status": listing.status,
        "listed_at": listing.listed_at.isoformat() if listing.listed_at else None,
        "expires_at": listing.expires_at.isoformat() if listing.expires_at else None,
        "sold_at": listing.sold_at.isoformat() if listing.sold_at else None,
        "cancelled_at": listing.cancelled_at.isoformat() if listing.cancelled_at else None,
        "expired_at": listing.expired_at.isoformat() if listing.expired_at else None,
    }


def _return_item_to_seller(listing: MarketplaceListing, session: Session) -> None:
    """Unlock the item back into the seller's inventory."""
    if listing.item_type == "artifact":
        artifact = session.exec(
            select(PlayerArtifact).where(PlayerArtifact.id == listing.item_ref_id)
        ).first()
        if artifact:
            artifact.marketplace_listing_id = None
            session.add(artifact)

    elif listing.item_type == "equipment":
        inv = session.exec(
            select(PlayerInventory).where(PlayerInventory.id == listing.item_ref_id)
        ).first()
        if inv:
            inv.marketplace_listing_id = None
            session.add(inv)


def _expire_listing(listing: MarketplaceListing, session: Session) -> None:
    """Mark a listing as expired, return item, and create notification."""
    listing.status = "expired"
    listing.expired_at = datetime.now(timezone.utc)
    session.add(listing)

    _return_item_to_seller(listing, session)

    from services.marketplace_notification_service import create_notification
    create_notification(
        player_id=listing.seller_id,
        notification_type="listing_expired",
        title=f"Listing Expired: {listing.item_name}",
        message=f"Your listing for {listing.item_name} has expired. "
                "The item has been returned to your inventory.",
        related_listing_id=listing.id,
        session=session,
    )


def _validate_and_lock_item(
    player_id: int,
    character_id: int,
    item_type: str,
    item_ref_id: int,
    session: Session,
) -> dict:
    """Validate ownership, check not already listed, auto-unequip if needed.

    Returns an item snapshot dict with keys: name, rarity, stats, icon_key,
    gear_slot (optional), is_curated (optional), _record, _type.
    """
    if item_type == "artifact":
        artifact = session.exec(
            select(PlayerArtifact).where(
                PlayerArtifact.id == item_ref_id,
                PlayerArtifact.player_id == player_id,
            )
        ).first()
        if not artifact:
            raise MarketplaceError("You don't own this artifact.", 400)
        if artifact.marketplace_listing_id is not None:
            raise MarketplaceError("This item is already listed.", 400)

        return {
            "name": artifact.name,
            "rarity": artifact.rarity,
            "stats": artifact.stat_bonuses,
            "icon_key": artifact.icon_sprite_key,
            "is_curated": artifact.curated_artifact_id is not None,
            "_record": artifact,
            "_type": "artifact",
        }

    elif item_type == "equipment":
        inv = session.exec(
            select(PlayerInventory).where(
                PlayerInventory.id == item_ref_id,
                PlayerInventory.character_id == character_id,
            )
        ).first()
        if not inv:
            raise MarketplaceError("You don't own this item.", 400)
        if inv.marketplace_listing_id is not None:
            raise MarketplaceError("This item is already listed.", 400)

        # Auto-unequip if equipped
        if inv.is_equipped:
            inv.is_equipped = False
            inv.equipped_slot = None
            session.add(inv)
            # Trigger stat recalc for seller
            from services.character_progression import recalculate_character_stats
            recalculate_character_stats(session, character_id)

        item_template = session.get(InventoryItem, inv.item_id)
        return {
            "name": item_template.name if item_template else "Unknown Item",
            "rarity": item_template.rarity if item_template else "common",
            "stats": item_template.base_stats,
            "icon_key": item_template.sprite_key,
            "gear_slot": item_template.gear_slot_id if item_template else None,
            "_record": inv,
            "_type": "equipment",
        }

    raise MarketplaceError(f"Invalid item type: {item_type}", 400)


def _transfer_item(
    listing: MarketplaceListing,
    buyer_id: int,
    buyer_character_id: int,
    session: Session,
) -> bool:
    """Transfer item ownership from seller to buyer.

    Returns True if claim queue is needed (equipment at inventory cap).
    """
    if listing.item_type == "artifact":
        # Artifacts have no cap — always immediate
        artifact = session.exec(
            select(PlayerArtifact).where(PlayerArtifact.id == listing.item_ref_id)
        ).first()
        if artifact:
            artifact.player_id = buyer_id
            artifact.character_id = buyer_character_id
            artifact.marketplace_listing_id = None
            artifact.is_new = True
            session.add(artifact)
        return False  # No claim needed

    elif listing.item_type == "equipment":
        inv = session.exec(
            select(PlayerInventory).where(PlayerInventory.id == listing.item_ref_id)
        ).first()
        if not inv:
            return False

        # Check buyer inventory cap (10 non-equipped items)
        non_equipped_count = session.exec(
            select(func.count()).where(
                PlayerInventory.character_id == buyer_character_id,
                PlayerInventory.is_equipped == False,  # noqa: E712
                PlayerInventory.marketplace_listing_id == None,  # noqa: E711
            )
        ).one()

        if non_equipped_count < 10:
            # Immediate transfer
            inv.character_id = buyer_character_id
            inv.marketplace_listing_id = None
            inv.is_equipped = False
            inv.equipped_slot = None
            session.add(inv)
            return False  # No claim needed
        else:
            # Claim queue — item is unlocked from marketplace but not yet assigned
            inv.marketplace_listing_id = None
            # Keep old character_id temporarily; trade record tracks pending claim.
            # The claim resolution endpoint will do the actual character_id swap.
            session.add(inv)
            return True  # Claim needed

    return False


def _destroy_item(item_type: str, item_ref_id: int, session: Session) -> None:
    """Permanently delete an item record."""
    if item_type == "artifact":
        artifact = session.exec(
            select(PlayerArtifact).where(PlayerArtifact.id == item_ref_id)
        ).first()
        if artifact:
            session.delete(artifact)
    elif item_type == "equipment":
        inv = session.exec(
            select(PlayerInventory).where(PlayerInventory.id == item_ref_id)
        ).first()
        if inv:
            session.delete(inv)


def _destroy_inventory_item(
    item_ref_id: int, character_id: int, session: Session
) -> None:
    """Verify ownership then delete an inventory item (for claim replacement)."""
    inv = session.exec(
        select(PlayerInventory).where(
            PlayerInventory.id == item_ref_id,
            PlayerInventory.character_id == character_id,
            PlayerInventory.is_equipped == False,  # noqa: E712
            PlayerInventory.marketplace_listing_id == None,  # noqa: E711
        )
    ).first()
    if not inv:
        raise MarketplaceError("Replacement item not found or is equipped/listed.", 400)
    session.delete(inv)


# =============================================================================
# Create Listing
# =============================================================================

def create_listing(
    player_id: int,
    item_type: str,
    item_ref_id: int,
    price_shards: int,
    session: Session,
) -> MarketplaceListing:
    """Create a new marketplace listing.

    Validates: ownership, not already listed, listing cap, account flag, character.
    Side effects: locks item (sets marketplace_listing_id), unequips if equipped.
    """
    # 1. Validate player has a character
    character = _get_player_character(player_id, session)
    if not character:
        raise MarketplaceError("You must create a character first.", 400)

    # 2. Account flag check
    player = _get_player(player_id, session)
    if player.account_flag == "dispute":
        raise MarketplaceError(
            "Marketplace trading is disabled while your account is under review.", 400
        )

    # 3. Listing cap check
    max_slots = min(3 + (player.marketplace_slots_purchased or 0), 10)
    active_count = session.exec(
        select(func.count()).where(
            MarketplaceListing.seller_id == player_id,
            MarketplaceListing.status == "active",
        )
    ).one()
    if active_count >= max_slots:
        raise MarketplaceError(
            f"Listing cap reached ({active_count}/{max_slots}). "
            "Cancel a listing or purchase a Bazaar Permit.",
            400,
        )

    # 4. Price validation
    if price_shards < 1:
        raise MarketplaceError("Minimum listing price is 1 Shard.", 400)

    # 5. Ownership + lock item
    item_snapshot = _validate_and_lock_item(
        player_id, character.id, item_type, item_ref_id, session
    )

    # 6. Create listing
    now = datetime.now(timezone.utc)
    listing = MarketplaceListing(
        seller_id=player_id,
        item_type=item_type,
        item_ref_id=item_ref_id,
        item_name=item_snapshot["name"],
        item_rarity=item_snapshot["rarity"],
        item_stats=item_snapshot["stats"],
        item_icon_key=item_snapshot["icon_key"],
        item_gear_slot=item_snapshot.get("gear_slot"),
        is_curated=item_snapshot.get("is_curated", False),
        price_shards=price_shards,
        status="active",
        listed_at=now,
        expires_at=now + timedelta(hours=24),
    )
    session.add(listing)
    session.flush()  # get listing.id

    # 7. Set marketplace_listing_id on the item record
    record = item_snapshot["_record"]
    record.marketplace_listing_id = listing.id
    session.add(record)

    # 8. Log initial price
    _log_price_history(listing.id, price_shards, "listed", session)

    session.flush()
    return listing


# =============================================================================
# Buy Listing
# =============================================================================

def buy_listing(
    buyer_id: int,
    listing_id: int,
    session: Session,
) -> dict:
    """Purchase a marketplace listing.

    Atomic: shard debit (buyer) + shard credit with tax (seller) + item transfer
    + notifications.
    Returns: { listing_id, trade_id, new_balance, claim_required, tax, seller_proceeds }
    """
    from services.payment_service import (
        _debit_shards_internal,
        _credit_shards_direct_internal,
    )

    # 1. Load listing with row lock to prevent double-buy
    listing = session.exec(
        select(MarketplaceListing)
        .where(MarketplaceListing.id == listing_id)
        .with_for_update()
    ).first()

    if not listing:
        raise MarketplaceError("Listing not found.", 404)

    # 2. Lazy expiry check
    now = datetime.now(timezone.utc)
    if listing.expires_at and listing.expires_at <= now or listing.status != "active":
        if listing.status == "active":
            _expire_listing(listing, session)
        raise MarketplaceError("This listing is no longer available.", 410)

    # 3. Self-purchase check
    if listing.seller_id == buyer_id:
        raise MarketplaceError("You cannot purchase your own listing.", 400)

    # 4. Buyer validation
    buyer = _get_player(buyer_id, session)
    if buyer.account_flag == "dispute":
        raise MarketplaceError(
            "Marketplace trading is disabled while your account is under review.", 400
        )

    buyer_character = _get_player_character(buyer_id, session)
    if not buyer_character:
        raise MarketplaceError("You must create a character first.", 400)

    # 5. Check pending claims
    pending_claim = session.exec(
        select(MarketplaceTrade).where(
            MarketplaceTrade.buyer_id == buyer_id,
            MarketplaceTrade.claim_status == "pending",
        )
    ).first()
    if pending_claim:
        raise MarketplaceError(
            "You have a pending item claim. Resolve it before purchasing again.", 400
        )

    # 6. Balance check
    meta = _get_player_meta(buyer_id, session)
    if meta.shard_balance < listing.price_shards:
        raise MarketplaceError("Insufficient shard balance.", 400)

    # 7. Calculate tax
    tax_rate = _get_config_float("marketplace_tax_rate", 0.05, session)
    tax = int(math.floor(listing.price_shards * tax_rate))
    seller_proceeds = listing.price_shards - tax

    # 8. Atomic shard transfers (flush, not commit)
    _debit_shards_internal(
        player_id=buyer_id,
        amount=listing.price_shards,
        source_type="marketplace_purchase",
        source_id=listing.id,
        description=f"Purchased {listing.item_name} from marketplace",
        session=session,
    )

    _credit_shards_direct_internal(
        player_id=listing.seller_id,
        amount=seller_proceeds,
        source_type="marketplace_sale",
        source_id=listing.id,
        description=f"Sold {listing.item_name} on marketplace (5% tax: {tax} Shards)",
        session=session,
    )

    # 9. Mark listing as sold
    listing.status = "sold"
    listing.sold_at = now
    listing.buyer_id = buyer_id
    session.add(listing)

    # 10. Transfer item + determine claim status
    claim_required = _transfer_item(
        listing, buyer_id, buyer_character.id, session
    )

    # 11. Create trade record
    trade = MarketplaceTrade(
        listing_id=listing.id,
        buyer_id=buyer_id,
        seller_id=listing.seller_id,
        item_type=listing.item_type,
        item_ref_id=listing.item_ref_id,
        item_name=listing.item_name,
        item_rarity=listing.item_rarity,
        price_shards=listing.price_shards,
        tax_shards=tax,
        seller_proceeds=seller_proceeds,
        claim_status="pending" if claim_required else "claimed",
        traded_at=now,
    )
    session.add(trade)
    session.flush()  # get trade.id

    # 12. Recalculate seller stats (item removed)
    seller_character = _get_player_character(listing.seller_id, session)
    if seller_character:
        from services.character_progression import recalculate_character_stats
        recalculate_character_stats(session, seller_character.id)

    # 13. Create seller notification
    from services.marketplace_notification_service import create_notification
    create_notification(
        player_id=listing.seller_id,
        notification_type="item_sold",
        title=f"Item Sold: {listing.item_name}",
        message=f"Your {listing.item_name} sold for {listing.price_shards} Shards! "
                f"You received {seller_proceeds} Shards after the 5% Bazaar tax.",
        related_listing_id=listing.id,
        session=session,
    )

    session.flush()

    return {
        "listing_id": listing.id,
        "trade_id": trade.id,
        "new_balance": meta.shard_balance,  # already debited by _debit_shards_internal
        "claim_required": claim_required,
        "tax": tax,
        "seller_proceeds": seller_proceeds,
    }


# =============================================================================
# Cancel Listing
# =============================================================================

def cancel_listing(player_id: int, listing_id: int, session: Session) -> None:
    """Cancel an active listing. Returns item to seller's inventory."""
    listing = session.exec(
        select(MarketplaceListing).where(
            MarketplaceListing.id == listing_id,
            MarketplaceListing.seller_id == player_id,
            MarketplaceListing.status == "active",
        )
    ).first()
    if not listing:
        raise MarketplaceError("Listing not found or not active.", 404)

    listing.status = "cancelled"
    listing.cancelled_at = datetime.now(timezone.utc)
    session.add(listing)

    _return_item_to_seller(listing, session)
    session.flush()


# =============================================================================
# Adjust Price
# =============================================================================

def adjust_price(
    player_id: int, listing_id: int, new_price: int, session: Session
) -> dict:
    """Adjust price on an active listing. Does not reset the 24hr timer."""
    if new_price < 1:
        raise MarketplaceError("Minimum price is 1 Shard.", 400)

    listing = session.exec(
        select(MarketplaceListing).where(
            MarketplaceListing.id == listing_id,
            MarketplaceListing.seller_id == player_id,
            MarketplaceListing.status == "active",
        )
    ).first()
    if not listing:
        raise MarketplaceError("Listing not found or not active.", 404)

    # Lazy expiry
    if listing.expires_at and listing.expires_at <= datetime.now(timezone.utc):
        _expire_listing(listing, session)
        raise MarketplaceError("This listing has expired.", 410)

    old_price = listing.price_shards
    listing.price_shards = new_price
    listing.updated_at = datetime.now(timezone.utc)
    session.add(listing)

    _log_price_history(listing.id, new_price, "adjusted", session, old_price=old_price)
    session.flush()

    tax_rate = _get_config_float("marketplace_tax_rate", 0.05, session)
    estimated_tax = int(math.floor(new_price * tax_rate))

    return {
        "listing_id": listing.id,
        "new_price": new_price,
        "old_price": old_price,
        "estimated_proceeds": new_price - estimated_tax,
    }


# =============================================================================
# Resolve Claim
# =============================================================================

def resolve_claim(
    buyer_id: int,
    trade_id: int,
    action: str,
    replace_item_id: Optional[int],
    session: Session,
) -> dict:
    """Resolve a pending equipment claim from a marketplace purchase.

    Actions:
    - 'claim': Direct claim (only works if inventory now has space)
    - 'replace': Destroy an existing inventory item, then claim
    - 'discard': Destroy the purchased item (no refund)
    """
    trade = session.exec(
        select(MarketplaceTrade).where(
            MarketplaceTrade.id == trade_id,
            MarketplaceTrade.buyer_id == buyer_id,
            MarketplaceTrade.claim_status == "pending",
        )
    ).first()
    if not trade:
        raise MarketplaceError("No pending claim found.", 404)

    buyer_character = _get_player_character(buyer_id, session)
    if not buyer_character:
        raise MarketplaceError("You must create a character first.", 400)

    if action == "discard":
        # Destroy the purchased item
        _destroy_item(trade.item_type, trade.item_ref_id, session)
        trade.claim_status = "discarded"
        session.add(trade)
        session.flush()
        return {"action": "discarded", "item_name": trade.item_name}

    if action == "replace":
        if not replace_item_id:
            raise MarketplaceError("Must specify which item to replace.", 400)
        # Destroy the replacement target
        _destroy_inventory_item(replace_item_id, buyer_character.id, session)

    # Now transfer the purchased item (for both 'claim' and 'replace')
    if trade.item_type == "equipment":
        inv = session.exec(
            select(PlayerInventory).where(PlayerInventory.id == trade.item_ref_id)
        ).first()
        if inv:
            inv.character_id = buyer_character.id
            inv.is_equipped = False
            inv.equipped_slot = None
            session.add(inv)
    elif trade.item_type == "artifact":
        artifact = session.exec(
            select(PlayerArtifact).where(PlayerArtifact.id == trade.item_ref_id)
        ).first()
        if artifact:
            artifact.player_id = buyer_id
            artifact.character_id = buyer_character.id
            artifact.is_new = True
            session.add(artifact)

    trade.claim_status = "claimed"
    session.add(trade)
    session.flush()

    return {"action": "claimed", "item_name": trade.item_name}


# =============================================================================
# Browse Listings
# =============================================================================

def get_browse_listings(
    filters: dict,
    page: int,
    page_size: int,
    session: Session,
    viewer_id: Optional[int] = None,
) -> dict:
    """Browse active marketplace listings with filters, search, sort, pagination.

    filters dict keys: item_type, rarity, gear_slot, min_price, max_price,
                       search, sort (price_asc|price_desc|rarity|recent).
    """
    now = datetime.now(timezone.utc)
    query = select(MarketplaceListing).where(
        MarketplaceListing.status == "active",
        MarketplaceListing.expires_at > now,
    )

    # Apply filters
    if filters.get("item_type"):
        query = query.where(MarketplaceListing.item_type == filters["item_type"])
    if filters.get("rarity"):
        query = query.where(MarketplaceListing.item_rarity == filters["rarity"])
    if filters.get("gear_slot") is not None:
        query = query.where(MarketplaceListing.item_gear_slot == filters["gear_slot"])
    if filters.get("min_price") is not None:
        query = query.where(MarketplaceListing.price_shards >= filters["min_price"])
    if filters.get("max_price") is not None:
        query = query.where(MarketplaceListing.price_shards <= filters["max_price"])
    if filters.get("search"):
        query = query.where(
            MarketplaceListing.item_name.ilike(f"%{filters['search']}%")
        )

    # Sort (FIFO within same price)
    sort = filters.get("sort", "price_asc")
    if sort == "price_desc":
        query = query.order_by(
            MarketplaceListing.price_shards.desc(),
            MarketplaceListing.listed_at.asc(),
        )
    elif sort == "rarity":
        query = query.order_by(
            MarketplaceListing.item_rarity.desc(),
            MarketplaceListing.listed_at.asc(),
        )
    elif sort == "recent":
        query = query.order_by(MarketplaceListing.listed_at.desc())
    else:
        # Default: price_asc, FIFO
        query = query.order_by(
            MarketplaceListing.price_shards.asc(),
            MarketplaceListing.listed_at.asc(),
        )

    # Paginate
    total = session.exec(
        select(func.count()).select_from(query.subquery())
    ).one()
    listings = session.exec(
        query.offset((page - 1) * page_size).limit(page_size)
    ).all()

    # Enrich with price comparables
    enriched = []
    for listing in listings:
        comparables = get_price_comparables(
            listing.item_name, listing.item_rarity, listing.id, session
        )
        enriched.append({
            **_listing_to_dict(listing),
            "is_own": listing.seller_id == viewer_id if viewer_id else False,
            "comparable_min": comparables["min_price"],
            "comparable_max": comparables["max_price"],
            "comparable_count": comparables["active_count"],
        })

    return {
        "listings": enriched,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 0,
    }


# =============================================================================
# My Listings
# =============================================================================

def get_my_listings(player_id: int, session: Session) -> dict:
    """Return player's active listings (lazy-expiring stale ones) and history."""
    now = datetime.now(timezone.utc)

    # Fetch all active listings for the player
    active_listings = session.exec(
        select(MarketplaceListing).where(
            MarketplaceListing.seller_id == player_id,
            MarketplaceListing.status == "active",
        )
    ).all()

    # Lazy-expire stale ones
    still_active = []
    for listing in active_listings:
        if listing.expires_at and listing.expires_at <= now:
            _expire_listing(listing, session)
        else:
            still_active.append(_listing_to_dict(listing))

    # History (sold, cancelled, expired)
    history_listings = session.exec(
        select(MarketplaceListing).where(
            MarketplaceListing.seller_id == player_id,
            MarketplaceListing.status.in_(["sold", "cancelled", "expired"]),
        ).order_by(MarketplaceListing.updated_at.desc()).limit(50)
    ).all()
    history = [_listing_to_dict(l) for l in history_listings]

    # Slot info
    player = _get_player(player_id, session)
    max_slots = min(3 + (player.marketplace_slots_purchased or 0), 10)

    return {
        "active": still_active,
        "history": history,
        "slots_used": len(still_active),
        "slots_max": max_slots,
    }


# =============================================================================
# Price Comparables
# =============================================================================

def get_price_comparables(
    item_name: str,
    item_rarity: str,
    exclude_listing_id: int,
    session: Session,
) -> dict:
    """Get min/max/count for same item name + rarity on active listings."""
    now = datetime.now(timezone.utc)
    results = session.exec(
        select(
            func.min(MarketplaceListing.price_shards),
            func.max(MarketplaceListing.price_shards),
            func.count(),
        ).where(
            MarketplaceListing.item_name == item_name,
            MarketplaceListing.item_rarity == item_rarity,
            MarketplaceListing.status == "active",
            MarketplaceListing.expires_at > now,
            MarketplaceListing.id != exclude_listing_id,
        )
    ).one()

    return {
        "min_price": results[0],
        "max_price": results[1],
        "active_count": results[2],
    }


# =============================================================================
# Trade History
# =============================================================================

def get_trade_history(
    player_id: int,
    page: int,
    page_size: int,
    trade_type: Optional[str],
    session: Session,
) -> dict:
    """Paginated trades where buyer_id or seller_id = player_id.

    trade_type: 'sales' | 'purchases' | None (all).
    """
    if trade_type == "sales":
        base_query = select(MarketplaceTrade).where(
            MarketplaceTrade.seller_id == player_id
        )
    elif trade_type == "purchases":
        base_query = select(MarketplaceTrade).where(
            MarketplaceTrade.buyer_id == player_id
        )
    else:
        from sqlalchemy import or_
        base_query = select(MarketplaceTrade).where(
            or_(
                MarketplaceTrade.buyer_id == player_id,
                MarketplaceTrade.seller_id == player_id,
            )
        )

    base_query = base_query.order_by(MarketplaceTrade.traded_at.desc())

    # Total count
    total = session.exec(
        select(func.count()).select_from(base_query.subquery())
    ).one()

    # Paginated results
    trades = session.exec(
        base_query.offset((page - 1) * page_size).limit(page_size)
    ).all()

    trade_list = []
    for t in trades:
        trade_dict = {
            "id": t.id,
            "listing_id": t.listing_id,
            "type": "sold" if t.seller_id == player_id else "purchased",
            "item_type": t.item_type,
            "item_name": t.item_name,
            "item_rarity": t.item_rarity,
            "price_shards": t.price_shards,
            "tax_shards": t.tax_shards,
            "seller_proceeds": t.seller_proceeds,
            "claim_status": t.claim_status,
            "traded_at": t.traded_at.isoformat() if t.traded_at else None,
        }
        trade_list.append(trade_dict)

    return {
        "trades": trade_list,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 0,
    }
