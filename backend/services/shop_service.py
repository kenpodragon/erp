"""Elysium Emporium business logic: purchase, equip, boosters, catalog."""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import text, and_

from models.shop import (
    ShopItem, ShopBundle, ShopBundleItem,
    PlayerShopItem, PlayerActiveBooster,
)
from models import PlayerMetaProgression, GameConfig
from models.player import PlayerCharacter, CharacterClass
from services.payment_service import (
    _debit_shards_internal,
    _credit_shards_direct_internal,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Exceptions
# =============================================================================

class ShopError(Exception):
    """Raised for shop business-logic failures."""

    def __init__(self, message: str, code: str = "shop_error"):
        super().__init__(message)
        self.code = code


# =============================================================================
# Helpers
# =============================================================================

def _get_player_meta(player_id: int, session: Session) -> PlayerMetaProgression:
    meta = session.get(PlayerMetaProgression, player_id)
    if meta is None:
        raise ShopError("Player progression data not found", "not_found")
    return meta


def _get_active_character(player_id: int, session: Session) -> Optional[PlayerCharacter]:
    return session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
    ).first()


def _get_class_name(class_id: int, session: Session) -> str:
    cc = session.get(CharacterClass, class_id)
    return cc.name if cc else f"Class #{class_id}"


def _get_game_config(key: str, default: str, session: Session) -> str:
    cfg = session.get(GameConfig, key)
    return cfg.value_json if cfg else default


# =============================================================================
# Purchase
# =============================================================================

def purchase_item(player_id: int, item_id: int, session: Session) -> dict:
    """Purchase a single shop item (cosmetic or booster).

    Returns dict with item info, new balance, and optional booster status.
    """
    item = session.get(ShopItem, item_id)
    if not item or not item.is_active:
        raise ShopError("Item not found", "not_found")

    # Availability window (strip tzinfo for SQLite compat)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if item.available_from:
        af = item.available_from.replace(tzinfo=None) if item.available_from.tzinfo else item.available_from
        if now < af:
            raise ShopError("This item is not yet available", "unavailable")
    if item.available_until:
        au = item.available_until.replace(tzinfo=None) if item.available_until.tzinfo else item.available_until
        if now > au:
            raise ShopError("This item is no longer available", "unavailable")

    # Balance checks
    meta = _get_player_meta(player_id, session)
    if meta.shard_balance < 0:
        raise ShopError(
            "Your shard balance is negative. Purchase more shards first.",
            "negative_balance",
        )
    if meta.shard_balance < item.price_shards:
        raise ShopError("Insufficient shard balance", "insufficient_balance")

    # Class restriction for skins
    if item.category == "skin" and item.class_restriction:
        character = _get_active_character(player_id, session)
        if not character or character.class_id != item.class_restriction:
            class_name = _get_class_name(item.class_restriction, session)
            raise ShopError(
                f"This skin requires the {class_name} class",
                "class_mismatch",
            )

    # Already-owned check for cosmetics
    if item.category in ("skin", "flair", "badge", "avatar"):
        existing = session.exec(
            select(PlayerShopItem).where(
                PlayerShopItem.player_id == player_id,
                PlayerShopItem.shop_item_id == item_id,
                PlayerShopItem.status == "owned",
            )
        ).first()
        if existing:
            raise ShopError("You already own this item", "already_owned")

    # --- Atomic transaction: debit + ownership/booster ---
    _debit_shards_internal(
        player_id=player_id,
        amount=item.price_shards,
        source_type="shop_purchase",
        source_id=item.id,
        description=f"Purchased {item.name}",
        session=session,
    )

    result = {
        "success": True,
        "item_name": item.name,
        "item_id": item.id,
        "category": item.category,
        "new_balance": meta.shard_balance,  # already debited by _debit_shards_internal
        "booster_status": None,
    }

    if item.category in ("skin", "flair", "badge", "avatar"):
        ownership = PlayerShopItem(
            player_id=player_id,
            shop_item_id=item_id,
            status="owned",
            purchased_at=now,
        )
        session.add(ownership)

    elif item.category == "booster":
        booster_status = _activate_booster(player_id, item, session)
        result["booster_status"] = booster_status

    elif item.category == "marketplace_permit":
        # Bazaar Permit: increment marketplace_slots_purchased on player
        from sqlalchemy import text as sa_text
        # Check hard cap (max 7 permits = 10 total slots)
        current_row = session.execute(
            sa_text("SELECT marketplace_slots_purchased FROM players WHERE id = :pid"),
            {"pid": player_id},
        ).fetchone()
        current_permits = current_row.marketplace_slots_purchased if current_row else 0
        if current_permits >= 7:
            raise ShopError("Maximum listing slots already unlocked (10/10)", "permit_cap")
        session.execute(
            sa_text("UPDATE players SET marketplace_slots_purchased = marketplace_slots_purchased + 1 WHERE id = :pid"),
            {"pid": player_id},
        )

    session.commit()
    return result


def purchase_bundle(player_id: int, bundle_id: int, session: Session) -> dict:
    """Purchase a bundle. One-time only. Delivers unowned contents."""
    bundle = session.get(ShopBundle, bundle_id)
    if not bundle or not bundle.is_active:
        raise ShopError("Bundle not found", "not_found")

    # Availability window (strip tzinfo for SQLite compat)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if bundle.available_from:
        af = bundle.available_from.replace(tzinfo=None) if bundle.available_from.tzinfo else bundle.available_from
        if now < af:
            raise ShopError("This bundle is not yet available", "unavailable")
    if bundle.available_until:
        au = bundle.available_until.replace(tzinfo=None) if bundle.available_until.tzinfo else bundle.available_until
        if now > au:
            raise ShopError("This bundle is no longer available", "unavailable")

    # One-time purchase check: look for bundle-level ownership record
    existing = session.exec(
        select(PlayerShopItem).where(
            PlayerShopItem.player_id == player_id,
            PlayerShopItem.source_bundle_id == bundle_id,
            PlayerShopItem.shop_item_id == None,  # noqa: E711  — bundle-level record
        )
    ).first()
    if existing:
        raise ShopError("You already purchased this bundle", "already_purchased")

    # Balance checks
    meta = _get_player_meta(player_id, session)
    if meta.shard_balance < 0:
        raise ShopError(
            "Your shard balance is negative. Purchase more shards first.",
            "negative_balance",
        )
    if meta.shard_balance < bundle.price_shards:
        raise ShopError("Insufficient shard balance", "insufficient_balance")

    # Debit shards (atomic)
    _debit_shards_internal(
        player_id=player_id,
        amount=bundle.price_shards,
        source_type="shop_purchase",
        source_id=bundle.id,
        description=f"Purchased bundle: {bundle.name}",
        session=session,
    )

    # Deliver contents
    bundle_items = session.exec(
        select(ShopBundleItem).where(ShopBundleItem.bundle_id == bundle_id)
    ).all()

    delivered = []
    already_owned = []

    for bi in bundle_items:
        item = session.get(ShopItem, bi.shop_item_id)
        if not item:
            continue

        # Check if player already owns this cosmetic
        if item.category in ("skin", "flair", "badge", "avatar"):
            owned = session.exec(
                select(PlayerShopItem).where(
                    PlayerShopItem.player_id == player_id,
                    PlayerShopItem.shop_item_id == bi.shop_item_id,
                    PlayerShopItem.status == "owned",
                )
            ).first()
            if owned:
                already_owned.append(item.name)
                continue

        if item.category in ("skin", "flair", "badge", "avatar"):
            ownership = PlayerShopItem(
                player_id=player_id,
                shop_item_id=bi.shop_item_id,
                status="owned",
                source_bundle_id=bundle_id,
                purchased_at=now,
            )
            session.add(ownership)
            delivered.append(item.name)
        elif item.category == "booster":
            _activate_booster(player_id, item, session)
            delivered.append(f"{item.name} (activated)")

    # Mark bundle as purchased (bundle-level ownership record)
    bundle_record = PlayerShopItem(
        player_id=player_id,
        shop_item_id=None,
        source_bundle_id=bundle_id,
        status="owned",
        purchased_at=now,
    )
    session.add(bundle_record)

    session.commit()
    return {
        "success": True,
        "bundle_name": bundle.name,
        "new_balance": meta.shard_balance,
        "delivered": delivered,
        "already_owned": already_owned,
    }


# =============================================================================
# Booster Activation & Timer
# =============================================================================

def _activate_booster(
    player_id: int, item: ShopItem, session: Session
) -> dict:
    """Activate a booster or extend an existing one.

    item.item_metadata: {"boost_type": "xp"|"essence"|"drop_rate",
                         "magnitude": 1.25, "duration_seconds": 3600}
    """
    config = item.item_metadata or {}
    boost_type = config["boost_type"]
    magnitude = float(config["magnitude"])
    duration_seconds = int(config["duration_seconds"])

    # Check for existing active booster of this type
    active = session.exec(
        select(PlayerActiveBooster).where(
            PlayerActiveBooster.player_id == player_id,
            PlayerActiveBooster.boost_type == boost_type,
            PlayerActiveBooster.status == "active",
        )
    ).first()

    now = datetime.now(timezone.utc)

    if active:
        # Extend: old remaining + new full duration
        remaining = max(0, active.duration_seconds - active.elapsed_seconds)
        active.duration_seconds = remaining + duration_seconds
        active.elapsed_seconds = 0  # reset counter; total is now combined remaining
        active.magnitude = max(float(active.magnitude), magnitude)
        active.shop_item_id = item.id
        active.updated_at = now
        session.add(active)
        return {
            "boost_type": boost_type,
            "magnitude": float(active.magnitude),
            "remaining_seconds": active.duration_seconds,
            "extended": True,
        }
    else:
        booster = PlayerActiveBooster(
            player_id=player_id,
            boost_type=boost_type,
            magnitude=magnitude,
            duration_seconds=duration_seconds,
            elapsed_seconds=0,
            shop_item_id=item.id,
            status="active",
            activated_at=now,
            updated_at=now,
        )
        session.add(booster)
        return {
            "boost_type": boost_type,
            "magnitude": magnitude,
            "remaining_seconds": duration_seconds,
            "extended": False,
        }


def increment_booster_time(
    player_id: int, elapsed_seconds: int, session: Session
) -> list[dict]:
    """Increment elapsed time on all active boosters for a player.

    Clamps elapsed_seconds to the anti-cheat max per ping.
    Returns list of active booster states (including any that just expired).
    """
    max_per_ping = int(_get_game_config(
        "shop_booster_max_elapsed_per_ping", "60", session
    ))
    clamped = min(elapsed_seconds, max_per_ping)

    active_boosters = session.exec(
        select(PlayerActiveBooster).where(
            PlayerActiveBooster.player_id == player_id,
            PlayerActiveBooster.status == "active",
        )
    ).all()

    now = datetime.now(timezone.utc)
    result = []
    expired = []

    for booster in active_boosters:
        booster.elapsed_seconds += clamped
        booster.updated_at = now

        if booster.elapsed_seconds >= booster.duration_seconds:
            booster.status = "expired"
            booster.expired_at = now
            expired.append({
                "boost_type": booster.boost_type,
                "magnitude": float(booster.magnitude),
            })
        else:
            remaining = booster.duration_seconds - booster.elapsed_seconds
            result.append({
                "boost_type": booster.boost_type,
                "magnitude": float(booster.magnitude),
                "remaining_seconds": remaining,
            })

        session.add(booster)

    session.commit()
    return {"active_boosters": result, "expired": expired}


def get_active_boosters(player_id: int, session: Session) -> list[dict]:
    """Return all active boosters with remaining time. Lazy-expires any that are done."""
    active_boosters = session.exec(
        select(PlayerActiveBooster).where(
            PlayerActiveBooster.player_id == player_id,
            PlayerActiveBooster.status == "active",
        )
    ).all()

    now = datetime.now(timezone.utc)
    result = []
    any_expired = False

    for booster in active_boosters:
        remaining = booster.duration_seconds - booster.elapsed_seconds
        if remaining <= 0:
            booster.status = "expired"
            booster.expired_at = now
            session.add(booster)
            any_expired = True
            continue

        result.append({
            "boost_type": booster.boost_type,
            "magnitude": float(booster.magnitude),
            "remaining_seconds": remaining,
            "duration_seconds": booster.duration_seconds,
            "activated_at": booster.activated_at.isoformat() if booster.activated_at else None,
        })

    if any_expired:
        session.commit()

    return result


# =============================================================================
# Equip / Unequip
# =============================================================================

def equip_cosmetic(player_id: int, item_id: int, session: Session) -> dict:
    """Equip a cosmetic item. Validates ownership and class restriction."""
    ownership = session.exec(
        select(PlayerShopItem).where(
            PlayerShopItem.player_id == player_id,
            PlayerShopItem.shop_item_id == item_id,
            PlayerShopItem.status == "owned",
        )
    ).first()
    if not ownership:
        raise ShopError("You don't own this item", "not_owned")

    item = session.get(ShopItem, item_id)
    if not item:
        raise ShopError("Item not found", "not_found")

    if item.category == "skin":
        character = _get_active_character(player_id, session)
        if not character:
            raise ShopError("No active character", "no_character")
        if item.class_restriction and character.class_id != item.class_restriction:
            class_name = _get_class_name(item.class_restriction, session)
            raise ShopError(
                f"This skin requires the {class_name} class",
                "class_mismatch",
            )
        session.execute(
            text("UPDATE player_characters SET equipped_skin_id = :iid WHERE id = :cid"),
            {"iid": item_id, "cid": character.id},
        )
    elif item.category == "flair":
        session.execute(
            text("UPDATE players SET equipped_flair_id = :iid WHERE id = :pid"),
            {"iid": item_id, "pid": player_id},
        )
    elif item.category == "badge":
        session.execute(
            text("UPDATE players SET equipped_badge_id = :iid WHERE id = :pid"),
            {"iid": item_id, "pid": player_id},
        )
    elif item.category == "avatar":
        session.execute(
            text("UPDATE players SET equipped_avatar_id = :iid WHERE id = :pid"),
            {"iid": item_id, "pid": player_id},
        )
    else:
        raise ShopError(f"Cannot equip items of category '{item.category}'", "invalid_category")

    session.commit()
    return {
        "success": True,
        "slot": item.category,
        "item_name": item.name,
    }


def unequip_cosmetic(player_id: int, slot: str, session: Session) -> dict:
    """Unequip a cosmetic by slot name. Reverts to default appearance."""
    if slot == "skin":
        character = _get_active_character(player_id, session)
        if character:
            session.execute(
                text("UPDATE player_characters SET equipped_skin_id = NULL WHERE id = :cid"),
                {"cid": character.id},
            )
    elif slot == "flair":
        session.execute(
            text("UPDATE players SET equipped_flair_id = NULL WHERE id = :pid"),
            {"pid": player_id},
        )
    elif slot == "badge":
        session.execute(
            text("UPDATE players SET equipped_badge_id = NULL WHERE id = :pid"),
            {"pid": player_id},
        )
    elif slot == "avatar":
        session.execute(
            text("UPDATE players SET equipped_avatar_id = NULL WHERE id = :pid"),
            {"pid": player_id},
        )
    else:
        raise ShopError(f"Unknown cosmetic slot: {slot}", "invalid_slot")

    session.commit()
    return {"success": True, "slot": slot, "reverted_to": "default"}


# =============================================================================
# Collection
# =============================================================================

def get_player_collection(player_id: int, session: Session) -> dict:
    """Return player's owned items and equipped state."""
    # Owned items
    owned_rows = session.exec(
        select(PlayerShopItem, ShopItem).join(
            ShopItem, PlayerShopItem.shop_item_id == ShopItem.id
        ).where(
            PlayerShopItem.player_id == player_id,
            PlayerShopItem.status == "owned",
            PlayerShopItem.shop_item_id != None,  # noqa: E711
        )
    ).all()

    # Equipped state
    player_row = session.execute(
        text(
            "SELECT equipped_flair_id, equipped_badge_id, equipped_avatar_id "
            "FROM players WHERE id = :pid"
        ),
        {"pid": player_id},
    ).fetchone()

    character = _get_active_character(player_id, session)
    equipped_skin_id = None
    if character:
        char_row = session.execute(
            text("SELECT equipped_skin_id FROM player_characters WHERE id = :cid"),
            {"cid": character.id},
        ).fetchone()
        if char_row:
            equipped_skin_id = char_row.equipped_skin_id

    equipped = {
        "skin": equipped_skin_id,
        "flair": player_row.equipped_flair_id if player_row else None,
        "badge": player_row.equipped_badge_id if player_row else None,
        "avatar": player_row.equipped_avatar_id if player_row else None,
    }

    # Build items list
    owned_items = []
    for psi, si in owned_rows:
        is_equipped = False
        if si.category == "skin" and equipped_skin_id == si.id:
            is_equipped = True
        elif si.category == "flair" and equipped.get("flair") == si.id:
            is_equipped = True
        elif si.category == "badge" and equipped.get("badge") == si.id:
            is_equipped = True
        elif si.category == "avatar" and equipped.get("avatar") == si.id:
            is_equipped = True

        owned_items.append({
            "id": psi.id,
            "shop_item_id": si.id,
            "name": si.name,
            "category": si.category,
            "icon_asset_key": si.icon_asset_key,
            "is_equipped": is_equipped,
            "purchased_at": psi.purchased_at.isoformat() if psi.purchased_at else None,
        })

    # Purchased bundles
    bundle_records = session.exec(
        select(PlayerShopItem).where(
            PlayerShopItem.player_id == player_id,
            PlayerShopItem.shop_item_id == None,  # noqa: E711
            PlayerShopItem.source_bundle_id != None,  # noqa: E711
        )
    ).all()
    purchased_bundle_ids = [r.source_bundle_id for r in bundle_records]

    return {
        "owned_items": owned_items,
        "equipped": equipped,
        "purchased_bundles": purchased_bundle_ids,
    }


# =============================================================================
# Catalog
# =============================================================================

def get_catalog(player_id: int, session: Session) -> dict:
    """Return full shop catalog with player ownership/equipped state."""
    now = datetime.now(timezone.utc)

    # -- All active items --
    all_items = session.exec(
        select(ShopItem).where(ShopItem.is_active == True)  # noqa: E712
    ).all()

    # -- Player's owned item IDs --
    owned_rows = session.exec(
        select(PlayerShopItem.shop_item_id).where(
            PlayerShopItem.player_id == player_id,
            PlayerShopItem.status == "owned",
            PlayerShopItem.shop_item_id != None,  # noqa: E711
        )
    ).all()
    owned_ids = {r for r in owned_rows}

    # -- Equipped state --
    player_row = session.execute(
        text(
            "SELECT equipped_flair_id, equipped_badge_id, equipped_avatar_id "
            "FROM players WHERE id = :pid"
        ),
        {"pid": player_id},
    ).fetchone()

    character = _get_active_character(player_id, session)
    equipped_skin_id = None
    if character:
        char_row = session.execute(
            text("SELECT equipped_skin_id FROM player_characters WHERE id = :cid"),
            {"cid": character.id},
        ).fetchone()
        if char_row:
            equipped_skin_id = char_row.equipped_skin_id

    equipped = {
        "skin": equipped_skin_id,
        "flair": player_row.equipped_flair_id if player_row else None,
        "badge": player_row.equipped_badge_id if player_row else None,
        "avatar": player_row.equipped_avatar_id if player_row else None,
    }

    # -- Active boosters --
    active_boosters_list = get_active_boosters(player_id, session)

    # -- Balance --
    meta = _get_player_meta(player_id, session)

    # -- Build item dicts --
    featured = []
    limited_time = []
    items = []

    for si in all_items:
        if si.category == "booster":
            continue  # boosters rendered separately

        item_dict = _item_to_dict(si, owned_ids, equipped, now)

        # Check featured
        is_featured_now = si.is_featured
        if si.featured_from and now < si.featured_from:
            is_featured_now = False
        if si.featured_until and now > si.featured_until:
            is_featured_now = False

        if is_featured_now:
            featured.append(item_dict)

        # Check limited-time
        if si.available_until and now < si.available_until:
            item_dict["available_until"] = si.available_until.isoformat()
            item_dict["countdown_seconds"] = int(
                (si.available_until - now).total_seconds()
            )
            limited_time.append(item_dict)
        else:
            items.append(item_dict)

    # -- Booster items --
    booster_items = [
        si for si in all_items if si.category == "booster"
    ]
    boosters_catalog = []
    for si in booster_items:
        boosters_catalog.append({
            "id": si.id,
            "item_key": si.item_key,
            "name": si.name,
            "description": si.description,
            "category": "booster",
            "price_shards": si.price_shards,
            "item_metadata": si.item_metadata,
            "sort_order": si.sort_order,
        })

    # -- Bundles --
    all_bundles = session.exec(
        select(ShopBundle).where(ShopBundle.is_active == True)  # noqa: E712
    ).all()

    # Purchased bundle IDs
    bundle_records = session.exec(
        select(PlayerShopItem.source_bundle_id).where(
            PlayerShopItem.player_id == player_id,
            PlayerShopItem.shop_item_id == None,  # noqa: E711
            PlayerShopItem.source_bundle_id != None,  # noqa: E711
        )
    ).all()
    purchased_bundle_ids = {r for r in bundle_records}

    bundles = []
    for b in all_bundles:
        # Availability check
        if b.available_from and now < b.available_from:
            continue
        if b.available_until and now > b.available_until:
            continue

        # Contents
        bundle_items_rows = session.exec(
            select(ShopBundleItem, ShopItem).join(
                ShopItem, ShopBundleItem.shop_item_id == ShopItem.id
            ).where(ShopBundleItem.bundle_id == b.id)
            .order_by(ShopBundleItem.sort_order)
        ).all()

        contents = []
        items_owned = 0
        for bi, si in bundle_items_rows:
            is_owned = si.id in owned_ids
            if is_owned:
                items_owned += 1
            contents.append({
                "item_id": si.id,
                "name": si.name,
                "category": si.category,
                "is_owned": is_owned,
            })

        bundles.append({
            "id": b.id,
            "bundle_key": b.bundle_key,
            "name": b.name,
            "description": b.description,
            "price_shards": b.price_shards,
            "original_price_shards": b.original_price_shards,
            "discount_pct": b.discount_pct,
            "icon_asset_key": b.icon_asset_key,
            "contents": contents,
            "items_owned": items_owned,
            "items_total": len(contents),
            "is_purchased": b.id in purchased_bundle_ids,
            "sort_order": b.sort_order,
        })

    # -- Booster active status --
    booster_status = {}
    for ab in active_boosters_list:
        booster_status[ab["boost_type"]] = {
            "active": True,
            "magnitude": ab["magnitude"],
            "remaining_seconds": ab["remaining_seconds"],
        }
    for bt in ("xp", "essence", "drop_rate"):
        if bt not in booster_status:
            booster_status[bt] = {"active": False}

    return {
        "current_balance": meta.shard_balance,
        "has_negative_balance": meta.shard_balance < 0,
        "featured": featured,
        "limited_time": limited_time,
        "items": items,
        "bundles": bundles,
        "boosters_catalog": boosters_catalog,
        "boosters": booster_status,
    }


def _item_to_dict(
    si: ShopItem, owned_ids: set, equipped: dict, now: datetime
) -> dict:
    """Convert a ShopItem to a catalog dict with ownership/equip state."""
    is_owned = si.id in owned_ids
    is_equipped = False
    if is_owned:
        slot = si.category  # skin, flair, badge, avatar
        if equipped.get(slot) == si.id:
            is_equipped = True

    d = {
        "id": si.id,
        "item_key": si.item_key,
        "name": si.name,
        "description": si.description,
        "category": si.category,
        "price_shards": si.price_shards,
        "icon_asset_key": si.icon_asset_key,
        "class_restriction": si.class_restriction,
        "item_metadata": si.item_metadata,
        "is_owned": is_owned,
        "is_equipped": is_equipped,
        "is_featured": si.is_featured,
        "sort_order": si.sort_order,
    }
    return d


# =============================================================================
# Admin: Refund
# =============================================================================

def admin_refund_item(
    player_id: int, item_id: int, reason: str, session: Session
) -> dict:
    """Admin refund: remove shop item from player and credit shards back."""
    ownership = session.exec(
        select(PlayerShopItem).where(
            PlayerShopItem.player_id == player_id,
            PlayerShopItem.shop_item_id == item_id,
            PlayerShopItem.status == "owned",
        )
    ).first()
    if not ownership:
        raise ShopError("Player doesn't own this item", "not_found")

    item = session.get(ShopItem, item_id)
    if not item:
        raise ShopError("Item not found", "not_found")

    now = datetime.now(timezone.utc)

    # Unequip if currently equipped
    _force_unequip_if_equipped(player_id, item, session)

    # Mark as refunded
    ownership.status = "refunded"
    ownership.refunded_at = now
    session.add(ownership)

    # For boosters: expire active booster if still running
    if item.category == "booster":
        active_booster = session.exec(
            select(PlayerActiveBooster).where(
                PlayerActiveBooster.player_id == player_id,
                PlayerActiveBooster.shop_item_id == item_id,
                PlayerActiveBooster.status == "active",
            )
        ).first()
        if active_booster:
            active_booster.status = "expired"
            active_booster.expired_at = now
            session.add(active_booster)

    # Credit shards back
    _credit_shards_direct_internal(
        player_id=player_id,
        amount=item.price_shards,
        source_type="admin_refund",
        source_id=item.id,
        description=f"Admin refund: {item.name} — {reason}",
        session=session,
    )

    session.commit()
    return {
        "success": True,
        "item_name": item.name,
        "shards_refunded": item.price_shards,
    }


def _force_unequip_if_equipped(
    player_id: int, item: ShopItem, session: Session
) -> None:
    """If the item is currently equipped, unequip it."""
    if item.category == "skin":
        character = _get_active_character(player_id, session)
        if character:
            char_row = session.execute(
                text("SELECT equipped_skin_id FROM player_characters WHERE id = :cid"),
                {"cid": character.id},
            ).fetchone()
            if char_row and char_row.equipped_skin_id == item.id:
                session.execute(
                    text("UPDATE player_characters SET equipped_skin_id = NULL WHERE id = :cid"),
                    {"cid": character.id},
                )
    elif item.category == "flair":
        session.execute(
            text(
                "UPDATE players SET equipped_flair_id = NULL "
                "WHERE id = :pid AND equipped_flair_id = :iid"
            ),
            {"pid": player_id, "iid": item.id},
        )
    elif item.category == "badge":
        session.execute(
            text(
                "UPDATE players SET equipped_badge_id = NULL "
                "WHERE id = :pid AND equipped_badge_id = :iid"
            ),
            {"pid": player_id, "iid": item.id},
        )
    elif item.category == "avatar":
        session.execute(
            text(
                "UPDATE players SET equipped_avatar_id = NULL "
                "WHERE id = :pid AND equipped_avatar_id = :iid"
            ),
            {"pid": player_id, "iid": item.id},
        )
