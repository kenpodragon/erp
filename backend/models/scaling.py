"""Scaling & difficulty models for the 5.4 Banner & Scaling Editor."""

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB


class WavePreset(SQLModel, table=True):
    __tablename__ = "wave_presets"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    description: Optional[str] = None
    config: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'::jsonb"))
    is_default: bool = Field(default=False)
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WavePresetAssignment(SQLModel, table=True):
    __tablename__ = "wave_preset_assignments"

    id: Optional[int] = Field(default=None, primary_key=True)
    wave_preset_id: int = Field(foreign_key="wave_presets.id")
    book_id: Optional[int] = Field(default=None, foreign_key="books.id")
    chapter_id: Optional[int] = Field(default=None, foreign_key="chapters.id")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DifficultyCurve(SQLModel, table=True):
    __tablename__ = "difficulty_curves"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    description: Optional[str] = None
    curve_data: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'::jsonb"))
    is_default: bool = Field(default=False)
    sort_order: int = Field(default=0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DifficultyPreset(SQLModel, table=True):
    __tablename__ = "difficulty_presets"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    description: Optional[str] = None
    difficulty_curve_id: Optional[int] = Field(default=None, foreign_key="difficulty_curves.id")
    wave_preset_id: Optional[int] = Field(default=None, foreign_key="wave_presets.id")
    config_snapshot: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'::jsonb"))
    is_active: bool = Field(default=False)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
