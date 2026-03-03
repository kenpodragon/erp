"""Player & Account models."""

from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


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
    narration_wpm: int = Field(default=300)
    narration_font_size: int = Field(default=16)
    narration_block_height: int = Field(default=50)
    ui_scale: float = Field(default=1.0)
    game_text_scale: float = Field(default=2.0)
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
