"""Character Progression models (2.4) — stat system, prerequisites, scene records."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class IdleSkillStatContribution(SQLModel, table=True):
    """Maps idle training skills to stat contributions with configurable coefficients."""
    __tablename__ = "idle_skill_stat_contributions"

    id: Optional[int] = Field(default=None, primary_key=True)
    idle_skill_id: int = Field(foreign_key="skills.id", nullable=False)
    stat_id: int = Field(foreign_key="stat_definitions.id", nullable=False)
    coefficient: float = Field(default=0.5)
    description: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class ClassStatAffinity(SQLModel, table=True):
    """Per-class, per-stat config: base value, Lore weight, level bonus rate."""
    __tablename__ = "class_stat_affinities"

    id: Optional[int] = Field(default=None, primary_key=True)
    class_id: int = Field(foreign_key="character_classes.id", nullable=False)
    stat_id: int = Field(foreign_key="stat_definitions.id", nullable=False)
    base_value: int = Field(default=10)
    lore_weight: float = Field(default=0.0)
    level_bonus_per_level: float = Field(default=0.0)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class CharacterStat(SQLModel, table=True):
    """Computed, cached per-character stat totals. Refreshed on source changes."""
    __tablename__ = "character_stats"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False)
    stat_id: int = Field(foreign_key="stat_definitions.id", nullable=False)
    computed_total: int = Field(default=0)
    last_computed_at: Optional[datetime] = Field(default=None)


class PlayerSceneRecord(SQLModel, table=True):
    """Per-player, per-scene personal bests for achievement evaluation."""
    __tablename__ = "player_scene_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    scene_id: int = Field(foreign_key="scenes.id", nullable=False)
    best_wave: int = Field(default=0)
    best_time_seconds: Optional[int] = Field(default=None)
    total_enemies_killed: int = Field(default=0)
    total_runs: int = Field(default=0)
    total_damage_dealt: int = Field(default=0)
    best_session_damage: int = Field(default=0)
    first_completed_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class SkillPrerequisite(SQLModel, table=True):
    """Unified prerequisite tree. Multiple rows per skill = AND-gated."""
    __tablename__ = "skill_prerequisites"

    id: Optional[int] = Field(default=None, primary_key=True)
    skill_id: int = Field(foreign_key="skills.id", nullable=False)
    prerequisite_type: str = Field(max_length=30, nullable=False)
    ref_id: Optional[int] = Field(default=None)
    min_value: int = Field(default=1)
    display_hint: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
