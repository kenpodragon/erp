"""Support ticket models."""

from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


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
