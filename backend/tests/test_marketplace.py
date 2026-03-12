"""Tests for Dreamwalker's Bazaar marketplace system (3.5).

Covers: listing CRUD, buy flow, claim queue, salvage, notifications,
expiry, slot expansion, and admin operations.
"""

import math
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from sqlmodel import Session, select, func, text, Field
from sqlalchemy import Column, Integer
from typing import Optional

# ---------------------------------------------------------------------------
# Monkey-patch models to add migration-only columns BEFORE any table creation.
# These columns exist in production via SQL migrations but are not in the
# SQLModel class definitions.  We must add them as proper Pydantic fields AND
# SQLAlchemy columns so that both getattr/setattr and DDL work correctly.
# ---------------------------------------------------------------------------
from models.home_base import PlayerArtifact
from models.inventory import PlayerInventory
from models.player import Player


def _add_mapped_column(model_cls, col_name, sa_type=Integer):
    """Add a fully mapped SA column + Pydantic field to a SQLModel class.

    This ensures that both ORM-level attribute access/set and DDL work.
    """
    from sqlalchemy.orm import column_property as sa_column_property
    from pydantic.fields import FieldInfo
    from sqlalchemy import inspect as sa_inspect

    # 1. Add the physical column to the SA Table if missing
    if col_name not in [c.name for c in model_cls.__table__.columns]:
        col = Column(col_name, sa_type, nullable=True)
        model_cls.__table__.append_column(col)
    else:
        col = model_cls.__table__.c[col_name]

    # 2. Map the column on the ORM mapper so session tracking works
    mapper = sa_inspect(model_cls)
    if col_name not in mapper.columns:
        mapper.add_property(col_name, col)

    # 3. Register as a Pydantic field so __getattr__/__setattr__ work
    if col_name not in model_cls.__pydantic_fields__:
        fi = FieldInfo(default=None)
        model_cls.__pydantic_fields__[col_name] = fi
        model_cls.model_fields[col_name] = fi


# PlayerArtifact.marketplace_listing_id
_add_mapped_column(PlayerArtifact, "marketplace_listing_id")

# PlayerInventory.marketplace_listing_id
_add_mapped_column(PlayerInventory, "marketplace_listing_id")

# Player.account_flag / marketplace_slots_purchased (used by raw SQL _get_player)
_add_mapped_column(Player, "account_flag")
_add_mapped_column(Player, "marketplace_slots_purchased")

# ---------------------------------------------------------------------------
# Now import everything else
# ---------------------------------------------------------------------------
from models import (
    CharacterClass, PlayerCharacter, GameConfig,
)
from models.home_base import ShardTransaction
from models.inventory import InventoryItem, GearSlot
from models.marketplace import (
    MarketplaceListing, MarketplaceTrade,
    MarketplaceNotification, MarketplacePriceHistory,
)
from models.story_mode import PlayerMetaProgression
from models.progress import PlayerEssence
from services.marketplace_service import (
    create_listing, buy_listing, cancel_listing, adjust_price,
    resolve_claim, get_browse_listings, MarketplaceError,
)
from services.salvage_service import (
    salvage_single, salvage_bulk, SalvageError,
)
from services.marketplace_notification_service import (
    create_notification, get_unread_notifications,
)


# =============================================================================
# Helper factories
# =============================================================================

def _create_player(
    session: Session,
    *,
    firebase_uid: str = "uid_seller",
    email: str = "seller@test.com",
    alias: str = "Seller",
    account_flag: str = None,
    marketplace_slots_purchased: int = 0,
) -> Player:
    """Insert a player with meta-progression row."""
    player = Player(
        firebase_uid=firebase_uid,
        email=email,
        alias=alias,
        created_at=datetime.now(timezone.utc),
        last_login_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(player)
    session.flush()

    # Set columns added by migration (not in SQLModel field list)
    session.execute(
        text(
            "UPDATE players SET account_flag = :flag, "
            "marketplace_slots_purchased = :slots WHERE id = :pid"
        ),
        {"flag": account_flag, "slots": marketplace_slots_purchased, "pid": player.id},
    )

    meta = PlayerMetaProgression(
        player_id=player.id,
        shard_balance=0,
        total_shards_earned=0,
        elysium_essence=0,
        total_essence_earned=0,
    )
    session.add(meta)

    essence = PlayerEssence(
        player_id=player.id,
        character_id=0,  # updated after character creation
        current_balance=0,
    )
    session.add(essence)
    session.flush()
    return player


def _create_character(
    session: Session,
    player: Player,
) -> PlayerCharacter:
    """Insert a character class + character for the player."""
    cls = session.exec(select(CharacterClass)).first()
    if not cls:
        cls = CharacterClass(
            name="Dreamwalker",
            base_strength=10,
            base_agility=10,
            base_intelligence=10,
            is_available=True,
        )
        session.add(cls)
        session.flush()

    char = PlayerCharacter(
        player_id=player.id,
        class_id=cls.id,
        character_name=f"Char_{player.alias}",
        level=10,
        strength=10,
        agility=10,
        intelligence=10,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(char)
    session.flush()

    # Fix essence record
    ess = session.exec(
        select(PlayerEssence).where(PlayerEssence.player_id == player.id)
    ).first()
    if ess:
        ess.character_id = char.id
        session.add(ess)
        session.flush()

    return char


def _create_artifact(
    session: Session,
    player_id: int,
    character_id: int,
    *,
    name: str = "Void Shard",
    rarity: str = "rare",
    curated_artifact_id: int = None,
    marketplace_listing_id: int = None,
) -> PlayerArtifact:
    """Insert a PlayerArtifact row."""
    art = PlayerArtifact(
        player_id=player_id,
        character_id=character_id,
        artifact_type="curated" if curated_artifact_id else "generated",
        curated_artifact_id=curated_artifact_id,
        artifact_code=f"TEST_{name.upper().replace(' ', '_')}",
        name=name,
        rarity=rarity,
        icon_sprite_key="artifact_test",
        stat_bonuses={"strength": 5},
        acquired_at=datetime.now(timezone.utc),
    )
    session.add(art)
    session.flush()
    if marketplace_listing_id is not None:
        session.execute(
            text(
                "UPDATE player_artifacts SET marketplace_listing_id = :mlid WHERE id = :aid"
            ),
            {"mlid": marketplace_listing_id, "aid": art.id},
        )
        session.flush()
        session.expire(art)  # force re-read so ORM sees the new column value
    return art


def _create_gear_slot(session: Session, name: str = "weapon") -> GearSlot:
    gs = session.exec(select(GearSlot).where(GearSlot.name == name)).first()
    if gs:
        return gs
    gs = GearSlot(name=name, display_name=name.title(), sort_order=1)
    session.add(gs)
    session.flush()
    return gs


def _create_equipment(
    session: Session,
    character_id: int,
    *,
    name: str = "Iron Sword",
    rarity: str = "common",
    is_equipped: bool = False,
    equipped_slot: str = None,
    marketplace_listing_id: int = None,
) -> PlayerInventory:
    """Insert an InventoryItem template + a PlayerInventory instance."""
    gear_slot = _create_gear_slot(session)
    tmpl = InventoryItem(
        name=name,
        description="A sturdy weapon.",
        item_type="weapon",
        rarity=rarity,
        base_stats={"strength": 3},
        sprite_key="item_test",
        gear_slot_id=gear_slot.id,
        created_at=datetime.now(timezone.utc),
    )
    session.add(tmpl)
    session.flush()

    inv = PlayerInventory(
        character_id=character_id,
        item_id=tmpl.id,
        is_equipped=is_equipped,
        equipped_slot=equipped_slot,
        quantity=1,
        acquired_at=datetime.now(timezone.utc),
    )
    session.add(inv)
    session.flush()
    if marketplace_listing_id is not None:
        session.execute(
            text(
                "UPDATE player_inventory SET marketplace_listing_id = :mlid WHERE id = :iid"
            ),
            {"mlid": marketplace_listing_id, "iid": inv.id},
        )
        session.flush()
    return inv


def _set_shard_balance(session: Session, player_id: int, balance: int):
    meta = session.get(PlayerMetaProgression, player_id)
    meta.shard_balance = balance
    meta.total_shards_earned = balance
    session.add(meta)
    session.flush()


def _seed_marketplace_configs(session: Session):
    """Seed the game_configs keys used by marketplace / salvage services."""
    defaults = {
        "marketplace_tax_rate": 0.05,
        "marketplace_listing_cap_base": 3,
        "marketplace_listing_cap_max": 10,
        "marketplace_listing_duration_hours": 24,
        "marketplace_equipment_inventory_cap": 10,
        "salvage_equipment_common_essence": 5,
        "salvage_equipment_uncommon_essence": 15,
        "salvage_equipment_rare_essence": 50,
        "salvage_equipment_epic_essence": 150,
        "salvage_equipment_legendary_essence": 500,
        "salvage_artifact_multiplier": 2.0,
        "salvage_curated_bonus_multiplier": 1.15,
    }
    for key, val in defaults.items():
        if not session.get(GameConfig, key):
            session.add(GameConfig(key=key, value_json=val, category="marketplace"))
    session.flush()


# =============================================================================
# Listing CRUD
# =============================================================================

class TestCreateListing:
    """Tests 1-5: listing creation happy-path and error cases."""

    def test_create_listing_valid(self, session: Session):
        """#1 -- Create listing with valid artifact, verify listing + item locked."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="s1", alias="Seller1")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id)

        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        assert listing.status == "active"
        assert listing.price_shards == 100
        assert listing.seller_id == seller.id
        assert listing.item_name == art.name

        # Item should be locked (marketplace_listing_id set)
        row = session.execute(
            text("SELECT marketplace_listing_id FROM player_artifacts WHERE id = :aid"),
            {"aid": art.id},
        ).fetchone()
        assert row.marketplace_listing_id == listing.id

    def test_create_listing_cap_exceeded(self, session: Session):
        """#2 -- Hit the default 3-slot cap, expect error."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="s2", alias="Seller2")
        char = _create_character(session, seller)

        # Fill 3 listing slots
        for i in range(3):
            art = _create_artifact(
                session, seller.id, char.id, name=f"Artifact {i}"
            )
            create_listing(seller.id, "artifact", art.id, 50 + i, session)

        # 4th listing should fail
        art4 = _create_artifact(session, seller.id, char.id, name="Artifact 3")
        with pytest.raises(MarketplaceError, match="Listing cap"):
            create_listing(seller.id, "artifact", art4.id, 99, session)

    def test_create_listing_already_listed(self, session: Session):
        """#3 -- List same item twice, expect error."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="s3", alias="Seller3")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id)

        create_listing(seller.id, "artifact", art.id, 100, session)

        with pytest.raises(MarketplaceError, match="already listed"):
            create_listing(seller.id, "artifact", art.id, 200, session)

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_create_listing_equipped_item(self, mock_recalc, session: Session):
        """#4 -- List equipped equipment, verify auto-unequip."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="s4", alias="Seller4")
        char = _create_character(session, seller)
        inv = _create_equipment(
            session, char.id, is_equipped=True, equipped_slot="weapon"
        )

        listing = create_listing(seller.id, "equipment", inv.id, 50, session)

        assert listing.status == "active"

        # Equipment should be unequipped
        session.expire(inv)
        assert inv.is_equipped is False
        assert inv.equipped_slot is None

    def test_create_listing_account_flagged(self, session: Session):
        """#5 -- Account with dispute flag, expect error."""
        _seed_marketplace_configs(session)
        seller = _create_player(
            session, firebase_uid="s5", alias="Flagged", account_flag="dispute"
        )
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id)

        with pytest.raises(MarketplaceError, match="under review"):
            create_listing(seller.id, "artifact", art.id, 100, session)


class TestAdjustPrice:
    """Test 6: price adjustment."""

    def test_adjust_price(self, session: Session):
        """#6 -- Adjust price, verify new price + history logged."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="a1", alias="Adjuster")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id)

        listing = create_listing(seller.id, "artifact", art.id, 100, session)
        result = adjust_price(seller.id, listing.id, 200, session)

        assert result["new_price"] == 200
        assert result["old_price"] == 100

        # Price history should have 2 entries (listed + adjusted)
        history = session.exec(
            select(MarketplacePriceHistory).where(
                MarketplacePriceHistory.listing_id == listing.id
            )
        ).all()
        assert len(history) == 2
        actions = {h.action for h in history}
        assert "listed" in actions
        assert "adjusted" in actions


class TestCancelListing:
    """Test 7: listing cancellation."""

    def test_cancel_listing(self, session: Session):
        """#7 -- Cancel listing, verify item returned to inventory."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="c1", alias="Canceller")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id)

        listing = create_listing(seller.id, "artifact", art.id, 100, session)
        cancel_listing(seller.id, listing.id, session)

        session.expire(listing)
        assert listing.status == "cancelled"
        assert listing.cancelled_at is not None

        # Item should be unlocked
        row = session.execute(
            text("SELECT marketplace_listing_id FROM player_artifacts WHERE id = :aid"),
            {"aid": art.id},
        ).fetchone()
        assert row.marketplace_listing_id is None


# =============================================================================
# Buy Flow
# =============================================================================

class TestBuyListing:
    """Tests 8-15: purchasing logic."""

    def _setup_seller_and_listing(
        self, session, *, item_type="artifact", price=100, expire_delta_hours=24
    ):
        """Create a seller + listing ready for a buyer."""
        _seed_marketplace_configs(session)
        seller = _create_player(
            session, firebase_uid="seller_buy", alias="BuySeller"
        )
        char = _create_character(session, seller)

        if item_type == "artifact":
            item = _create_artifact(session, seller.id, char.id, name="Sale Shard")
        else:
            item = _create_equipment(session, char.id, name="Sale Sword")

        listing = create_listing(seller.id, item_type, item.id, price, session)

        # Manually set expires_at for expiry tests
        if expire_delta_hours != 24:
            listing.expires_at = datetime.now(timezone.utc) + timedelta(
                hours=expire_delta_hours
            )
            session.add(listing)
            session.flush()

        return seller, char, item, listing

    def _create_buyer(self, session, *, balance=1000, account_flag=None):
        buyer = _create_player(
            session,
            firebase_uid="buyer_buy",
            email="buyer@test.com",
            alias="Buyer",
            account_flag=account_flag,
        )
        buyer_char = _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, balance)
        return buyer, buyer_char

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_buy_listing_valid(self, mock_recalc, session: Session):
        """#8 -- Valid purchase: shards transferred, item moved."""
        seller, _, item, listing = self._setup_seller_and_listing(session)
        buyer, buyer_char = self._create_buyer(session, balance=1000)

        result = buy_listing(buyer.id, listing.id, session)

        assert result["listing_id"] == listing.id
        assert result["tax"] == 5  # floor(100 * 0.05)
        assert result["seller_proceeds"] == 95
        assert result["claim_required"] is False

        # Buyer balance debited
        buyer_meta = session.get(PlayerMetaProgression, buyer.id)
        assert buyer_meta.shard_balance == 900  # 1000 - 100

        # Seller balance credited
        seller_meta = session.get(PlayerMetaProgression, seller.id)
        assert seller_meta.shard_balance == 95

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_buy_listing_tax_calculation(self, mock_recalc, session: Session):
        """#9 -- Verify 5% tax = floor(price * 0.05)."""
        seller, _, _, listing = self._setup_seller_and_listing(
            session, price=199
        )
        buyer, _ = self._create_buyer(session, balance=5000)

        result = buy_listing(buyer.id, listing.id, session)

        expected_tax = int(math.floor(199 * 0.05))  # 9
        assert result["tax"] == expected_tax
        assert result["seller_proceeds"] == 199 - expected_tax

    def test_buy_listing_self_purchase(self, session: Session):
        """#10 -- Self-purchase blocked."""
        seller, _, _, listing = self._setup_seller_and_listing(session)
        _set_shard_balance(session, seller.id, 5000)

        with pytest.raises(MarketplaceError, match="cannot purchase your own"):
            buy_listing(seller.id, listing.id, session)

    def test_buy_listing_insufficient_balance(self, session: Session):
        """#11 -- Insufficient shards."""
        seller, _, _, listing = self._setup_seller_and_listing(session, price=500)
        buyer, _ = self._create_buyer(session, balance=100)

        with pytest.raises(MarketplaceError, match="Insufficient"):
            buy_listing(buyer.id, listing.id, session)

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_buy_listing_already_sold(self, mock_recalc, session: Session):
        """#12 -- Buy already-sold listing, expect 410."""
        seller, _, _, listing = self._setup_seller_and_listing(session)
        buyer1, _ = self._create_buyer(session, balance=1000)

        buy_listing(buyer1.id, listing.id, session)

        # Second buyer
        buyer2 = _create_player(
            session, firebase_uid="buyer2", email="b2@test.com", alias="Buyer2"
        )
        _create_character(session, buyer2)
        _set_shard_balance(session, buyer2.id, 1000)

        with pytest.raises(MarketplaceError, match="no longer available"):
            buy_listing(buyer2.id, listing.id, session)

    def test_buy_listing_account_flagged(self, session: Session):
        """#13 -- Buyer with dispute flag, expect error."""
        seller, _, _, listing = self._setup_seller_and_listing(session)
        buyer, _ = self._create_buyer(
            session, balance=1000, account_flag="dispute"
        )

        with pytest.raises(MarketplaceError, match="under review"):
            buy_listing(buyer.id, listing.id, session)

    def test_buy_listing_expired(self, session: Session):
        """#14 -- Buy expired listing (expires_at in past), expect 410."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="sell_exp", alias="ExpSeller")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id, name="Expired Art")
        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        # Force expiry in the past
        listing.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        session.add(listing)
        session.flush()

        buyer = _create_player(
            session, firebase_uid="buy_exp", email="buyexp@test.com", alias="ExpBuyer"
        )
        _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 1000)

        with pytest.raises(MarketplaceError, match="no longer available"):
            buy_listing(buyer.id, listing.id, session)

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_fifo_ordering(self, mock_recalc, session: Session):
        """#15 -- Create 2 listings at same price, verify oldest first in browse."""
        _seed_marketplace_configs(session)

        seller1 = _create_player(session, firebase_uid="fifo1", alias="FIFO1")
        char1 = _create_character(session, seller1)
        art1 = _create_artifact(session, seller1.id, char1.id, name="FIFO Art A")
        listing1 = create_listing(seller1.id, "artifact", art1.id, 50, session)

        # Second listing -- force a later listed_at
        seller2 = _create_player(
            session, firebase_uid="fifo2", email="fifo2@test.com", alias="FIFO2"
        )
        char2 = _create_character(session, seller2)
        art2 = _create_artifact(session, seller2.id, char2.id, name="FIFO Art B")
        listing2 = create_listing(seller2.id, "artifact", art2.id, 50, session)
        listing2.listed_at = listing1.listed_at + timedelta(seconds=10)
        session.add(listing2)
        session.flush()

        result = get_browse_listings(
            filters={"sort": "price_asc"}, page=1, page_size=10, session=session
        )
        ids = [l["id"] for l in result["listings"]]
        assert ids.index(listing1.id) < ids.index(listing2.id)


# =============================================================================
# Claim Queue
# =============================================================================

class TestClaimQueue:
    """Tests 16-19: artifact immediate, equipment cap, replace, discard."""

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_buy_artifact_no_cap(self, mock_recalc, session: Session):
        """#16 -- Artifact purchase is always immediate (no claim queue)."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="cs1", alias="ClaimSeller")
        schar = _create_character(session, seller)
        art = _create_artifact(session, seller.id, schar.id, name="Claim Art")
        listing = create_listing(seller.id, "artifact", art.id, 50, session)

        buyer = _create_player(
            session, firebase_uid="cb1", email="cb@test.com", alias="ClaimBuyer"
        )
        _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 500)

        result = buy_listing(buyer.id, listing.id, session)
        assert result["claim_required"] is False

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_buy_equipment_inventory_full(self, mock_recalc, session: Session):
        """#17 -- Equipment at 10-item cap triggers pending claim."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="cs2", alias="EqSeller")
        schar = _create_character(session, seller)
        inv = _create_equipment(session, schar.id, name="Eq Sale Item")
        listing = create_listing(seller.id, "equipment", inv.id, 50, session)

        buyer = _create_player(
            session, firebase_uid="cb2", email="cb2@test.com", alias="EqBuyer"
        )
        bchar = _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 500)

        # Fill buyer inventory to 10 unequipped items
        for i in range(10):
            _create_equipment(session, bchar.id, name=f"Filler {i}")

        result = buy_listing(buyer.id, listing.id, session)
        assert result["claim_required"] is True

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_resolve_claim_replace(self, mock_recalc, session: Session):
        """#18 -- Replace existing item, verify old destroyed + new claimed."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="cs3", alias="RpSeller")
        schar = _create_character(session, seller)
        sale_item = _create_equipment(session, schar.id, name="Replace Target Sale")
        listing = create_listing(seller.id, "equipment", sale_item.id, 50, session)

        buyer = _create_player(
            session, firebase_uid="cb3", email="cb3@test.com", alias="RpBuyer"
        )
        bchar = _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 500)

        # Fill buyer inventory to cap
        fillers = []
        for i in range(10):
            f = _create_equipment(session, bchar.id, name=f"Filler {i}")
            fillers.append(f)

        result = buy_listing(buyer.id, listing.id, session)
        assert result["claim_required"] is True

        trade = session.exec(
            select(MarketplaceTrade).where(
                MarketplaceTrade.id == result["trade_id"]
            )
        ).first()

        # Resolve by replacing the first filler
        replace_target = fillers[0]
        resolve_result = resolve_claim(
            buyer.id, trade.id, "replace", replace_target.id, session
        )
        assert resolve_result["action"] == "claimed"

        # Old filler should be destroyed
        old = session.get(PlayerInventory, replace_target.id)
        assert old is None

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_resolve_claim_discard(self, mock_recalc, session: Session):
        """#19 -- Discard purchased item, verify destroyed."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="cs4", alias="DcSeller")
        schar = _create_character(session, seller)
        sale_item = _create_equipment(session, schar.id, name="Discard Sale")
        listing = create_listing(seller.id, "equipment", sale_item.id, 50, session)

        buyer = _create_player(
            session, firebase_uid="cb4", email="cb4@test.com", alias="DcBuyer"
        )
        bchar = _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 500)

        # Fill buyer inventory
        for i in range(10):
            _create_equipment(session, bchar.id, name=f"DcFill {i}")

        result = buy_listing(buyer.id, listing.id, session)
        trade = session.exec(
            select(MarketplaceTrade).where(
                MarketplaceTrade.id == result["trade_id"]
            )
        ).first()

        resolve_result = resolve_claim(buyer.id, trade.id, "discard", None, session)
        assert resolve_result["action"] == "discarded"

        # Purchased item should be destroyed
        item = session.get(PlayerInventory, sale_item.id)
        assert item is None


# =============================================================================
# Salvage
# =============================================================================

class TestSalvage:
    """Tests 20-25: salvage Essence calculations and edge cases."""

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_salvage_equipment_rates(self, mock_recalc, session: Session):
        """#20 -- Verify correct Essence per rarity for equipment."""
        _seed_marketplace_configs(session)

        expected = {
            "common": 5,
            "uncommon": 15,
            "rare": 50,
            "epic": 150,
            "legendary": 500,
        }

        for rarity, expected_essence in expected.items():
            player = _create_player(
                session,
                firebase_uid=f"salv_{rarity}",
                email=f"salv_{rarity}@test.com",
                alias=f"S{rarity[:3]}",
            )
            char = _create_character(session, player)
            inv = _create_equipment(
                session, char.id, name=f"{rarity} Sword", rarity=rarity
            )

            result = salvage_single(player.id, "equipment", inv.id, session)
            assert result["essence_gained"] == expected_essence, (
                f"Expected {expected_essence} for {rarity}, got {result['essence_gained']}"
            )

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_salvage_artifact_multiplier(self, mock_recalc, session: Session):
        """#21 -- Artifact returns 2x base rate."""
        _seed_marketplace_configs(session)
        player = _create_player(session, firebase_uid="sa1", alias="ArtSalv")
        char = _create_character(session, player)
        art = _create_artifact(
            session, player.id, char.id, name="Salv Art", rarity="rare"
        )

        result = salvage_single(player.id, "artifact", art.id, session)
        # rare base=50, artifact multiplier=2x => 100
        assert result["essence_gained"] == 100

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_salvage_curated_bonus(self, mock_recalc, session: Session):
        """#22 -- Curated artifact returns ceil(2x * 1.15)."""
        _seed_marketplace_configs(session)
        player = _create_player(session, firebase_uid="sc1", alias="CuratSalv")
        char = _create_character(session, player)
        art = _create_artifact(
            session,
            player.id,
            char.id,
            name="Curated Salv",
            rarity="rare",
            curated_artifact_id=999,  # fake ID -- only presence matters
        )

        result = salvage_single(player.id, "artifact", art.id, session)
        # rare base=50, 2x=100, *1.15=115, ceil=115
        assert result["essence_gained"] == math.ceil(50 * 2.0 * 1.15)

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_salvage_bulk(self, mock_recalc, session: Session):
        """#23 -- Bulk salvage multiple items, verify total Essence."""
        _seed_marketplace_configs(session)
        player = _create_player(session, firebase_uid="sb1", alias="BulkSalv")
        char = _create_character(session, player)

        inv1 = _create_equipment(
            session, char.id, name="Bulk Sword 1", rarity="common"
        )
        inv2 = _create_equipment(
            session, char.id, name="Bulk Sword 2", rarity="uncommon"
        )

        result = salvage_bulk(
            player.id,
            [
                {"item_type": "equipment", "item_ref_id": inv1.id},
                {"item_type": "equipment", "item_ref_id": inv2.id},
            ],
            session,
        )
        assert result["count"] == 2
        assert result["total_essence"] == 5 + 15  # common + uncommon

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_salvage_equipped_item(self, mock_recalc, session: Session):
        """#24 -- Salvage equipped item: verify auto-unequip + destroy."""
        _seed_marketplace_configs(session)
        player = _create_player(session, firebase_uid="se1", alias="EqSalv")
        char = _create_character(session, player)
        inv = _create_equipment(
            session, char.id, name="Eq Salv Sword", rarity="common",
            is_equipped=True, equipped_slot="weapon",
        )

        result = salvage_single(player.id, "equipment", inv.id, session)
        assert result["essence_gained"] == 5

        # Item should be destroyed
        assert session.get(PlayerInventory, inv.id) is None

    def test_salvage_listed_item_blocked(self, session: Session):
        """#25 -- Can't salvage item currently listed on marketplace."""
        _seed_marketplace_configs(session)
        player = _create_player(session, firebase_uid="sl1", alias="ListedSalv")
        char = _create_character(session, player)
        art = _create_artifact(
            session, player.id, char.id, name="Listed Art",
            marketplace_listing_id=999,  # simulate being listed
        )

        with pytest.raises(SalvageError, match="currently listed"):
            salvage_single(player.id, "artifact", art.id, session)


# =============================================================================
# Notifications
# =============================================================================

class TestNotifications:
    """Tests 26-27: notification creation on sale and expiry."""

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_notification_on_sale(self, mock_recalc, session: Session):
        """#26 -- Notification created when item sells."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="ns1", alias="NotifSeller")
        schar = _create_character(session, seller)
        art = _create_artifact(session, seller.id, schar.id, name="Notif Art")
        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        buyer = _create_player(
            session, firebase_uid="nb1", email="nb@test.com", alias="NotifBuyer"
        )
        _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 1000)

        buy_listing(buyer.id, listing.id, session)

        notifs = get_unread_notifications(seller.id, session)
        assert len(notifs) >= 1
        sold_notifs = [n for n in notifs if n["notification_type"] == "item_sold"]
        assert len(sold_notifs) == 1
        assert "Notif Art" in sold_notifs[0]["title"]

    def test_notification_on_expiry(self, session: Session):
        """#27 -- Notification created when listing expires (via lazy expiry)."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="ne1", alias="ExpiryNotif")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id, name="Expiry Art")
        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        # Force expiry in the past
        listing.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        session.add(listing)
        session.flush()

        # Trigger lazy expiry by attempting to buy
        buyer = _create_player(
            session, firebase_uid="ne2", email="ne2@test.com", alias="ExpiryBuyer"
        )
        _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 1000)

        with pytest.raises(MarketplaceError, match="no longer available"):
            buy_listing(buyer.id, listing.id, session)

        notifs = get_unread_notifications(seller.id, session)
        expired_notifs = [
            n for n in notifs if n["notification_type"] == "listing_expired"
        ]
        assert len(expired_notifs) == 1
        assert "Expiry Art" in expired_notifs[0]["title"]


# =============================================================================
# Expiry
# =============================================================================

class TestExpiry:
    """Tests 28-29: lazy expiry in browse and item return."""

    def test_lazy_expiry_browse_excludes(self, session: Session):
        """#28 -- Browse excludes expired listings (expires_at < now)."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="le1", alias="LazyExp")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id, name="Lazy Art")
        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        # Force expiry in the past
        listing.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        session.add(listing)
        session.flush()

        result = get_browse_listings(
            filters={}, page=1, page_size=20, session=session
        )
        listing_ids = [l["id"] for l in result["listings"]]
        assert listing.id not in listing_ids

    def test_lazy_expiry_returns_item(self, session: Session):
        """#29 -- Accessing expired listing returns item to seller."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="le2", alias="LazyRet")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id, name="Lazy Ret Art")
        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        # Force expiry
        listing.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        session.add(listing)
        session.flush()

        # Trigger lazy expiry via buy attempt
        buyer = _create_player(
            session, firebase_uid="le3", email="le3@test.com", alias="LazyBuyer"
        )
        _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 1000)

        with pytest.raises(MarketplaceError):
            buy_listing(buyer.id, listing.id, session)

        # Flush pending changes from _expire_listing (called inside buy_listing
        # before it raised the error).
        session.flush()

        # Item should be unlocked
        row = session.execute(
            text("SELECT marketplace_listing_id FROM player_artifacts WHERE id = :aid"),
            {"aid": art.id},
        ).fetchone()
        assert row.marketplace_listing_id is None


# =============================================================================
# Slot Expansion
# =============================================================================

class TestSlotExpansion:
    """Test 30: bazaar permit slot increment."""

    def test_bazaar_permit_increments_slots(self, session: Session):
        """#30 -- Verify permit purchase increments marketplace_slots_purchased."""
        _seed_marketplace_configs(session)
        player = _create_player(
            session, firebase_uid="bp1", alias="PermitBuy",
            marketplace_slots_purchased=0,
        )
        _create_character(session, player)

        # Simulate permit purchase: increment the column
        session.execute(
            text(
                "UPDATE players SET marketplace_slots_purchased = "
                "marketplace_slots_purchased + 1 WHERE id = :pid"
            ),
            {"pid": player.id},
        )
        session.flush()

        row = session.execute(
            text("SELECT marketplace_slots_purchased FROM players WHERE id = :pid"),
            {"pid": player.id},
        ).fetchone()
        assert row.marketplace_slots_purchased == 1

        # Now the player should have 4 listing slots (3 base + 1)
        # Verify by creating 4 listings without error
        char = session.exec(
            select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)
        ).first()
        for i in range(4):
            art = _create_artifact(
                session, player.id, char.id, name=f"Permit Art {i}"
            )
            create_listing(player.id, "artifact", art.id, 10 + i, session)

        # 5th should fail
        art5 = _create_artifact(
            session, player.id, char.id, name="Permit Art 4"
        )
        with pytest.raises(MarketplaceError, match="Listing cap"):
            create_listing(player.id, "artifact", art5.id, 50, session)


# =============================================================================
# Admin Operations
# =============================================================================

class TestAdminOperations:
    """Tests 31-32: admin force-remove and trade reversal.

    These admin endpoints use raw SQL, so we test them at the SQL level
    rather than calling the route handler directly (which needs
    PostgreSQL-specific features).
    """

    def test_admin_force_remove_listing(self, session: Session):
        """#31 -- Force remove returns item + creates notification."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="af1", alias="AdminSeller")
        char = _create_character(session, seller)
        art = _create_artifact(session, seller.id, char.id, name="Admin Art")
        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        # Simulate admin force-remove (mirrors admin_marketplace.py logic)
        session.execute(
            text(
                "UPDATE marketplace_listings SET status = 'removed' "
                "WHERE id = :lid"
            ),
            {"lid": listing.id},
        )
        session.execute(
            text(
                "UPDATE player_artifacts SET marketplace_listing_id = NULL "
                "WHERE id = :ref_id AND player_id = :pid"
            ),
            {"ref_id": art.id, "pid": seller.id},
        )
        # Create notification
        create_notification(
            player_id=seller.id,
            notification_type="listing_removed",
            title="Listing Removed",
            message="Your marketplace listing has been removed by an administrator.",
            related_listing_id=listing.id,
            session=session,
        )
        session.flush()

        # Verify listing status
        session.expire(listing)
        assert listing.status == "removed"

        # Item unlocked
        row = session.execute(
            text("SELECT marketplace_listing_id FROM player_artifacts WHERE id = :aid"),
            {"aid": art.id},
        ).fetchone()
        assert row.marketplace_listing_id is None

        # Notification exists
        notifs = get_unread_notifications(seller.id, session)
        removed_notifs = [
            n for n in notifs if n["notification_type"] == "listing_removed"
        ]
        assert len(removed_notifs) == 1

    @patch("services.character_progression.recalculate_character_stats", return_value={})
    def test_admin_reverse_trade(self, mock_recalc, session: Session):
        """#32 -- Reverse trade returns item to seller + adjusts shards."""
        _seed_marketplace_configs(session)
        seller = _create_player(session, firebase_uid="ar1", alias="RevSeller")
        schar = _create_character(session, seller)
        art = _create_artifact(session, seller.id, schar.id, name="Rev Art")
        listing = create_listing(seller.id, "artifact", art.id, 100, session)

        buyer = _create_player(
            session, firebase_uid="ar2", email="ar2@test.com", alias="RevBuyer"
        )
        bchar = _create_character(session, buyer)
        _set_shard_balance(session, buyer.id, 1000)

        result = buy_listing(buyer.id, listing.id, session)
        trade_id = result["trade_id"]
        tax = result["tax"]  # 5
        seller_proceeds = result["seller_proceeds"]  # 95

        buyer_balance_after_buy = session.get(
            PlayerMetaProgression, buyer.id
        ).shard_balance  # 900
        seller_balance_after_sale = session.get(
            PlayerMetaProgression, seller.id
        ).shard_balance  # 95

        # Simulate admin reverse trade (mirrors admin_marketplace.py)
        # Return item to seller
        session.execute(
            text(
                "UPDATE player_artifacts SET player_id = :seller_id "
                "WHERE id = :ref_id"
            ),
            {"seller_id": seller.id, "ref_id": art.id},
        )

        # Credit buyer (refund full price)
        session.execute(
            text(
                "UPDATE player_meta_progression "
                "SET shard_balance = shard_balance + :amount WHERE player_id = :pid"
            ),
            {"amount": 100, "pid": buyer.id},
        )

        # Debit seller (take back proceeds)
        session.execute(
            text(
                "UPDATE player_meta_progression "
                "SET shard_balance = shard_balance - :amount WHERE player_id = :pid"
            ),
            {"amount": seller_proceeds, "pid": seller.id},
        )

        # Mark trade reversed
        session.execute(
            text(
                "UPDATE marketplace_trades SET claim_status = 'reversed' "
                "WHERE id = :tid"
            ),
            {"tid": trade_id},
        )
        session.flush()

        # Verify
        session.expire_all()

        # Buyer refunded
        buyer_meta = session.get(PlayerMetaProgression, buyer.id)
        assert buyer_meta.shard_balance == buyer_balance_after_buy + 100

        # Seller debited
        seller_meta = session.get(PlayerMetaProgression, seller.id)
        assert seller_meta.shard_balance == seller_balance_after_sale - seller_proceeds

        # Trade marked reversed
        trade = session.get(MarketplaceTrade, trade_id)
        assert trade.claim_status == "reversed"

        # Item returned to seller
        row = session.execute(
            text("SELECT player_id FROM player_artifacts WHERE id = :aid"),
            {"aid": art.id},
        ).fetchone()
        assert row.player_id == seller.id
