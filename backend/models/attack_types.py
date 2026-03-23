"""Attack type models for combat classification."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class AttackType(SQLModel, table=True):
    """Maps to the `attack_types` table. Combat attack type definitions."""
    __tablename__ = "attack_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    display_name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None)
    is_physical: bool = Field(default=False)
    lore_reference: Optional[str] = Field(default=None)
    visual_behavior_id: Optional[int] = Field(default=None, foreign_key="visual_behaviors.id")
    stat_multipliers: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    # Visual / animation columns
    attack_animation_type: str = Field(default="melee_swing")
    projectile_sprite_key: Optional[str] = None
    projectile_speed: float = Field(default=3.0)
    projectile_color: Optional[str] = None
    impact_effect: str = Field(default="flash")
    attack_range: float = Field(default=30.0)
    cooldown_ms: int = Field(default=2000)
    arc_angle: float = Field(default=90.0)
    trail_type: Optional[str] = None
    screen_shake: bool = Field(default=False)

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class EntityAttackType(SQLModel, table=True):
    """Maps to the `entity_attack_types` junction table."""
    __tablename__ = "entity_attack_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int = Field(foreign_key="entities.id", nullable=False)
    attack_type_id: int = Field(foreign_key="attack_types.id", nullable=False)
    is_primary: bool = Field(default=False)
    created_at: Optional[datetime] = Field(default=None)


class TypeBaseAttackType(SQLModel, table=True):
    """Maps to the `type_base_attack_types` junction table."""
    __tablename__ = "type_base_attack_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    type_base_id: int = Field(foreign_key="item_type_bases.id", nullable=False)
    attack_type_id: int = Field(foreign_key="attack_types.id", nullable=False)
    created_at: Optional[datetime] = Field(default=None)
