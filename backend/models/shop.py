"""Elysium Emporium models: Shop Catalog, Bundles, Player Ownership, Active Boosters."""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Text, Numeric, JSON


class ShopItem(SQLModel, table=True):
    """Maps to `shop_items`. Master catalog of all purchasable shop items."""
    __tablename__ = "shop_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_key: str = Field(max_length=60, unique=True, nullable=False)
    name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    category: str = Field(max_length=20, nullable=False)  # skin, flair, badge, avatar, booster
    price_shards: int = Field(nullable=False)
    icon_asset_key: Optional[str] = Field(default=None, max_length=255)
    class_restriction: Optional[int] = Field(default=None, foreign_key="character_classes.id")
    item_metadata: Optional[dict] = Field(default=None, sa_column=Column("item_metadata", JSON))
    is_active: bool = Field(default=True, nullable=False)
    is_featured: bool = Field(default=False, nullable=False)
    featured_from: Optional[datetime] = Field(default=None)
    featured_until: Optional[datetime] = Field(default=None)
    available_from: Optional[datetime] = Field(default=None)
    available_until: Optional[datetime] = Field(default=None)
    sort_order: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    bundle_items: list["ShopBundleItem"] = Relationship(back_populates="shop_item")
    player_items: list["PlayerShopItem"] = Relationship(back_populates="shop_item")
    active_boosters: list["PlayerActiveBooster"] = Relationship(back_populates="shop_item")


class ShopBundle(SQLModel, table=True):
    """Maps to `shop_bundles`. Curated bundle packages with discount pricing."""
    __tablename__ = "shop_bundles"

    id: Optional[int] = Field(default=None, primary_key=True)
    bundle_key: str = Field(max_length=60, unique=True, nullable=False)
    name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    price_shards: int = Field(nullable=False)
    original_price_shards: int = Field(nullable=False)
    discount_pct: int = Field(default=20, nullable=False)
    icon_asset_key: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True, nullable=False)
    is_featured: bool = Field(default=False, nullable=False)
    featured_from: Optional[datetime] = Field(default=None)
    featured_until: Optional[datetime] = Field(default=None)
    available_from: Optional[datetime] = Field(default=None)
    available_until: Optional[datetime] = Field(default=None)
    sort_order: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    items: list["ShopBundleItem"] = Relationship(back_populates="bundle")
    player_items: list["PlayerShopItem"] = Relationship(back_populates="source_bundle")


class ShopBundleItem(SQLModel, table=True):
    """Maps to `shop_bundle_items`. Junction table linking bundles to their contained items."""
    __tablename__ = "shop_bundle_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    bundle_id: int = Field(nullable=False, foreign_key="shop_bundles.id")
    shop_item_id: int = Field(nullable=False, foreign_key="shop_items.id")
    sort_order: int = Field(default=0, nullable=False)

    # Relationships
    bundle: Optional[ShopBundle] = Relationship(back_populates="items")
    shop_item: Optional[ShopItem] = Relationship(back_populates="bundle_items")


class PlayerShopItem(SQLModel, table=True):
    """Maps to `player_shop_items`. Player ownership of shop items (account-wide)."""
    __tablename__ = "player_shop_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(nullable=False, foreign_key="players.id")
    shop_item_id: Optional[int] = Field(default=None, foreign_key="shop_items.id")
    source_bundle_id: Optional[int] = Field(default=None, foreign_key="shop_bundles.id")
    status: str = Field(default="owned", max_length=20, nullable=False)  # owned, refunded
    purchased_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    refunded_at: Optional[datetime] = Field(default=None)

    # Relationships
    shop_item: Optional[ShopItem] = Relationship(back_populates="player_items")
    source_bundle: Optional[ShopBundle] = Relationship(back_populates="player_items")


class PlayerActiveBooster(SQLModel, table=True):
    """Maps to `player_active_boosters`. Tracks active and expired time-limited boosters."""
    __tablename__ = "player_active_boosters"

    id: Optional[int] = Field(default=None, primary_key=True)
    player_id: int = Field(nullable=False, foreign_key="players.id")
    boost_type: str = Field(max_length=20, nullable=False)  # xp, essence, drop_rate
    magnitude: float = Field(sa_column=Column(Numeric(5, 2), nullable=False))
    duration_seconds: int = Field(nullable=False)
    elapsed_seconds: int = Field(default=0, nullable=False)
    shop_item_id: Optional[int] = Field(default=None, foreign_key="shop_items.id")
    status: str = Field(default="active", max_length=20, nullable=False)  # active, expired
    activated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expired_at: Optional[datetime] = Field(default=None)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    shop_item: Optional[ShopItem] = Relationship(back_populates="active_boosters")
