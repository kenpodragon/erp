"""Asset Registry model: centralized visual asset definitions."""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text, JSON


VALID_CATEGORIES = [
    "entity_sprite", "class_sprite", "background",
    "item_icon", "artifact_icon", "achievement_icon", "skill_icon",
    "avatar", "skin", "badge", "flair",
    "spell_effect", "ui_icon", "narrative_image", "portrait",
]


class AssetRegistryEntry(SQLModel, table=True):
    """Maps to `asset_registry`. Centralized visual asset definitions with procedural render data.

    Note: The production DB uses JSONB columns (with GIN indexes) as defined in
    db/055_asset_registry.sql. The SQLModel definition uses generic JSON so that
    the in-memory SQLite test DB can also create the table.
    """
    __tablename__ = "asset_registry"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_key: str = Field(max_length=150, unique=True, nullable=False, index=True)
    category: str = Field(max_length=50, nullable=False)
    display_name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    render_definition: Optional[Any] = Field(
        default=None,
        sa_column=Column("render_definition", JSON, nullable=False, server_default="{}"),
    )
    tags: Optional[Any] = Field(
        default=None,
        sa_column=Column("tags", JSON, nullable=False, server_default="[]"),
    )
    source: str = Field(default="admin", max_length=50)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
