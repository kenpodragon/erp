"""Home Base Hub models: Artifacts, Achievements, Titles, Leaderboard, Shards."""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


# =============================================================================
# Artifact System
# =============================================================================

class CuratedArtifact(SQLModel, table=True):
    """Maps to `curated_artifacts`. Hand-designed lore artifacts."""
    __tablename__ = "curated_artifacts"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True, nullable=False)
    description: str = Field(nullable=False)
    lore_text: Optional[str] = Field(default=None)
    icon_sprite_key: str = Field(max_length=100, nullable=False)
    source_type: str = Field(max_length=20, nullable=False)
    source_id: Optional[int] = Field(default=None)
    source_hint: str = Field(max_length=255, nullable=False)
    base_drop_chance: Decimal = Field(default=Decimal("0.01"))
    synergy_set_id: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class CuratedArtifactTier(SQLModel, table=True):
    """Maps to `curated_artifact_tiers`. Per-rarity stat definitions."""
    __tablename__ = "curated_artifact_tiers"

    id: Optional[int] = Field(default=None, primary_key=True)
    curated_artifact_id: int = Field(foreign_key="curated_artifacts.id", nullable=False)
    rarity: str = Field(max_length=20, nullable=False)
    stat_bonuses: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    unique_effect_text: Optional[str] = Field(default=None)
    drop_chance_multiplier: Decimal = Field(default=Decimal("1.0"))


class ArtifactTypeBase(SQLModel, table=True):
    """Maps to `artifact_type_bases`. Type bases for generated artifacts."""
    __tablename__ = "artifact_type_bases"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=50, nullable=False)
    base_stat_range: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    lore_reference: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)


class ArtifactPrefix(SQLModel, table=True):
    """Maps to `artifact_prefixes`. Prefix name components for generated artifacts."""
    __tablename__ = "artifact_prefixes"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=50, nullable=False)
    stat_bonuses: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    created_at: Optional[datetime] = Field(default=None)


class ArtifactSuffix(SQLModel, table=True):
    """Maps to `artifact_suffixes`. Suffix name components for generated artifacts."""
    __tablename__ = "artifact_suffixes"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=8, unique=True, nullable=False)
    display_name: str = Field(max_length=100, nullable=False)
    stat_bonuses: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    created_at: Optional[datetime] = Field(default=None)


class PlayerArtifact(SQLModel, table=True):
    """Maps to `player_artifacts`. Player-owned artifact instances."""
    __tablename__ = "player_artifacts"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False)
    artifact_type: str = Field(max_length=20, nullable=False)
    curated_artifact_id: Optional[int] = Field(default=None, foreign_key="curated_artifacts.id")
    artifact_code: Optional[str] = Field(default=None, max_length=60)
    name: str = Field(max_length=150, nullable=False)
    rarity: str = Field(max_length=20, nullable=False)
    icon_sprite_key: str = Field(default="artifact_default", max_length=100)
    stat_bonuses: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    acquired_from: Optional[str] = Field(default=None, max_length=100)
    is_new: bool = Field(default=True)
    acquired_at: Optional[datetime] = Field(default=None)


# =============================================================================
# Achievement & Title System
# =============================================================================

class Title(SQLModel, table=True):
    """Maps to `titles`. Earnable display titles for players."""
    __tablename__ = "titles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True, nullable=False)
    display_format: str = Field(max_length=10, nullable=False)
    achievement_id: Optional[int] = Field(default=None, foreign_key="achievements.id")
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = Field(default=None)


class Achievement(SQLModel, table=True):
    """Maps to `achievements`. Master achievement definitions."""
    __tablename__ = "achievements"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=150, nullable=False)
    description: str = Field(nullable=False)
    category: str = Field(max_length=20, nullable=False)
    icon_sprite_key: str = Field(default="achievement_default", max_length=100)
    tracking_type: str = Field(max_length=20, nullable=False)
    tracking_source: str = Field(max_length=100, nullable=False)
    threshold_value: Decimal = Field(default=Decimal("1"))
    parent_achievement_id: Optional[int] = Field(default=None, foreign_key="achievements.id")
    reward_shards: int = Field(default=0)
    reward_essence: int = Field(default=0)
    reward_title_id: Optional[int] = Field(default=None, foreign_key="titles.id")
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class PlayerAchievement(SQLModel, table=True):
    """Maps to `player_achievements`. Player achievement progress and completion."""
    __tablename__ = "player_achievements"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    achievement_id: int = Field(foreign_key="achievements.id", nullable=False)
    progress_value: Decimal = Field(default=Decimal("0"))
    is_completed: bool = Field(default=False)
    is_new: bool = Field(default=True)
    earned_at: Optional[datetime] = Field(default=None)


class PlayerTitle(SQLModel, table=True):
    """Maps to `player_titles`. Unlocked title pool per player."""
    __tablename__ = "player_titles"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    title_id: int = Field(foreign_key="titles.id", nullable=False)
    earned_at: Optional[datetime] = Field(default=None)


# =============================================================================
# Leaderboard Cache
# =============================================================================

class LeaderboardCache(SQLModel, table=True):
    """Maps to `leaderboard_cache`. Pre-computed leaderboard rankings."""
    __tablename__ = "leaderboard_cache"

    id: Optional[int] = Field(default=None, primary_key=True)
    category: str = Field(max_length=20, nullable=False)
    rank: int = Field(nullable=False)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    player_alias: str = Field(max_length=100, nullable=False)
    character_class: Optional[str] = Field(default=None, max_length=50)
    character_level: Optional[int] = Field(default=None)
    equipped_title: Optional[str] = Field(default=None, max_length=100)
    metric_value: Decimal = Field(nullable=False)
    badge_tier: Optional[str] = Field(default=None, max_length=10)
    updated_at: Optional[datetime] = Field(default=None)


# =============================================================================
# Shard Transactions
# =============================================================================

class ShardTransaction(SQLModel, table=True):
    """Maps to `shard_transactions`. Audit trail for premium currency."""
    __tablename__ = "shard_transactions"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    amount: int = Field(nullable=False)
    balance_after: int = Field(nullable=False)
    source_type: str = Field(max_length=30, nullable=False)
    source_id: Optional[int] = Field(default=None)
    description: Optional[str] = Field(default=None, max_length=255)
    created_at: Optional[datetime] = Field(default=None)
