"""Discovery system models (REC 2.6.2)."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class PlayerEntityDiscovery(SQLModel, table=True):
    """Tracks per-player entity encounters, kills, and codex rank."""
    __tablename__ = "player_entity_discovery"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    entity_id: int = Field(foreign_key="entities.id", nullable=False)
    encounters: int = Field(default=0)
    kills: int = Field(default=0)
    rank: Optional[str] = Field(default=None, max_length=2)
    first_seen_at: Optional[datetime] = Field(default=None)
    is_new: bool = Field(default=True)


class PlayerDiscoveryLog(SQLModel, table=True):
    """Tracks discovered skills, item components, and effects."""
    __tablename__ = "player_discovery_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    discovery_type: str = Field(max_length=20, nullable=False)
    reference_id: int = Field(nullable=False)
    discovered_at: Optional[datetime] = Field(default=None)
    is_new: bool = Field(default=True)
