"""Game progress models."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship


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
    character: "PlayerCharacter" = Relationship(back_populates="progress")


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
    character: "PlayerCharacter" = Relationship(back_populates="essence")
