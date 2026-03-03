"""Story Mode (Loop B) models — sessions, upgrades, meta-progression, audit logging."""

import uuid
from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


class GameConfig(SQLModel, table=True):
    """Maps to the `game_configs` table. Admin-tunable game settings."""
    __tablename__ = "game_configs"

    key: str = Field(primary_key=True, max_length=100)
    value_json: Any = Field(sa_column=Column(JSON, nullable=False))
    description: Optional[str] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class PlayerStorySession(SQLModel, table=True):
    """Maps to `player_story_sessions`. Tracks active Story Mode combat state."""
    __tablename__ = "player_story_sessions"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    scene_id: Optional[int] = Field(default=None, foreign_key="scenes.id")
    chapter_id: Optional[int] = Field(default=None)
    current_zone: int = Field(default=1)
    current_wave: int = Field(default=1)
    session_gold: float = Field(default=0)
    dark_ritual_multiplier: float = Field(default=1.0)
    audio_progress_pct: float = Field(default=0)
    narrative_progress_pct: float = Field(default=0)
    required_waves_finished: bool = Field(default=False)
    audio_finished: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class SessionUpgrade(SQLModel, table=True):
    """Maps to `session_upgrades`. Temporary purchases made with session gold."""
    __tablename__ = "session_upgrades"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: Optional[uuid.UUID] = Field(default=None, foreign_key="player_story_sessions.id")
    upgrade_type: str = Field(max_length=50, nullable=False)
    target_id: Optional[int] = Field(default=None)  # skill ID for skill upgrades
    level: int = Field(default=0)
    total_cost_paid: float = Field(default=0)
    current_multiplier: float = Field(default=1.0)


class PlayerMetaProgression(SQLModel, table=True):
    """Maps to `player_meta_progression`. Permanent Essence earned from Story Mode."""
    __tablename__ = "player_meta_progression"

    player_id: int = Field(primary_key=True, foreign_key="players.id")
    elysium_essence: float = Field(default=0)
    total_essence_earned: float = Field(default=0)
    spent_essence: float = Field(default=0)
    updated_at: Optional[datetime] = Field(default=None)


class DevContentAudit(SQLModel, table=True):
    """Maps to `dev_content_audit`. Logs missing assets/stats for content pipeline."""
    __tablename__ = "dev_content_audit"

    id: Optional[int] = Field(default=None, primary_key=True)
    audit_type: str = Field(max_length=50, nullable=False)
    entity_type: Optional[str] = Field(default=None, max_length=50)
    entity_id: Optional[int] = Field(default=None)
    entity_name: Optional[str] = Field(default=None, max_length=255)
    missing_field: Optional[str] = Field(default=None, max_length=100)
    scene_id: Optional[int] = Field(default=None, foreign_key="scenes.id")
    zone_level: Optional[int] = Field(default=None)
    logged_at: Optional[datetime] = Field(default=None)
    resolved: bool = Field(default=False)


class CharacterSkillLevel(SQLModel, table=True):
    """Maps to `character_skill_levels`. Bridges Idle Training (2.3) and Story Mode (2.2)."""
    __tablename__ = "character_skill_levels"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False)
    skill_id: int = Field(foreign_key="skills.id", nullable=False)
    level: int = Field(default=1)
    current_xp: float = Field(default=0)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class BossCompletion(SQLModel, table=True):
    """Maps to `boss_completions`. One record per player per boss scene (first-clear only)."""
    __tablename__ = "boss_completions"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    scene_id: int = Field(foreign_key="scenes.id", nullable=False)
    boss_type: str = Field(max_length=20, nullable=False)  # 'chapter_boss' | 'book_boss'
    chapter_id: Optional[int] = Field(default=None, foreign_key="chapters.id")
    book_id: Optional[int] = Field(default=None, foreign_key="books.id")
    session_id: Optional[uuid.UUID] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)



class EntitySceneAppearance(SQLModel, table=True):
    """Maps to `entity_scene_appearances`. Links entities to scenes with role metadata."""
    __tablename__ = "entity_scene_appearances"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: int = Field(foreign_key="entities.id", nullable=False)
    scene_id: int = Field(foreign_key="scenes.id", nullable=False)
    role: Optional[str] = Field(default=None, max_length=50)
    is_present: bool = Field(default=True)
    description_delta: Optional[str] = Field(default=None)
    emotional_state_delta: Optional[str] = Field(default=None)
    equipment_delta: Optional[str] = Field(default=None)
    exit_reason: Optional[str] = Field(default=None, max_length=255)
    entry_context: Optional[str] = Field(default=None)
    relationships: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
