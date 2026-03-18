"""Marketplace models: listings, trades, notifications, price history (3.5)."""

from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.types import JSON


# =============================================================================
# Marketplace Listings
# =============================================================================

class MarketplaceListing(SQLModel, table=True):
    """Maps to `marketplace_listings`. Tracks all marketplace listings."""
    __tablename__ = "marketplace_listings"

    id: Optional[int] = Field(default=None, primary_key=True)
    seller_id: int = Field(foreign_key="players.id", nullable=False)
    buyer_id: Optional[int] = Field(default=None, foreign_key="players.id")

    item_type: str = Field(max_length=20, nullable=False)  # 'artifact' | 'equipment'
    item_ref_id: int = Field(nullable=False)
    item_name: str = Field(max_length=150, nullable=False)
    item_rarity: str = Field(max_length=50, nullable=False)
    item_stats: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    item_icon_key: Optional[str] = Field(default=None, max_length=100)
    item_gear_slot: Optional[int] = Field(default=None, foreign_key="gear_slots.id")
    is_curated: bool = Field(default=False)

    price_shards: int = Field(nullable=False)

    status: str = Field(default="active", max_length=20)
    listed_at: Optional[datetime] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    sold_at: Optional[datetime] = Field(default=None)
    cancelled_at: Optional[datetime] = Field(default=None)
    expired_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))


# =============================================================================
# Marketplace Trades
# =============================================================================

class MarketplaceTrade(SQLModel, table=True):
    """Maps to `marketplace_trades`. Records completed trades."""
    __tablename__ = "marketplace_trades"

    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="marketplace_listings.id", nullable=False)
    buyer_id: int = Field(foreign_key="players.id", nullable=False)
    seller_id: int = Field(foreign_key="players.id", nullable=False)

    item_type: str = Field(max_length=20, nullable=False)
    item_ref_id: int = Field(nullable=False)
    item_name: str = Field(max_length=150, nullable=False)
    item_rarity: str = Field(max_length=50, nullable=False)

    price_shards: int = Field(nullable=False)
    tax_shards: int = Field(default=0)
    seller_proceeds: int = Field(nullable=False)

    claim_status: str = Field(default="claimed", max_length=20)  # claimed|pending|discarded|reversed
    traded_at: Optional[datetime] = Field(default=None)


# =============================================================================
# Marketplace Notifications
# =============================================================================

class MarketplaceNotification(SQLModel, table=True):
    """Maps to `marketplace_notifications`. Trade notifications for players."""
    __tablename__ = "marketplace_notifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="players.id", nullable=False)
    notification_type: str = Field(max_length=30, nullable=False)  # item_sold|listing_expired|listing_removed
    title: str = Field(max_length=200, nullable=False)
    message: str = Field(nullable=False)
    related_listing_id: Optional[int] = Field(default=None, foreign_key="marketplace_listings.id")
    is_read: bool = Field(default=False)
    created_at: Optional[datetime] = Field(default=None)
    read_at: Optional[datetime] = Field(default=None)


# =============================================================================
# Marketplace Price History
# =============================================================================

class MarketplacePriceHistory(SQLModel, table=True):
    """Maps to `marketplace_price_history`. Price change audit log."""
    __tablename__ = "marketplace_price_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="marketplace_listings.id", nullable=False)
    price: int = Field(nullable=False)
    old_price: Optional[int] = Field(default=None)
    action: str = Field(max_length=20, nullable=False)  # 'listed' | 'adjusted'
    changed_at: Optional[datetime] = Field(default=None)
