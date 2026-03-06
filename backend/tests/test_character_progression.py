"""Tests for 2.4 Character Progression — stats, XP, levels, prerequisites."""

import math
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlmodel import Session

from models import (
    Player, CharacterClass, PlayerCharacter, Skill, CharacterSkillLevel,
    StatDefinition, GameConfig, Book, Chapter, Scene, StoryBeat,
)
from models.character_progression import (
    IdleSkillStatContribution, ClassStatAffinity, CharacterStat,
    PlayerSceneRecord, SkillPrerequisite,
)
from services.character_progression import (
    recalculate_character_stats,
    get_character_level,
    award_character_xp,
    award_scene_completion_char_xp,
    upsert_scene_record,
    evaluate_prerequisites,
    get_skill_tree,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def stat_defs(session: Session):
    """Create STR/AGI/INT stat definitions."""
    stats = []
    for name, display in [("strength", "Strength"), ("agility", "Agility"), ("intelligence", "Intelligence")]:
        s = StatDefinition(
            name=name, display_name=display, value_type="integer",
            min_value=0, max_value=9999, category="combat",
        )
        session.add(s)
        stats.append(s)
    session.commit()
    for s in stats:
        session.refresh(s)
    return {s.name: s for s in stats}


@pytest.fixture
def drifter_class(session: Session):
    cc = CharacterClass(
        name="Drifter", base_strength=15, base_agility=10, base_intelligence=5,
        is_available=True,
    )
    session.add(cc)
    session.commit()
    session.refresh(cc)
    return cc


@pytest.fixture
def drifter_affinities(session: Session, drifter_class, stat_defs):
    """Seed class_stat_affinities for Drifter."""
    affs = []
    data = [
        ("strength", 15, 0.60, 1.0),
        ("agility", 10, 0.40, 0.5),
        ("intelligence", 5, 0.00, 0.0),
    ]
    for stat_name, base, lore_w, lvl_bonus in data:
        a = ClassStatAffinity(
            class_id=drifter_class.id,
            stat_id=stat_defs[stat_name].id,
            base_value=base,
            lore_weight=lore_w,
            level_bonus_per_level=lvl_bonus,
        )
        session.add(a)
        affs.append(a)
    session.commit()
    return affs


@pytest.fixture
def idle_skills(session: Session):
    """Create Attack, Magic, Lore, Precision idle skills."""
    skills = {}
    for name in ["Attack", "Magic", "Lore", "Precision"]:
        s = Skill(name=name, category="idle")
        session.add(s)
        skills[name] = s
    session.commit()
    for s in skills.values():
        session.refresh(s)
    return skills


@pytest.fixture
def idle_contributions(session: Session, idle_skills, stat_defs):
    """Seed idle_skill_stat_contributions (Attack→STR, Precision→AGI, Magic→INT)."""
    mappings = [
        ("Attack", "strength"),
        ("Precision", "agility"),
        ("Magic", "intelligence"),
    ]
    for skill_name, stat_name in mappings:
        c = IdleSkillStatContribution(
            idle_skill_id=idle_skills[skill_name].id,
            stat_id=stat_defs[stat_name].id,
            coefficient=0.5,
        )
        session.add(c)
    session.commit()


@pytest.fixture
def drifter_char(session: Session, drifter_class):
    """Create a player + character (Drifter)."""
    player = Player(
        firebase_uid="test_drift_uid", email="drifter@test.com",
        created_at=datetime.now(timezone.utc),
    )
    session.add(player)
    session.commit()
    session.refresh(player)

    char = PlayerCharacter(
        player_id=player.id,
        class_id=drifter_class.id,
        character_name="TestDrifter",
        level=1,
        character_xp=0,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(char)
    session.commit()
    session.refresh(char)
    return char


@pytest.fixture
def game_configs(session: Session):
    """Seed required game_configs."""
    configs = {
        "char_level_xp_factor": "1000",
        "char_level_cap": "99",
        "char_xp_per_scene_base": "50",
        "idle_to_char_xp_ratio": "0.1",
        "lore_pool_coefficient": "0.6",
    }
    for key, val in configs.items():
        session.add(GameConfig(key=key, value_json=val))
    session.commit()


# ---------------------------------------------------------------------------
# Tests: Stat Calculation (Design §1.1–§1.6)
# ---------------------------------------------------------------------------

class TestStatCalculation:
    def test_class_base_only(self, session, stat_defs, drifter_affinities, idle_contributions, drifter_char, game_configs):
        """With no training or equipment, stats = class base + level 1 bonus."""
        result = recalculate_character_stats(session, drifter_char.id)
        session.commit()

        # Level 1 Drifter: STR base(15) + level(floor(1*1.0)=1) = 16
        assert result["strength"] == 16
        # AGI base(10) + level(floor(1*0.5)=0) = 10
        assert result["agility"] == 10
        assert result["intelligence"] == 5

    def test_idle_contribution(self, session, stat_defs, drifter_affinities, idle_contributions, idle_skills, drifter_char, game_configs):
        """Attack level 50 should add floor(50 * 0.5) = 25 to STR."""
        csl = CharacterSkillLevel(
            character_id=drifter_char.id,
            skill_id=idle_skills["Attack"].id,
            level=50, current_xp=0,
        )
        session.add(csl)
        session.commit()

        result = recalculate_character_stats(session, drifter_char.id)
        session.commit()

        # STR: base(15) + idle(25) + level1 bonus(1) = 41
        assert result["strength"] == 41

    def test_lore_distribution(self, session, stat_defs, drifter_affinities, idle_contributions, idle_skills, drifter_char, game_configs):
        """Lore level 50: pool=floor(50*0.6)=30. Drifter: STR=floor(30*0.6)=18, AGI=floor(30*0.4)=12."""
        csl = CharacterSkillLevel(
            character_id=drifter_char.id,
            skill_id=idle_skills["Lore"].id,
            level=50, current_xp=0,
        )
        session.add(csl)
        session.commit()

        result = recalculate_character_stats(session, drifter_char.id)
        session.commit()

        # STR: base(15) + lore(18) + level1(1) = 34
        assert result["strength"] == 34
        # AGI: base(10) + lore(12) + level1(0) = 22
        assert result["agility"] == 22

    def test_character_level_bonus(self, session, stat_defs, drifter_affinities, idle_contributions, drifter_char, game_configs):
        """Drifter at level 25: STR += floor(25*1.0)=25, AGI += floor(25*0.5)=12."""
        drifter_char.level = 25
        session.add(drifter_char)
        session.commit()

        result = recalculate_character_stats(session, drifter_char.id)
        session.commit()

        assert result["strength"] == 15 + 25  # base + level bonus
        assert result["agility"] == 10 + 12
        assert result["intelligence"] == 5 + 0  # no INT level bonus for Drifter

    def test_full_stat_calculation(self, session, stat_defs, drifter_affinities, idle_contributions, idle_skills, drifter_char, game_configs):
        """Full calc: Drifter, all skills at 50, level 25 (Design §1.6 reference values)."""
        drifter_char.level = 25
        session.add(drifter_char)

        for skill_name in ["Attack", "Magic", "Lore", "Precision"]:
            csl = CharacterSkillLevel(
                character_id=drifter_char.id,
                skill_id=idle_skills[skill_name].id,
                level=50, current_xp=0,
            )
            session.add(csl)
        session.commit()

        result = recalculate_character_stats(session, drifter_char.id)
        session.commit()

        # From Design §1.6:
        # STR: 15 (base) + 25 (Attack*0.5) + 18 (Lore 60%) + 25 (level*1.0) = 83
        assert result["strength"] == 83
        # AGI: 10 (base) + 25 (Precision*0.5) + 12 (Lore 40%) + 12 (level*0.5) = 59
        assert result["agility"] == 59
        # INT: 5 (base) + 25 (Magic*0.5) + 0 (Lore 0%) + 0 (level*0.0) = 30
        assert result["intelligence"] == 30


# ---------------------------------------------------------------------------
# Tests: Character XP & Level-Up (Design §2.1–§2.3)
# ---------------------------------------------------------------------------

class TestCharacterXP:
    def test_level_from_xp(self):
        """Level derivation from cumulative XP (K=1000)."""
        assert get_character_level(0, 1000) == 1
        assert get_character_level(999, 1000) == 1
        assert get_character_level(1000, 1000) == 1  # XP_to_reach(1) = 1000
        assert get_character_level(4000, 1000) == 2  # XP_to_reach(2) = 4000
        assert get_character_level(25000, 1000) == 5  # XP_to_reach(5) = 25000

    def test_award_xp_no_levelup(self, session, drifter_char, game_configs):
        """Award XP without crossing a level threshold."""
        result = award_character_xp(session, drifter_char, 500)
        session.commit()

        assert result["xp_awarded"] == 500
        assert result["leveled_up"] is False
        assert drifter_char.character_xp == 500

    def test_award_xp_levelup(self, session, stat_defs, drifter_affinities, idle_contributions, drifter_char, game_configs):
        """Award enough XP to level up (K=1000, level 1→2 at 4000 XP)."""
        result = award_character_xp(session, drifter_char, 5000)
        session.commit()

        assert result["leveled_up"] is True
        assert result["new_level"] >= 2

    def test_scene_completion_xp(self, session, stat_defs, drifter_affinities, idle_contributions, drifter_char, game_configs):
        """Scene completion awards flat char XP (default 50)."""
        result = award_scene_completion_char_xp(session, drifter_char)
        session.commit()

        assert result["xp_awarded"] == 50


# ---------------------------------------------------------------------------
# Tests: Player Scene Records
# ---------------------------------------------------------------------------

class TestSceneRecords:
    def test_upsert_new_record(self, session, drifter_char):
        """First run creates a new record."""
        # Need a scene
        from models import Book, Chapter, Scene
        book = Book(book_number=1, title="Book 1", source_file="b1.docx")
        session.add(book)
        session.commit()
        session.refresh(book)
        chapter = Chapter(book_id=book.id, chapter_number=1, sort_order=1)
        session.add(chapter)
        session.commit()
        session.refresh(chapter)
        scene = Scene(chapter_id=chapter.id, scene_number=1, sort_order=1)
        session.add(scene)
        session.commit()
        session.refresh(scene)

        record = upsert_scene_record(session, drifter_char.player_id, scene.id, wave=10, enemies_killed=50)
        session.commit()

        assert record.best_wave == 10
        assert record.total_enemies_killed == 50
        assert record.total_runs == 1

    def test_upsert_updates_best(self, session, drifter_char):
        """Second run with lower wave doesn't overwrite best_wave."""
        from models import Book, Chapter, Scene
        book = Book(book_number=1, title="Book 1", source_file="b1.docx")
        session.add(book)
        session.commit()
        session.refresh(book)
        chapter = Chapter(book_id=book.id, chapter_number=1, sort_order=1)
        session.add(chapter)
        session.commit()
        session.refresh(chapter)
        scene = Scene(chapter_id=chapter.id, scene_number=1, sort_order=1)
        session.add(scene)
        session.commit()
        session.refresh(scene)

        upsert_scene_record(session, drifter_char.player_id, scene.id, wave=10)
        session.commit()
        record = upsert_scene_record(session, drifter_char.player_id, scene.id, wave=5)
        session.commit()

        assert record.best_wave == 10  # best kept
        assert record.total_runs == 2


# ---------------------------------------------------------------------------
# Tests: Prerequisites (Design §5.1)
# ---------------------------------------------------------------------------

class TestPrerequisites:
    def test_no_prereqs_met(self, session, idle_skills, drifter_char):
        """Skill with no prerequisites is always met."""
        result = evaluate_prerequisites(session, drifter_char.id, idle_skills["Attack"].id)
        assert result["met"] is True

    def test_idle_skill_prereq_not_met(self, session, stat_defs, idle_skills, drifter_char):
        """Clickstorm requires Attack ≥ 10; character has no training."""
        clickstorm = Skill(name="Clickstorm", category="hotbar")
        session.add(clickstorm)
        session.commit()
        session.refresh(clickstorm)

        prereq = SkillPrerequisite(
            skill_id=clickstorm.id,
            prerequisite_type="idle_skill_level",
            ref_id=idle_skills["Attack"].id,
            min_value=10,
            display_hint="Requires Attack Level 10",
        )
        session.add(prereq)
        session.commit()

        result = evaluate_prerequisites(session, drifter_char.id, clickstorm.id)
        assert result["met"] is False
        assert result["details"][0]["current"] == 0

    def test_idle_skill_prereq_met(self, session, stat_defs, idle_skills, drifter_char):
        """Clickstorm requires Attack ≥ 10; character has Attack level 15."""
        clickstorm = Skill(name="Clickstorm", category="hotbar")
        session.add(clickstorm)
        session.commit()
        session.refresh(clickstorm)

        prereq = SkillPrerequisite(
            skill_id=clickstorm.id,
            prerequisite_type="idle_skill_level",
            ref_id=idle_skills["Attack"].id,
            min_value=10,
        )
        session.add(prereq)

        csl = CharacterSkillLevel(
            character_id=drifter_char.id,
            skill_id=idle_skills["Attack"].id,
            level=15,
        )
        session.add(csl)
        session.commit()

        result = evaluate_prerequisites(session, drifter_char.id, clickstorm.id)
        assert result["met"] is True

    def test_character_level_prereq(self, session, drifter_char):
        """Character level prerequisite check."""
        skill = Skill(name="TestSkill", category="hotbar")
        session.add(skill)
        session.commit()
        session.refresh(skill)

        prereq = SkillPrerequisite(
            skill_id=skill.id,
            prerequisite_type="character_level",
            min_value=15,
        )
        session.add(prereq)
        session.commit()

        # Level 1 < 15
        result = evaluate_prerequisites(session, drifter_char.id, skill.id)
        assert result["met"] is False

        # Level up to 15
        drifter_char.level = 15
        session.add(drifter_char)
        session.commit()

        result = evaluate_prerequisites(session, drifter_char.id, skill.id)
        assert result["met"] is True

    def test_and_gate_multiple_prereqs(self, session, stat_defs, idle_skills, drifter_char, drifter_affinities, idle_contributions, game_configs):
        """Multiple prereqs must ALL be met (AND-gate)."""
        skill = Skill(name="ComplexSkill", category="hotbar")
        session.add(skill)
        session.commit()
        session.refresh(skill)

        # Requires Attack ≥ 10 AND character level ≥ 5
        session.add(SkillPrerequisite(
            skill_id=skill.id, prerequisite_type="idle_skill_level",
            ref_id=idle_skills["Attack"].id, min_value=10,
        ))
        session.add(SkillPrerequisite(
            skill_id=skill.id, prerequisite_type="character_level",
            min_value=5,
        ))
        session.commit()

        # Neither met
        result = evaluate_prerequisites(session, drifter_char.id, skill.id)
        assert result["met"] is False

        # Only Attack met
        session.add(CharacterSkillLevel(
            character_id=drifter_char.id, skill_id=idle_skills["Attack"].id, level=10,
        ))
        session.commit()
        result = evaluate_prerequisites(session, drifter_char.id, skill.id)
        assert result["met"] is False

        # Both met
        drifter_char.level = 5
        session.add(drifter_char)
        session.commit()
        result = evaluate_prerequisites(session, drifter_char.id, skill.id)
        assert result["met"] is True


# ---------------------------------------------------------------------------
# Tests: Skill Tree
# ---------------------------------------------------------------------------

class TestSkillTree:
    def test_skill_tree_basic(self, session, stat_defs, idle_skills, drifter_char, drifter_affinities, idle_contributions, game_configs):
        """Skill tree returns visible skills with prerequisite state."""
        tree = get_skill_tree(session, drifter_char.id)
        # Should include the 4 idle skills
        skill_names = [s["name"] for s in tree]
        assert "Attack" in skill_names

    def test_class_exclusive_hidden(self, session, stat_defs, idle_skills, drifter_char, drifter_affinities, idle_contributions, game_configs):
        """Class-exclusive skills for other classes are hidden."""
        # Create an Engineer-only skill
        engineer = CharacterClass(name="Engineer", base_strength=5, base_agility=15, base_intelligence=10)
        session.add(engineer)
        session.commit()
        session.refresh(engineer)

        eng_skill = Skill(
            name="Energy Shields", category="active",
            class_id=engineer.id, is_class_exclusive=True,
        )
        session.add(eng_skill)
        session.commit()

        tree = get_skill_tree(session, drifter_char.id)
        skill_names = [s["name"] for s in tree]
        assert "Energy Shields" not in skill_names


# ---------------------------------------------------------------------------
# Tests: Content Gate (min_level / recommended_level)
# ---------------------------------------------------------------------------

class TestContentGate:
    @pytest.fixture
    def story_fixtures(self, session):
        """Create book → chapter → scene with min_level set."""
        now = datetime.now(timezone.utc)
        book = Book(title="Test Book", book_number=1, sort_order=1, source_file="test.docx", created_at=now, updated_at=now)
        session.add(book)
        session.commit()
        session.refresh(book)

        chapter = Chapter(
            book_id=book.id, title="Hard Chapter", chapter_number=1,
            sort_order=1, min_level=10, recommended_level=8,
            created_at=now, updated_at=now,
        )
        session.add(chapter)
        session.commit()
        session.refresh(chapter)

        scene = Scene(
            chapter_id=chapter.id, title="Test Scene", scene_number=1,
            sort_order=1, created_at=now, updated_at=now,
        )
        session.add(scene)
        session.commit()
        session.refresh(scene)

        beat = StoryBeat(
            scene_id=scene.id, beat_number=1, text="Test text.", sort_order=1,
            created_at=now, updated_at=now,
        )
        session.add(beat)
        session.commit()
        return {"book": book, "chapter": chapter, "scene": scene}

    @pytest.fixture
    def gated_client(self, session, test_player, test_character):
        from main import app
        from db import get_session as _get_session
        from auth import get_current_player

        def get_session_override():
            return session

        def get_current_player_override():
            return {"uid": test_player.firebase_uid, "email": test_player.email, "player": test_player}

        app.dependency_overrides[_get_session] = get_session_override
        app.dependency_overrides[get_current_player] = get_current_player_override

        with TestClient(app) as c:
            yield c
        app.dependency_overrides.clear()

    def test_min_level_blocks_session_start(self, session, gated_client, story_fixtures, test_character):
        """Character level 1 cannot start scene with min_level=10."""
        assert test_character.level == 1
        resp = gated_client.post(
            "/api/game/story/session/start",
            json={"scene_id": story_fixtures["scene"].id},
        )
        assert resp.status_code == 403
        assert "minimum level" in resp.json()["detail"].lower()

    def test_min_level_allows_when_met(self, session, gated_client, story_fixtures, test_character):
        """Character at min_level can start the session."""
        test_character.level = 10
        session.add(test_character)
        session.commit()

        resp = gated_client.post(
            "/api/game/story/session/start",
            json={"scene_id": story_fixtures["scene"].id},
        )
        assert resp.status_code == 200
        assert "session_id" in resp.json()
