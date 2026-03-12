"""Finance models: admin shard adjustment audit trail (3.6)."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class AdminShardAdjustment(SQLModel, table=True):
    """Maps to `admin_shard_adjustments`. Audit trail for manual shard grants/debits."""
    __tablename__ = "admin_shard_adjustments"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    admin_email: str = Field(max_length=255, nullable=False)
    adjust_type: str = Field(max_length=10, nullable=False)  # 'grant' | 'debit'
    amount: int = Field(nullable=False)
    reason: str = Field(nullable=False)
    balance_before: int = Field(nullable=False)
    balance_after: int = Field(nullable=False)
    shard_txn_id: Optional[int] = Field(default=None, foreign_key="shard_transactions.id")
    created_at: Optional[datetime] = Field(default=None)
