"""Tests for alt account detection service (REC 3.5 §11.3)."""

import pytest
from sqlmodel import Session, select
from sqlalchemy import text

from models import Player, ActivityEvent
from services.alt_detection_service import check_shared_stripe_customer, log_alt_warning


# ---------------------------------------------------------------------------
# Fixture: add migration-only columns to SQLite test DB
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def add_migration_columns(session: Session):
    """Add stripe_customer_id column (exists in prod via migration, not in SQLModel def)."""
    for col in [
        "stripe_customer_id VARCHAR(255) DEFAULT NULL",
    ]:
        try:
            session.execute(text(f"ALTER TABLE players ADD COLUMN {col}"))
        except Exception:
            pass
    session.flush()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_player(session: Session, id: int, alias: str, stripe_cid: str = None) -> Player:
    player = Player(
        id=id,
        alias=alias,
        firebase_uid=f"uid_{alias}",
        email=f"{alias}@test.com",
    )
    session.add(player)
    session.flush()
    # Set stripe_customer_id via raw SQL since it's a migration-only column
    if stripe_cid:
        session.execute(
            text("UPDATE players SET stripe_customer_id = :cid WHERE id = :pid"),
            {"cid": stripe_cid, "pid": id},
        )
        session.flush()
    return player


# ---------------------------------------------------------------------------
# Tests: check_shared_stripe_customer
# ---------------------------------------------------------------------------

class TestCheckSharedStripeCustomer:
    def test_detects_shared_customer_id(self, session: Session):
        _create_player(session, 10, "buyer", stripe_cid="cus_SHARED123")
        _create_player(session, 11, "seller", stripe_cid="cus_SHARED123")

        result = check_shared_stripe_customer(10, 11, session)
        assert result == "cus_SHARED123"

    def test_returns_none_for_different_ids(self, session: Session):
        _create_player(session, 10, "buyer", stripe_cid="cus_AAA")
        _create_player(session, 11, "seller", stripe_cid="cus_BBB")

        result = check_shared_stripe_customer(10, 11, session)
        assert result is None

    def test_returns_none_when_buyer_has_no_stripe(self, session: Session):
        _create_player(session, 10, "buyer", stripe_cid=None)
        _create_player(session, 11, "seller", stripe_cid="cus_BBB")

        result = check_shared_stripe_customer(10, 11, session)
        assert result is None

    def test_returns_none_when_seller_has_no_stripe(self, session: Session):
        _create_player(session, 10, "buyer", stripe_cid="cus_AAA")
        _create_player(session, 11, "seller", stripe_cid=None)

        result = check_shared_stripe_customer(10, 11, session)
        assert result is None

    def test_returns_none_when_both_null(self, session: Session):
        _create_player(session, 10, "buyer", stripe_cid=None)
        _create_player(session, 11, "seller", stripe_cid=None)

        result = check_shared_stripe_customer(10, 11, session)
        assert result is None

    def test_returns_none_for_self_trade(self, session: Session):
        _create_player(session, 10, "same_player", stripe_cid="cus_SELF")

        result = check_shared_stripe_customer(10, 10, session)
        assert result is None


# ---------------------------------------------------------------------------
# Tests: log_alt_warning
# ---------------------------------------------------------------------------

class TestLogAltWarning:
    def test_creates_activity_event(self, session: Session):
        _create_player(session, 10, "buyer")
        _create_player(session, 11, "seller")

        log_alt_warning(
            buyer_id=10,
            seller_id=11,
            shared_customer_id="cus_SHARED456",
            trade_id=99,
            session=session,
        )
        session.flush()

        events = session.exec(
            select(ActivityEvent).where(ActivityEvent.event_type == "marketplace_alt_warning")
        ).all()

        assert len(events) == 1
        event = events[0]
        assert event.player_id == 10
        assert event.event_data["buyer_id"] == 10
        assert event.event_data["seller_id"] == 11
        assert event.event_data["shared_stripe_customer_id"] == "cus_SHARED456"
        assert event.event_data["trade_id"] == 99
