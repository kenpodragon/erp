"""Stripe payment models: Shard Packages, Payment Orders, Webhook Events."""

from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


# =============================================================================
# Shard Packages
# =============================================================================

class ShardPackage(SQLModel, table=True):
    """Maps to `shard_packages`. Purchasable shard bundles."""
    __tablename__ = "shard_packages"

    id: Optional[int] = Field(default=None, primary_key=True)
    tier_key: str = Field(max_length=30, unique=True, nullable=False)
    name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None, max_length=255)
    price_cents: int = Field(nullable=False)
    base_shards: int = Field(nullable=False)
    bonus_pct: int = Field(default=0)
    total_shards: int = Field(nullable=False)
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True)
    is_best_value: bool = Field(default=False)
    max_purchases_per_player: Optional[int] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)


# =============================================================================
# Payment Orders
# =============================================================================

class PaymentOrder(SQLModel, table=True):
    """Maps to `payment_orders`. Tracks Stripe checkout lifecycle."""
    __tablename__ = "payment_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    package_id: int = Field(foreign_key="shard_packages.id", nullable=False)
    status: str = Field(default="pending", max_length=20)
    stripe_checkout_session_id: Optional[str] = Field(default=None, max_length=255)
    stripe_payment_intent_id: Optional[str] = Field(default=None, max_length=255)
    stripe_charge_id: Optional[str] = Field(default=None, max_length=255)
    idempotency_key: str = Field(nullable=False)
    price_cents: int = Field(nullable=False)
    shards_credited: int = Field(default=0)
    shards_refunded: int = Field(default=0)
    is_first_purchase: bool = Field(default=False)
    created_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    refunded_at: Optional[datetime] = Field(default=None)
    expired_at: Optional[datetime] = Field(default=None)


# =============================================================================
# Stripe Webhook Events
# =============================================================================

class StripeWebhookEvent(SQLModel, table=True):
    """Maps to `stripe_webhook_events`. Idempotent Stripe event log."""
    __tablename__ = "stripe_webhook_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    stripe_event_id: str = Field(max_length=255, unique=True, nullable=False)
    event_type: str = Field(max_length=100, nullable=False)
    payload: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    processed: bool = Field(default=False)
    processing_error: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    processed_at: Optional[datetime] = Field(default=None)
