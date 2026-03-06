"""Inventory API routes (2.4.2 Track B).

Endpoints:
  GET    /api/game/inventory              — full inventory (equipped + stored + gear slots)
  POST   /api/game/inventory/equip        — equip an item by inventory_id
  POST   /api/game/inventory/unequip      — unequip an item by inventory_id
  DELETE /api/game/inventory/{id}         — discard an unequipped item
  POST   /api/game/inventory/keep-drop    — keep a dropped item after scene completion
  POST   /api/game/inventory/dismiss-drop — dismiss a dropped item (no-op acknowledgement)
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import Player, PlayerCharacter, StatDefinition
from models.inventory import GearSlot, InventoryItem, PlayerInventory
from models.character_progression import CharacterStat
from services.character_progression import recalculate_character_stats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/game/inventory", tags=["inventory"])

MAX_BAG_SLOTS = 10


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class EquipRequest(BaseModel):
    inventory_id: int

class UnequipRequest(BaseModel):
    inventory_id: int

class KeepDropRequest(BaseModel):
    item_id: int

class DismissDropRequest(BaseModel):
    item_id: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_player(token: dict) -> Player:
    """Extract the Player from the auth token dict, or 404."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found.")
    return player


def _get_character(session: Session, player: Player) -> PlayerCharacter:
    """Return the player's character or 404."""
    character = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
    ).first()
    if not character:
        raise HTTPException(status_code=404, detail="No character found.")
    return character


def _get_char_stats(session: Session, character_id: int) -> dict[str, int]:
    """Return {stat_name: computed_total} for a character."""
    rows = session.exec(
        select(CharacterStat, StatDefinition)
        .join(StatDefinition, CharacterStat.stat_id == StatDefinition.id)
        .where(CharacterStat.character_id == character_id)
    ).all()
    return {sd.name: cs.computed_total for cs, sd in rows}


def _meets_requirements(item: InventoryItem, character: PlayerCharacter, char_stats: dict[str, int]) -> bool:
    """Check min_char_level and stat_requirements."""
    if character.level < item.min_char_level:
        return False
    if item.stat_requirements:
        for stat_name, required_value in item.stat_requirements.items():
            if char_stats.get(stat_name, 0) < required_value:
                return False
    return True


def _count_stored(session: Session, character_id: int) -> int:
    """Count unequipped (bag) items for a character."""
    rows = session.exec(
        select(PlayerInventory)
        .where(PlayerInventory.character_id == character_id)
        .where(PlayerInventory.is_equipped == False)  # noqa: E712
    ).all()
    return len(rows)


def _build_item_dict(inv: PlayerInventory, item: InventoryItem, meets_reqs: bool) -> dict:
    """Serialize an inventory entry with its item details."""
    return {
        "inventory_id": inv.id,
        "item_id": item.id,
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type,
        "rarity": item.rarity,
        "base_stats": item.base_stats,
        "sprite_key": item.sprite_key,
        "item_code": item.item_code,
        "item_level": item.item_level,
        "min_char_level": item.min_char_level,
        "stat_requirements": item.stat_requirements,
        "gear_slot_id": item.gear_slot_id,
        "is_dream_item": item.is_dream_item,
        "is_equipped": inv.is_equipped,
        "equipped_slot": inv.equipped_slot,
        "quantity": inv.quantity,
        "acquired_at": inv.acquired_at.isoformat() if inv.acquired_at else None,
        "meets_requirements": meets_reqs,
    }


# ---------------------------------------------------------------------------
# 1. GET /api/game/inventory
# ---------------------------------------------------------------------------

@router.get("")
def get_inventory(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Full inventory: equipped items (with slot info), stored items, gear slots."""
    player = _extract_player(token)
    character = _get_character(session, player)
    char_stats = _get_char_stats(session, character.id)

    inventory_rows = session.exec(
        select(PlayerInventory, InventoryItem)
        .join(InventoryItem, PlayerInventory.item_id == InventoryItem.id)
        .where(PlayerInventory.character_id == character.id)
    ).all()

    equipped = []
    stored = []
    for inv, item in inventory_rows:
        meets_reqs = _meets_requirements(item, character, char_stats)
        entry = _build_item_dict(inv, item, meets_reqs)
        if inv.is_equipped:
            equipped.append(entry)
        else:
            stored.append(entry)

    gear_slots = session.exec(select(GearSlot).order_by(GearSlot.sort_order)).all()
    gear_slots_list = [
        {
            "id": gs.id,
            "name": gs.name,
            "display_name": gs.display_name,
            "description": gs.description,
            "sort_order": gs.sort_order,
        }
        for gs in gear_slots
    ]

    return {
        "equipped": equipped,
        "stored": stored,
        "gear_slots": gear_slots_list,
        "bag_capacity": MAX_BAG_SLOTS,
        "bag_used": len(stored),
    }


# ---------------------------------------------------------------------------
# 2. POST /api/game/inventory/equip
# ---------------------------------------------------------------------------

@router.post("/equip")
def equip_item(
    body: EquipRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Equip an item. Direct swap if slot is occupied."""
    player = _extract_player(token)
    character = _get_character(session, player)

    inv = session.get(PlayerInventory, body.inventory_id)
    if not inv or inv.character_id != character.id:
        raise HTTPException(status_code=404, detail="Item not found in your inventory.")
    if inv.is_equipped:
        raise HTTPException(status_code=400, detail="Item is already equipped.")

    item = session.get(InventoryItem, inv.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item data not found.")
    if not item.gear_slot_id:
        raise HTTPException(status_code=400, detail="This item cannot be equipped.")

    # Requirement check
    char_stats = _get_char_stats(session, character.id)
    if not _meets_requirements(item, character, char_stats):
        raise HTTPException(status_code=400, detail="Character does not meet item requirements.")

    # Resolve slot name
    gear_slot = session.get(GearSlot, item.gear_slot_id)
    slot_name = gear_slot.name if gear_slot else f"slot_{item.gear_slot_id}"

    # Direct swap: unequip current item in that slot
    current_in_slot = session.exec(
        select(PlayerInventory)
        .where(PlayerInventory.character_id == character.id)
        .where(PlayerInventory.is_equipped == True)  # noqa: E712
        .where(PlayerInventory.equipped_slot == slot_name)
    ).first()
    if current_in_slot:
        current_in_slot.is_equipped = False
        current_in_slot.equipped_slot = None
        session.add(current_in_slot)

    # Equip the new item
    inv.is_equipped = True
    inv.equipped_slot = slot_name
    session.add(inv)
    session.commit()

    # Recalculate stats
    new_stats = recalculate_character_stats(session, character.id)

    return {
        "status": "equipped",
        "inventory_id": inv.id,
        "slot": slot_name,
        "swapped_inventory_id": current_in_slot.id if current_in_slot else None,
        "stats": new_stats,
    }


# ---------------------------------------------------------------------------
# 3. POST /api/game/inventory/unequip
# ---------------------------------------------------------------------------

@router.post("/unequip")
def unequip_item(
    body: UnequipRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Unequip an item back to the bag."""
    player = _extract_player(token)
    character = _get_character(session, player)

    inv = session.get(PlayerInventory, body.inventory_id)
    if not inv or inv.character_id != character.id:
        raise HTTPException(status_code=404, detail="Item not found in your inventory.")
    if not inv.is_equipped:
        raise HTTPException(status_code=400, detail="Item is not equipped.")

    # Bag space check
    stored_count = _count_stored(session, character.id)
    if stored_count >= MAX_BAG_SLOTS:
        raise HTTPException(status_code=400, detail="Bag is full. Discard an item first.")

    inv.is_equipped = False
    inv.equipped_slot = None
    session.add(inv)
    session.commit()

    new_stats = recalculate_character_stats(session, character.id)

    return {
        "status": "unequipped",
        "inventory_id": inv.id,
        "stats": new_stats,
    }


# ---------------------------------------------------------------------------
# 4. DELETE /api/game/inventory/{inventory_id}
# ---------------------------------------------------------------------------

@router.delete("/{inventory_id}")
def discard_item(
    inventory_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Discard an unequipped item."""
    player = _extract_player(token)
    character = _get_character(session, player)

    inv = session.get(PlayerInventory, inventory_id)
    if not inv or inv.character_id != character.id:
        raise HTTPException(status_code=404, detail="Item not found in your inventory.")
    if inv.is_equipped:
        raise HTTPException(status_code=400, detail="Cannot discard an equipped item. Unequip it first.")

    session.delete(inv)
    session.commit()

    return {"status": "discarded", "inventory_id": inventory_id}


# ---------------------------------------------------------------------------
# 5. POST /api/game/inventory/keep-drop
# ---------------------------------------------------------------------------

@router.post("/keep-drop")
def keep_drop(
    body: KeepDropRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Keep a dropped item after scene completion. Auto-places into equip slot or bag."""
    player = _extract_player(token)
    character = _get_character(session, player)

    item = session.get(InventoryItem, body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    # Check if player already owns this item instance
    already_owned = session.exec(
        select(PlayerInventory)
        .where(PlayerInventory.character_id == character.id)
        .where(PlayerInventory.item_id == item.id)
    ).first()
    if already_owned:
        raise HTTPException(status_code=400, detail="You already own this item.")

    char_stats = _get_char_stats(session, character.id)
    now = datetime.now(timezone.utc)

    # Auto-placement: try equip slot first if empty and requirements met
    placed_in = "bag"
    equipped_slot_name = None

    if item.gear_slot_id and _meets_requirements(item, character, char_stats):
        gear_slot = session.get(GearSlot, item.gear_slot_id)
        slot_name = gear_slot.name if gear_slot else f"slot_{item.gear_slot_id}"

        current_in_slot = session.exec(
            select(PlayerInventory)
            .where(PlayerInventory.character_id == character.id)
            .where(PlayerInventory.is_equipped == True)  # noqa: E712
            .where(PlayerInventory.equipped_slot == slot_name)
        ).first()

        if not current_in_slot:
            placed_in = "equipped"
            equipped_slot_name = slot_name

    # If going to bag, check capacity
    if placed_in == "bag":
        stored_count = _count_stored(session, character.id)
        if stored_count >= MAX_BAG_SLOTS:
            # Return current inventory so frontend can show comparison UI
            inventory_rows = session.exec(
                select(PlayerInventory, InventoryItem)
                .join(InventoryItem, PlayerInventory.item_id == InventoryItem.id)
                .where(PlayerInventory.character_id == character.id)
                .where(PlayerInventory.is_equipped == False)  # noqa: E712
            ).all()
            stored_items = []
            for inv, itm in inventory_rows:
                meets = _meets_requirements(itm, character, char_stats)
                stored_items.append(_build_item_dict(inv, itm, meets))

            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Bag is full. Discard an item to make room.",
                    "bag_capacity": MAX_BAG_SLOTS,
                    "stored_items": stored_items,
                },
            )

    new_inv = PlayerInventory(
        character_id=character.id,
        item_id=item.id,
        is_equipped=(placed_in == "equipped"),
        equipped_slot=equipped_slot_name,
        quantity=1,
        acquired_at=now,
    )
    session.add(new_inv)
    session.commit()
    session.refresh(new_inv)

    # Recalculate if equipped
    new_stats = None
    if placed_in == "equipped":
        new_stats = recalculate_character_stats(session, character.id)

    return {
        "status": "kept",
        "placed_in": placed_in,
        "inventory_id": new_inv.id,
        "slot": equipped_slot_name,
        "stats": new_stats,
    }


# ---------------------------------------------------------------------------
# 6. POST /api/game/inventory/dismiss-drop
# ---------------------------------------------------------------------------

@router.post("/dismiss-drop")
def dismiss_drop(
    body: DismissDropRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Dismiss a dropped item. Acknowledgement only, no DB change."""
    return {"status": "dismissed", "item_id": body.item_id}
