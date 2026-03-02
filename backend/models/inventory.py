"""Inventory & collection models."""

from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


class InventoryItem(SQLModel, table=True):
    """Maps to the `inventory_items` table. Item templates."""
    __tablename__ = "inventory_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None)
    item_type: str = Field(max_length=50, nullable=False)
    rarity: str = Field(default="common", max_length=50)
    base_stats: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    sprite_key: Optional[str] = Field(max_length=100)
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
