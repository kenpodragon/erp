"""Tests for Akashic Log endpoint (2.7.1)."""

import pytest
from datetime import datetime, timezone, timedelta
from sqlmodel import Session

from models import (
    Player, PlayerCharacter, CharacterClass, PlayerProgress, PlayerSettings,
    Book, Chapter, Scene, StoryBeat, StatDefinition,
)
from models.character_progression import CharacterStat


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def akashic_book(session: Session) -> Book:
    book = Book(book_number=1, title="The Pallid Mask", source_file="book1.docx",
                created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@pytest.fixture
def akashic_chapters(session: Session, akashic_book: Book) -> list[Chapter]:
    chapters = []
    for i in range(2):
        ch = Chapter(book_id=akashic_book.id, chapter_number=i + 1, title=f"Chapter {i + 1}",
                     sort_order=i + 1, processing_status="done",
                     created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
        session.add(ch)
        chapters.append(ch)
    session.commit()
    for ch in chapters:
        session.refresh(ch)
    return chapters


@pytest.fixture
def akashic_scenes(session: Session, akashic_chapters: list[Chapter]) -> list[Scene]:
    scenes = []
    for ch in akashic_chapters:
        for i in range(2):
            sc = Scene(chapter_id=ch.id, scene_number=i + 1, title=f"Scene {i + 1}",
                       summary=f"Summary for scene {i + 1}", sort_order=i + 1,
                       scene_type="normal",
                       created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
            session.add(sc)
            scenes.append(sc)
    session.commit()
    for sc in scenes:
        session.refresh(sc)
    return scenes


@pytest.fixture
def akashic_beats(session: Session, akashic_scenes: list[Scene]) -> list[StoryBeat]:
    beats = []
    for sc in akashic_scenes:
        for i in range(3):
            bt = StoryBeat(
                scene_id=sc.id,
                beat_number=i + 1,
                sort_order=i + 1,
                raw_text=f"Beat {i + 1} content for scene {sc.scene_number}.",
                hidden_lore_text=f"Hidden lore for beat {i + 1}" if i == 0 else None,
                lore_intelligence_threshold=15 if i == 0 else None,
                created_at=datetime.now(timezone.utc),
            )
            session.add(bt)
            beats.append(bt)
    session.commit()
    for bt in beats:
        session.refresh(bt)
    return beats


@pytest.fixture
def akashic_progress(session: Session, test_player: Player, test_character: PlayerCharacter):
    """Set progress to Ch1 Sc2 Beat2 — meaning Ch1 Sc1 is completed, Ch1 Sc2 partially done."""
    prog = PlayerProgress(
        player_id=test_player.id,
        character_id=test_character.id,
        book_number=1,
        chapter_number=1,
        scene_number=2,
        beat_number=2,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(prog)
    session.commit()
    session.refresh(prog)
    return prog


# ---------------------------------------------------------------------------
# Tests: Hierarchy Structure
# ---------------------------------------------------------------------------

class TestAkashicLogHierarchy:
    def test_returns_empty_without_character(self, client, test_player, player_token):
        # Delete the character so player has none
        # test_player exists but test_character is not used here — no character created
        # Actually, we need a client with auth but no character.
        # Use a fresh player with no character.
        from models import Player
        from sqlmodel import select

        res = client.get("/api/game/home-base/akashic-log")
        assert res.status_code == 200
        data = res.json()
        assert data["total_beats"] == 0
        assert data["books"] == []

    def test_returns_hierarchy(self, client, test_player, test_character,
                                player_token, akashic_book, akashic_chapters,
                                akashic_scenes, akashic_beats, akashic_progress):
        res = client.get("/api/game/home-base/akashic-log")
        assert res.status_code == 200
        data = res.json()

        # Should have 1 book
        assert len(data["books"]) == 1
        book = data["books"][0]
        assert book["title"] == "The Pallid Mask"
        assert book["book_number"] == 1

        # Should have 2 chapters
        assert len(book["chapters"]) == 2
        ch1 = book["chapters"][0]
        assert ch1["chapter_number"] == 1
        assert len(ch1["scenes"]) == 2

        # Each scene has 3 beats
        sc1 = ch1["scenes"][0]
        assert len(sc1["beats"]) == 3

    def test_total_beat_count(self, client, test_player, test_character,
                               player_token, akashic_book, akashic_chapters,
                               akashic_scenes, akashic_beats, akashic_progress):
        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        # 4 scenes × 3 beats = 12 total beats
        assert data["total_beats"] == 12


# ---------------------------------------------------------------------------
# Tests: Completion Percentage
# ---------------------------------------------------------------------------

class TestAkashicLogCompletion:
    def test_completion_pct(self, client, test_player, test_character,
                             player_token, akashic_book, akashic_chapters,
                             akashic_scenes, akashic_beats, akashic_progress):
        """Progress at Ch1 Sc2 Beat2 = Ch1 Sc1 fully done (3 beats) + Ch1 Sc2 partial (2 beats) = 5/12."""
        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        assert data["total_unlocked"] == 5  # 3 from completed Sc1 + 2 from in-progress Sc2
        assert data["total_beats"] == 12
        # 5/12 = 41.7%
        assert data["total_completion_pct"] == 41.7

    def test_chapter_completion(self, client, test_player, test_character,
                                 player_token, akashic_book, akashic_chapters,
                                 akashic_scenes, akashic_beats, akashic_progress):
        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        ch1 = data["books"][0]["chapters"][0]
        # Ch1: Sc1 (3 beats done) + Sc2 (2 of 3 done) = 5/6
        assert ch1["unlocked_beats"] == 5
        assert ch1["total_beats"] == 6
        assert ch1["completion_pct"] == 83.3

        ch2 = data["books"][0]["chapters"][1]
        # Ch2: nothing done
        assert ch2["unlocked_beats"] == 0
        assert ch2["completion_pct"] == 0


# ---------------------------------------------------------------------------
# Tests: Beat Unlocking
# ---------------------------------------------------------------------------

class TestBeatUnlocking:
    def test_completed_scene_all_beats_unlocked(self, client, test_player, test_character,
                                                  player_token, akashic_book, akashic_chapters,
                                                  akashic_scenes, akashic_beats, akashic_progress):
        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        # Ch1 Sc1 is completed — all 3 beats should be unlocked with content
        sc1_beats = data["books"][0]["chapters"][0]["scenes"][0]["beats"]
        for beat in sc1_beats:
            assert beat["unlocked"] is True
            assert beat["content"] is not None

    def test_in_progress_scene_partial_beats(self, client, test_player, test_character,
                                               player_token, akashic_book, akashic_chapters,
                                               akashic_scenes, akashic_beats, akashic_progress):
        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        # Ch1 Sc2 in progress at beat 2 — beats 1,2 unlocked, beat 3 locked
        sc2_beats = data["books"][0]["chapters"][0]["scenes"][1]["beats"]
        assert sc2_beats[0]["unlocked"] is True
        assert sc2_beats[1]["unlocked"] is True
        assert sc2_beats[2]["unlocked"] is False
        assert sc2_beats[2]["content"] is None

    def test_locked_chapter_beats_all_locked(self, client, test_player, test_character,
                                               player_token, akashic_book, akashic_chapters,
                                               akashic_scenes, akashic_beats, akashic_progress):
        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        # Ch2 is entirely locked
        ch2_beats = data["books"][0]["chapters"][1]["scenes"][0]["beats"]
        for beat in ch2_beats:
            assert beat["unlocked"] is False
            assert beat["content"] is None


# ---------------------------------------------------------------------------
# Tests: Hidden Lore
# ---------------------------------------------------------------------------

class TestHiddenLore:
    def test_hidden_lore_eligible(self, session, client, test_player, test_character,
                                    test_character_class, player_token,
                                    akashic_book, akashic_chapters,
                                    akashic_scenes, akashic_beats, akashic_progress):
        """When Intelligence >= threshold, hidden lore text should be revealed."""
        # Set up intelligence stat = 20 (threshold is 15)
        stat_def = StatDefinition(name="intelligence", display_name="Intelligence",
                                   category="primary", value_type="integer")
        session.add(stat_def)
        session.commit()
        session.refresh(stat_def)

        char_stat = CharacterStat(
            character_id=test_character.id,
            stat_id=stat_def.id,
            computed_total=20,
            last_computed_at=datetime.now(timezone.utc),
        )
        session.add(char_stat)
        session.commit()

        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        # First beat of completed Sc1 has hidden lore with threshold 15
        beat0 = data["books"][0]["chapters"][0]["scenes"][0]["beats"][0]
        assert beat0["has_hidden_lore"] is True
        assert beat0["hidden_lore_unlocked"] is True
        assert beat0["hidden_lore_text"] is not None
        assert "Hidden lore for beat 1" in beat0["hidden_lore_text"]

    def test_hidden_lore_locked_low_intelligence(self, session, client, test_player,
                                                    test_character, test_character_class,
                                                    player_token,
                                                    akashic_book, akashic_chapters,
                                                    akashic_scenes, akashic_beats,
                                                    akashic_progress):
        """When Intelligence < threshold, hidden lore text should be hidden."""
        stat_def = StatDefinition(name="intelligence", display_name="Intelligence",
                                   category="primary", value_type="integer")
        session.add(stat_def)
        session.commit()
        session.refresh(stat_def)

        char_stat = CharacterStat(
            character_id=test_character.id,
            stat_id=stat_def.id,
            computed_total=10,  # Below threshold of 15
            last_computed_at=datetime.now(timezone.utc),
        )
        session.add(char_stat)
        session.commit()

        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        beat0 = data["books"][0]["chapters"][0]["scenes"][0]["beats"][0]
        assert beat0["has_hidden_lore"] is True
        assert beat0["hidden_lore_unlocked"] is False
        assert beat0["hidden_lore_text"] is None
        assert beat0["lore_intelligence_threshold"] == 15

    def test_hidden_lore_not_shown_on_locked_beat(self, session, client, test_player,
                                                     test_character, test_character_class,
                                                     player_token,
                                                     akashic_book, akashic_chapters,
                                                     akashic_scenes, akashic_beats,
                                                     akashic_progress):
        """Even with high Intelligence, locked beats don't reveal hidden lore."""
        stat_def = StatDefinition(name="intelligence", display_name="Intelligence",
                                   category="primary", value_type="integer")
        session.add(stat_def)
        session.commit()
        session.refresh(stat_def)

        char_stat = CharacterStat(
            character_id=test_character.id,
            stat_id=stat_def.id,
            computed_total=100,  # Way above threshold
            last_computed_at=datetime.now(timezone.utc),
        )
        session.add(char_stat)
        session.commit()

        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        # Ch2 Sc1 Beat1 — has hidden lore but scene is locked
        ch2_beat0 = data["books"][0]["chapters"][1]["scenes"][0]["beats"][0]
        assert ch2_beat0["unlocked"] is False
        assert ch2_beat0["hidden_lore_unlocked"] is False
        assert ch2_beat0["hidden_lore_text"] is None


# ---------------------------------------------------------------------------
# Tests: New Badge
# ---------------------------------------------------------------------------

class TestNewBadge:
    def test_new_badge_when_visited_before_completion(self, session, client,
                                                        test_player, test_character,
                                                        player_token,
                                                        akashic_book, akashic_chapters,
                                                        akashic_scenes, akashic_beats,
                                                        akashic_progress):
        """Beats completed after last visit should have is_new=True."""
        from models.character_progression import PlayerSceneRecord

        # Set last visited to yesterday
        settings = PlayerSettings(
            player_id=test_player.id,
            akashic_last_visited_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        session.add(settings)

        # Mark Sc1 as completed today
        scene1 = akashic_scenes[0]
        record = PlayerSceneRecord(
            player_id=test_player.id,
            scene_id=scene1.id,
            best_wave=10,
            total_runs=1,
            first_completed_at=datetime.now(timezone.utc),
        )
        session.add(record)
        session.commit()

        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        # Sc1 beats should have is_new=True (completed after last visit)
        sc1_beats = data["books"][0]["chapters"][0]["scenes"][0]["beats"]
        for beat in sc1_beats:
            assert beat["is_new"] is True

    def test_no_new_badge_when_never_visited(self, client, test_player, test_character,
                                               player_token, akashic_book, akashic_chapters,
                                               akashic_scenes, akashic_beats, akashic_progress):
        """Without a last_visited timestamp, no beats should be marked new."""
        res = client.get("/api/game/home-base/akashic-log")
        data = res.json()

        sc1_beats = data["books"][0]["chapters"][0]["scenes"][0]["beats"]
        for beat in sc1_beats:
            assert beat["is_new"] is False
