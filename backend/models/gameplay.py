"""Gameplay mechanics models."""

from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from sqlalchemy.types import JSON


class SceneGameplayData(SQLModel, table=True):
    """Maps to the `scene_gameplay_data` table. Normalized gameplay attributes."""
    __tablename__ = "scene_gameplay_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    scene_id: int = Field(foreign_key="scenes.id", nullable=False, unique=True)
    required_time_seconds: int = Field(default=0)
    background_sprite_key: Optional[str] = Field(default=None, max_length=100)
    is_boss_scene: bool = Field(default=False)

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    scene: "Scene" = Relationship(back_populates="gameplay_data")


class Entity(SQLModel, table=True):
    """Maps to the existing `entities` table from the book data."""
    __tablename__ = "entities"

    id: Optional[int] = Field(default=None, primary_key=True)
    canonical_name: str = Field(max_length=255, unique=True, nullable=False)
    entity_type: str = Field(max_length=50, nullable=False)
    is_generated: bool = Field(default=False)
    base_description: Optional[str] = Field(default=None)
    first_appearance_scene_id: Optional[int] = Field(default=None, foreign_key="scenes.id")
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    gameplay_data: Optional["EntityGameplayData"] = Relationship(back_populates="entity", sa_relationship_kwargs={"uselist": False})


class EntityGameplayData(SQLModel, table=True):
    """Maps to the `entity_gameplay_data` table. Normalized gameplay attributes."""
    __tablename__ = "entity_gameplay_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int = Field(foreign_key="entities.id", nullable=False, unique=True)
    sprite_key: Optional[str] = Field(default=None, max_length=100)
    base_hp: int = Field(default=0)
    base_gold: int = Field(default=0)
    appearance_rate: float = Field(default=1.0)
    stat_block: Optional[Any] = Field(default=None, sa_column=Column(JSON))

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    entity: Entity = Relationship(back_populates="gameplay_data")


class StatDefinition(SQLModel, table=True):
    """Maps to the `stat_definitions` table. Defines what stats exist."""
    __tablename__ = "stat_definitions"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True, nullable=False)
    display_name: str = Field(max_length=100, nullable=False)
    value_type: str = Field(max_length=50, nullable=False)
    min_value: Optional[float] = Field(default=None)
    max_value: Optional[float] = Field(default=None)
    description: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default=None, max_length=50)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class BenefitEffectData(SQLModel, table=True):
    """Maps to the `benefit_effect_data` table. Defines metadata for skill/item effects."""
    __tablename__ = "benefit_effect_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    effect_key: str = Field(max_length=100, unique=True, nullable=False)
    display_name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None)
    value_type: str = Field(max_length=50, nullable=False)
    min_value: Optional[float] = Field(default=None)
    max_value: Optional[float] = Field(default=None)
    category: Optional[str] = Field(default=None, max_length=50)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class Skill(SQLModel, table=True):
    """Maps to the new `skills` table."""
    __tablename__ = "skills"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, nullable=False)
    category: str = Field(max_length=50, nullable=False)
    description: Optional[str] = Field(default=None)
    benefits_json: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    xp_curve_type: str = Field(default="standard", max_length=50)

    # 2.3 Idle Training columns
    unlock_scene_id: Optional[int] = Field(default=None, foreign_key="scenes.id")
    unlock_display_text: Optional[str] = Field(default=None)
    idle_flavor_title: Optional[str] = Field(default=None, max_length=100)

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class SkillAction(SQLModel, table=True):
    """Maps to the `skill_actions` table. Individual trainable actions for a skill."""
    __tablename__ = "skill_actions"

    id: Optional[int] = Field(default=None, primary_key=True)
    skill_id: int = Field(foreign_key="skills.id", nullable=False)
    name: str = Field(max_length=100, nullable=False)
    display_name: str = Field(max_length=150, nullable=False)
    lore_description: str = Field(nullable=False)
    level_required: int = Field(default=1)
    interval_ms: int = Field(default=3000)
    xp_per_action: int = Field(default=10)
    sort_order: int = Field(default=0)

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
