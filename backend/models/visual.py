"""Visual lookup table models for entity rendering."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class MovementType(SQLModel, table=True):
    """Maps to the `movement_types` table. Entity movement behavior definitions."""
    __tablename__ = "movement_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    description: Optional[str] = Field(default=None)
    y_offset_min: float = Field(default=0)
    y_offset_max: float = Field(default=0)
    bob_amplitude: float = Field(default=0)
    bob_frequency: float = Field(default=1.0)
    speed_multiplier: float = Field(default=1.0)
    can_change_lane: bool = Field(default=False)
    trail_effect: Optional[str] = Field(default=None, max_length=50)
    created_at: Optional[datetime] = Field(default=None)


class SizeClass(SQLModel, table=True):
    """Maps to the `size_classes` table. Entity size category definitions."""
    __tablename__ = "size_classes"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    description: Optional[str] = Field(default=None)
    scale_min: float = Field(nullable=False)
    scale_max: float = Field(nullable=False)
    width_base: float = Field(nullable=False)
    height_base: float = Field(nullable=False)
    hitbox_radius: float = Field(nullable=False)
    hp_bar_width: float = Field(nullable=False)
    hp_bar_offset_y: float = Field(default=-8)
    name_tag_visible: bool = Field(default=True)
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = Field(default=None)


class AnimationStyle(SQLModel, table=True):
    """Maps to the `animation_styles` table. Entity animation behavior definitions."""
    __tablename__ = "animation_styles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    description: Optional[str] = Field(default=None)
    idle_scale_x: float = Field(default=1.0)
    idle_scale_y: float = Field(default=1.0)
    idle_cycle_ms: int = Field(default=2000)
    idle_translate_x: float = Field(default=0)
    idle_translate_y: float = Field(default=0)
    attack_recoil: float = Field(default=3.0)
    death_style: str = Field(default="fade", max_length=30)
    death_duration_ms: int = Field(default=400)
    death_particle_count: int = Field(default=8)
    created_at: Optional[datetime] = Field(default=None)


class SilhouetteType(SQLModel, table=True):
    """Maps to the `silhouette_types` table. Entity body shape definitions."""
    __tablename__ = "silhouette_types"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    description: Optional[str] = Field(default=None)
    body_shape: str = Field(max_length=30, nullable=False)
    body_ratio_w: float = Field(default=1.0)
    body_ratio_h: float = Field(default=1.0)
    corner_radius: float = Field(default=0.1)
    has_limbs: bool = Field(default=False)
    limb_count: int = Field(default=0)
    has_head: bool = Field(default=False)
    has_wings: bool = Field(default=False)
    has_weapon_slot: bool = Field(default=False)
    has_eye_glow: bool = Field(default=False)
    sub_unit_count: int = Field(default=1)
    created_at: Optional[datetime] = Field(default=None)


class ArmorClass(SQLModel, table=True):
    """Maps to the `armor_classes` table. Entity armor visual definitions."""
    __tablename__ = "armor_classes"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=20, unique=True, nullable=False)
    display_name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None)
    overlay_opacity: float = Field(default=0.6)
    color_tint_base: Optional[str] = Field(default=None, max_length=20)
    texture_pattern: str = Field(default="solid", max_length=30)
    glow_intensity: float = Field(default=0)
    outline_width: float = Field(default=1.0)
    weight_class: str = Field(default="medium", max_length=20)
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = Field(default=None)
