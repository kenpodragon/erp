"""Chat system models (REC 2.6.4)."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class ChatChannel(SQLModel, table=True):
    """Chat channel metadata. Messages are in-memory only."""
    __tablename__ = "chat_channels"

    id: str = Field(primary_key=True, max_length=50)
    name: str = Field(max_length=100, nullable=False)
    channel_type: str = Field(default="global", max_length=20)
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default=None)
    created_by: Optional[int] = Field(default=None, foreign_key="players.id")
