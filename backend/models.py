"""
SQLModel ORM models for ERP.

These map to the tables created by db/002_onboarding_and_admin.sql.
Only models needed by the current implementation phase are defined here;
more will be added as features are built (characters, tickets, config, etc.).
"""

from datetime import datetime, timezone
from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON


class Player(SQLModel, table=True):
    """Maps to the `players` table."""

    __tablename__ = "players"

    id: Optional[int] = Field(default=None, primary_key=True)
    firebase_uid: str = Field(max_length=128, unique=True, nullable=False)
    email: str = Field(max_length=255, nullable=False)
    google_display_name: Optional[str] = Field(default=None, max_length=255)
    google_avatar_url: Optional[str] = Field(default=None)
    alias: Optional[str] = Field(default=None, max_length=20)
    custom_avatar_url: Optional[str] = Field(default=None)
    avatar_preset_key: Optional[str] = Field(default=None, max_length=50)
    terms_accepted_at: Optional[datetime] = Field(default=None)
    is_banned: bool = Field(default=False)
    banned_at: Optional[datetime] = Field(default=None)
    banned_by: Optional[str] = Field(default=None, max_length=255)
    ban_reason: Optional[str] = Field(default=None)
    sessions_invalid_before: Optional[datetime] = Field(default=None)
    
    # Granular Roles
    is_owner: bool = Field(default=False)
    is_system_admin: bool = Field(default=False)
    is_game_admin: bool = Field(default=False)
    
    created_at: Optional[datetime] = Field(default=None)
    last_login_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    settings: Optional["PlayerSettings"] = Relationship(back_populates="player", sa_relationship_kwargs={"uselist": False})
    characters: List["PlayerCharacter"] = Relationship(back_populates="player")
    tickets: List["SupportTicket"] = Relationship(back_populates="player")


class PlayerSettings(SQLModel, table=True):
    """Maps to the `player_settings` table."""

    __tablename__ = "player_settings"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", unique=True, nullable=False)
    audio_enabled: bool = Field(default=True)
    music_volume: int = Field(default=80)
    sfx_volume: int = Field(default=80)
    narration_speed: float = Field(default=1.0)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    player: Player = Relationship(back_populates="settings")


class CharacterClass(SQLModel, table=True):
    """Maps to the `character_classes` table."""

    __tablename__ = "character_classes"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    lore_blurb: Optional[str] = Field(default=None)
    base_strength: int = Field(default=10)
    base_agility: int = Field(default=10)
    base_intelligence: int = Field(default=10)
    sprite_key: Optional[str] = Field(default=None, max_length=100)
    is_available: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    characters: List["PlayerCharacter"] = Relationship(back_populates="character_class")


class PlayerCharacter(SQLModel, table=True):
    """Maps to the `player_characters` table."""

    __tablename__ = "player_characters"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    class_id: int = Field(foreign_key="character_classes.id", nullable=False)
    character_name: str = Field(max_length=20, nullable=False)
    level: int = Field(default=1)
    strength: Optional[int] = Field(default=None)
    agility: Optional[int] = Field(default=None)
    intelligence: Optional[int] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    last_played_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    player: Player = Relationship(back_populates="characters")
    character_class: CharacterClass = Relationship(back_populates="characters")
    progress: Optional["PlayerProgress"] = Relationship(back_populates="character", sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"})
    essence: Optional["PlayerEssence"] = Relationship(back_populates="character", sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"})


class PlayerProgress(SQLModel, table=True):
    """Maps to the `player_progress` table. Tracks narrative position."""

    __tablename__ = "player_progress"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False, unique=True)
    book_number: int = Field(default=1)
    chapter_number: int = Field(default=1)
    scene_number: int = Field(default=1)
    beat_number: int = Field(default=1)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    character: PlayerCharacter = Relationship(back_populates="progress")


class PlayerEssence(SQLModel, table=True):
    """Maps to the `player_essence` table. Tracks currency/resource."""

    __tablename__ = "player_essence"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False, unique=True)
    current_balance: float = Field(default=0.0)
    passive_rate: float = Field(default=0.0)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    character: PlayerCharacter = Relationship(back_populates="essence")


class SupportTicket(SQLModel, table=True):
    """Maps to the `support_tickets` table."""

    __tablename__ = "support_tickets"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    category: Optional[str] = Field(default=None, max_length=50)
    priority: str = Field(default="normal", max_length=20)
    subject: str = Field(max_length=100, nullable=False)
    status: str = Field(default="open", max_length=20)
    assigned_admin: Optional[str] = Field(default=None, max_length=255)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
    resolved_at: Optional[datetime] = Field(default=None)
    closed_at: Optional[datetime] = Field(default=None)
    player_last_viewed_at: Optional[datetime] = Field(default=None)
    admin_last_viewed_at: Optional[datetime] = Field(default=None)

    # Relationships
    player: "Player" = Relationship(back_populates="tickets")
    replies: List["SupportReply"] = Relationship(back_populates="ticket")
    attachments: List["SupportAttachment"] = Relationship(back_populates="ticket")


class SupportReply(SQLModel, table=True):
    """Maps to the `support_replies` table."""

    __tablename__ = "support_replies"

    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="support_tickets.id", nullable=False)
    author_type: Optional[str] = Field(default=None, max_length=10)  # 'player' or 'admin'
    author_id: Optional[int] = Field(default=None)  # players.id if player
    author_email: Optional[str] = Field(default=None, max_length=255)  # admin email if admin
    content: str = Field(nullable=False)
    is_internal_note: bool = Field(default=False)
    created_at: Optional[datetime] = Field(default=None)

    # Relationships
    ticket: SupportTicket = Relationship(back_populates="replies")


class SupportAttachment(SQLModel, table=True):
    """Maps to the `support_attachments` table. Not used in endpoints yet (deferred)."""

    __tablename__ = "support_attachments"

    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="support_tickets.id", nullable=False)
    reply_id: Optional[int] = Field(default=None, foreign_key="support_replies.id")
    file_name: str = Field(max_length=255, nullable=False)
    file_path: str = Field(nullable=False)
    file_size: int = Field(nullable=False)
    mime_type: str = Field(max_length=100, nullable=False)
    uploaded_by: Optional[int] = Field(default=None, foreign_key="players.id")
    created_at: Optional[datetime] = Field(default=None)

    # Relationships
    ticket: SupportTicket = Relationship(back_populates="attachments")


class ServerConfig(SQLModel, table=True):
    """Maps to the `server_config` table. Dynamic key-value settings."""

    __tablename__ = "server_config"

    key: str = Field(primary_key=True, max_length=100)
    value: Optional[str] = Field(default=None)
    value_type: str = Field(max_length=20)  # string, integer, numeric, boolean, text
    category: str = Field(max_length=50)  # game, ops
    description: Optional[str] = Field(default=None)
    default_value: Optional[str] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
    updated_by: Optional[str] = Field(default=None, max_length=255)


class ActivityEvent(SQLModel, table=True):
    """Maps to the `activity_events` table. Player behavior event log."""

    __tablename__ = "activity_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: Optional[int] = Field(default=None, foreign_key="players.id")
    event_type: str = Field(max_length=50, nullable=False)
    # Use TEXT in SQLite, JSONB in Postgres. SQLModel handles some abstraction,
    # but for SQLite tests we need a compatible type.
    event_data: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)


class AdminAuditLog(SQLModel, table=True):
    """Maps to the `admin_audit_log` table. Immutable admin action audit trail."""

    __tablename__ = "admin_audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    admin_email: str = Field(max_length=255, nullable=False)
    action: str = Field(max_length=100, nullable=False)
    target_type: str = Field(max_length=50, nullable=False)
    target_id: str = Field(max_length=100, nullable=False)
    details: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    ip_address: Optional[str] = Field(default=None, max_length=45)
    created_at: Optional[datetime] = Field(default=None)


# ---------------------------------------------------------------------------
# Game Loop 2.0 Entities (Narrative + Gameplay)
# ---------------------------------------------------------------------------

class Chapter(SQLModel, table=True):
    """Maps to the existing `chapters` table from the book data."""
    __tablename__ = "chapters"

    id: Optional[int] = Field(default=None, primary_key=True)
    book_id: int = Field(foreign_key="books.id", nullable=False)
    chapter_number: int = Field(nullable=False)
    title: Optional[str] = Field(max_length=255)
    raw_text: Optional[str] = Field(default=None)
    sort_order: int = Field(nullable=False)
    processing_status: str = Field(default="not_started")
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    scenes: List["Scene"] = Relationship(back_populates="chapter")


class Scene(SQLModel, table=True):
    """Maps to the existing `scenes` table from the book data."""
    __tablename__ = "scenes"

    id: Optional[int] = Field(default=None, primary_key=True)
    chapter_id: int = Field(foreign_key="chapters.id", nullable=False)
    scene_number: int = Field(nullable=False)
    title: Optional[str] = Field(max_length=255)
    summary: Optional[str] = Field(default=None)
    raw_text: Optional[str] = Field(default=None)
    sort_order: int = Field(nullable=False)
    primary_location_id: Optional[int] = Field(default=None, foreign_key="locations.id")
    has_hard_break: bool = Field(default=False)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    chapter: Chapter = Relationship(back_populates="scenes")
    story_beats: List["StoryBeat"] = Relationship(back_populates="scene")
    gameplay_data: Optional["SceneGameplayData"] = Relationship(back_populates="scene", sa_relationship_kwargs={"uselist": False})


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
    scene: Scene = Relationship(back_populates="gameplay_data")


class StoryBeat(SQLModel, table=True):
    """Maps to the existing `story_beats` table."""
    __tablename__ = "story_beats"

    id: Optional[int] = Field(default=None, primary_key=True)
    scene_id: int = Field(foreign_key="scenes.id", nullable=False)
    beat_number: int = Field(nullable=False)
    summary: Optional[str] = Field(default=None, max_length=500)
    raw_text: Optional[str] = Field(default=None)
    sort_order: int = Field(nullable=False)
    location_id: Optional[int] = Field(default=None, foreign_key="locations.id")
    intensity: Optional[int] = Field(default=None)
    pacing: Optional[str] = Field(default=None, max_length=50)
    timeline_context: Optional[str] = Field(default="present", max_length=50)
    
    # Gameplay Extension (matches 010_game_entities.sql if added there later)
    content_image_path: Optional[str] = Field(default=None, max_length=255)
    audio_path: Optional[str] = Field(default=None, max_length=255)
    audio_duration_seconds: int = Field(default=0)
    
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    scene: Scene = Relationship(back_populates="story_beats")


class Entity(SQLModel, table=True):
    """Maps to the existing `entities` table from the book data."""
    __tablename__ = "entities"

    id: Optional[int] = Field(default=None, primary_key=True)
    canonical_name: str = Field(max_length=255, unique=True, nullable=False)
    entity_type: str = Field(max_length=50, nullable=False)
    is_generated: bool = Field(default=False)
    base_description: Optional[str] = Field(default=None)
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
    stat_block: Optional[Any] = Field(default=None, sa_column=Column(JSONB))
    
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
    benefits_json: Optional[Any] = Field(default=None, sa_column=Column(JSONB))
    xp_curve_type: str = Field(default="standard", max_length=50)
    created_at: Optional[datetime] = Field(default=None)


# ---------------------------------------------------------------------------
# Admin Access Control (Whitelist)
# ---------------------------------------------------------------------------

class AdminWhitelistEmail(SQLModel, table=True):
    """Maps to `admin_whitelist_emails`. Dynamic email whitelist for admin access."""
    __tablename__ = "admin_whitelist_emails"

    email: str = Field(primary_key=True, max_length=255)
    added_by: Optional[str] = Field(default=None, max_length=255)
    created_at: Optional[datetime] = Field(default=datetime.now(timezone.utc))


class AdminWhitelistIP(SQLModel, table=True):
    """Maps to `admin_whitelist_ips`. Dynamic IP whitelist for admin access."""
    __tablename__ = "admin_whitelist_ips"

    ip_address: str = Field(primary_key=True, max_length=45)
    note: Optional[str] = Field(default=None, max_length=255)
    added_by: Optional[str] = Field(default=None, max_length=255)
    created_at: Optional[datetime] = Field(default=datetime.now(timezone.utc))

