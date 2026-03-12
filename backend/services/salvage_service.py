"""NPC Vendor salvage logic: single/bulk item destruction for Essence (3.5)."""

import math
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import text

from models.home_base import PlayerArtifact
from models.inventory import PlayerInventory, InventoryItem
from models.story_mode import GameConfig, PlayerMetaProgression
from models.player import PlayerCharacter

logger = logging.getLogger(__name__)


# =============================================================================
# Exceptions
# =============================================================================

class SalvageError(Exception):
    """Raised for salvage business-logic failures."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


# =============================================================================
# Helpers
# =============================================================================

def _get_player_character(player_id: int, session: Session) -> Optional[PlayerCharacter]:
    """Get the player's active character."""
    return session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
    ).first()


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


def _validate_salvage_item(
    player_id: int,
    character_id: int,
    item_type: str,
    item_ref_id: int,
    session: Session,
) -> dict:
    """Validate ownership and eligibility for salvage.

    Returns: { name, rarity, is_curated, is_equipped }
    """
    if item_type == "artifact":
        artifact = session.exec(
            select(PlayerArtifact).where(
                PlayerArtifact.id == item_ref_id,
                PlayerArtifact.player_id == player_id,
            )
        ).first()
        if not artifact:
            raise SalvageError("You don't own this artifact.", 400)
        if artifact.marketplace_listing_id is not None:
            raise SalvageError("Cannot salvage an item that is currently listed.", 400)

        return {
            "name": artifact.name,
            "rarity": artifact.rarity,
            "is_curated": artifact.curated_artifact_id is not None,
            "is_equipped": False,  # artifacts are not equipped in the traditional sense
        }

    elif item_type == "equipment":
        inv = session.exec(
            select(PlayerInventory).where(
                PlayerInventory.id == item_ref_id,
                PlayerInventory.character_id == character_id,
            )
        ).first()
        if not inv:
            raise SalvageError("You don't own this item.", 400)
        if inv.marketplace_listing_id is not None:
            raise SalvageError("Cannot salvage an item that is currently listed.", 400)

        item_template = session.get(InventoryItem, inv.item_id)
        return {
            "name": item_template.name if item_template else "Unknown Item",
            "rarity": item_template.rarity if item_template else "common",
            "is_curated": False,  # equipment is never curated
            "is_equipped": inv.is_equipped,
        }

    raise SalvageError(f"Invalid item type: {item_type}", 400)


def _calculate_essence_value(
    item_type: str, rarity: str, is_curated: bool, session: Session
) -> int:
    """Calculate Essence return for salvaging an item.

    Equipment base rates: configurable per rarity via game_configs.
    Artifact multiplier: 2x (configurable).
    Curated artifact bonus: 15% on top (configurable), ceil().
    """
    rarity_lower = rarity.lower()

    # Default base rates per rarity
    default_rates = {
        "common": 5,
        "uncommon": 15,
        "rare": 50,
        "epic": 150,
        "legendary": 500,
        "cosmic": 500,
    }

    # Load configurable base rate for the rarity
    config_key = f"salvage_equipment_{rarity_lower}_essence"
    base = _get_config_int(config_key, default_rates.get(rarity_lower, 5), session)

    if item_type == "artifact":
        artifact_multiplier = _get_config_float(
            "salvage_artifact_multiplier", 2.0, session
        )
        base = int(base * artifact_multiplier)

        if is_curated:
            curated_bonus = _get_config_float(
                "salvage_curated_bonus_multiplier", 1.15, session
            )
            base = math.ceil(base * curated_bonus)

    return base


def _credit_essence(player_id: int, amount: int, session: Session) -> None:
    """Credit Essence to the player's balance and meta progression."""
    from models.progress import PlayerEssence

    # Update player_essence current_balance
    essence = session.exec(
        select(PlayerEssence).where(PlayerEssence.player_id == player_id)
    ).first()
    if essence:
        essence.current_balance += amount
        session.add(essence)

    # Update player_meta_progression
    meta = session.get(PlayerMetaProgression, player_id)
    if meta:
        meta.elysium_essence += amount
        meta.total_essence_earned += amount
        meta.updated_at = datetime.now(timezone.utc)
        session.add(meta)


def _unequip_item(item_ref_id: int, character_id: int, session: Session) -> None:
    """Unequip an equipment item before salvaging."""
    inv = session.exec(
        select(PlayerInventory).where(
            PlayerInventory.id == item_ref_id,
            PlayerInventory.character_id == character_id,
        )
    ).first()
    if inv and inv.is_equipped:
        inv.is_equipped = False
        inv.equipped_slot = None
        session.add(inv)


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


def _log_salvage_activity(
    player_id: int,
    item_name: str,
    rarity: str,
    essence: int,
    session: Session,
) -> None:
    """Insert an ActivityEvent for salvage tracking."""
    from models.admin import ActivityEvent

    event = ActivityEvent(
        player_id=player_id,
        event_type="item_salvaged",
        event_data={
            "item_name": item_name,
            "rarity": rarity,
            "essence_gained": essence,
        },
        created_at=datetime.now(timezone.utc),
    )
    session.add(event)


# =============================================================================
# Single Salvage
# =============================================================================

def salvage_single(
    player_id: int,
    item_type: str,
    item_ref_id: int,
    session: Session,
) -> dict:
    """Salvage a single item for Essence. Permanently destroys the item.

    Returns: { item_name, rarity, essence_gained }
    """
    character = _get_player_character(player_id, session)
    if not character:
        raise SalvageError("You must create a character first.", 400)

    item_info = _validate_salvage_item(
        player_id, character.id, item_type, item_ref_id, session
    )

    essence_value = _calculate_essence_value(
        item_type, item_info["rarity"], item_info["is_curated"], session
    )

    # Unequip if equipped (equipment only)
    if item_type == "equipment" and item_info["is_equipped"]:
        _unequip_item(item_ref_id, character.id, session)

    # Destroy the item
    _destroy_item(item_type, item_ref_id, session)

    # Credit Essence
    _credit_essence(player_id, essence_value, session)

    # Recalculate stats
    from services.character_progression import recalculate_character_stats
    recalculate_character_stats(session, character.id)

    # Log activity
    _log_salvage_activity(
        player_id, item_info["name"], item_info["rarity"], essence_value, session
    )

    session.flush()
    return {
        "item_name": item_info["name"],
        "rarity": item_info["rarity"],
        "essence_gained": essence_value,
    }


# =============================================================================
# Bulk Salvage
# =============================================================================

def salvage_bulk(
    player_id: int,
    items: list[dict],
    session: Session,
) -> dict:
    """Salvage multiple items in a single atomic transaction.

    Curated artifacts in the list must have been individually confirmed by the
    frontend (double-confirm happened client-side before calling this endpoint).

    Returns: { total_essence, items_salvaged: [{ name, rarity, essence }], count }
    """
    character = _get_player_character(player_id, session)
    if not character:
        raise SalvageError("You must create a character first.", 400)

    if not items:
        raise SalvageError("No items specified for salvage.", 400)

    total_essence = 0
    results = []

    for item_spec in items:
        item_type = item_spec["item_type"]
        item_ref_id = item_spec["item_ref_id"]

        item_info = _validate_salvage_item(
            player_id, character.id, item_type, item_ref_id, session
        )
        essence_value = _calculate_essence_value(
            item_type, item_info["rarity"], item_info["is_curated"], session
        )

        # Unequip if equipped
        if item_type == "equipment" and item_info["is_equipped"]:
            _unequip_item(item_ref_id, character.id, session)

        # Destroy
        _destroy_item(item_type, item_ref_id, session)
        total_essence += essence_value
        results.append({
            "name": item_info["name"],
            "rarity": item_info["rarity"],
            "essence": essence_value,
        })

    # Credit total Essence (single update)
    _credit_essence(player_id, total_essence, session)

    # Recalculate stats once (after all items removed)
    from services.character_progression import recalculate_character_stats
    recalculate_character_stats(session, character.id)

    # Log activity for each item
    for item_result in results:
        _log_salvage_activity(
            player_id,
            item_result["name"],
            item_result["rarity"],
            item_result["essence"],
            session,
        )

    session.flush()
    return {
        "total_essence": total_essence,
        "items_salvaged": results,
        "count": len(results),
    }


# =============================================================================
# Salvage Preview
# =============================================================================

def get_salvage_value(
    player_id: int,
    items: list[dict],
    session: Session,
) -> list[dict]:
    """Preview salvage values without destroying items.

    Returns: [{ item_type, item_ref_id, name, rarity, essence_value, is_curated, is_listed }]
    """
    character = _get_player_character(player_id, session)
    if not character:
        raise SalvageError("You must create a character first.", 400)

    preview = []
    for item_spec in items:
        item_type = item_spec["item_type"]
        item_ref_id = item_spec["item_ref_id"]

        # Check ownership and get info (will raise on invalid)
        is_listed = False

        if item_type == "artifact":
            artifact = session.exec(
                select(PlayerArtifact).where(
                    PlayerArtifact.id == item_ref_id,
                    PlayerArtifact.player_id == player_id,
                )
            ).first()
            if not artifact:
                continue  # skip items not owned (preview is lenient)
            is_listed = artifact.marketplace_listing_id is not None
            is_curated = artifact.curated_artifact_id is not None
            name = artifact.name
            rarity = artifact.rarity

        elif item_type == "equipment":
            inv = session.exec(
                select(PlayerInventory).where(
                    PlayerInventory.id == item_ref_id,
                    PlayerInventory.character_id == character.id,
                )
            ).first()
            if not inv:
                continue  # skip items not owned
            is_listed = inv.marketplace_listing_id is not None
            is_curated = False
            item_template = session.get(InventoryItem, inv.item_id)
            name = item_template.name if item_template else "Unknown Item"
            rarity = item_template.rarity if item_template else "common"
        else:
            continue

        essence_value = _calculate_essence_value(
            item_type, rarity, is_curated, session
        )

        preview.append({
            "item_type": item_type,
            "item_ref_id": item_ref_id,
            "name": name,
            "rarity": rarity,
            "essence_value": essence_value,
            "is_curated": is_curated,
            "is_listed": is_listed,
        })

    return preview
