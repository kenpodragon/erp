"""Donation system models: individual donations and patron tracking."""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class Donation(SQLModel, table=True):
    """Maps to `donations`. Individual donation records with cumulative snapshots."""
    __tablename__ = "donations"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    payment_order_id: int = Field(foreign_key="payment_orders.id", nullable=False)
    amount_cents: int = Field(nullable=False)
    cumulative_total_cents: int = Field(default=0, nullable=False)
    patron_tier: Optional[str] = Field(default=None, max_length=20)
    diamond_stars: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
