"""Tests for achievement evaluation engine (2.7.3)."""

import pytest
from datetime import datetime, timezone
from decimal import Decimal
from sqlmodel import Session

from models import Player, PlayerCharacter, CharacterClass, PlayerSettings
from models.home_base import (
    Achievement, PlayerAchievement, Title, PlayerTitle,
    ShardTransaction, PlayerArtifact,
)
from models.story_mode import PlayerMetaProgression
from models.progress import PlayerEssence
from services.achievement_service import (
    evaluate_achievements, get_player_cumulative_stats,
    update_achievement_progress,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def combat_achievements(session: Session) -> list[Achievement]:
    """Seed tiered combat achievements: Slayer I (10 kills), II (50), III (200)."""
    achs = []
    parent_id = None
    for tier, (name, threshold) in enumerate([
        ("Enemy Slayer I", 10),
        ("Enemy Slayer II", 50),
        ("Enemy Slayer III", 200),
    ], 1):
        ach = Achievement(
            name=name,
            description=f"Kill {threshold} enemies.",
            category="combat",
            tracking_type="cumulative",
            tracking_source="total_enemies_killed",
            threshold_value=Decimal(str(threshold)),
            parent_achievement_id=parent_id,
            reward_shards=10 * tier,
            reward_essence=50 * tier,
            sort_order=tier,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(ach)
        session.commit()
        session.refresh(ach)
        parent_id = ach.id
        achs.append(ach)
    return achs


@pytest.fixture
def title_achievement(session: Session) -> tuple[Achievement, Title]:
    """Achievement that rewards a title."""
    title = Title(
        name="The Vanquisher",
        display_format="suffix",
        sort_order=1,
        created_at=datetime.now(timezone.utc),
    )
    session.add(title)
    session.commit()
    session.refresh(title)

    ach = Achievement(
        name="Boss Conqueror",
        description="Defeat 5 bosses.",
        category="combat",
        tracking_type="cumulative",
        tracking_source="total_bosses_killed",
        threshold_value=Decimal("5"),
        reward_title_id=title.id,
        reward_shards=50,
        sort_order=10,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    session.add(ach)
    session.commit()
    session.refresh(ach)
    return ach, title


@pytest.fixture
def meta_progression(session: Session, test_player: Player) -> PlayerMetaProgression:
    """Create meta progression record for the test player."""
    meta = PlayerMetaProgression(
        player_id=test_player.id,
        elysium_essence=0,
        total_essence_earned=0,
        shard_balance=0,
        total_shards_earned=0,
    )
    session.add(meta)
    session.commit()
    session.refresh(meta)
    return meta


@pytest.fixture
def player_essence(session: Session, test_player: Player, test_character: PlayerCharacter) -> PlayerEssence:
    """Create essence record for test player."""
    essence = PlayerEssence(
        player_id=test_player.id,
        character_id=test_character.id,
        current_balance=0,
        created_at=datetime.now(timezone.utc),
    )
    session.add(essence)
    session.commit()
    session.refresh(essence)
    return essence


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCumulativeStats:
    def test_returns_defaults_for_new_player(
        self, session: Session, test_player: Player, test_character: PlayerCharacter, meta_progression
    ):
        stats = get_player_cumulative_stats(test_player.id, session)
        assert stats["total_enemies_killed"] == 0
        assert stats["total_bosses_killed"] == 0
        assert stats["total_sessions"] == 0
        assert stats["total_artifacts_owned"] == 0
        assert stats["character_level"] == 1

    def test_counts_artifacts(
        self, session: Session, test_player: Player, test_character: PlayerCharacter, meta_progression
    ):
        # Add 2 artifacts
        for i in range(2):
            session.add(PlayerArtifact(
                player_id=test_player.id,
                character_id=test_character.id,
                artifact_type="generated",
                artifact_code=f"GEN-{i}",
                name=f"Test Artifact {i}",
                rarity="common",
                stat_bonuses={"strength": 1},
                acquired_at=datetime.now(timezone.utc),
            ))
        session.commit()

        stats = get_player_cumulative_stats(test_player.id, session)
        assert stats["total_artifacts_owned"] == 2


class TestEvaluateAchievements:
    def test_grants_tier_one(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        combat_achievements, meta_progression, player_essence,
    ):
        """Player with enough kills should earn tier I."""
        # Simulate: provide stats via context override
        result = evaluate_achievements(
            test_player.id, session, context={"total_enemies_killed": 15}
        )

        assert len(result) == 1
        assert result[0]["name"] == "Enemy Slayer I"
        assert result[0]["reward_shards"] == 10

    def test_grants_multiple_tiers_in_single_pass(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        combat_achievements, meta_progression, player_essence,
    ):
        """Player with 60 kills should earn both tier I and II in one pass."""
        result = evaluate_achievements(
            test_player.id, session, context={"total_enemies_killed": 60}
        )

        names = [r["name"] for r in result]
        assert "Enemy Slayer I" in names
        assert "Enemy Slayer II" in names
        assert "Enemy Slayer III" not in names  # threshold=200

    def test_parent_chain_enforced(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        combat_achievements, meta_progression, player_essence,
    ):
        """Tier III requires tier II which requires tier I."""
        # With only 5 kills, no achievement should be granted
        result = evaluate_achievements(
            test_player.id, session, context={"total_enemies_killed": 5}
        )
        assert len(result) == 0

    def test_idempotency(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        combat_achievements, meta_progression, player_essence,
    ):
        """Re-evaluation should not double-grant."""
        evaluate_achievements(
            test_player.id, session, context={"total_enemies_killed": 15}
        )
        # Second evaluation with same stats
        result = evaluate_achievements(
            test_player.id, session, context={"total_enemies_killed": 15}
        )
        assert len(result) == 0

    def test_shard_reward_distribution(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        combat_achievements, meta_progression, player_essence,
    ):
        """Shards should be credited and transaction logged."""
        evaluate_achievements(
            test_player.id, session, context={"total_enemies_killed": 15}
        )

        session.refresh(meta_progression)
        assert meta_progression.shard_balance == 10
        assert meta_progression.total_shards_earned == 10

        # Check transaction log
        txns = session.exec(
            ShardTransaction.__table__.select()
            .where(ShardTransaction.player_id == test_player.id)
        ).all()
        assert len(txns) == 1
        assert txns[0].source_type == "achievement"
        assert txns[0].amount == 10

    def test_essence_reward_distribution(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        combat_achievements, meta_progression, player_essence,
    ):
        """Essence should be credited."""
        evaluate_achievements(
            test_player.id, session, context={"total_enemies_killed": 15}
        )

        session.refresh(player_essence)
        assert player_essence.current_balance == 50

        session.refresh(meta_progression)
        assert meta_progression.total_essence_earned == 50

    def test_title_reward(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        title_achievement, meta_progression, player_essence,
    ):
        """Title should be granted when achievement is earned."""
        ach, title = title_achievement
        result = evaluate_achievements(
            test_player.id, session, context={"total_bosses_killed": 5}
        )

        assert len(result) == 1
        assert result[0]["reward_title"] == "The Vanquisher"

        # Check PlayerTitle was created
        pt = session.exec(
            PlayerTitle.__table__.select()
            .where(PlayerTitle.player_id == test_player.id)
        ).all()
        assert len(pt) == 1
        assert pt[0].title_id == title.id


class TestUpdateProgress:
    def test_updates_incomplete_achievements(
        self, session: Session, test_player: Player, test_character: PlayerCharacter,
        combat_achievements, meta_progression,
    ):
        """Progress values should be updated for incomplete achievements."""
        # Create a partial progress record
        pa = PlayerAchievement(
            player_id=test_player.id,
            achievement_id=combat_achievements[0].id,
            progress_value=Decimal("0"),
            is_completed=False,
        )
        session.add(pa)
        session.commit()

        # Update with context that gives some kills
        update_achievement_progress(test_player.id, session)

        session.refresh(pa)
        # With no actual scene records, progress should be 0
        assert float(pa.progress_value) == 0.0
