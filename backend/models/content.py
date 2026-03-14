"""Content editor models — Backgrounds, SceneWaveConfig, and junction tables
that previously had no SQLModel representation."""

from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


class Background(SQLModel, table=True):
    """Structured background definitions for scene rendering."""
    __tablename__ = "backgrounds"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, nullable=False, unique=True)
    description: Optional[str] = Field(default=None)
    background_key: str = Field(max_length=100, nullable=False, unique=True)
    parallax_config: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    time_of_day: Optional[str] = Field(default=None, max_length=50)
    mood: Optional[str] = Field(default=None, max_length=50)
    color_palette: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class SceneWaveConfig(SQLModel, table=True):
    """Per-scene wave composition configuration."""
    __tablename__ = "scene_wave_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    scene_id: int = Field(foreign_key="scenes.id", nullable=False, unique=True)
    max_enemies_per_wave: int = Field(default=5, nullable=False)
    wave_count: int = Field(default=10, nullable=False)
    spawn_interval_ms: int = Field(default=2000, nullable=False)
    scaling_factor: float = Field(default=1.0, nullable=False)
    hp_multiplier: float = Field(default=1.0, nullable=False)
    gold_multiplier: float = Field(default=1.0, nullable=False)
    entity_pool: Any = Field(default=[], sa_column=Column(JSON, nullable=False))
    boss_entity_id: Optional[int] = Field(default=None, foreign_key="entities.id")
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class EntityAlias(SQLModel, table=True):
    """Maps to `entity_aliases` table."""
    __tablename__ = "entity_aliases"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int = Field(foreign_key="entities.id", nullable=False)
    alias: str = Field(max_length=255, nullable=False)
    context: Optional[str] = Field(default=None)


class EntityBeatAppearance(SQLModel, table=True):
    """Maps to `entity_beat_appearances` table."""
    __tablename__ = "entity_beat_appearances"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int = Field(foreign_key="entities.id", nullable=False)
    story_beat_id: int = Field(foreign_key="story_beats.id", nullable=False)
    role: Optional[str] = Field(default=None, max_length=50)
    is_primary: bool = Field(default=False)
    beat_context: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)


class LocationAlias(SQLModel, table=True):
    """Maps to `location_aliases` table."""
    __tablename__ = "location_aliases"

    id: Optional[int] = Field(default=None, primary_key=True)
    location_id: int = Field(foreign_key="locations.id", nullable=False)
    alias: str = Field(max_length=255, nullable=False)
    context: Optional[str] = Field(default=None)


class LocationSceneAppearance(SQLModel, table=True):
    """Maps to `location_scene_appearances` table."""
    __tablename__ = "location_scene_appearances"

    id: Optional[int] = Field(default=None, primary_key=True)
    location_id: int = Field(foreign_key="locations.id", nullable=False)
    scene_id: int = Field(foreign_key="scenes.id", nullable=False)
    visual_delta: Optional[str] = Field(default=None)
    auditory_delta: Optional[str] = Field(default=None)
    olfactory_delta: Optional[str] = Field(default=None)
    tactile_delta: Optional[str] = Field(default=None)
    atmosphere_delta: Optional[str] = Field(default=None)
    ai_provider: Optional[str] = Field(default=None, max_length=50)
    ai_model_id: Optional[str] = Field(default=None, max_length=100)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class SemanticTag(SQLModel, table=True):
    """Maps to `semantic_tags` table."""
    __tablename__ = "semantic_tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    story_beat_id: int = Field(foreign_key="story_beats.id", nullable=False)
    category: str = Field(max_length=50, nullable=False)
    value: str = Field(max_length=100, nullable=False)
    canonical_value: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None)
    ai_provider: Optional[str] = Field(default=None, max_length=50)
    ai_model_id: Optional[str] = Field(default=None, max_length=100)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
