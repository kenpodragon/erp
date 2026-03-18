"""Admin & system models."""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


class ServerConfig(SQLModel, table=True):
    """Maps to the `server_config` table. Dynamic key-value settings."""

    __tablename__ = "server_config"

    key: str = Field(primary_key=True, max_length=100)
    value: Optional[str] = Field(default=None)
    value_type: str = Field(max_length=20)  # string, integer, numeric, boolean, text
    category: str = Field(max_length=50)  # game, ops
    description: Optional[str] = Field(default=None)
    default_value: Optional[str] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)
    updated_by: Optional[str] = Field(default=None, max_length=255)


class ActivityEvent(SQLModel, table=True):
    """Maps to the `activity_events` table. Player behavior event log."""

    __tablename__ = "activity_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: Optional[int] = Field(default=None, foreign_key="players.id")
    event_type: str = Field(max_length=50, nullable=False)
    event_data: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)


class AdminAuditLog(SQLModel, table=True):
    """Maps to the `admin_audit_log` table. Immutable admin action audit trail."""

    __tablename__ = "admin_audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    admin_email: str = Field(max_length=255, nullable=False)
    action: str = Field(max_length=100, nullable=False)
    target_type: str = Field(max_length=50, nullable=False)
    target_id: str = Field(max_length=100, nullable=False)
    details: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    ip_address: Optional[str] = Field(default=None, max_length=45)
    created_at: Optional[datetime] = Field(default=None)


class AdminWhitelistEmail(SQLModel, table=True):
    """Maps to `admin_whitelist_emails`. Dynamic email whitelist for admin access."""
    __tablename__ = "admin_whitelist_emails"

    email: str = Field(primary_key=True, max_length=255)
    added_by: Optional[str] = Field(default=None, max_length=255)
    created_at: Optional[datetime] = Field(default=datetime.now(timezone.utc))


class AdminEssenceAdjustment(SQLModel, table=True):
    """Maps to `admin_essence_adjustments`. Immutable audit trail for admin Essence grants/debits."""

    __tablename__ = "admin_essence_adjustments"

    id: Optional[int] = Field(default=None, primary_key=True)
    character_id: int = Field(foreign_key="player_characters.id", nullable=False, index=True)
    player_id: int = Field(foreign_key="players.id", nullable=False, index=True)
    admin_email: str = Field(max_length=255, nullable=False)
    adjustment_type: str = Field(max_length=10, nullable=False)  # "grant" or "debit"
    amount: float = Field(nullable=False)
    balance_before: float = Field(nullable=False)
    balance_after: float = Field(nullable=False)
    reason: str = Field(max_length=500, nullable=False)
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))


class AdminWhitelistIP(SQLModel, table=True):
    """Maps to `admin_whitelist_ips`. Dynamic IP whitelist for admin access."""
    __tablename__ = "admin_whitelist_ips"

    ip_address: str = Field(primary_key=True, max_length=45)
    note: Optional[str] = Field(default=None, max_length=255)
    added_by: Optional[str] = Field(default=None, max_length=255)
    created_at: Optional[datetime] = Field(default=datetime.now(timezone.utc))
