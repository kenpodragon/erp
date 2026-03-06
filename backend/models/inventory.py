"""Inventory & collection models."""

from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


class GearSlot(SQLModel, table=True):
    """Maps to the `gear_slots` table. Equipment slot definitions."""
    __tablename__ = "gear_slots"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    display_name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None)
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = Field(default=None)


class ItemPrefix(SQLModel, table=True):
    """Maps to the `item_prefixes` table. Dream item prefix components."""
    __tablename__ = "item_prefixes"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=50, nullable=False)
    stat_bonuses: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    lore_reference: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class ItemQuality(SQLModel, table=True):
    """Maps to the `item_qualities` table. Dream item quality components."""
    __tablename__ = "item_qualities"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=50, nullable=False)
    lore_reference: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)


class ItemLoreTag(SQLModel, table=True):
    """Maps to the `item_lore_tags` table. Dream item lore tag components."""
    __tablename__ = "item_lore_tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=50, nullable=False)
    narrative_context: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)


class ItemTypeBase(SQLModel, table=True):
    """Maps to the `item_type_bases` table. Dream item type/base components."""
    __tablename__ = "item_type_bases"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=50, nullable=False)
    gear_slot_id: int = Field(foreign_key="gear_slots.id", nullable=False)
    base_stat_range: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    lore_reference: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class ItemSuffix(SQLModel, table=True):
    """Maps to the `item_suffixes` table. Dream item suffix components."""
    __tablename__ = "item_suffixes"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=100, nullable=False)
    stat_bonuses: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    lore_reference: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class InventoryItem(SQLModel, table=True):
    """Maps to the `inventory_items` table. Item templates."""
    __tablename__ = "inventory_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None)
    item_type: str = Field(max_length=50, nullable=False)
    rarity: str = Field(default="common", max_length=50)
    base_stats: Optional[Any] = Field(default=None, sa_column=Column("base_stats", JSON))
    sprite_key: Optional[str] = Field(max_length=100)
    item_code: Optional[str] = Field(default=None, max_length=60)
    item_level: int = Field(default=1)
    min_char_level: int = Field(default=1)
    stat_requirements: Optional[Any] = Field(default=None, sa_column=Column("stat_requirements", JSON))
    gear_slot_id: Optional[int] = Field(default=None, foreign_key="gear_slots.id")
    is_dream_item: bool = Field(default=False)
    acquired_from: Optional[str] = Field(default=None, max_length=100)
    created_at: Optional[datetime] = Field(default=None)


class PlayerInventory(SQLModel, table=True):
    """Maps to the `player_inventory` table. Item instances owned by players."""
    __tablename__ = "player_inventory"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False)
    item_id: int = Field(foreign_key="inventory_items.id", nullable=False)
    is_equipped: bool = Field(default=False)
    equipped_slot: Optional[str] = Field(max_length=50)
    quantity: int = Field(default=1)
    acquired_at: Optional[datetime] = Field(default=None)


class Artifact(SQLModel, table=True):
    """Maps to the `artifacts` table. Meta-progression lore items."""
    __tablename__ = "artifacts"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True, nullable=False)
    description: Optional[str] = Field(default=None)
    lore_text: Optional[str] = Field(default=None)
    rarity: str = Field(default="rare", max_length=50)
    passive_bonus: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    sprite_key: Optional[str] = Field(max_length=100)
    created_at: Optional[datetime] = Field(default=None)


class PlayerCollection(SQLModel, table=True):
    """Maps to the `player_collections` table. Track unlocked artifacts."""
    __tablename__ = "player_collections"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False)
    artifact_id: int = Field(foreign_key="artifacts.id", nullable=False)
    unlocked_at: Optional[datetime] = Field(default=None)
