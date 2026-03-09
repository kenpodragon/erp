"""Narrative structure models (Books, Chapters, Scenes, StoryBeats, Locations)."""

from datetime import datetime
from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from sqlalchemy.types import JSON


class Book(SQLModel, table=True):
    """Maps to the existing `books` table."""
    __tablename__ = "books"

    id: Optional[int] = Field(default=None, primary_key=True)
    book_number: int = Field(unique=True, nullable=False)
    title: str = Field(max_length=255, nullable=False)
    source_file: str = Field(max_length=255, nullable=False)
    transition_lore_text: Optional[str] = Field(default=None)
    recommended_level: Optional[int] = Field(default=None)
    min_level: Optional[int] = Field(default=None)
    atmosphere_id: Optional[int] = Field(default=None, foreign_key="atmospheres.id")
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    chapters: List["Chapter"] = Relationship(back_populates="book")


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
    transition_lore_text: Optional[str] = Field(default=None)
    recommended_level: Optional[int] = Field(default=None)
    min_level: Optional[int] = Field(default=None)
    atmosphere_id: Optional[int] = Field(default=None, foreign_key="atmospheres.id")
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    book: Book = Relationship(back_populates="chapters")
    scenes: List["Scene"] = Relationship(back_populates="chapter")


class Location(SQLModel, table=True):
    """Maps to the existing `locations` table."""
    __tablename__ = "locations"

    id: Optional[int] = Field(default=None, primary_key=True)
    canonical_name: str = Field(max_length=255, unique=True, nullable=False)
    description: Optional[str] = Field(default=None)
    archetype_id: Optional[int] = Field(default=None, foreign_key="atmospheres.id")
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


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
    scene_type: str = Field(default='normal')
    boss_config: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    chapter: Chapter = Relationship(back_populates="scenes")
    story_beats: List["StoryBeat"] = Relationship(back_populates="scene")
    gameplay_data: Optional["SceneGameplayData"] = Relationship(back_populates="scene", sa_relationship_kwargs={"uselist": False})


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

    # Hidden lore (2.7)
    hidden_lore_text: Optional[str] = Field(default=None)
    lore_intelligence_threshold: Optional[int] = Field(default=None)

    # Gameplay Extension
    content_image_path: Optional[str] = Field(default=None, max_length=255)
    audio_path: Optional[str] = Field(default=None, max_length=255)
    audio_duration_seconds: int = Field(default=0)

    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    scene: Scene = Relationship(back_populates="story_beats")
