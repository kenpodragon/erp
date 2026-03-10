"""Tests for the Stripe payment system (checkout, webhooks, shards, packages, transactions)."""

import os
import math
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

from sqlmodel import Session, select
from sqlalchemy import text

from models import PlayerMetaProgression, GameConfig, ActivityEvent
from models.payments import ShardPackage, PaymentOrder, StripeWebhookEvent
from models.home_base import ShardTransaction
from services.payment_service import (
    credit_shards, debit_shards, calculate_refund_shards,
    check_balance_integrity,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def meta_progression(session: Session, test_player):
    """Seed PlayerMetaProgression with zero shard balance."""
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
def player_columns(session: Session, test_player):
    """Add the migration-049 columns (stripe_customer_id, first_purchase_claimed,
    account_flag) to the players table in SQLite and initialise them."""
    # SQLite ALTER TABLE supports adding columns one at a time
    for col_def in [
        "stripe_customer_id VARCHAR(255) DEFAULT NULL",
        "first_purchase_claimed BOOLEAN DEFAULT FALSE",
        "account_flag VARCHAR(30) DEFAULT NULL",
    ]:
        try:
            session.execute(text(f"ALTER TABLE players ADD COLUMN {col_def}"))
        except Exception:
            pass  # Column may already exist from a prior fixture call
    session.commit()


@pytest.fixture
def normal_package(session: Session) -> ShardPackage:
    """A regular shard package with no purchase cap."""
    pkg = ShardPackage(
        tier_key="standard_500",
        name="500 Shards",
        price_cents=499,
        base_shards=500,
        bonus_pct=0,
        total_shards=500,
        sort_order=1,
        is_active=True,
    )
    session.add(pkg)
    session.commit()
    session.refresh(pkg)
    return pkg


@pytest.fixture
def limited_package(session: Session) -> ShardPackage:
    """A limited shard package (max 1 per player)."""
    pkg = ShardPackage(
        tier_key="starter_100",
        name="Starter Pack",
        price_cents=99,
        base_shards=100,
        bonus_pct=0,
        total_shards=100,
        sort_order=0,
        is_active=True,
        max_purchases_per_player=1,
    )
    session.add(pkg)
    session.commit()
    session.refresh(pkg)
    return pkg


@pytest.fixture
def inactive_package(session: Session) -> ShardPackage:
    """An inactive shard package."""
    pkg = ShardPackage(
        tier_key="legacy_200",
        name="Legacy Pack",
        price_cents=199,
        base_shards=200,
        bonus_pct=0,
        total_shards=200,
        sort_order=99,
        is_active=False,
    )
    session.add(pkg)
    session.commit()
    session.refresh(pkg)
    return pkg


def _make_completed_order(
    session: Session, player_id: int, package: ShardPackage,
    shards_credited: int = 0, charge_id: str | None = None,
) -> PaymentOrder:
    """Helper: create a completed PaymentOrder."""
    order = PaymentOrder(
        player_id=player_id,
        package_id=package.id,
        status="completed",
        price_cents=package.price_cents,
        idempotency_key="key-" + str(player_id) + "-" + str(package.id),
        stripe_checkout_session_id="cs_test_" + str(package.id),
        stripe_payment_intent_id="pi_test_" + str(package.id),
        stripe_charge_id=charge_id or "ch_test_" + str(package.id),
        shards_credited=shards_credited,
        completed_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _set_env(monkeypatch):
    """Ensure required env vars are set for Stripe-related code."""
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_fake")
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:5173")


def _webhook_post(client, event_type: str, event_data: dict, event_id: str = "evt_test_1"):
    """Fire a simulated webhook POST with mocked signature verification."""
    return client.post(
        "/api/webhooks/stripe",
        content=b'{"fake": "payload"}',
        headers={"stripe-signature": "t=1,v1=fakesig"},
    )


# ===========================================================================
# Checkout Endpoint Tests
# ===========================================================================

class TestCheckout:
    """POST /api/payments/checkout"""

    @patch("services.payment_service.stripe.Customer.create")
    @patch("routes.payments.stripe.checkout.Session.create")
    def test_checkout_valid_package(
        self, mock_checkout, mock_customer,
        client, session, test_player, player_token,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)
        mock_customer.return_value = MagicMock(id="cus_test_123")
        mock_checkout.return_value = MagicMock(
            url="https://checkout.stripe.com/test",
            id="cs_test_session_1",
        )
        resp = client.post(
            "/api/payments/checkout",
            json={"package_id": normal_package.id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "checkout_url" in data
        assert data["checkout_url"] == "https://checkout.stripe.com/test"
        assert data["session_id"] == "cs_test_session_1"

    def test_checkout_invalid_package(
        self, client, test_player, player_token,
        player_columns, meta_progression, monkeypatch,
    ):
        _set_env(monkeypatch)
        resp = client.post("/api/payments/checkout", json={"package_id": 99999})
        assert resp.status_code == 400

    @patch("services.payment_service.stripe.Customer.create")
    def test_checkout_inactive_package(
        self, mock_customer, client, session, test_player, player_token,
        player_columns, meta_progression, inactive_package, monkeypatch,
    ):
        _set_env(monkeypatch)
        mock_customer.return_value = MagicMock(id="cus_test_123")
        resp = client.post(
            "/api/payments/checkout",
            json={"package_id": inactive_package.id},
        )
        assert resp.status_code == 400

    def test_checkout_dispute_blocked(
        self, client, session, test_player, player_token,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)
        # Flag the account as having a dispute
        session.execute(
            text("UPDATE players SET account_flag = 'dispute' WHERE id = :pid"),
            {"pid": test_player.id},
        )
        session.commit()

        resp = client.post(
            "/api/payments/checkout",
            json={"package_id": normal_package.id},
        )
        assert resp.status_code == 403

    @patch("services.payment_service.stripe.Customer.create")
    def test_checkout_purchase_cap_exceeded(
        self, mock_customer, client, session, test_player, player_token,
        player_columns, meta_progression, limited_package, monkeypatch,
    ):
        _set_env(monkeypatch)
        mock_customer.return_value = MagicMock(id="cus_test_123")

        # Seed a completed order so the cap (max=1) is hit
        _make_completed_order(session, test_player.id, limited_package, shards_credited=100)

        resp = client.post(
            "/api/payments/checkout",
            json={"package_id": limited_package.id},
        )
        assert resp.status_code == 400
        assert "Maximum purchases" in resp.json()["detail"]


# ===========================================================================
# Webhook Tests
# ===========================================================================

class TestWebhooks:
    """POST /api/webhooks/stripe"""

    @patch("routes.webhooks.stripe.PaymentIntent.retrieve")
    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_checkout_completed(
        self, mock_construct, mock_pi,
        client, session, test_player,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)

        # Create pending order
        order = PaymentOrder(
            player_id=test_player.id,
            package_id=normal_package.id,
            status="pending",
            price_cents=normal_package.price_cents,
            idempotency_key="idem-1",
            stripe_checkout_session_id="cs_checkout_1",
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        mock_pi.return_value = {"latest_charge": "ch_test_charge_1"}
        mock_construct.return_value = {
            "id": "evt_checkout_ok",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_checkout_1",
                    "payment_intent": "pi_test_1",
                    "metadata": {
                        "payment_order_id": str(order.id),
                        "player_id": str(test_player.id),
                    },
                }
            },
        }

        resp = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp.status_code == 200

        # Verify order is completed and shards credited
        session.expire_all()
        order = session.get(PaymentOrder, order.id)
        assert order.status == "completed"
        # First purchase => 2x
        assert order.shards_credited == normal_package.total_shards * 2

        meta = session.get(PlayerMetaProgression, test_player.id)
        assert meta.shard_balance == normal_package.total_shards * 2

    @patch("routes.webhooks.stripe.PaymentIntent.retrieve")
    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_idempotency(
        self, mock_construct, mock_pi,
        client, session, test_player,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)

        order = PaymentOrder(
            player_id=test_player.id,
            package_id=normal_package.id,
            status="pending",
            price_cents=normal_package.price_cents,
            idempotency_key="idem-dup",
            stripe_checkout_session_id="cs_dup_1",
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        mock_pi.return_value = {"latest_charge": "ch_dup"}
        event_payload = {
            "id": "evt_dup_test",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_dup_1",
                    "payment_intent": "pi_dup",
                    "metadata": {
                        "payment_order_id": str(order.id),
                        "player_id": str(test_player.id),
                    },
                }
            },
        }
        mock_construct.return_value = event_payload

        # First call — should credit
        resp1 = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp1.status_code == 200

        session.expire_all()
        meta = session.get(PlayerMetaProgression, test_player.id)
        balance_after_first = meta.shard_balance

        # Second call — same event_id, should be skipped
        resp2 = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp2.status_code == 200
        assert resp2.json().get("status") == "already_processed"

        session.expire_all()
        meta = session.get(PlayerMetaProgression, test_player.id)
        assert meta.shard_balance == balance_after_first  # No double credit

    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_invalid_signature(
        self, mock_construct, client, monkeypatch,
    ):
        _set_env(monkeypatch)
        import stripe as stripe_module
        mock_construct.side_effect = stripe_module.error.SignatureVerificationError(
            "Invalid signature", "sig_header"
        )
        resp = client.post(
            "/api/webhooks/stripe",
            content=b"bad_payload",
            headers={"stripe-signature": "t=1,v1=bad"},
        )
        assert resp.status_code == 400

    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_checkout_expired(
        self, mock_construct,
        client, session, test_player,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)

        order = PaymentOrder(
            player_id=test_player.id,
            package_id=normal_package.id,
            status="pending",
            price_cents=normal_package.price_cents,
            idempotency_key="idem-expire",
            stripe_checkout_session_id="cs_expired_1",
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        mock_construct.return_value = {
            "id": "evt_expired",
            "type": "checkout.session.expired",
            "data": {
                "object": {"id": "cs_expired_1"},
            },
        }

        resp = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp.status_code == 200

        session.expire_all()
        order = session.get(PaymentOrder, order.id)
        assert order.status == "expired"


# ===========================================================================
# Shard Crediting Tests
# ===========================================================================

class TestShardCrediting:
    """credit_shards service function — first-purchase bonus logic."""

    def test_first_purchase_bonus(
        self, session, test_player, player_columns, meta_progression, normal_package,
    ):
        """First purchase should receive 2x shards."""
        order = PaymentOrder(
            player_id=test_player.id,
            package_id=normal_package.id,
            status="pending",
            price_cents=normal_package.price_cents,
            idempotency_key="idem-first",
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        result = credit_shards(order.id, session)
        assert result is True

        session.expire_all()
        order = session.get(PaymentOrder, order.id)
        assert order.is_first_purchase is True
        assert order.shards_credited == normal_package.total_shards * 2

        meta = session.get(PlayerMetaProgression, test_player.id)
        assert meta.shard_balance == normal_package.total_shards * 2

    def test_second_purchase_no_bonus(
        self, session, test_player, player_columns, meta_progression, normal_package,
    ):
        """Second purchase gets 1x shards (no bonus)."""
        # Mark first purchase already claimed
        session.execute(
            text("UPDATE players SET first_purchase_claimed = TRUE WHERE id = :pid"),
            {"pid": test_player.id},
        )
        session.commit()

        order = PaymentOrder(
            player_id=test_player.id,
            package_id=normal_package.id,
            status="pending",
            price_cents=normal_package.price_cents,
            idempotency_key="idem-second",
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        credit_shards(order.id, session)

        session.expire_all()
        order = session.get(PaymentOrder, order.id)
        assert order.is_first_purchase is False
        assert order.shards_credited == normal_package.total_shards  # 1x

    def test_first_purchase_bonus_not_reset_on_refund(
        self, session, test_player, player_columns, meta_progression, normal_package,
    ):
        """Refunding the first purchase does NOT reset first_purchase_claimed."""
        # Credit the first purchase
        order = PaymentOrder(
            player_id=test_player.id,
            package_id=normal_package.id,
            status="pending",
            price_cents=normal_package.price_cents,
            idempotency_key="idem-refund-first",
            created_at=datetime.now(timezone.utc),
        )
        session.add(order)
        session.commit()
        session.refresh(order)

        credit_shards(order.id, session)
        session.expire_all()

        # Simulate a refund debit
        debit_shards(
            player_id=test_player.id,
            amount=normal_package.total_shards * 2,
            source_type="refund",
            source_id=order.id,
            description="Full refund",
            session=session,
        )

        # Verify first_purchase_claimed is still True
        row = session.execute(
            text("SELECT first_purchase_claimed FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).fetchone()
        assert row[0] is True or row[0] == 1


# ===========================================================================
# Refund / Dispute Tests
# ===========================================================================

class TestRefundDispute:
    """Webhook handlers for charge.refunded, charge.dispute.created, charge.dispute.closed"""

    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_charge_refunded(
        self, mock_construct,
        client, session, test_player,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)

        # Create a completed order with shards already credited
        order = _make_completed_order(
            session, test_player.id, normal_package,
            shards_credited=500, charge_id="ch_refund_1",
        )
        # Credit the balance manually
        meta = session.get(PlayerMetaProgression, test_player.id)
        meta.shard_balance = 500
        meta.total_shards_earned = 500
        session.add(meta)
        session.commit()

        mock_construct.return_value = {
            "id": "evt_refund_full",
            "type": "charge.refunded",
            "data": {
                "object": {
                    "id": "ch_refund_1",
                    "payment_intent": "pi_test_" + str(normal_package.id),
                    "amount_refunded": normal_package.price_cents,  # Full refund
                },
            },
        }

        resp = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp.status_code == 200

        session.expire_all()
        meta = session.get(PlayerMetaProgression, test_player.id)
        # Full refund => all shards debited
        assert meta.shard_balance == 0

    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_partial_refund(
        self, mock_construct,
        client, session, test_player,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)

        order = _make_completed_order(
            session, test_player.id, normal_package,
            shards_credited=500, charge_id="ch_partial_1",
        )
        meta = session.get(PlayerMetaProgression, test_player.id)
        meta.shard_balance = 500
        meta.total_shards_earned = 500
        session.add(meta)
        session.commit()

        # Refund half the price
        half_cents = normal_package.price_cents // 2
        expected_debit = math.floor(500 * half_cents / normal_package.price_cents)

        mock_construct.return_value = {
            "id": "evt_partial_refund",
            "type": "charge.refunded",
            "data": {
                "object": {
                    "id": "ch_partial_1",
                    "payment_intent": "pi_test_" + str(normal_package.id),
                    "amount_refunded": half_cents,
                },
            },
        }

        resp = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp.status_code == 200

        session.expire_all()
        meta = session.get(PlayerMetaProgression, test_player.id)
        assert meta.shard_balance == 500 - expected_debit

    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_dispute_created(
        self, mock_construct,
        client, session, test_player,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)

        order = _make_completed_order(
            session, test_player.id, normal_package,
            shards_credited=500, charge_id="ch_dispute_1",
        )
        meta = session.get(PlayerMetaProgression, test_player.id)
        meta.shard_balance = 500
        meta.total_shards_earned = 500
        session.add(meta)
        session.commit()

        mock_construct.return_value = {
            "id": "evt_dispute_create",
            "type": "charge.dispute.created",
            "data": {
                "object": {
                    "charge": "ch_dispute_1",
                },
            },
        }

        resp = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp.status_code == 200

        session.expire_all()
        # Shards should be debited
        meta = session.get(PlayerMetaProgression, test_player.id)
        assert meta.shard_balance == 0

        # Account should be flagged
        row = session.execute(
            text("SELECT account_flag FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).fetchone()
        assert row[0] == "dispute"

    @patch("routes.webhooks.stripe.Webhook.construct_event")
    def test_webhook_dispute_won(
        self, mock_construct,
        client, session, test_player,
        player_columns, meta_progression, normal_package, monkeypatch,
    ):
        _set_env(monkeypatch)

        order = _make_completed_order(
            session, test_player.id, normal_package,
            shards_credited=500, charge_id="ch_dispute_won",
        )
        # Simulate the state after dispute_created: balance=0, shards_refunded=500, status=disputed
        meta = session.get(PlayerMetaProgression, test_player.id)
        meta.shard_balance = 0
        meta.total_shards_earned = 500
        session.add(meta)

        order.shards_refunded = 500
        order.status = "disputed"
        session.add(order)

        # Flag the account
        session.execute(
            text("UPDATE players SET account_flag = 'dispute' WHERE id = :pid"),
            {"pid": test_player.id},
        )
        session.commit()

        mock_construct.return_value = {
            "id": "evt_dispute_won",
            "type": "charge.dispute.closed",
            "data": {
                "object": {
                    "charge": "ch_dispute_won",
                    "status": "won",
                },
            },
        }

        resp = client.post(
            "/api/webhooks/stripe",
            content=b"payload",
            headers={"stripe-signature": "t=1,v1=sig"},
        )
        assert resp.status_code == 200

        session.expire_all()
        meta = session.get(PlayerMetaProgression, test_player.id)
        # Shards should be re-credited
        assert meta.shard_balance == 500

        order = session.get(PaymentOrder, order.id)
        assert order.status == "completed"
        assert order.shards_refunded == 0

        # Account flag should be cleared
        row = session.execute(
            text("SELECT account_flag FROM players WHERE id = :pid"),
            {"pid": test_player.id},
        ).fetchone()
        assert row[0] is None

    def test_negative_balance_after_refund(
        self, session, test_player, player_columns, meta_progression, normal_package,
    ):
        """Balance CAN go negative after a refund (e.g., player spent shards before refund)."""
        meta = session.get(PlayerMetaProgression, test_player.id)
        meta.shard_balance = 100  # Player spent most of the 500 they earned
        session.add(meta)
        session.commit()

        order = _make_completed_order(
            session, test_player.id, normal_package,
            shards_credited=500, charge_id="ch_neg_1",
        )

        debit_shards(
            player_id=test_player.id,
            amount=500,
            source_type="refund",
            source_id=order.id,
            description="Full refund — balance goes negative",
            session=session,
        )

        session.expire_all()
        meta = session.get(PlayerMetaProgression, test_player.id)
        assert meta.shard_balance == -400  # 100 - 500


# ===========================================================================
# Packages Endpoint Tests
# ===========================================================================

class TestPackages:
    """GET /api/payments/packages"""

    def test_get_packages(
        self, client, session, test_player, player_token,
        player_columns, meta_progression, normal_package, limited_package,
    ):
        resp = client.get("/api/payments/packages")
        assert resp.status_code == 200
        data = resp.json()
        assert "packages" in data
        assert len(data["packages"]) == 2
        assert data["first_purchase_available"] is True
        assert data["current_balance"] == 0

    def test_get_packages_with_purchase_counts(
        self, client, session, test_player, player_token,
        player_columns, meta_progression, limited_package,
    ):
        # Buy the limited package once (create completed order)
        _make_completed_order(session, test_player.id, limited_package, shards_credited=100)

        resp = client.get("/api/payments/packages")
        assert resp.status_code == 200
        data = resp.json()
        pkg = data["packages"][0]
        assert pkg["max_purchases"] == 1
        assert pkg["purchases_remaining"] == 0


# ===========================================================================
# Transaction History Tests
# ===========================================================================

class TestTransactions:
    """GET /api/payments/transactions"""

    def test_get_transactions(
        self, client, session, test_player, player_token,
        player_columns, meta_progression,
    ):
        # Seed some transactions
        for i in range(3):
            txn = ShardTransaction(
                player_id=test_player.id,
                amount=100 * (i + 1),
                balance_after=100 * (i + 1),
                source_type="purchase",
                source_id=i + 1,
                description=f"Purchase {i + 1}",
                created_at=datetime.now(timezone.utc),
            )
            session.add(txn)
        session.commit()

        resp = client.get("/api/payments/transactions")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["transactions"]) == 3
        assert data["page"] == 1

    def test_get_transactions_filter(
        self, client, session, test_player, player_token,
        player_columns, meta_progression,
    ):
        # Seed mixed transaction types
        txn_purchase = ShardTransaction(
            player_id=test_player.id,
            amount=500,
            balance_after=500,
            source_type="purchase",
            source_id=1,
            description="Purchase",
            created_at=datetime.now(timezone.utc),
        )
        txn_refund = ShardTransaction(
            player_id=test_player.id,
            amount=-200,
            balance_after=300,
            source_type="refund",
            source_id=1,
            description="Refund",
            created_at=datetime.now(timezone.utc),
        )
        session.add(txn_purchase)
        session.add(txn_refund)
        session.commit()

        # Filter by source_type
        resp = client.get("/api/payments/transactions?source_type=refund")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["transactions"][0]["source_type"] == "refund"

        resp2 = client.get("/api/payments/transactions?source_type=purchase")
        assert resp2.status_code == 200
        assert resp2.json()["total"] == 1


# ===========================================================================
# Balance Integrity Tests
# ===========================================================================

class TestBalanceIntegrity:
    """check_balance_integrity service function."""

    def test_balance_integrity_match(
        self, session, test_player, meta_progression,
    ):
        """Transaction log sum matches stored balance."""
        # Add transactions that sum to 300
        for amount in [500, -200]:
            txn = ShardTransaction(
                player_id=test_player.id,
                amount=amount,
                balance_after=0,  # doesn't matter for sum
                source_type="purchase" if amount > 0 else "refund",
                source_id=1,
                description="test",
                created_at=datetime.now(timezone.utc),
            )
            session.add(txn)

        meta = session.get(PlayerMetaProgression, test_player.id)
        meta.shard_balance = 300  # matches 500 + (-200)
        session.add(meta)
        session.commit()

        result = check_balance_integrity(test_player.id, session)
        assert result["expected"] == 300
        assert result["actual"] == 300
        assert result["match"] is True

    def test_balance_integrity_mismatch(
        self, session, test_player, meta_progression,
    ):
        """Detects when transaction log and stored balance diverge."""
        txn = ShardTransaction(
            player_id=test_player.id,
            amount=500,
            balance_after=500,
            source_type="purchase",
            source_id=1,
            description="test",
            created_at=datetime.now(timezone.utc),
        )
        session.add(txn)

        # Set balance to a wrong value
        meta = session.get(PlayerMetaProgression, test_player.id)
        meta.shard_balance = 999
        session.add(meta)
        session.commit()

        result = check_balance_integrity(test_player.id, session)
        assert result["expected"] == 500
        assert result["actual"] == 999
        assert result["match"] is False
