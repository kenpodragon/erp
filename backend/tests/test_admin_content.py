"""Comprehensive tests for 5.2 Game Content Editor admin endpoints.

Covers:
  - Books, Chapters, Scenes (admin_content.py)
  - Backgrounds, Wave Configs (admin_content.py)
  - Entities, Entity-Scenes, Entity-Beats (admin_content_entities.py)
  - Story Beats, Semantic Tags (admin_content_entities.py)
  - Locations, Location-Scenes (admin_content_locations.py)
  - Audit Logging
"""

import pytest
from datetime import datetime, timezone

from models import (
    Book, Chapter, Scene, StoryBeat, Location,
    SceneGameplayData, Entity, EntityGameplayData,
    Atmosphere, AttackType, EntityAttackType,
    AdminAuditLog, AssetRegistryEntry,
    EntityType, EntityFamily,
)
from models.story_mode import EntitySceneAppearance
from models.content import (
    Background, SceneWaveConfig, EntityAlias, EntityBeatAppearance,
    LocationAlias, LocationSceneAppearance, SemanticTag,
)

BASE = "/api/admin/content"


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc)


def _make_book(session, book_number=1, title="Book One"):
    b = Book(book_number=book_number, title=title, source_file="",
             created_at=_now(), updated_at=_now())
    session.add(b)
    session.commit()
    session.refresh(b)
    return b


def _make_chapter(session, book_id, chapter_number=1, title="Chapter One"):
    ch = Chapter(book_id=book_id, chapter_number=chapter_number,
                 title=title, sort_order=chapter_number,
                 processing_status="not_started",
                 created_at=_now(), updated_at=_now())
    session.add(ch)
    session.commit()
    session.refresh(ch)
    return ch


def _make_scene(session, chapter_id, scene_number=1, title="Scene One",
                scene_type="normal"):
    s = Scene(chapter_id=chapter_id, scene_number=scene_number,
              title=title, sort_order=scene_number,
              scene_type=scene_type, has_hard_break=False,
              created_at=_now(), updated_at=_now())
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


def _make_beat(session, scene_id, beat_number=1, sort_order=1):
    sb = StoryBeat(scene_id=scene_id, beat_number=beat_number,
                   sort_order=sort_order, summary=f"Beat {beat_number}",
                   created_at=_now(), updated_at=_now())
    session.add(sb)
    session.commit()
    session.refresh(sb)
    return sb


def _ensure_entity_type(session, name="enemy"):
    """Get-or-create an EntityType row and return its id."""
    from sqlmodel import select
    et = session.exec(select(EntityType).where(EntityType.name == name)).first()
    if et:
        return et.id
    et = EntityType(name=name, display_name=name.title(), sort_order=0,
                    created_at=_now(), updated_at=_now())
    session.add(et)
    session.commit()
    session.refresh(et)
    return et.id


def _ensure_entity_family(session, name):
    """Get-or-create an EntityFamily row and return its id."""
    from sqlmodel import select
    ef = session.exec(select(EntityFamily).where(EntityFamily.name == name)).first()
    if ef:
        return ef.id
    ef = EntityFamily(name=name, display_name=name.title(), sort_order=0,
                      created_at=_now(), updated_at=_now())
    session.add(ef)
    session.commit()
    session.refresh(ef)
    return ef.id


def _make_entity(session, name="Goblin", entity_type="enemy"):
    entity_type_id = _ensure_entity_type(session, entity_type)
    e = Entity(canonical_name=name, entity_type_id=entity_type_id,
               created_at=_now(), updated_at=_now())
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


def _make_location(session, name="Dark Forest", location_type="outdoor"):
    loc = Location(canonical_name=name, location_type=location_type,
                   created_at=_now(), updated_at=_now())
    session.add(loc)
    session.commit()
    session.refresh(loc)
    return loc


def _make_background(session, name="Forest BG", key="forest_bg"):
    bg = Background(name=name, background_key=key,
                    created_at=_now(), updated_at=_now())
    session.add(bg)
    session.commit()
    session.refresh(bg)
    return bg


def _make_attack_type(session, name="slash", display_name="Slash"):
    at = AttackType(name=name, display_name=display_name,
                    created_at=_now())
    session.add(at)
    session.commit()
    session.refresh(at)
    return at


def _make_atmosphere(session, name="Eerie Forest"):
    atm = Atmosphere(name=name, archetype="forest",
                     created_at=_now(), updated_at=_now())
    session.add(atm)
    session.commit()
    session.refresh(atm)
    return atm


def _full_hierarchy(session):
    """Create Book -> Chapter -> Scene and return all three."""
    book = _make_book(session)
    chapter = _make_chapter(session, book.id)
    scene = _make_scene(session, chapter.id)
    return book, chapter, scene


# ===========================================================================
#  BOOK CRUD (5 tests)
# ===========================================================================

class TestBookCRUD:

    def test_list_books(self, admin_client, session):
        _make_book(session, 1, "Book A")
        _make_book(session, 2, "Book B")
        r = admin_client.get(f"{BASE}/books")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        assert data[0]["book_number"] == 1
        assert "chapter_count" in data[0]
        assert "scene_count" in data[0]

    def test_create_book(self, admin_client, session):
        r = admin_client.post(f"{BASE}/books", json={
            "book_number": 1, "title": "The First Tower",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "The First Tower"
        assert data["book_number"] == 1
        # Verify DB state
        book = session.get(Book, data["id"])
        assert book is not None
        assert book.title == "The First Tower"

    def test_update_book(self, admin_client, session):
        book = _make_book(session)
        r = admin_client.patch(f"{BASE}/books/{book.id}", json={
            "title": "Updated Title",
        })
        assert r.status_code == 200
        assert r.json()["title"] == "Updated Title"

    def test_delete_book(self, admin_client, session):
        book = _make_book(session)
        r = admin_client.delete(f"{BASE}/books/{book.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert session.get(Book, book.id) is None

    def test_delete_book_blocked(self, admin_client, session):
        book = _make_book(session)
        _make_chapter(session, book.id)
        r = admin_client.delete(f"{BASE}/books/{book.id}")
        assert r.status_code == 409
        assert "chapters" in r.json()["detail"].lower()


# ===========================================================================
#  CHAPTER CRUD (6 tests)
# ===========================================================================

class TestChapterCRUD:

    def test_list_chapters(self, admin_client, session):
        book = _make_book(session)
        _make_chapter(session, book.id, 1, "Ch 1")
        _make_chapter(session, book.id, 2, "Ch 2")
        r = admin_client.get(f"{BASE}/chapters", params={"book_id": book.id})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    def test_get_chapter_detail(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        ch.raw_text = "Some raw text here"
        session.add(ch)
        session.commit()
        r = admin_client.get(f"{BASE}/chapters/{ch.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["raw_text"] == "Some raw text here"
        assert "book_title" in data

    def test_create_chapter(self, admin_client, session):
        book = _make_book(session)
        r = admin_client.post(f"{BASE}/chapters", json={
            "book_id": book.id, "chapter_number": 1, "title": "The Beginning",
        })
        assert r.status_code == 201
        assert r.json()["title"] == "The Beginning"

    def test_update_chapter(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        r = admin_client.patch(f"{BASE}/chapters/{ch.id}", json={
            "title": "New Title", "recommended_level": 5,
        })
        assert r.status_code == 200
        assert r.json()["title"] == "New Title"
        assert r.json()["recommended_level"] == 5

    def test_delete_chapter(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        r = admin_client.delete(f"{BASE}/chapters/{ch.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_delete_chapter_blocked(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        _make_scene(session, ch.id)
        r = admin_client.delete(f"{BASE}/chapters/{ch.id}")
        assert r.status_code == 409
        assert "scenes" in r.json()["detail"].lower()


# ===========================================================================
#  SCENE CRUD + GAMEPLAY (8 tests)
# ===========================================================================

class TestSceneCRUD:

    def test_list_scenes(self, admin_client, session):
        book, ch, _ = _full_hierarchy(session)
        _make_scene(session, ch.id, 2, "Scene Two")
        r = admin_client.get(f"{BASE}/scenes",
                             params={"chapter_id": ch.id})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2

    def test_get_scene_detail(self, admin_client, session):
        _, ch, scene = _full_hierarchy(session)
        gd = SceneGameplayData(scene_id=scene.id, required_time_seconds=60,
                               is_boss_scene=False,
                               created_at=_now(), updated_at=_now())
        session.add(gd)
        session.commit()
        r = admin_client.get(f"{BASE}/scenes/{scene.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["gameplay_data"] is not None
        assert data["gameplay_data"]["required_time_seconds"] == 60

    def test_create_scene_with_gameplay(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        r = admin_client.post(f"{BASE}/scenes", json={
            "chapter_id": ch.id, "scene_number": 1, "title": "Intro",
            "gameplay_data": {"required_time_seconds": 90, "is_boss_scene": False},
        })
        assert r.status_code == 201
        data = r.json()
        assert data["gameplay_data"] is not None
        assert data["gameplay_data"]["required_time_seconds"] == 90

    def test_update_scene_gameplay(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        r = admin_client.patch(f"{BASE}/scenes/{scene.id}", json={
            "gameplay_data": {"required_time_seconds": 120},
        })
        assert r.status_code == 200
        assert r.json()["gameplay_data"]["required_time_seconds"] == 120

    def test_update_scene_boss_config(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        boss_config = {
            "timer_seconds": 30,
            "interrupts": [
                {"type": "click_burst", "threshold": 20},
                {"type": "target_zone", "radius": 40},
            ],
        }
        r = admin_client.patch(f"{BASE}/scenes/{scene.id}", json={
            "boss_config": boss_config,
        })
        assert r.status_code == 200
        assert r.json()["boss_config"]["timer_seconds"] == 30
        assert len(r.json()["boss_config"]["interrupts"]) == 2

    def test_update_scene_invalid_boss_config(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        bad_config = {
            "interrupts": [{"type": "invalid_type"}],
        }
        r = admin_client.patch(f"{BASE}/scenes/{scene.id}", json={
            "boss_config": bad_config,
        })
        assert r.status_code == 409

    def test_delete_scene(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        r = admin_client.delete(f"{BASE}/scenes/{scene.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_delete_scene_blocked(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        _make_beat(session, scene.id)
        r = admin_client.delete(f"{BASE}/scenes/{scene.id}")
        assert r.status_code == 409
        assert "story_beats" in r.json()["detail"].lower()


# ===========================================================================
#  STORY BEAT CRUD (6 tests)
# ===========================================================================

class TestStoryBeatCRUD:

    def test_list_beats(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        _make_beat(session, scene.id, 1, 1)
        _make_beat(session, scene.id, 2, 2)
        r = admin_client.get(f"{BASE}/beats",
                             params={"scene_id": scene.id})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2

    def test_create_beat(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        r = admin_client.post(f"{BASE}/beats", json={
            "scene_id": scene.id, "beat_number": 1, "sort_order": 1,
            "summary": "A hero appears",
        })
        assert r.status_code == 201
        assert r.json()["summary"] == "A hero appears"

    def test_update_beat(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        r = admin_client.patch(f"{BASE}/beats/{beat.id}", json={
            "summary": "Updated summary", "intensity": 5,
        })
        assert r.status_code == 200
        assert r.json()["summary"] == "Updated summary"
        assert r.json()["intensity"] == 5

    def test_reorder_beats(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        b1 = _make_beat(session, scene.id, 1, 1)
        b2 = _make_beat(session, scene.id, 2, 2)
        b3 = _make_beat(session, scene.id, 3, 3)
        # Reverse order
        r = admin_client.patch(f"{BASE}/beats/reorder", json={
            "scene_id": scene.id,
            "beat_ids": [b3.id, b2.id, b1.id],
        })
        assert r.status_code == 200
        data = r.json()
        assert data[0]["id"] == b3.id
        assert data[0]["sort_order"] == 1
        assert data[2]["id"] == b1.id
        assert data[2]["sort_order"] == 3

    def test_delete_beat(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        r = admin_client.delete(f"{BASE}/beats/{beat.id}")
        assert r.status_code == 204

    def test_delete_beat_blocked(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        # Add a semantic tag referencing this beat
        tag = SemanticTag(story_beat_id=beat.id, category="mood",
                          value="dark", created_at=_now(), updated_at=_now())
        session.add(tag)
        session.commit()
        r = admin_client.delete(f"{BASE}/beats/{beat.id}")
        assert r.status_code == 409
        assert "semantic tags" in r.json()["detail"].lower()


# ===========================================================================
#  ENTITY CRUD (8 tests)
# ===========================================================================

class TestEntityCRUD:

    def test_list_entities(self, admin_client, session):
        _make_entity(session, "Goblin", "enemy")
        _make_entity(session, "Orc", "enemy")
        _make_entity(session, "Sage", "npc")
        enemy_type_id = _ensure_entity_type(session, "enemy")
        r = admin_client.get(f"{BASE}/entities",
                             params={"entity_type_id": enemy_type_id})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2

    def test_list_entity_families(self, admin_client, session):
        gob_id = _ensure_entity_family(session, "goblinoid")
        orc_id = _ensure_entity_family(session, "orcish")
        e1 = _make_entity(session, "Goblin", "enemy")
        e1.entity_family_id = gob_id
        e2 = _make_entity(session, "Orc", "enemy")
        e2.entity_family_id = orc_id
        session.add_all([e1, e2])
        session.commit()
        r = admin_client.get(f"{BASE}/entities/families")
        assert r.status_code == 200
        families = r.json()
        family_names = [f["name"] for f in families]
        assert "goblinoid" in family_names
        assert "orcish" in family_names

    def test_get_entity_detail(self, admin_client, session):
        entity = _make_entity(session)
        gd = EntityGameplayData(entity_id=entity.id, base_hp=100,
                                base_gold=10, appearance_rate=1.0,
                                created_at=_now(), updated_at=_now())
        session.add(gd)
        alias = EntityAlias(entity_id=entity.id, alias="Little Goblin")
        session.add(alias)
        session.commit()
        r = admin_client.get(f"{BASE}/entities/{entity.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["gameplay_data"] is not None
        assert data["gameplay_data"]["base_hp"] == 100
        assert len(data["aliases"]) == 1
        assert data["aliases"][0]["alias"] == "Little Goblin"

    def test_create_entity(self, admin_client, session):
        enemy_type_id = _ensure_entity_type(session, "enemy")
        r = admin_client.post(f"{BASE}/entities", json={
            "canonical_name": "Shadow Wolf",
            "entity_type_id": enemy_type_id,
            "base_description": "A dark wolf from the void",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["canonical_name"] == "Shadow Wolf"
        assert data["entity_type_id"] == enemy_type_id

    def test_update_entity(self, admin_client, session):
        entity = _make_entity(session)
        r = admin_client.patch(f"{BASE}/entities/{entity.id}", json={
            "base_description": "A fierce goblin warrior",
        })
        assert r.status_code == 200
        assert r.json()["base_description"] == "A fierce goblin warrior"

    def test_upsert_entity_gameplay(self, admin_client, session):
        entity = _make_entity(session)
        # Create
        r = admin_client.put(f"{BASE}/entities/{entity.id}/gameplay", json={
            "base_hp": 200, "base_gold": 50, "appearance_rate": 0.8,
        })
        assert r.status_code == 200
        assert r.json()["base_hp"] == 200
        # Update (upsert)
        r2 = admin_client.put(f"{BASE}/entities/{entity.id}/gameplay", json={
            "base_hp": 300,
        })
        assert r2.status_code == 200
        assert r2.json()["base_hp"] == 300

    def test_set_entity_attack_types(self, admin_client, session):
        entity = _make_entity(session)
        at1 = _make_attack_type(session, "slash", "Slash")
        at2 = _make_attack_type(session, "bite", "Bite")
        r = admin_client.put(f"{BASE}/entities/{entity.id}/attack-types",
                             json=[
                                 {"attack_type_id": at1.id, "is_primary": True},
                                 {"attack_type_id": at2.id, "is_primary": False},
                             ])
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        primary = [d for d in data if d["is_primary"]]
        assert len(primary) == 1

    def test_entity_aliases(self, admin_client, session):
        entity = _make_entity(session)
        # Add alias
        r = admin_client.post(f"{BASE}/entities/{entity.id}/aliases", json={
            "alias": "Gobbo", "context": "slang",
        })
        assert r.status_code == 201
        alias_id = r.json()["id"]
        # Delete alias
        r2 = admin_client.delete(
            f"{BASE}/entities/{entity.id}/aliases/{alias_id}")
        assert r2.status_code == 204


# ===========================================================================
#  ENTITY-SCENE MAPPER (5 tests)
# ===========================================================================

class TestEntitySceneMapper:

    def test_list_entity_scenes(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        entity = _make_entity(session)
        esa = EntitySceneAppearance(entity_id=entity.id, scene_id=scene.id,
                                    role="antagonist", is_present=True,
                                    created_at=_now(), updated_at=_now())
        session.add(esa)
        session.commit()
        r = admin_client.get(f"{BASE}/entity-scenes",
                             params={"scene_id": scene.id})
        assert r.status_code == 200
        assert r.json()["total"] == 1

    def test_create_entity_scene(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        entity = _make_entity(session)
        r = admin_client.post(f"{BASE}/entity-scenes", json={
            "entity_id": entity.id, "scene_id": scene.id,
            "role": "guard",
        })
        assert r.status_code == 201
        assert r.json()["role"] == "guard"

    def test_bulk_create_entity_scenes(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        e1 = _make_entity(session, "Wolf", "enemy")
        e2 = _make_entity(session, "Bear", "enemy")
        # Pre-create one to test skip
        esa = EntitySceneAppearance(entity_id=e1.id, scene_id=scene.id,
                                    is_present=True,
                                    created_at=_now(), updated_at=_now())
        session.add(esa)
        session.commit()
        r = admin_client.post(f"{BASE}/entity-scenes/bulk", json={
            "items": [
                {"entity_id": e1.id, "scene_id": scene.id},
                {"entity_id": e2.id, "scene_id": scene.id, "role": "beast"},
            ],
        })
        assert r.status_code == 200
        data = r.json()
        assert data["created"] == 1
        assert data["skipped"] == 1

    def test_copy_entity_scenes(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        scene1 = _make_scene(session, ch.id, 1, "S1")
        scene2 = _make_scene(session, ch.id, 2, "S2")
        entity = _make_entity(session)
        esa = EntitySceneAppearance(entity_id=entity.id, scene_id=scene1.id,
                                    role="patrol", is_present=True,
                                    created_at=_now(), updated_at=_now())
        session.add(esa)
        session.commit()
        r = admin_client.post(f"{BASE}/entity-scenes/copy", json={
            "source_scene_id": scene1.id,
            "target_scene_id": scene2.id,
        })
        assert r.status_code == 200
        assert r.json()["created"] == 1

    def test_delete_entity_scene(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        entity = _make_entity(session)
        esa = EntitySceneAppearance(entity_id=entity.id, scene_id=scene.id,
                                    is_present=True,
                                    created_at=_now(), updated_at=_now())
        session.add(esa)
        session.commit()
        session.refresh(esa)
        r = admin_client.delete(f"{BASE}/entity-scenes/{esa.id}")
        assert r.status_code == 204


# ===========================================================================
#  ENTITY-BEAT MAPPER (4 tests)
# ===========================================================================

class TestEntityBeatMapper:

    def test_list_entity_beats(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        entity = _make_entity(session)
        eba = EntityBeatAppearance(entity_id=entity.id,
                                   story_beat_id=beat.id,
                                   role="speaker", is_primary=True,
                                   created_at=_now())
        session.add(eba)
        session.commit()
        r = admin_client.get(f"{BASE}/entity-beats",
                             params={"story_beat_id": beat.id})
        assert r.status_code == 200
        assert r.json()["total"] == 1

    def test_create_entity_beat(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        entity = _make_entity(session)
        r = admin_client.post(f"{BASE}/entity-beats", json={
            "entity_id": entity.id, "story_beat_id": beat.id,
            "role": "observer", "is_primary": False,
        })
        assert r.status_code == 201
        assert r.json()["role"] == "observer"

    def test_bulk_create_entity_beats(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        e1 = _make_entity(session, "Goblin A", "enemy")
        e2 = _make_entity(session, "Goblin B", "enemy")
        # Pre-create one to test skip
        eba = EntityBeatAppearance(entity_id=e1.id, story_beat_id=beat.id,
                                   created_at=_now())
        session.add(eba)
        session.commit()
        r = admin_client.post(f"{BASE}/entity-beats/bulk", json={
            "items": [
                {"entity_id": e1.id, "story_beat_id": beat.id},
                {"entity_id": e2.id, "story_beat_id": beat.id, "role": "minion"},
            ],
        })
        assert r.status_code == 200
        data = r.json()
        assert data["created"] == 1
        assert data["skipped"] == 1

    def test_delete_entity_beat(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        entity = _make_entity(session)
        eba = EntityBeatAppearance(entity_id=entity.id,
                                   story_beat_id=beat.id,
                                   created_at=_now())
        session.add(eba)
        session.commit()
        session.refresh(eba)
        r = admin_client.delete(f"{BASE}/entity-beats/{eba.id}")
        assert r.status_code == 204


# ===========================================================================
#  BACKGROUND CRUD (5 tests)
# ===========================================================================

class TestBackgroundCRUD:

    def test_list_backgrounds(self, admin_client, session):
        _make_background(session, "Forest", "forest_bg")
        _make_background(session, "Cave", "cave_bg")
        r = admin_client.get(f"{BASE}/backgrounds")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        assert "scene_count" in data[0]

    def test_create_background(self, admin_client, session):
        r = admin_client.post(f"{BASE}/backgrounds", json={
            "name": "Mountain Peak",
            "background_key": "mountain_peak",
            "time_of_day": "dawn",
            "mood": "epic",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Mountain Peak"
        assert data["background_key"] == "mountain_peak"

    def test_update_background(self, admin_client, session):
        bg = _make_background(session)
        r = admin_client.patch(f"{BASE}/backgrounds/{bg.id}", json={
            "mood": "serene", "time_of_day": "sunset",
        })
        assert r.status_code == 200
        assert r.json()["mood"] == "serene"
        assert r.json()["time_of_day"] == "sunset"

    def test_delete_background(self, admin_client, session):
        bg = _make_background(session)
        r = admin_client.delete(f"{BASE}/backgrounds/{bg.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_delete_background_blocked(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        bg = _make_background(session)
        gd = SceneGameplayData(scene_id=scene.id, background_id=bg.id,
                               is_boss_scene=False,
                               created_at=_now(), updated_at=_now())
        session.add(gd)
        session.commit()
        r = admin_client.delete(f"{BASE}/backgrounds/{bg.id}")
        assert r.status_code == 409
        assert "scenes" in r.json()["detail"].lower()


# ===========================================================================
#  WAVE CONFIG (7 tests)
# ===========================================================================

class TestWaveConfig:

    def test_upsert_wave_config(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        # Create
        r = admin_client.put(f"{BASE}/wave-configs/{scene.id}", json={
            "wave_count": 15, "max_enemies_per_wave": 8,
        })
        assert r.status_code == 200
        assert r.json()["wave_count"] == 15
        # Update
        r2 = admin_client.put(f"{BASE}/wave-configs/{scene.id}", json={
            "wave_count": 20,
        })
        assert r2.status_code == 200
        assert r2.json()["wave_count"] == 20

    def test_get_wave_config(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        wc = SceneWaveConfig(scene_id=scene.id, wave_count=12,
                             max_enemies_per_wave=6,
                             spawn_interval_ms=1500,
                             scaling_factor=1.2,
                             hp_multiplier=1.0, gold_multiplier=1.0,
                             entity_pool=[],
                             created_at=_now(), updated_at=_now())
        session.add(wc)
        session.commit()
        r = admin_client.get(f"{BASE}/wave-configs/{scene.id}")
        assert r.status_code == 200
        assert r.json()["wave_count"] == 12

    def test_delete_wave_config(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        wc = SceneWaveConfig(scene_id=scene.id, wave_count=10,
                             max_enemies_per_wave=5,
                             spawn_interval_ms=2000,
                             scaling_factor=1.0,
                             hp_multiplier=1.0, gold_multiplier=1.0,
                             entity_pool=[],
                             created_at=_now(), updated_at=_now())
        session.add(wc)
        session.commit()
        r = admin_client.delete(f"{BASE}/wave-configs/{scene.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_list_wave_configs(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        s1 = _make_scene(session, ch.id, 1, "S1")
        s2 = _make_scene(session, ch.id, 2, "S2")
        for s in (s1, s2):
            wc = SceneWaveConfig(scene_id=s.id, wave_count=10,
                                 max_enemies_per_wave=5,
                                 spawn_interval_ms=2000,
                                 scaling_factor=1.0,
                                 hp_multiplier=1.0, gold_multiplier=1.0,
                                 entity_pool=[],
                                 created_at=_now(), updated_at=_now())
            session.add(wc)
        session.commit()
        r = admin_client.get(f"{BASE}/wave-configs",
                             params={"chapter_id": ch.id})
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_apply_wave_template(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        _make_scene(session, ch.id, 1, "S1", "normal")
        _make_scene(session, ch.id, 2, "S2", "normal")
        _make_scene(session, ch.id, 3, "S3", "normal")
        r = admin_client.post(f"{BASE}/wave-configs/bulk-template", json={
            "scope": "chapter",
            "scope_id": ch.id,
            "template": {"wave_count": 8, "max_enemies_per_wave": 4},
            "scaling_increment": 0.1,
            "overwrite": False,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["created"] == 3
        assert data["total_scenes"] == 3

    def test_bulk_adjust_multipliers(self, admin_client, session):
        book = _make_book(session)
        ch = _make_chapter(session, book.id)
        s1 = _make_scene(session, ch.id, 1, "S1")
        s2 = _make_scene(session, ch.id, 2, "S2")
        for s in (s1, s2):
            wc = SceneWaveConfig(scene_id=s.id, wave_count=10,
                                 max_enemies_per_wave=5,
                                 spawn_interval_ms=2000,
                                 scaling_factor=1.0,
                                 hp_multiplier=1.0, gold_multiplier=1.0,
                                 entity_pool=[],
                                 created_at=_now(), updated_at=_now())
            session.add(wc)
        session.commit()
        r = admin_client.patch(f"{BASE}/wave-configs/bulk-multipliers", json={
            "scene_ids": [s1.id, s2.id],
            "hp_multiplier_delta": 0.5,
            "gold_multiplier_delta": 0.3,
        })
        assert r.status_code == 200
        data = r.json()
        assert data["adjusted"] == 2
        # Verify actual values
        wc1 = session.exec(
            __import__("sqlmodel").select(SceneWaveConfig)
            .where(SceneWaveConfig.scene_id == s1.id)
        ).first()
        assert abs(wc1.hp_multiplier - 1.5) < 0.01
        assert abs(wc1.gold_multiplier - 1.3) < 0.01

    def test_auto_populate_wave_config(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        entity = _make_entity(session, "Dark Spider", "enemy")
        gd = EntityGameplayData(entity_id=entity.id, base_hp=50,
                                base_gold=5, appearance_rate=0.8,
                                created_at=_now(), updated_at=_now())
        session.add(gd)
        esa = EntitySceneAppearance(entity_id=entity.id, scene_id=scene.id,
                                    is_present=True,
                                    created_at=_now(), updated_at=_now())
        session.add(esa)
        session.commit()
        r = admin_client.post(f"{BASE}/wave-configs/auto-populate/{scene.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["entity_pool"] is not None
        assert len(data["entity_pool"]) == 1
        assert data["entity_pool"][0]["entity_id"] == entity.id


# ===========================================================================
#  LOCATION CRUD (6 tests)
# ===========================================================================

class TestLocationCRUD:

    def test_list_locations(self, admin_client, session):
        _make_location(session, "Forest", "outdoor")
        _make_location(session, "Dungeon", "indoor")
        r = admin_client.get(f"{BASE}/locations",
                             params={"location_type": "outdoor"})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["canonical_name"] == "Forest"

    def test_list_location_types(self, admin_client, session):
        _make_location(session, "Forest", "outdoor")
        _make_location(session, "Cave", "underground")
        r = admin_client.get(f"{BASE}/locations/types")
        assert r.status_code == 200
        types = r.json()
        assert "outdoor" in types
        assert "underground" in types

    def test_create_location(self, admin_client, session):
        r = admin_client.post(f"{BASE}/locations", json={
            "canonical_name": "Crystal Cavern",
            "location_type": "underground",
            "base_visual": "Glowing crystals line the walls",
            "base_auditory": "Dripping water echoes",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["canonical_name"] == "Crystal Cavern"
        assert data["base_visual"] == "Glowing crystals line the walls"

    def test_update_location(self, admin_client, session):
        loc = _make_location(session)
        r = admin_client.patch(f"{BASE}/locations/{loc.id}", json={
            "description": "A dark and mysterious forest",
            "base_olfactory": "Damp earth and moss",
        })
        assert r.status_code == 200
        assert r.json()["description"] == "A dark and mysterious forest"

    def test_delete_location_blocked(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        loc = _make_location(session)
        lsa = LocationSceneAppearance(location_id=loc.id, scene_id=scene.id,
                                      created_at=_now(), updated_at=_now())
        session.add(lsa)
        session.commit()
        r = admin_client.delete(f"{BASE}/locations/{loc.id}")
        assert r.status_code == 409
        assert "references" in r.json()["detail"].lower()

    def test_location_aliases(self, admin_client, session):
        loc = _make_location(session)
        # Add alias
        r = admin_client.post(f"{BASE}/locations/{loc.id}/aliases", json={
            "alias": "Enchanted Woods", "context": "local legend",
        })
        assert r.status_code == 201
        alias_id = r.json()["id"]
        assert r.json()["alias"] == "Enchanted Woods"
        # Delete alias
        r2 = admin_client.delete(
            f"{BASE}/locations/{loc.id}/aliases/{alias_id}")
        assert r2.status_code == 200
        assert r2.json()["ok"] is True


# ===========================================================================
#  LOCATION-SCENE (4 tests)
# ===========================================================================

class TestLocationScene:

    def test_list_location_scenes(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        loc = _make_location(session)
        lsa = LocationSceneAppearance(location_id=loc.id, scene_id=scene.id,
                                      visual_delta="Night version",
                                      created_at=_now(), updated_at=_now())
        session.add(lsa)
        session.commit()
        r = admin_client.get(f"{BASE}/location-scenes",
                             params={"location_id": loc.id})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["visual_delta"] == "Night version"

    def test_create_location_scene(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        loc = _make_location(session)
        r = admin_client.post(f"{BASE}/location-scenes", json={
            "location_id": loc.id, "scene_id": scene.id,
            "visual_delta": "Flames everywhere",
            "auditory_delta": "Roaring fire",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["visual_delta"] == "Flames everywhere"
        assert data["location_id"] == loc.id

    def test_update_location_scene(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        loc = _make_location(session)
        lsa = LocationSceneAppearance(location_id=loc.id, scene_id=scene.id,
                                      visual_delta="Original",
                                      created_at=_now(), updated_at=_now())
        session.add(lsa)
        session.commit()
        session.refresh(lsa)
        r = admin_client.patch(f"{BASE}/location-scenes/{lsa.id}", json={
            "visual_delta": "Updated visual",
            "atmosphere_delta": "More tense",
        })
        assert r.status_code == 200
        assert r.json()["visual_delta"] == "Updated visual"
        assert r.json()["atmosphere_delta"] == "More tense"

    def test_delete_location_scene(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        loc = _make_location(session)
        lsa = LocationSceneAppearance(location_id=loc.id, scene_id=scene.id,
                                      created_at=_now(), updated_at=_now())
        session.add(lsa)
        session.commit()
        session.refresh(lsa)
        r = admin_client.delete(f"{BASE}/location-scenes/{lsa.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ===========================================================================
#  SEMANTIC TAGS (6 tests)
# ===========================================================================

class TestSemanticTags:

    def test_list_semantic_tags(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        t1 = SemanticTag(story_beat_id=beat.id, category="mood",
                         value="dark", created_at=_now(), updated_at=_now())
        t2 = SemanticTag(story_beat_id=beat.id, category="mood",
                         value="tense", created_at=_now(), updated_at=_now())
        t3 = SemanticTag(story_beat_id=beat.id, category="theme",
                         value="betrayal", created_at=_now(), updated_at=_now())
        session.add_all([t1, t2, t3])
        session.commit()
        r = admin_client.get(f"{BASE}/semantic-tags",
                             params={"category": "mood"})
        assert r.status_code == 200
        assert r.json()["total"] == 2

    def test_get_semantic_tag_analytics(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        t1 = SemanticTag(story_beat_id=beat.id, category="mood",
                         value="dark", created_at=_now(), updated_at=_now())
        session.add(t1)
        session.commit()
        r = admin_client.get(f"{BASE}/semantic-tags/analytics")
        assert r.status_code == 200
        data = r.json()
        assert "total_tags" in data
        assert data["total_tags"] >= 1
        assert "category_counts" in data
        assert "top_values" in data

    def test_create_semantic_tag(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        r = admin_client.post(f"{BASE}/semantic-tags", json={
            "story_beat_id": beat.id,
            "category": "emotion",
            "value": "fear",
        })
        assert r.status_code == 201
        assert r.json()["category"] == "emotion"
        assert r.json()["value"] == "fear"

    def test_bulk_create_semantic_tags(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        r = admin_client.post(f"{BASE}/semantic-tags/bulk", json={
            "story_beat_id": beat.id,
            "tags": [
                {"category": "mood", "value": "dark"},
                {"category": "theme", "value": "sacrifice"},
                {"category": "setting", "value": "underground"},
            ],
        })
        assert r.status_code == 200
        assert r.json()["created"] == 3

    def test_rename_semantic_tag_value(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        b1 = _make_beat(session, scene.id, 1, 1)
        b2 = _make_beat(session, scene.id, 2, 2)
        t1 = SemanticTag(story_beat_id=b1.id, category="mood",
                         value="scary", created_at=_now(), updated_at=_now())
        t2 = SemanticTag(story_beat_id=b2.id, category="mood",
                         value="scary", created_at=_now(), updated_at=_now())
        session.add_all([t1, t2])
        session.commit()
        r = admin_client.patch(f"{BASE}/semantic-tags/rename", json={
            "category": "mood",
            "old_value": "scary",
            "new_value": "terrifying",
        })
        assert r.status_code == 200
        assert r.json()["updated"] == 2
        # Verify DB state
        session.refresh(t1)
        session.refresh(t2)
        assert t1.value == "terrifying"
        assert t2.value == "terrifying"

    def test_delete_semantic_tag(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        beat = _make_beat(session, scene.id)
        tag = SemanticTag(story_beat_id=beat.id, category="mood",
                          value="eerie", created_at=_now(), updated_at=_now())
        session.add(tag)
        session.commit()
        session.refresh(tag)
        r = admin_client.delete(f"{BASE}/semantic-tags/{tag.id}")
        assert r.status_code == 204


# ===========================================================================
#  AUDIT LOGGING (3 tests)
# ===========================================================================

class TestAuditLogging:

    def test_book_create_audit_log(self, admin_client, session):
        r = admin_client.post(f"{BASE}/books", json={
            "book_number": 1, "title": "Audit Test Book",
        })
        assert r.status_code == 201
        # Check for audit log entry
        from sqlmodel import select
        logs = session.exec(
            select(AdminAuditLog).where(AdminAuditLog.action == "create_book")
        ).all()
        assert len(logs) >= 1
        log = logs[-1]
        assert log.admin_email == "admin@example.com"
        assert log.target_type == "book"

    def test_entity_update_audit_log(self, admin_client, session):
        entity = _make_entity(session)
        r = admin_client.patch(f"{BASE}/entities/{entity.id}", json={
            "base_description": "Audit entity update test",
        })
        assert r.status_code == 200
        from sqlmodel import select
        logs = session.exec(
            select(AdminAuditLog).where(
                AdminAuditLog.action == "entity_updated"
            )
        ).all()
        assert len(logs) >= 1
        log = logs[-1]
        assert log.target_id == str(entity.id)

    def test_scene_delete_audit_log(self, admin_client, session):
        _, _, scene = _full_hierarchy(session)
        scene_id = scene.id
        r = admin_client.delete(f"{BASE}/scenes/{scene_id}")
        assert r.status_code == 200
        from sqlmodel import select
        logs = session.exec(
            select(AdminAuditLog).where(AdminAuditLog.action == "delete_scene")
        ).all()
        assert len(logs) >= 1
        log = logs[-1]
        assert log.target_id == str(scene_id)
        assert log.target_type == "scene"
