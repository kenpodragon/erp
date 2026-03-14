"""Entity classification models for the 5.3 Entity Classification system."""

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class EntityType(SQLModel, table=True):
    __tablename__ = "entity_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True)
    display_name: str = Field(max_length=100)
    description: Optional[str] = None
    color_hex: Optional[str] = Field(default=None, max_length=7)
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class EntityFamily(SQLModel, table=True):
    __tablename__ = "entity_families"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    display_name: str = Field(max_length=100)
    description: Optional[str] = None
    icon_key: Optional[str] = Field(default=None, max_length=100)
    lore_reference: Optional[str] = None
    base_stat_template: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class VisualBehavior(SQLModel, table=True):
    __tablename__ = "visual_behaviors"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True)
    display_name: str = Field(max_length=100)
    description: Optional[str] = None
    animation_config: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'::jsonb"))
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
