"""Tests for the subscription system (3.2): lifecycle, boosts, stipend, grace period, admin, routes."""

import json
import pytest
from datetime import datetime, timezone, timedelta, date
from unittest.mock import patch, MagicMock

from sqlmodel import Session, select
from sqlalchemy import text

from models import PlayerMetaProgression, GameConfig, Player
from models.subscriptions import PlayerSubscription, SubscriptionStipendLog
from models.home_base import ShardTransaction, Title, PlayerTitle
from services.subscription_service import (
    activate_subscription,
    renew_subscription,
    cancel_subscription,
    reactivate_subscription,
    expire_subscription,
    mark_past_due,
    refund_subscription,
    get_active_subscription,
    get_subscription_by_stripe_id,
    resolve_lazy_status,
    get_subscriber_multipliers,
    calculate_grace_deadline,
    _is_business_day,
    _next_business_day,
    _us_federal_holidays_for_year,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def subscription_columns(session: Session, test_player):
    """Add subscription-related columns to players table for SQLite tests."""
    for col_def in [
        "is_ascendant BOOLEAN DEFAULT FALSE",
        "cumulative_subscription_months INTEGER DEFAULT 0",
        "stripe_customer_id VARCHAR(255) DEFAULT NULL",
        "account_flag VARCHAR(30) DEFAULT NULL",
    ]:
        try:
            session.execute(text(f"ALTER TABLE players ADD COLUMN {col_def}"))
        except Exception:
            pass
    session.commit()


@pytest.fixture
def meta_progression(session: Session, test_player):
    """Seed PlayerMetaProgression with zero balances."""
    meta = PlayerMetaProgression(
        player_id=test_player.id,
        shard_balance=0,
        total_shards_earned=0,
    )
    session.add(meta)
    session.commit()
    session.refresh(meta)
    return meta


@pytest.fixture
def base_configs(session: Session):
    """Seed base subscription game_configs."""
    configs = [
        ("subscription_base_xp_boost", 0.15, "subscription"),
        ("subscription_base_essence_boost", 0.15, "subscription"),
        ("subscription_base_drop_boost", 0.10, "subscription"),
        ("subscription_base_training_boost", 0.10, "subscription"),
        ("subscription_base_stipend_shards", 150, "subscription"),
        ("subscription_streak_bonuses", [
            {"months": 3, "xp_bonus": 0.05, "essence_bonus": 0.05, "drop_bonus": 0.02, "training_bonus": 0.02, "stipend_bonus": 25},
            {"months": 6, "xp_bonus": 0.05, "essence_bonus": 0.05, "drop_bonus": 0.03, "training_bonus": 0.03, "stipend_bonus": 25},
        ], "subscription"),
        ("subscription_cumulative_milestones", [
            {"months": 1, "reward_type": "title", "reward_value": "the_patron"},
        ], "subscription"),
    ]
    for key, value_json, cat in configs:
        cfg = GameConfig(key=key, value_json=value_json, category=cat)
        session.add(cfg)
    session.commit()


@pytest.fixture
def active_sub(session: Session, test_player, subscription_columns, meta_progression, base_configs):
    """Create an active subscription for test_player."""
    now = datetime.now(timezone.utc)
    sub = activate_subscription(
        player_id=test_player.id,
        stripe_subscription_id="sub_test_123",
        stripe_price_id="price_test_monthly",
        plan_key="ascendant_monthly",
        period_start=now,
        period_end=now + timedelta(days=30),
        source="stripe",
        db=session,
    )
    session.commit()
    session.refresh(sub)
    return sub


# ---------------------------------------------------------------------------
# Lifecycle Tests
# ---------------------------------------------------------------------------

class TestActivateSubscription:
    def test_creates_active_subscription(self, session, test_player, subscription_columns, meta_progression, base_configs):
        now = datetime.now(timezone.utc)
        sub = activate_subscription(
            player_id=test_player.id,
            stripe_subscription_id="sub_abc",
            stripe_price_id="price_abc",
            plan_key="ascendant_monthly",
            period_start=now,
            period_end=now + timedelta(days=30),
            db=session,
        )
        session.commit()

        assert sub.id is not None
        assert sub.status == "active"
        assert sub.player_id == test_player.id
        assert sub.continuous_streak == 0

    def test_sets_is_ascendant_flag(self, session, test_player, subscription_columns, meta_progression, base_configs):
        now = datetime.now(timezone.utc)
        activate_subscription(
            player_id=test_player.id,
            stripe_subscription_id=None,
            stripe_price_id=None,
            plan_key="ascendant_monthly",
            period_start=now,
            period_end=now + timedelta(days=30),
            source="admin_gift",
            db=session,
        )
        session.commit()

        row = session.execute(
            text("SELECT is_ascendant FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).first()
        assert row[0] == True


class TestRenewSubscription:
    def test_increments_streak_and_cumulative(self, session, test_player, active_sub):
        now = datetime.now(timezone.utc)
        renew_subscription(
            sub=active_sub,
            new_period_start=now,
            new_period_end=now + timedelta(days=30),
            stripe_invoice_id="inv_test",
            db=session,
        )
        session.commit()
        session.refresh(active_sub)

        assert active_sub.continuous_streak == 1
        assert active_sub.status == "active"

        row = session.execute(
            text("SELECT cumulative_subscription_months FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).first()
        assert row[0] == 1

    def test_credits_stipend(self, session, test_player, active_sub, meta_progression):
        now = datetime.now(timezone.utc)
        renew_subscription(
            sub=active_sub,
            new_period_start=now,
            new_period_end=now + timedelta(days=30),
            stripe_invoice_id="inv_test_stipend",
            db=session,
        )
        session.commit()

        logs = session.exec(
            select(SubscriptionStipendLog)
            .where(SubscriptionStipendLog.subscription_id == active_sub.id)
        ).all()
        assert len(logs) == 1
        assert logs[0].shards_credited == 150

        session.refresh(meta_progression)
        assert meta_progression.shard_balance == 150


class TestCancelSubscription:
    def test_marks_canceling(self, session, active_sub):
        cancel_subscription(active_sub, session)
        session.commit()
        session.refresh(active_sub)

        assert active_sub.status == "canceling"
        assert active_sub.cancel_at_period_end == True


class TestReactivateSubscription:
    def test_reactivates(self, session, active_sub):
        cancel_subscription(active_sub, session)
        session.commit()

        reactivate_subscription(active_sub, session)
        session.commit()
        session.refresh(active_sub)

        assert active_sub.status == "active"
        assert active_sub.cancel_at_period_end == False


class TestExpireSubscription:
    def test_expires_and_clears_flag(self, session, test_player, active_sub):
        expire_subscription(active_sub, session)
        session.commit()
        session.refresh(active_sub)

        assert active_sub.status == "expired"
        assert active_sub.continuous_streak == 0

        row = session.execute(
            text("SELECT is_ascendant FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).first()
        assert row[0] == False


class TestMarkPastDue:
    def test_sets_grace_deadline(self, session, active_sub):
        mark_past_due(active_sub, session)
        session.commit()
        session.refresh(active_sub)

        assert active_sub.status == "past_due"
        assert active_sub.grace_deadline is not None
        assert active_sub.grace_period_start is not None

    def test_idempotent_if_already_past_due(self, session, active_sub):
        mark_past_due(active_sub, session)
        session.commit()
        original_deadline = active_sub.grace_deadline

        mark_past_due(active_sub, session)
        session.commit()
        session.refresh(active_sub)

        assert active_sub.grace_deadline == original_deadline


# ---------------------------------------------------------------------------
# Lazy Status Resolution
# ---------------------------------------------------------------------------

class TestResolveLazyStatus:
    def test_expires_past_due_after_grace(self, session, test_player, active_sub):
        active_sub.status = "past_due"
        active_sub.grace_deadline = datetime.now(timezone.utc) - timedelta(hours=1)
        session.add(active_sub)
        session.commit()

        resolve_lazy_status(active_sub, session)
        session.commit()

        assert active_sub.status == "expired"

    def test_expires_canceling_after_period_end(self, session, test_player, active_sub):
        active_sub.status = "canceling"
        active_sub.current_period_end = datetime.now(timezone.utc) - timedelta(hours=1)
        session.add(active_sub)
        session.commit()

        resolve_lazy_status(active_sub, session)
        session.commit()

        assert active_sub.status == "expired"

    def test_keeps_active_within_period(self, session, active_sub):
        resolve_lazy_status(active_sub, session)
        assert active_sub.status == "active"


# ---------------------------------------------------------------------------
# Lookup Tests
# ---------------------------------------------------------------------------

class TestLookups:
    def test_get_active_subscription(self, session, test_player, active_sub):
        found = get_active_subscription(test_player.id, session)
        assert found is not None
        assert found.id == active_sub.id

    def test_get_active_subscription_returns_none(self, session, test_player, subscription_columns):
        found = get_active_subscription(test_player.id, session)
        assert found is None

    def test_get_by_stripe_id(self, session, active_sub):
        found = get_subscription_by_stripe_id("sub_test_123", session)
        assert found is not None
        assert found.id == active_sub.id

    def test_get_by_stripe_id_not_found(self, session):
        found = get_subscription_by_stripe_id("sub_nonexistent", session)
        assert found is None


# ---------------------------------------------------------------------------
# Boost Multipliers
# ---------------------------------------------------------------------------

class TestSubscriberMultipliers:
    def test_non_subscriber_gets_defaults(self, session, test_player, subscription_columns, base_configs):
        mult = get_subscriber_multipliers(test_player.id, session)
        assert mult["xp"] == 1.0
        assert mult["essence"] == 1.0
        assert mult["is_ascendant"] == False

    def test_active_subscriber_gets_boosts(self, session, test_player, active_sub):
        mult = get_subscriber_multipliers(test_player.id, session)
        assert mult["xp"] == 1.15
        assert mult["essence"] == 1.15
        assert mult["drop_rate"] == 1.10
        assert mult["training_speed"] == 1.10
        assert mult["is_ascendant"] == True
        assert mult["stipend_shards"] == 150

    def test_streak_bonuses_accumulate(self, session, test_player, active_sub):
        active_sub.continuous_streak = 6
        session.add(active_sub)
        session.commit()

        mult = get_subscriber_multipliers(test_player.id, session)
        # Base 0.15 + 3mo bonus 0.05 + 6mo bonus 0.05 = 0.25
        assert mult["xp"] == 1.25
        assert mult["stipend_shards"] == 200  # 150 + 25 + 25


# ---------------------------------------------------------------------------
# Grace Period / Business Day
# ---------------------------------------------------------------------------

class TestGracePeriod:
    def test_weekday_failure(self, session, base_configs):
        # Wednesday → next business day is Thursday
        failure = datetime(2026, 3, 11, 10, 0, 0, tzinfo=timezone.utc)  # Wednesday
        deadline = calculate_grace_deadline(failure, session)
        assert deadline.date() == date(2026, 3, 12)  # Thursday
        assert deadline.hour == 23
        assert deadline.minute == 59

    def test_friday_failure(self, session, base_configs):
        # Friday → next business day is Monday
        failure = datetime(2026, 3, 13, 10, 0, 0, tzinfo=timezone.utc)  # Friday
        deadline = calculate_grace_deadline(failure, session)
        assert deadline.date() == date(2026, 3, 16)  # Monday

    def test_is_business_day_weekend(self):
        sat = date(2026, 3, 14)
        sun = date(2026, 3, 15)
        assert not _is_business_day(sat, set())
        assert not _is_business_day(sun, set())

    def test_is_business_day_holiday(self):
        christmas_observed = date(2026, 12, 25)  # Friday
        assert not _is_business_day(christmas_observed, set())

    def test_custom_holiday(self, session, base_configs):
        # Add a custom holiday on a normal business day
        cfg = session.exec(
            select(GameConfig).where(GameConfig.key == "subscription_custom_holidays")
        ).first()
        if not cfg:
            cfg = GameConfig(key="subscription_custom_holidays", value_json=["2026-03-12"], category="subscription")
            session.add(cfg)
            session.commit()

        failure = datetime(2026, 3, 11, 10, 0, 0, tzinfo=timezone.utc)  # Wednesday
        deadline = calculate_grace_deadline(failure, session)
        # Thursday is custom holiday, so should skip to Friday
        assert deadline.date() == date(2026, 3, 13)


# ---------------------------------------------------------------------------
# Refund
# ---------------------------------------------------------------------------

class TestRefundSubscription:
    def test_claws_back_stipend_and_expires(self, session, test_player, active_sub, meta_progression):
        # Seed a stipend log
        now = datetime.now(timezone.utc)
        log = SubscriptionStipendLog(
            subscription_id=active_sub.id,
            player_id=test_player.id,
            period_key=now.strftime("%Y-%m"),
            shards_credited=150,
            period_start=now,
            created_at=now,
        )
        session.add(log)
        meta_progression.shard_balance = 150
        meta_progression.total_shards_earned = 150
        session.add(meta_progression)
        session.commit()

        refund_subscription(active_sub, session)
        session.commit()
        session.refresh(active_sub)
        session.refresh(meta_progression)

        assert active_sub.status == "expired"
        assert meta_progression.shard_balance == 0


# ---------------------------------------------------------------------------
# Admin Endpoint Tests
# ---------------------------------------------------------------------------

class TestAdminEndpoints:
    @pytest.fixture
    def admin_token(self, test_player):
        """Override get_current_player to return admin role."""
        from main import app
        from auth import get_current_player

        def override():
            return {"uid": test_player.firebase_uid, "email": test_player.email, "player": test_player, "role": "admin"}

        app.dependency_overrides[get_current_player] = override
        yield
        app.dependency_overrides.pop(get_current_player, None)

    @pytest.fixture
    def player_token_nonadmin(self, test_player):
        """Override get_current_player to return regular player role."""
        from main import app
        from auth import get_current_player

        def override():
            return {"uid": test_player.firebase_uid, "email": test_player.email, "player": test_player, "role": "player"}

        app.dependency_overrides[get_current_player] = override
        yield
        app.dependency_overrides.pop(get_current_player, None)

    def test_list_subscriptions(self, client, admin_token, active_sub):
        res = client.get("/api/admin/subscriptions/")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        assert len(data["subscriptions"]) >= 1

    def test_list_subscriptions_requires_admin(self, client, player_token_nonadmin):
        res = client.get("/api/admin/subscriptions/")
        assert res.status_code == 403

    def test_gift_subscription(self, client, admin_token, session, test_player, subscription_columns, meta_progression, base_configs):
        res = client.post(
            f"/api/admin/subscriptions/{test_player.id}/gift",
            json={"days": 30},
        )
        assert res.status_code == 200
        data = res.json()
        assert "subscription_id" in data

    def test_gift_blocked_if_already_active(self, client, admin_token, active_sub, test_player):
        res = client.post(
            f"/api/admin/subscriptions/{test_player.id}/gift",
            json={"days": 30},
        )
        assert res.status_code == 400

    def test_extend_subscription(self, client, admin_token, active_sub):
        original_end = active_sub.current_period_end
        res = client.post(
            f"/api/admin/subscriptions/{active_sub.id}/extend",
            json={"days": 7},
        )
        assert res.status_code == 200

    def test_force_cancel(self, client, admin_token, active_sub, test_player):
        res = client.post(f"/api/admin/subscriptions/{active_sub.id}/force-cancel")
        assert res.status_code == 200
        assert res.json()["status"] == "expired"

    def test_force_cancel_already_expired(self, client, admin_token, active_sub, session):
        active_sub.status = "expired"
        session.add(active_sub)
        session.commit()

        res = client.post(f"/api/admin/subscriptions/{active_sub.id}/force-cancel")
        assert res.status_code == 400

    def test_override_streak(self, client, admin_token, active_sub):
        res = client.patch(
            f"/api/admin/subscriptions/{active_sub.id}/streak",
            json={"continuous_streak": 12},
        )
        assert res.status_code == 200
        assert res.json()["continuous_streak"] == 12


# ---------------------------------------------------------------------------
# Player Route Tests
# ---------------------------------------------------------------------------

class TestPlayerRoutes:
    def test_status_not_subscribed(self, client, session, test_player, subscription_columns, base_configs):
        from main import app
        from auth import get_current_player

        app.dependency_overrides[get_current_player] = lambda: {
            "uid": test_player.firebase_uid,
            "email": test_player.email,
            "player": test_player,
        }

        res = client.get("/api/subscriptions/status")
        assert res.status_code == 200
        data = res.json()
        assert data["subscribed"] == False
        assert data["boosts"]["xp"] == 1.0

        app.dependency_overrides.pop(get_current_player, None)

    def test_status_subscribed(self, client, session, test_player, active_sub):
        from main import app
        from auth import get_current_player

        app.dependency_overrides[get_current_player] = lambda: {
            "uid": test_player.firebase_uid,
            "email": test_player.email,
            "player": test_player,
        }

        res = client.get("/api/subscriptions/status")
        assert res.status_code == 200
        data = res.json()
        assert data["subscribed"] == True
        assert data["subscription"]["plan_key"] == "ascendant_monthly"
        assert data["boosts"]["xp"] == 1.15

        app.dependency_overrides.pop(get_current_player, None)

    def test_cancel_no_subscription(self, client, session, test_player, subscription_columns, base_configs):
        from main import app
        from auth import get_current_player

        app.dependency_overrides[get_current_player] = lambda: {
            "uid": test_player.firebase_uid,
            "email": test_player.email,
            "player": test_player,
        }

        res = client.post("/api/subscriptions/cancel")
        assert res.status_code == 400

        app.dependency_overrides.pop(get_current_player, None)

    @patch("stripe.Subscription.modify")
    def test_cancel_active_subscription(self, mock_modify, client, session, test_player, active_sub):
        from main import app
        from auth import get_current_player

        app.dependency_overrides[get_current_player] = lambda: {
            "uid": test_player.firebase_uid,
            "email": test_player.email,
            "player": test_player,
        }

        res = client.post("/api/subscriptions/cancel")
        assert res.status_code == 200
        assert res.json()["status"] == "canceling"
        mock_modify.assert_called_once()

        app.dependency_overrides.pop(get_current_player, None)

    @patch("stripe.Subscription.modify")
    def test_reactivate_subscription(self, mock_modify, client, session, test_player, active_sub):
        from main import app
        from auth import get_current_player

        cancel_subscription(active_sub, session)
        session.commit()

        app.dependency_overrides[get_current_player] = lambda: {
            "uid": test_player.firebase_uid,
            "email": test_player.email,
            "player": test_player,
        }

        res = client.post("/api/subscriptions/reactivate")
        assert res.status_code == 200
        assert res.json()["status"] == "active"

        app.dependency_overrides.pop(get_current_player, None)

    @patch("stripe.checkout.Session.create")
    def test_create_subscription(self, mock_create, client, session, test_player, subscription_columns, base_configs):
        from main import app
        from auth import get_current_player

        # Seed price config
        cfg = GameConfig(key="stripe_ascendant_monthly_price_id", value_json="price_test_123", category="subscription")
        session.add(cfg)
        session.commit()

        mock_create.return_value = MagicMock(url="https://checkout.stripe.com/test", id="cs_test_123")

        app.dependency_overrides[get_current_player] = lambda: {
            "uid": test_player.firebase_uid,
            "email": test_player.email,
            "player": test_player,
        }

        with patch("routes.subscriptions.get_or_create_stripe_customer", return_value="cus_test"):
            res = client.post(
                "/api/subscriptions/create",
                json={"plan_key": "ascendant_monthly"},
            )

        assert res.status_code == 200
        data = res.json()
        assert "checkout_url" in data
        assert data["session_id"] == "cs_test_123"

        app.dependency_overrides.pop(get_current_player, None)


# ---------------------------------------------------------------------------
# Achievement Integration
# ---------------------------------------------------------------------------

class TestAchievementIntegration:
    def test_cumulative_stats_include_subscription(self, session, test_player, subscription_columns, active_sub):
        from services.achievement_service import get_player_cumulative_stats

        session.execute(
            text("UPDATE players SET cumulative_subscription_months = 5 WHERE id = :pid"),
            {"pid": test_player.id},
        )
        session.commit()

        stats = get_player_cumulative_stats(test_player.id, session)
        assert stats["cumulative_sub_months"] == 5
        assert stats["continuous_sub_streak"] == 0  # streak is 0 on fresh sub
        assert "shards_purchased" in stats
        assert "shards_spent" in stats
