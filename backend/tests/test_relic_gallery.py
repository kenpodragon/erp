"""Tests for Relic Gallery endpoints (2.7.2)."""

import pytest
from datetime import datetime, timezone
from sqlmodel import Session

from models import Player, PlayerCharacter, CharacterClass, PlayerSettings
from models.home_base import CuratedArtifact, CuratedArtifactTier, PlayerArtifact


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def curated_artifacts(session: Session) -> list[CuratedArtifact]:
    """Seed 3 curated artifacts."""
    artifacts = []
    for i, (name, source_type) in enumerate([
        ("Void Shard", "boss"),
        ("Tower Core", "mastery"),
        ("Ether Fragment", "hidden"),
    ]):
        ca = CuratedArtifact(
            name=name,
            description=f"A {name.lower()} artifact.",
            lore_text=f"Ancient lore about {name}.",
            icon_sprite_key=f"artifact_{name.lower().replace(' ', '_')}",
            source_type=source_type,
            source_id=i + 1,
            source_hint=f"Drops from: {source_type} source {i + 1}",
            base_drop_chance=0.1,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(ca)
        artifacts.append(ca)
    session.commit()
    for ca in artifacts:
        session.refresh(ca)
    return artifacts


@pytest.fixture
def owned_artifacts(session: Session, test_player: Player,
                     test_character: PlayerCharacter,
                     curated_artifacts: list[CuratedArtifact]) -> list[PlayerArtifact]:
    """Give player 1 curated + 2 generated artifacts."""
    arts = []

    # Curated artifact (Void Shard)
    pa1 = PlayerArtifact(
        player_id=test_player.id,
        character_id=test_character.id,
        artifact_type="curated",
        curated_artifact_id=curated_artifacts[0].id,
        name="Void Shard",
        rarity="rare",
        icon_sprite_key="artifact_void_shard",
        stat_bonuses={"strength": 12, "intelligence": 5},
        is_new=True,
        acquired_from="boss_drop",
        acquired_at=datetime.now(timezone.utc),
    )
    session.add(pa1)
    arts.append(pa1)

    # Generated artifacts
    for i, (code, name, stats) in enumerate([
        ("FRACT_SHARD_VOID", "Fractured Shard of the Void", {"strength": 5, "agility": 3}),
        ("LUMIN_PRISM_TOWER", "Luminous Prism of the Tower", {"intelligence": 8}),
    ]):
        pa = PlayerArtifact(
            player_id=test_player.id,
            character_id=test_character.id,
            artifact_type="generated",
            artifact_code=code,
            name=name,
            rarity="uncommon",
            icon_sprite_key=f"artifact_gen_{i}",
            stat_bonuses=stats,
            is_new=i == 0,  # First one is new
            acquired_from="scene_complete",
            acquired_at=datetime.now(timezone.utc),
        )
        session.add(pa)
        arts.append(pa)

    session.commit()
    for pa in arts:
        session.refresh(pa)
    return arts


# ---------------------------------------------------------------------------
# Tests: GET /artifacts
# ---------------------------------------------------------------------------

class TestGetArtifacts:
    def test_returns_empty_without_character(self, client, test_player, player_token):
        # test_player has no character in this test
        res = client.get("/api/game/home-base/artifacts")
        assert res.status_code == 200
        data = res.json()
        assert data["owned_artifacts"] == []
        assert data["curated_collection"]["total"] == 0

    def test_returns_owned_artifacts(self, client, test_player, test_character,
                                      player_token, curated_artifacts, owned_artifacts):
        res = client.get("/api/game/home-base/artifacts")
        assert res.status_code == 200
        data = res.json()

        assert len(data["owned_artifacts"]) == 3
        assert data["generated_count"] == 2

    def test_curated_artifact_has_lore(self, client, test_player, test_character,
                                        player_token, curated_artifacts, owned_artifacts):
        res = client.get("/api/game/home-base/artifacts")
        data = res.json()

        curated = [a for a in data["owned_artifacts"] if a["type"] == "curated"]
        assert len(curated) == 1
        assert curated[0]["name"] == "Void Shard"
        assert curated[0]["lore_text"] == "Ancient lore about Void Shard."
        assert curated[0]["source_hint"] is not None
        assert curated[0]["rarity"] == "rare"

    def test_generated_artifact_has_code(self, client, test_player, test_character,
                                           player_token, curated_artifacts, owned_artifacts):
        res = client.get("/api/game/home-base/artifacts")
        data = res.json()

        generated = [a for a in data["owned_artifacts"] if a["type"] == "generated"]
        assert len(generated) == 2
        codes = {a["artifact_code"] for a in generated}
        assert "FRACT_SHARD_VOID" in codes
        assert "LUMIN_PRISM_TOWER" in codes

    def test_curated_collection_counts(self, client, test_player, test_character,
                                        player_token, curated_artifacts, owned_artifacts):
        res = client.get("/api/game/home-base/artifacts")
        data = res.json()

        coll = data["curated_collection"]
        assert coll["total"] == 3
        assert coll["owned"] == 1
        assert len(coll["undiscovered"]) == 2

    def test_undiscovered_silhouettes(self, client, test_player, test_character,
                                       player_token, curated_artifacts, owned_artifacts):
        res = client.get("/api/game/home-base/artifacts")
        data = res.json()

        undiscovered = data["curated_collection"]["undiscovered"]
        # Should not include Void Shard (owned), should include Tower Core and Ether Fragment
        names = {u["name"] for u in undiscovered}
        assert names == {"???", "???"}  # All show as "???"
        hints = {u["source_hint"] for u in undiscovered}
        assert "Drops from: mastery source 2" in hints
        assert "Drops from: hidden source 3" in hints
        for u in undiscovered:
            assert u["silhouette"] is True

    def test_stat_totals(self, client, test_player, test_character,
                          player_token, curated_artifacts, owned_artifacts):
        res = client.get("/api/game/home-base/artifacts")
        data = res.json()

        totals = data["stat_total"]
        # Void Shard: str=12, int=5 + Shard: str=5, agi=3 + Prism: int=8
        assert totals["strength"] == 17
        assert totals["agility"] == 3
        assert totals["intelligence"] == 13

    def test_is_new_flags(self, client, test_player, test_character,
                           player_token, curated_artifacts, owned_artifacts):
        res = client.get("/api/game/home-base/artifacts")
        data = res.json()

        new_arts = [a for a in data["owned_artifacts"] if a["is_new"]]
        assert len(new_arts) == 2  # Void Shard + first generated


# ---------------------------------------------------------------------------
# Tests: POST /artifacts/mark-visited
# ---------------------------------------------------------------------------

class TestMarkVisited:
    def test_clears_new_flags(self, client, session, test_player, test_character,
                               player_token, curated_artifacts, owned_artifacts):
        # Create settings for the player
        settings = PlayerSettings(player_id=test_player.id)
        session.add(settings)
        session.commit()

        res = client.post("/api/game/home-base/artifacts/mark-visited")
        assert res.status_code == 200
        data = res.json()
        assert data["cleared"] == 2  # 2 artifacts had is_new=True

        # Verify flags are cleared
        res2 = client.get("/api/game/home-base/artifacts")
        data2 = res2.json()
        new_arts = [a for a in data2["owned_artifacts"] if a["is_new"]]
        assert len(new_arts) == 0

    def test_updates_gallery_visited_at(self, client, session, test_player, test_character,
                                          player_token, curated_artifacts, owned_artifacts):
        settings = PlayerSettings(player_id=test_player.id)
        session.add(settings)
        session.commit()

        client.post("/api/game/home-base/artifacts/mark-visited")

        session.refresh(settings)
        assert settings.gallery_last_visited_at is not None

    def test_returns_zero_when_nothing_new(self, client, session, test_player, test_character,
                                            player_token, curated_artifacts):
        # No artifacts owned
        settings = PlayerSettings(player_id=test_player.id)
        session.add(settings)
        session.commit()

        res = client.post("/api/game/home-base/artifacts/mark-visited")
        assert res.json()["cleared"] == 0
