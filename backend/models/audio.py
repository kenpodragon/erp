"""Audio & Music system models (REC 2.5)."""

from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


class Atmosphere(SQLModel, table=True):
    """Maps to the `atmospheres` table. Themed Web Audio API synthesis definitions."""
    __tablename__ = "atmospheres"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, unique=True, nullable=False)
    archetype: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)

    music_definitions: Optional[Any] = Field(
        default=None,
        sa_column=Column(JSON, default={"explore": None, "combat": None, "boss": None, "mystery": None}),
    )

    generator_bpm: int = Field(default=120)
    generator_key: str = Field(default="C", max_length=10)
    generator_scale: str = Field(default="minor", max_length=50)
    generator_complexity: int = Field(default=5)
    generator_seed: Optional[int] = Field(default=None)

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class AudioConfig(SQLModel, table=True):
    """Maps to the `audio_configs` table. SFX preset definitions."""
    __tablename__ = "audio_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    config_key: str = Field(max_length=100, unique=True, nullable=False)
    category: str = Field(default="sfx", max_length=50)
    display_name: Optional[str] = Field(default=None, max_length=100)

    preset_definition: Optional[Any] = Field(
        default=None,
        sa_column=Column(JSON, default={}),
    )

    base_volume: float = Field(default=1.0)
    pitch_variation: float = Field(default=0.0)
    spatial_enabled: bool = Field(default=False)

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
