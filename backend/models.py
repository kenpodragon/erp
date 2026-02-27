"""
SQLModel ORM models for ERP.

These map to the tables created by db/002_onboarding_and_admin.sql.
Only models needed by the current implementation phase are defined here;
more will be added as features are built (characters, tickets, config, etc.).
"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


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
    created_at: Optional[datetime] = Field(default=None)
    last_login_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
