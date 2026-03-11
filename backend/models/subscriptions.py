"""Subscription models: PlayerSubscription, SubscriptionStipendLog (3.2)."""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class PlayerSubscription(SQLModel, table=True):
    """Maps to `player_subscriptions`. Append-only subscription lifecycle tracker."""
    __tablename__ = "player_subscriptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    stripe_subscription_id: Optional[str] = Field(default=None, max_length=255)
    stripe_price_id: Optional[str] = Field(default=None, max_length=255)
    plan_key: str = Field(max_length=30, nullable=False)
    status: str = Field(default="active", max_length=20)
    source: str = Field(default="stripe", max_length=20)
    subscription_start_date: Optional[datetime] = Field(default=None)
    current_period_start: Optional[datetime] = Field(default=None)
    current_period_end: Optional[datetime] = Field(default=None)
    cancel_at_period_end: bool = Field(default=False)
    continuous_streak: int = Field(default=0)
    grace_period_start: Optional[datetime] = Field(default=None)
    grace_deadline: Optional[datetime] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


class SubscriptionStipendLog(SQLModel, table=True):
    """Maps to `subscription_stipend_log`. One row per credited stipend month."""
    __tablename__ = "subscription_stipend_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    subscription_id: int = Field(foreign_key="player_subscriptions.id", nullable=False)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    period_key: str = Field(max_length=7, nullable=False)
    shards_credited: int = Field(nullable=False)
    stripe_invoice_id: Optional[str] = Field(default=None, max_length=255)
    period_start: Optional[datetime] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
