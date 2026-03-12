"""Tests for 3.4 Donations system."""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from sqlmodel import Session
from sqlalchemy import text

from models import (
    Player, PlayerMetaProgression, ShardPackage, GameConfig,
    ShopItem, PlayerShopItem, Title, PlayerTitle,
    Achievement, PlayerAchievement, ShardTransaction, Donation,
)
from models.payments import PaymentOrder
import services.donation_service as donation_service


@pytest.fixture(autouse=True)
def add_migration_columns(session):
    """Add migration columns to tables for SQLite tests.

    The SQLModel creates tables with Python field names (e.g. ``key``,
    ``value_json`` on ``game_configs``) but the donation service uses raw
    SQL referencing the production column names (``config_key``,
    ``config_value``).  We add those columns so raw-SQL queries work.
    """
    # -- players columns added by migrations --
    player_cols = [
        "cumulative_donation_cents INTEGER NOT NULL DEFAULT 0",
        "patron_tier VARCHAR(20) DEFAULT NULL",
        "patron_diamond_stars INTEGER NOT NULL DEFAULT 0",
        "donor_visibility BOOLEAN NOT NULL DEFAULT FALSE",
        "account_flag VARCHAR(20) DEFAULT NULL",
        "stripe_customer_id VARCHAR(255) DEFAULT NULL",
        "first_purchase_claimed BOOLEAN DEFAULT FALSE",
        "cumulative_subscription_months INTEGER DEFAULT 0",
    ]
    for col in player_cols:
        try:
            session.execute(text(f"ALTER TABLE players ADD COLUMN {col}"))
        except Exception:
            pass

    # -- game_configs: add production column aliases --
    for col in [
        "config_key VARCHAR(100)",
        "config_value TEXT",
    ]:
        try:
            session.execute(text(f"ALTER TABLE game_configs ADD COLUMN {col}"))
        except Exception:
            pass
    session.commit()


@pytest.fixture
def donation_configs(session):
    """Seed game_configs for donation system.

    The service reads via raw SQL (``config_key`` / ``config_value``) which
    correspond to production column names.  In SQLite test tables the ORM
    columns are ``key`` / ``value_json``, so we populate both sets.
    """
    configs = [
        ("donation_min_cents", "100", "donations"),
        ("patron_tier_bronze_cents", "500", "donations"),
        ("patron_tier_silver_cents", "2500", "donations"),
        ("patron_tier_gold_cents", "10000", "donations"),
        ("patron_tier_diamond_cents", "50000", "donations"),
        ("patron_diamond_star_increment", "50000", "donations"),
        ("patron_diamond_star_display_cap", "5", "donations"),
        ("donor_leaderboard_size", "50", "donations"),
        ("recent_donors_count", "5", "donations"),
        ("recent_donors_window_days", "7", "donations"),
    ]
    for key, val, cat in configs:
        session.execute(
            text(
                "INSERT INTO game_configs (key, value_json, category, config_key, config_value) "
                "VALUES (:k, :v, :c, :k, :v)"
            ),
            {"k": key, "v": val, "c": cat},
        )
    session.commit()


@pytest.fixture
def shard_package(session):
    """Create a dummy shard package (needed for FK on payment_orders)."""
    pkg = ShardPackage(
        tier_key="test_pkg", name="Test Package",
        price_cents=100, base_shards=100, total_shards=100,
        sort_order=1, is_active=True,
    )
    session.add(pkg)
    session.commit()
    session.refresh(pkg)
    return pkg


@pytest.fixture
def meta_progression(session, test_player):
    """Create PlayerMetaProgression for test player."""
    meta = PlayerMetaProgression(
        player_id=test_player.id,
        shard_balance=0,
        total_shards_earned=0,
        elysium_essence=0,
        total_essence_earned=0,
        updated_at=datetime.now(timezone.utc),
    )
    session.add(meta)
    session.commit()
    return meta


@pytest.fixture
def patron_items(session):
    """Seed patron cosmetic shop items and titles."""
    now = datetime.now(timezone.utc)
    items = [
        ShopItem(item_key="patron_badge_bronze", name="Bronze Patron Badge",
                 category="patron_badge", price_shards=0, is_active=True,
                 sort_order=900, created_at=now, updated_at=now),
        ShopItem(item_key="patron_badge_silver", name="Silver Patron Badge",
                 category="patron_badge", price_shards=0, is_active=True,
                 sort_order=901, created_at=now, updated_at=now),
        ShopItem(item_key="patron_badge_gold", name="Gold Patron Badge",
                 category="patron_badge", price_shards=0, is_active=True,
                 sort_order=902, created_at=now, updated_at=now),
        ShopItem(item_key="patron_badge_diamond", name="Diamond Patron Badge",
                 category="patron_badge", price_shards=0, is_active=True,
                 sort_order=903, created_at=now, updated_at=now),
        ShopItem(item_key="patron_flair_golden", name="Golden Benefactor",
                 category="patron_flair", price_shards=0, is_active=True,
                 sort_order=910, created_at=now, updated_at=now),
        ShopItem(item_key="patron_avatar_benefactor", name="The Benefactor",
                 category="patron_avatar", price_shards=0, is_active=True,
                 sort_order=920, created_at=now, updated_at=now),
    ]
    for item in items:
        session.add(item)

    titles = [
        Title(name="Bronze Patron", display_format="prefix", sort_order=200),
        Title(name="Silver Patron", display_format="prefix", sort_order=201),
        Title(name="Gold Patron", display_format="prefix", sort_order=202),
        Title(name="Diamond Patron", display_format="prefix", sort_order=203),
        Title(name="Patron of Elysium", display_format="suffix", sort_order=204),
    ]
    for t in titles:
        session.add(t)
    session.commit()


def _create_donation_record(session, player, amount_cents, cumulative, shard_package, tier=None, stars=0):
    """Helper: create a PaymentOrder + Donation record."""
    order = PaymentOrder(
        player_id=player.id,
        package_id=shard_package.id,
        status="completed",
        idempotency_key=str(uuid.uuid4()),
        price_cents=amount_cents,
        shards_credited=0,
        shards_refunded=0,
        created_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    session.add(order)
    session.flush()

    donation = Donation(
        player_id=player.id,
        payment_order_id=order.id,
        amount_cents=amount_cents,
        cumulative_total_cents=cumulative,
        patron_tier=tier,
        diamond_stars=stars,
    )
    session.add(donation)
    session.commit()
    return donation


# =============================================================================
# Test: Patron tier calculation
# =============================================================================

class TestPatronTierCalculation:
    def test_no_tier_below_bronze(self, session, donation_configs):
        """Cumulative below bronze threshold returns no tier."""
        tier, stars = donation_service.calculate_patron_tier(400, session)
        assert tier is None
        assert stars == 0

    def test_bronze_tier(self, session, donation_configs):
        """$5.00 cumulative reaches Bronze."""
        tier, stars = donation_service.calculate_patron_tier(500, session)
        assert tier == "bronze"
        assert stars == 0

    def test_silver_tier(self, session, donation_configs):
        """$25.00 cumulative reaches Silver."""
        tier, stars = donation_service.calculate_patron_tier(2500, session)
        assert tier == "silver"
        assert stars == 0

    def test_gold_tier(self, session, donation_configs):
        """$100.00 cumulative reaches Gold."""
        tier, stars = donation_service.calculate_patron_tier(10000, session)
        assert tier == "gold"
        assert stars == 0

    def test_diamond_tier(self, session, donation_configs):
        """$500.00 cumulative reaches Diamond with 0 stars."""
        tier, stars = donation_service.calculate_patron_tier(50000, session)
        assert tier == "diamond"
        assert stars == 0

    def test_diamond_stars(self, session, donation_configs):
        """$1500 cumulative = 150000 cents -> (150000-50000)/50000 = 2 stars."""
        tier, stars = donation_service.calculate_patron_tier(150000, session)
        assert tier == "diamond"
        assert stars == 2

    def test_tier_is_pure_function(self, session, donation_configs):
        """calculate_patron_tier is a pure function on cumulative amount.
        The service layer ensures cumulative never decreases."""
        tier1, _ = donation_service.calculate_patron_tier(10000, session)
        assert tier1 == "gold"
        tier2, _ = donation_service.calculate_patron_tier(5000, session)
        assert tier2 == "silver"


# =============================================================================
# Test: Donation checkout session creation (needs Stripe mock)
# =============================================================================

class TestCreateDonationSession:
    def test_below_minimum_rejected(self, session, test_player, donation_configs):
        """Donation below minimum ($1.00) raises ValueError."""
        with pytest.raises(ValueError, match="Minimum donation"):
            donation_service.create_donation_checkout_session(
                test_player.id, 50, session
            )

    def test_flagged_account_blocked(self, session, test_player, donation_configs):
        """Player with account_flag='dispute' cannot create donation sessions."""
        session.execute(
            text("UPDATE players SET account_flag = 'dispute' WHERE id = :pid"),
            {"pid": test_player.id},
        )
        session.commit()
        with pytest.raises(ValueError, match="active dispute"):
            donation_service.create_donation_checkout_session(
                test_player.id, 500, session
            )


# =============================================================================
# Test: Webhook processing
# =============================================================================

class TestDonationWebhook:
    def test_process_donation_creates_record(
        self, session, test_player, shard_package, donation_configs,
        meta_progression, patron_items,
    ):
        """Successful donation webhook creates donation record and updates player."""
        order = PaymentOrder(
            player_id=test_player.id,
            package_id=shard_package.id,
            status="pending",
            idempotency_key=str(uuid.uuid4()),
            price_cents=500,
            shards_credited=0,
            shards_refunded=0,
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        with patch("services.donation_service.stripe"):
            donation_service.process_donation_webhook(
                order.id, {"payment_intent": None}, session
            )

        # Check donation record created
        donations = session.execute(
            text("SELECT * FROM donations WHERE player_id = :pid"),
            {"pid": test_player.id},
        ).fetchall()
        assert len(donations) >= 1

        # Check cumulative updated on player
        p_row = session.execute(
            text("SELECT cumulative_donation_cents FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).first()
        assert p_row[0] == 500

        # Check order marked completed
        session.refresh(order)
        assert order.status == "completed"

    def test_donation_logs_zero_shard_transaction(
        self, session, test_player, shard_package, donation_configs,
        meta_progression, patron_items,
    ):
        """Donation creates a shard_transaction with amount=0 (audit trail)."""
        order = PaymentOrder(
            player_id=test_player.id,
            package_id=shard_package.id,
            status="pending",
            idempotency_key=str(uuid.uuid4()),
            price_cents=100,
            shards_credited=0,
            shards_refunded=0,
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        with patch("services.donation_service.stripe"):
            donation_service.process_donation_webhook(
                order.id, {"payment_intent": None}, session
            )

        txns = session.execute(
            text(
                "SELECT amount, source_type FROM shard_transactions "
                "WHERE player_id = :pid AND source_type = 'donation'"
            ),
            {"pid": test_player.id},
        ).fetchall()
        assert len(txns) >= 1
        assert txns[0].amount == 0

    def test_bronze_tier_promotion(
        self, session, test_player, shard_package, donation_configs,
        meta_progression, patron_items,
    ):
        """$5 donation triggers Bronze tier and grants badge + title."""
        order = PaymentOrder(
            player_id=test_player.id,
            package_id=shard_package.id,
            status="pending",
            idempotency_key=str(uuid.uuid4()),
            price_cents=500,
            shards_credited=0,
            shards_refunded=0,
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        with patch("services.donation_service.stripe"):
            donation_service.process_donation_webhook(
                order.id, {"payment_intent": None}, session
            )

        # Verify patron tier set to bronze
        p_row = session.execute(
            text("SELECT patron_tier FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).first()
        assert p_row[0] == "bronze"

        # Verify badge granted
        badge = session.execute(
            text("""
                SELECT 1 FROM player_shop_items psi
                JOIN shop_items si ON si.id = psi.shop_item_id
                WHERE psi.player_id = :pid AND si.item_key = 'patron_badge_bronze'
            """),
            {"pid": test_player.id},
        ).first()
        assert badge is not None

        # Verify title granted
        title = session.execute(
            text("""
                SELECT 1 FROM player_titles pt
                JOIN titles t ON t.id = pt.title_id
                WHERE pt.player_id = :pid AND t.name = 'Bronze Patron'
            """),
            {"pid": test_player.id},
        ).first()
        assert title is not None


# =============================================================================
# Test: Patron status, history, leaderboard, visibility
# =============================================================================

class TestPatronStatus:
    def test_get_status_no_donations(self, session, test_player, donation_configs):
        """Player with no donations returns zero values."""
        status = donation_service.get_patron_status(test_player.id, session)
        assert status["patron_tier"] is None
        assert status["donation_count"] == 0
        assert status["cumulative_cents"] == 0

    def test_get_status_with_donations(
        self, session, test_player, shard_package, donation_configs,
    ):
        """Player with donations returns correct tier and count."""
        session.execute(
            text(
                "UPDATE players SET cumulative_donation_cents = 2500, "
                "patron_tier = 'silver' WHERE id = :pid"
            ),
            {"pid": test_player.id},
        )
        session.commit()
        _create_donation_record(
            session, test_player, 2500, 2500, shard_package, "silver"
        )

        status = donation_service.get_patron_status(test_player.id, session)
        assert status["patron_tier"] == "silver"
        assert status["cumulative_cents"] == 2500
        assert status["donation_count"] == 1


class TestDonorLeaderboard:
    def test_leaderboard_excludes_opted_out(
        self, session, test_player, donation_configs,
    ):
        """Player with donor_visibility=FALSE does not appear on leaderboard."""
        session.execute(
            text(
                "UPDATE players SET cumulative_donation_cents = 1000, "
                "patron_tier = 'bronze', donor_visibility = FALSE WHERE id = :pid"
            ),
            {"pid": test_player.id},
        )
        session.commit()

        lb = donation_service.get_donor_leaderboard(session)
        assert len(lb) == 0

    def test_leaderboard_includes_opted_in(
        self, session, test_player, donation_configs,
    ):
        """Player with donor_visibility=TRUE appears on leaderboard."""
        session.execute(
            text(
                "UPDATE players SET cumulative_donation_cents = 1000, "
                "patron_tier = 'bronze', donor_visibility = TRUE WHERE id = :pid"
            ),
            {"pid": test_player.id},
        )
        session.commit()

        lb = donation_service.get_donor_leaderboard(session)
        assert len(lb) == 1
        assert lb[0]["player_alias"] == "TestPlayer"

    def test_visibility_toggle(self, session, test_player, donation_configs):
        """toggle_donor_visibility updates the player row."""
        result = donation_service.toggle_donor_visibility(
            test_player.id, True, session
        )
        assert result["donor_visibility"] is True

        row = session.execute(
            text("SELECT donor_visibility FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).first()
        assert row[0] in (True, 1)  # SQLite may return int


class TestAdminDonationStats:
    def test_admin_stats_empty(self, session, donation_configs):
        """Empty database returns zero stats."""
        stats = donation_service.admin_get_donation_stats(session)
        assert stats["total_donations"] == 0
        assert stats["unique_donors"] == 0
        assert stats["total_raised_cents"] == 0

    def test_admin_stats_with_donations(
        self, session, test_player, shard_package, donation_configs,
    ):
        """Stats aggregate correctly across multiple donations."""
        _create_donation_record(
            session, test_player, 500, 500, shard_package, "bronze"
        )
        _create_donation_record(
            session, test_player, 2000, 2500, shard_package, "silver"
        )

        stats = donation_service.admin_get_donation_stats(session)
        assert stats["total_donations"] == 2
        assert stats["unique_donors"] == 1
        assert stats["total_raised_cents"] == 2500
