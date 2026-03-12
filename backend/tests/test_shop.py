"""Tests for the Elysium Emporium shop system (3.3)."""

import pytest
from datetime import datetime, timezone, timedelta
from sqlmodel import Session

from models import PlayerMetaProgression, GameConfig
from models.shop import (
    ShopItem, ShopBundle, ShopBundleItem,
    PlayerShopItem, PlayerActiveBooster,
)
from services.shop_service import (
    ShopError, purchase_item, purchase_bundle,
    equip_cosmetic, unequip_cosmetic,
    get_active_boosters, increment_booster_time,
    get_catalog, get_player_collection,
    admin_refund_item,
)
from services.boost_service import get_effective_multipliers


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def player_meta(session: Session, test_player):
    """Create PlayerMetaProgression with a healthy shard balance."""
    meta = PlayerMetaProgression(
        player_id=test_player.id,
        elysium_essence=0,
        total_essence_earned=0,
        spent_essence=0,
        shard_balance=5000,
        total_shards_purchased=5000,
    )
    session.add(meta)
    session.commit()
    session.refresh(meta)
    return meta


@pytest.fixture
def shop_skin(session: Session):
    """A universal (no class restriction) skin item."""
    item = ShopItem(
        item_key="skin_void_walker",
        name="Void Walker Skin",
        description="A dark void-themed skin.",
        category="skin",
        price_shards=250,
        is_active=True,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@pytest.fixture
def shop_class_skin(session: Session, test_character_class):
    """A class-restricted skin item."""
    item = ShopItem(
        item_key="skin_engineer_spire",
        name="Spire Engineer Skin",
        description="Engineer-class only skin.",
        category="skin",
        price_shards=350,
        class_restriction=test_character_class.id,
        is_active=True,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@pytest.fixture
def shop_flair(session: Session):
    item = ShopItem(
        item_key="flair_void_whisper",
        name="Void Whisper",
        category="flair",
        price_shards=100,
        is_active=True,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@pytest.fixture
def shop_booster_xp(session: Session):
    """1-hour XP booster."""
    item = ShopItem(
        item_key="booster_xp_1hr",
        name="XP Boost (1hr)",
        category="booster",
        price_shards=75,
        is_active=True,
        item_metadata={"boost_type": "xp", "magnitude": 1.25, "duration_seconds": 3600},
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@pytest.fixture
def shop_booster_xp_8hr(session: Session):
    """8-hour XP booster (higher magnitude)."""
    item = ShopItem(
        item_key="booster_xp_8hr",
        name="XP Boost (8hr)",
        category="booster",
        price_shards=400,
        is_active=True,
        item_metadata={"boost_type": "xp", "magnitude": 1.5, "duration_seconds": 28800},
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@pytest.fixture
def shop_booster_essence(session: Session):
    """1-hour Essence booster."""
    item = ShopItem(
        item_key="booster_essence_1hr",
        name="Essence Boost (1hr)",
        category="booster",
        price_shards=75,
        is_active=True,
        item_metadata={"boost_type": "essence", "magnitude": 1.25, "duration_seconds": 3600},
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@pytest.fixture
def shop_bundle(session: Session, shop_skin, shop_flair):
    """A bundle containing the skin and flair."""
    bundle = ShopBundle(
        bundle_key="bundle_starter",
        name="Starter Bundle",
        description="Skin + Flair combo",
        price_shards=300,
        original_price_shards=350,
        discount_pct=14,
        is_active=True,
    )
    session.add(bundle)
    session.commit()
    session.refresh(bundle)

    bi1 = ShopBundleItem(bundle_id=bundle.id, shop_item_id=shop_skin.id, sort_order=1)
    bi2 = ShopBundleItem(bundle_id=bundle.id, shop_item_id=shop_flair.id, sort_order=2)
    session.add_all([bi1, bi2])
    session.commit()
    return bundle


@pytest.fixture
def limited_item(session: Session):
    """A limited-time item that has expired."""
    item = ShopItem(
        item_key="badge_limited_past",
        name="Legacy Badge",
        category="badge",
        price_shards=150,
        is_active=True,
        available_from=datetime(2020, 1, 1),
        available_until=datetime(2020, 12, 31),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@pytest.fixture
def anti_cheat_config(session: Session):
    """Set the anti-cheat max elapsed per ping config."""
    cfg = GameConfig(
        key="shop_booster_max_elapsed_per_ping",
        value_json="60",
        category="economy",
        description="Max elapsed seconds per booster ping",
    )
    session.add(cfg)
    session.commit()
    return cfg


# =============================================================================
# Purchase Cosmetic Tests
# =============================================================================

class TestPurchaseCosmetic:
    def test_purchase_valid_item(self, session, test_player, player_meta, shop_skin):
        result = purchase_item(test_player.id, shop_skin.id, session)
        assert result["success"] is True
        assert result["item_name"] == "Void Walker Skin"
        assert result["new_balance"] == 5000 - 250
        # Verify ownership record
        owned = session.exec(
            __import__("sqlmodel").select(PlayerShopItem).where(
                PlayerShopItem.player_id == test_player.id,
                PlayerShopItem.shop_item_id == shop_skin.id,
            )
        ).first()
        assert owned is not None
        assert owned.status == "owned"

    def test_insufficient_balance(self, session, test_player, player_meta, shop_skin):
        player_meta.shard_balance = 100
        session.add(player_meta)
        session.commit()
        with pytest.raises(ShopError, match="Insufficient"):
            purchase_item(test_player.id, shop_skin.id, session)

    def test_already_owned(self, session, test_player, player_meta, shop_skin):
        purchase_item(test_player.id, shop_skin.id, session)
        with pytest.raises(ShopError, match="already own"):
            purchase_item(test_player.id, shop_skin.id, session)

    def test_negative_balance_blocked(self, session, test_player, player_meta, shop_skin):
        player_meta.shard_balance = -50
        session.add(player_meta)
        session.commit()
        with pytest.raises(ShopError, match="negative"):
            purchase_item(test_player.id, shop_skin.id, session)


# =============================================================================
# Class-Specific Skin Tests
# =============================================================================

class TestClassSpecificSkin:
    def test_correct_class_succeeds(
        self, session, test_player, player_meta, test_character, shop_class_skin
    ):
        result = purchase_item(test_player.id, shop_class_skin.id, session)
        assert result["success"] is True

    def test_wrong_class_fails(
        self, session, test_player, player_meta, shop_class_skin, test_character_class
    ):
        """Player with no character matching the class restriction."""
        # shop_class_skin requires test_character_class; player has no character
        with pytest.raises(ShopError, match="requires the"):
            purchase_item(test_player.id, shop_class_skin.id, session)


# =============================================================================
# Booster Tests
# =============================================================================

class TestBoosterPurchase:
    def test_new_booster_activation(
        self, session, test_player, player_meta, shop_booster_xp
    ):
        result = purchase_item(test_player.id, shop_booster_xp.id, session)
        assert result["success"] is True
        booster = result["booster_status"]
        assert booster is not None
        assert booster["boost_type"] == "xp"
        assert booster["magnitude"] == 1.25
        assert booster["remaining_seconds"] == 3600
        assert booster["extended"] is False

    def test_booster_extend_same_type(
        self, session, test_player, player_meta, shop_booster_xp, shop_booster_xp_8hr
    ):
        # Activate 1hr booster first
        purchase_item(test_player.id, shop_booster_xp.id, session)
        # Purchase 8hr booster of same type — should extend
        result = purchase_item(test_player.id, shop_booster_xp_8hr.id, session)
        booster = result["booster_status"]
        assert booster["extended"] is True
        # Remaining should be ~3600 + 28800
        assert booster["remaining_seconds"] == 3600 + 28800
        # Magnitude should be max(1.25, 1.5)
        assert booster["magnitude"] == 1.5

    def test_different_type_coexist(
        self, session, test_player, player_meta, shop_booster_xp, shop_booster_essence
    ):
        purchase_item(test_player.id, shop_booster_xp.id, session)
        purchase_item(test_player.id, shop_booster_essence.id, session)
        boosters = get_active_boosters(test_player.id, session)
        assert len(boosters) == 2
        types = {b["boost_type"] for b in boosters}
        assert types == {"xp", "essence"}


# =============================================================================
# Booster Timer & Expiry Tests
# =============================================================================

class TestBoosterTimer:
    def test_increment_booster_time(
        self, session, test_player, player_meta, shop_booster_xp, anti_cheat_config
    ):
        purchase_item(test_player.id, shop_booster_xp.id, session)
        result = increment_booster_time(test_player.id, 30, session)
        assert len(result["active_boosters"]) == 1
        assert result["active_boosters"][0]["remaining_seconds"] == 3600 - 30

    def test_booster_expiry(
        self, session, test_player, player_meta, shop_booster_xp, anti_cheat_config
    ):
        purchase_item(test_player.id, shop_booster_xp.id, session)
        # Manually set elapsed close to duration
        booster = session.exec(
            __import__("sqlmodel").select(PlayerActiveBooster).where(
                PlayerActiveBooster.player_id == test_player.id
            )
        ).first()
        booster.elapsed_seconds = 3590
        session.add(booster)
        session.commit()
        # Increment past duration
        result = increment_booster_time(test_player.id, 20, session)
        assert len(result["expired"]) == 1
        assert result["expired"][0]["boost_type"] == "xp"
        assert len(result["active_boosters"]) == 0

    def test_lazy_expiry_on_access(
        self, session, test_player, player_meta, shop_booster_xp
    ):
        purchase_item(test_player.id, shop_booster_xp.id, session)
        booster = session.exec(
            __import__("sqlmodel").select(PlayerActiveBooster).where(
                PlayerActiveBooster.player_id == test_player.id
            )
        ).first()
        booster.elapsed_seconds = 9999
        session.add(booster)
        session.commit()
        result = get_active_boosters(test_player.id, session)
        assert len(result) == 0

    def test_anti_cheat_clamping(
        self, session, test_player, player_meta, shop_booster_xp, anti_cheat_config
    ):
        purchase_item(test_player.id, shop_booster_xp.id, session)
        # Send absurdly large elapsed — should be clamped to 60
        result = increment_booster_time(test_player.id, 99999, session)
        assert result["active_boosters"][0]["remaining_seconds"] == 3600 - 60


# =============================================================================
# Bundle Tests
# =============================================================================

class TestBundlePurchase:
    def test_purchase_bundle(
        self, session, test_player, player_meta, shop_bundle, shop_skin, shop_flair
    ):
        result = purchase_bundle(test_player.id, shop_bundle.id, session)
        assert result["success"] is True
        assert len(result["delivered"]) == 2
        assert result["new_balance"] == 5000 - 300

    def test_bundle_already_purchased(
        self, session, test_player, player_meta, shop_bundle, shop_skin, shop_flair
    ):
        purchase_bundle(test_player.id, shop_bundle.id, session)
        with pytest.raises(ShopError, match="already purchased"):
            purchase_bundle(test_player.id, shop_bundle.id, session)

    def test_bundle_partial_ownership(
        self, session, test_player, player_meta, shop_bundle, shop_skin, shop_flair
    ):
        # Buy skin individually first
        purchase_item(test_player.id, shop_skin.id, session)
        # Now buy bundle — should only deliver flair
        result = purchase_bundle(test_player.id, shop_bundle.id, session)
        assert "Void Walker Skin" in result["already_owned"]
        assert "Void Whisper" in result["delivered"]


# =============================================================================
# Limited-Time Tests
# =============================================================================

class TestLimitedTime:
    def test_expired_item_blocked(self, session, test_player, player_meta, limited_item):
        with pytest.raises(ShopError, match="no longer available"):
            purchase_item(test_player.id, limited_item.id, session)


# =============================================================================
# Equip / Unequip Tests
# =============================================================================

class TestEquipUnequip:
    def test_equip_flair(self, session, test_player, player_meta, shop_flair):
        purchase_item(test_player.id, shop_flair.id, session)
        result = equip_cosmetic(test_player.id, shop_flair.id, session)
        assert result["success"] is True
        assert result["slot"] == "flair"

    def test_unequip_flair(self, session, test_player, player_meta, shop_flair):
        purchase_item(test_player.id, shop_flair.id, session)
        equip_cosmetic(test_player.id, shop_flair.id, session)
        result = unequip_cosmetic(test_player.id, "flair", session)
        assert result["success"] is True
        assert result["slot"] == "flair"

    def test_equip_not_owned_fails(self, session, test_player, shop_flair):
        with pytest.raises(ShopError, match="don't own"):
            equip_cosmetic(test_player.id, shop_flair.id, session)

    def test_equip_skin_with_character(
        self, session, test_player, player_meta, test_character, shop_skin
    ):
        purchase_item(test_player.id, shop_skin.id, session)
        result = equip_cosmetic(test_player.id, shop_skin.id, session)
        assert result["slot"] == "skin"


# =============================================================================
# Combined Multiplier Test
# =============================================================================

class TestCombinedMultiplier:
    def test_booster_multiplier_stacking(
        self, session, test_player, player_meta, shop_booster_xp
    ):
        purchase_item(test_player.id, shop_booster_xp.id, session)
        mult = get_effective_multipliers(test_player.id, session)
        # Non-subscriber: sub xp=1.0, shop xp=1.25
        assert mult["xp"] == 1.25
        assert mult["essence"] == 1.0
        assert mult["drop_rate"] == 1.0


# =============================================================================
# Catalog Test
# =============================================================================

class TestCatalog:
    def test_catalog_returns_items(
        self, session, test_player, player_meta, shop_skin, shop_flair, shop_booster_xp
    ):
        catalog = get_catalog(test_player.id, session)
        assert catalog["current_balance"] == 5000
        # Boosters go to boosters_catalog, non-boosters to items or limited_time
        total_non_booster = len(catalog["items"]) + len(catalog.get("limited_time", []))
        assert total_non_booster >= 2  # skin + flair
        assert len(catalog.get("boosters_catalog", [])) >= 1

    def test_catalog_respects_ownership(
        self, session, test_player, player_meta, shop_skin
    ):
        purchase_item(test_player.id, shop_skin.id, session)
        catalog = get_catalog(test_player.id, session)
        all_items = catalog["items"] + catalog.get("limited_time", []) + catalog.get("featured", [])
        skin_item = next(i for i in all_items if i["id"] == shop_skin.id)
        assert skin_item["is_owned"] is True


# =============================================================================
# Admin Refund Test
# =============================================================================

class TestAdminRefund:
    def test_refund_removes_item_credits_shards(
        self, session, test_player, player_meta, shop_flair
    ):
        purchase_item(test_player.id, shop_flair.id, session)
        balance_after_purchase = player_meta.shard_balance
        result = admin_refund_item(test_player.id, shop_flair.id, "Test refund", session)
        assert result["success"] is True
        session.refresh(player_meta)
        assert player_meta.shard_balance == balance_after_purchase + shop_flair.price_shards

    def test_refund_equipped_item_unequips(
        self, session, test_player, player_meta, shop_flair
    ):
        purchase_item(test_player.id, shop_flair.id, session)
        equip_cosmetic(test_player.id, shop_flair.id, session)
        result = admin_refund_item(test_player.id, shop_flair.id, "Test refund", session)
        assert result["success"] is True
        # Item should be removed from collection
        collection = get_player_collection(test_player.id, session)
        owned_ids = [i["shop_item_id"] for i in collection["owned_items"]]
        assert shop_flair.id not in owned_ids
