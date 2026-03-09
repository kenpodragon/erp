"""Tests for leaderboard service and endpoints (2.7.3)."""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlmodel import Session

from models import Player, PlayerCharacter, CharacterClass, PlayerProgress, PlayerSettings
from models.home_base import LeaderboardCache
from models.story_mode import PlayerMetaProgression
from services.leaderboard_service import (
    refresh_leaderboard, get_leaderboard, get_player_own_rank,
    _assign_badge_tier, VALID_CATEGORIES,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def leaderboard_players(session: Session, test_character_class: CharacterClass):
    """Create 10 players with progress for leaderboard testing."""
    players = []
    for i in range(10):
        p = Player(
            firebase_uid=f"lb_uid_{i}",
            email=f"lb{i}@test.com",
            alias=f"Player{i}",
            created_at=datetime.now(timezone.utc),
            last_login_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(p)
        session.commit()
        session.refresh(p)

        char = PlayerCharacter(
            player_id=p.id,
            class_id=test_character_class.id,
            character_name=f"Char{i}",
            level=10 + i,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(char)
        session.commit()
        session.refresh(char)

        # Progression — each player further than the last
        prog = PlayerProgress(
            player_id=p.id,
            character_id=char.id,
            book_number=1,
            chapter_number=1 + (i // 3),
            scene_number=1 + (i % 3),
        )
        session.add(prog)

        # Meta progression — varying essence
        meta = PlayerMetaProgression(
            player_id=p.id,
            elysium_essence=float(100 * (i + 1)),
            total_essence_earned=float(100 * (i + 1)),
        )
        session.add(meta)

        players.append(p)

    session.commit()
    return players


class TestBadgeTierAssignment:
    def test_cosmic_tier(self):
        assert _assign_badge_tier(1, 100) == "cosmic"

    def test_gold_tier(self):
        assert _assign_badge_tier(3, 100) == "gold"

    def test_silver_tier(self):
        assert _assign_badge_tier(10, 100) == "silver"

    def test_bronze_tier(self):
        assert _assign_badge_tier(20, 100) == "bronze"

    def test_no_tier(self):
        assert _assign_badge_tier(50, 100) is None

    def test_empty_leaderboard(self):
        assert _assign_badge_tier(1, 0) is None


class TestRefreshLeaderboard:
    def test_populates_cache(self, session: Session, leaderboard_players):
        refresh_leaderboard("vanguard", session, force=True)

        cached = session.exec(
            LeaderboardCache.__table__.select()
            .where(LeaderboardCache.category == "vanguard")
        ).all()
        # Should have entries for all 10 players
        assert len(cached) == 10

    def test_rankings_ordered(self, session: Session, leaderboard_players):
        refresh_leaderboard("vanguard", session, force=True)

        entries = session.exec(
            LeaderboardCache.__table__.select()
            .where(LeaderboardCache.category == "vanguard")
            .order_by(LeaderboardCache.rank)
        ).all()

        # Rank 1 should have highest metric (Player9 at B1 Ch4 S1)
        assert entries[0].rank == 1
        assert entries[0].player_alias == "Player9"

    def test_alchemist_category(self, session: Session, leaderboard_players):
        refresh_leaderboard("alchemist", session, force=True)

        entries = session.exec(
            LeaderboardCache.__table__.select()
            .where(LeaderboardCache.category == "alchemist")
            .order_by(LeaderboardCache.rank)
        ).all()

        assert len(entries) == 10
        # Player9 has 1000 essence, should be rank 1
        assert entries[0].player_alias == "Player9"

    def test_ttl_prevents_recompute(self, session: Session, leaderboard_players):
        """Cache shouldn't refresh within TTL window."""
        refresh_leaderboard("vanguard", session, force=True)

        # Get first entry's updated_at
        entry = session.exec(
            LeaderboardCache.__table__.select()
            .where(LeaderboardCache.category == "vanguard")
            .order_by(LeaderboardCache.rank)
            .limit(1)
        ).first()
        original_time = entry.updated_at

        # Second refresh without force — should NOT recompute
        refresh_leaderboard("vanguard", session, force=False)

        entry2 = session.exec(
            LeaderboardCache.__table__.select()
            .where(LeaderboardCache.category == "vanguard")
            .order_by(LeaderboardCache.rank)
            .limit(1)
        ).first()
        assert entry2.updated_at == original_time


class TestGetLeaderboard:
    def test_returns_paginated(self, session: Session, leaderboard_players):
        result = get_leaderboard("vanguard", session, page=1, per_page=5)

        assert result["total"] == 10
        assert result["page"] == 1
        assert result["per_page"] == 5
        assert len(result["entries"]) == 5

    def test_page_two(self, session: Session, leaderboard_players):
        result = get_leaderboard("vanguard", session, page=2, per_page=5)

        assert len(result["entries"]) == 5
        # First entry on page 2 should be rank 6
        assert result["entries"][0]["rank"] == 6


class TestPlayerOwnRank:
    def test_finds_cached_player(self, session: Session, leaderboard_players):
        refresh_leaderboard("vanguard", session, force=True)
        player = leaderboard_players[5]

        rank = get_player_own_rank("vanguard", player.id, session)
        assert rank is not None
        assert rank["player_alias"] == "Player5"

    def test_returns_none_for_unknown(self, session: Session, leaderboard_players):
        refresh_leaderboard("vanguard", session, force=True)

        rank = get_player_own_rank("vanguard", 99999, session)
        assert rank is None
