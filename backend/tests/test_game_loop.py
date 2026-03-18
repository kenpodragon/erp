import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from models import (
    Book, Chapter, Scene, StoryBeat, Skill, StatDefinition, BenefitEffectData,
    Player, PlayerCharacter, PlayerProgress, Artifact, PlayerCollection, SceneGameplayData
)

def test_get_game_map_empty(client: TestClient, player_token):
    """Test getting map when no books exist."""
    response = client.get("/api/game/map", headers={"Authorization": f"Bearer {player_token}"})
    assert response.status_code == 200
    assert response.json() == []

def test_get_game_map_with_data(client: TestClient, session: Session, player_token, test_character: PlayerCharacter):
    """Test the nested book -> chapter -> scene structure."""
    # Ensure progress exists for character
    progress = PlayerProgress(player_id=test_character.player_id, character_id=test_character.id, book_number=1, chapter_number=1, scene_number=1)
    session.add(progress)
    session.commit()

    # Seed data
    book = Book(book_number=1, title="Test Book", source_file="test.txt")
    session.add(book)
    session.commit()
    session.refresh(book)

    chapter = Chapter(book_id=book.id, chapter_number=1, title="Test Chapter", sort_order=1)
    session.add(chapter)
    session.commit()
    session.refresh(chapter)

    scene = Scene(chapter_id=chapter.id, scene_number=1, title="Test Scene", sort_order=1)
    session.add(scene)
    session.commit()
    session.refresh(scene)

    response = client.get("/api/game/map", headers={"Authorization": f"Bearer {player_token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Book"
    assert len(data[0]["chapters"]) == 1
    assert data[0]["chapters"][0]["title"] == "Test Chapter"
    assert len(data[0]["chapters"][0]["scenes"]) == 1
    assert data[0]["chapters"][0]["scenes"][0]["title"] == "Test Scene"

def test_map_states_logic(client: TestClient, session: Session, player_token, test_character: PlayerCharacter):
    """Test the in_progress and mastered logic in the map endpoint."""
    # Seed data: 1 Book, 1 Chapter, 2 Scenes
    book = Book(book_number=1, title="Book 1", source_file="b1.txt")
    session.add(book)
    session.commit()
    session.refresh(book)

    ch = Chapter(book_id=book.id, chapter_number=1, title="CH1", sort_order=1)
    session.add(ch)
    session.commit()
    session.refresh(ch)

    s1 = Scene(chapter_id=ch.id, scene_number=1, title="S1", sort_order=1)
    s2 = Scene(chapter_id=ch.id, scene_number=2, title="S2", sort_order=2)
    session.add(s1)
    session.add(s2)
    session.commit()

    # Case 1: Player at Scene 1, Beat 1 -> S1 is "available", S2 is "locked"
    progress = PlayerProgress(player_id=test_character.player_id, character_id=test_character.id, book_number=1, chapter_number=1, scene_number=1, beat_number=1)
    session.add(progress)
    session.commit()

    response = client.get("/api/game/map", headers={"Authorization": f"Bearer {player_token}"})
    scenes = response.json()[0]["chapters"][0]["scenes"]
    assert scenes[0]["status"] == "available"
    assert scenes[1]["status"] == "locked"

    # Case 2: Player at Scene 1, Beat 2 -> S1 is "in_progress"
    progress.beat_number = 2
    session.add(progress)
    session.commit()

    response = client.get("/api/game/map", headers={"Authorization": f"Bearer {player_token}"})
    scenes = response.json()[0]["chapters"][0]["scenes"]
    assert scenes[0]["status"] == "in_progress"

    # Case 3: Player at Scene 2, Beat 1 -> S1 is "mastered", S2 is "available"
    progress.scene_number = 2
    progress.beat_number = 1
    session.add(progress)
    session.commit()

    response = client.get("/api/game/map", headers={"Authorization": f"Bearer {player_token}"})
    scenes = response.json()[0]["chapters"][0]["scenes"]
    assert scenes[0]["status"] == "mastered"
    assert scenes[1]["status"] == "available"

def test_debug_advance_endpoint(client: TestClient, session: Session, player_token, test_character: PlayerCharacter):
    """Test the debug advance endpoint progresses the player."""
    # Ensure progress exists
    progress = PlayerProgress(player_id=test_character.player_id, character_id=test_character.id, book_number=1, chapter_number=1, scene_number=1, beat_number=1)
    session.add(progress)
    session.commit()

    # Advance once (Beat 1 -> 2)
    response = client.post("/api/game/debug/advance", headers={"Authorization": f"Bearer {player_token}"})
    assert response.status_code == 200
    assert response.json()["beat_number"] == 2

    # Advance multiple times to trigger scene change (Beat 2 -> 3 -> 4 -> 5(Scene 2, Beat 1))
    client.post("/api/game/debug/advance", headers={"Authorization": f"Bearer {player_token}"})
    client.post("/api/game/debug/advance", headers={"Authorization": f"Bearer {player_token}"})
    res = client.post("/api/game/debug/advance", headers={"Authorization": f"Bearer {player_token}"})
    
    assert res.json()["scene_number"] == 2
    assert res.json()["beat_number"] == 1

def test_get_scene_details(client: TestClient, session: Session, player_token):
    """Test fetching detailed scene info with story beats."""
    book = Book(book_number=1, title="Test Book", source_file="test.txt")
    session.add(book)
    session.commit()
    
    chapter = Chapter(book_id=book.id, chapter_number=1, title="Test Chapter", sort_order=1)
    session.add(chapter)
    session.commit()

    scene = Scene(chapter_id=chapter.id, scene_number=1, title="Test Scene", sort_order=1)
    session.add(scene)
    session.commit()
    session.refresh(scene)

    beat = StoryBeat(scene_id=scene.id, beat_number=1, raw_text="Test Beat", sort_order=1)
    session.add(beat)
    session.commit()

    response = client.get(f"/api/game/scenes/{scene.id}", headers={"Authorization": f"Bearer {player_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Scene"
    assert len(data["story_beats"]) == 1
    assert data["story_beats"][0]["raw_text"] == "Test Beat"

def test_get_artifacts(client: TestClient, session: Session, player_token, test_character: PlayerCharacter):
    """Test artifact list and ownership flagging."""
    artifact = Artifact(name="Test Core", description="Desc", lore_text="Lore", rarity="rare")
    session.add(artifact)
    session.commit()
    session.refresh(artifact)

    # Initially not unlocked
    response = client.get("/api/game/artifacts", headers={"Authorization": f"Bearer {player_token}"})
    data = response.json()
    assert any(a["name"] == "Test Core" and a["unlocked"] == False for a in data)

    # Unlock it
    unlock = PlayerCollection(character_id=test_character.id, artifact_id=artifact.id)
    session.add(unlock)
    session.commit()

    response = client.get("/api/game/artifacts", headers={"Authorization": f"Bearer {player_token}"})
    data = response.json()
    assert any(a["name"] == "Test Core" and a["unlocked"] == True for a in data)

def test_leaderboards(client: TestClient, session: Session, player_token, test_character: PlayerCharacter):
    """Test progression and essence rankings."""
    # Already has one character from conftest/previous tests
    # Add another character with higher progress
    p2 = Player(firebase_uid="p2", email="p2@ex.com")
    session.add(p2)
    session.commit()
    
    # We need a dummy class for the 2nd character
    c2 = PlayerCharacter(player_id=p2.id, class_id=test_character.class_id, character_name="TopPlayer", level=50)
    session.add(c2)
    session.commit()
    
    prog = PlayerProgress(player_id=p2.id, character_id=c2.id, book_number=2, chapter_number=1, scene_number=1)
    session.add(prog)
    session.commit()

    response = client.get("/api/game/leaderboards?type=progression", headers={"Authorization": f"Bearer {player_token}"})
    data = response.json()
    assert data[0]["name"] == "TopPlayer"
    assert "Book 2" in data[0]["value"]

def test_journal_filtering(client: TestClient, session: Session, player_token, test_character: PlayerCharacter):
    """Test that only completed scenes show in the journal."""
    book = Book(book_number=1, title="Book 1", source_file="b1.txt")
    session.add(book)
    session.commit()
    
    ch1 = Chapter(book_id=book.id, chapter_number=1, title="CH1", sort_order=1)
    session.add(ch1)
    session.commit()

    s1 = Scene(chapter_id=ch1.id, scene_number=1, title="S1", sort_order=1)
    s2 = Scene(chapter_id=ch1.id, scene_number=2, title="S2", sort_order=2)
    session.add(s1)
    session.add(s2)
    session.commit()

    # Set player progress to Scene 2 (so Scene 1 is completed)
    progress = PlayerProgress(player_id=test_character.player_id, character_id=test_character.id, book_number=1, chapter_number=1, scene_number=2)
    session.add(progress)
    session.commit()

    response = client.get("/api/game/journal", headers={"Authorization": f"Bearer {player_token}"})
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "S1"

def test_stat_definitions_endpoint(client: TestClient, session: Session, player_token):
    """Test that stat definitions are returned correctly."""
    stat = StatDefinition(name="strength", display_name="Strength", value_type="integer", category="combat")
    session.add(stat)
    session.commit()

    response = client.get("/api/game/stat-definitions", headers={"Authorization": f"Bearer {player_token}"})
    assert response.status_code == 200
    data = response.json()
    assert any(s["name"] == "strength" for s in data)


# ---------------------------------------------------------------------------
# /api/game/audit — frontend missing-asset reporting
# ---------------------------------------------------------------------------

def test_audit_missing_asset_creates_record(client: TestClient, session: Session):
    """POST /api/game/audit with missing_asset creates a dev_content_audit row."""
    from models.story_mode import DevContentAudit

    response = client.post("/api/game/audit", json={
        "audit_type": "missing_asset",
        "asset_key": "enemy_test_sprite",
        "category": "entity_sprite",
        "source": "frontend_renderer",
    })
    assert response.status_code == 204

    row = session.exec(
        select(DevContentAudit)
        .where(DevContentAudit.audit_type == "missing_asset")
        .where(DevContentAudit.entity_name == "enemy_test_sprite")
    ).first()
    assert row is not None
    assert row.missing_field == "entity_sprite"
    assert row.entity_type == "asset"


def test_audit_missing_asset_deduplicates(client: TestClient, session: Session):
    """Duplicate POST for same asset_key should not create a second row."""
    from models.story_mode import DevContentAudit

    payload = {
        "audit_type": "missing_asset",
        "asset_key": "bg_99_far",
        "category": "background",
        "source": "frontend_renderer",
    }
    client.post("/api/game/audit", json=payload)
    client.post("/api/game/audit", json=payload)

    rows = session.exec(
        select(DevContentAudit)
        .where(DevContentAudit.audit_type == "missing_asset")
        .where(DevContentAudit.entity_name == "bg_99_far")
    ).all()
    assert len(rows) == 1


def test_audit_ignores_non_missing_asset(client: TestClient, session: Session):
    """POST with audit_type != 'missing_asset' should be a no-op."""
    from models.story_mode import DevContentAudit

    response = client.post("/api/game/audit", json={
        "audit_type": "something_else",
        "asset_key": "whatever",
        "category": "entity_sprite",
    })
    assert response.status_code == 204

    row = session.exec(
        select(DevContentAudit)
        .where(DevContentAudit.entity_name == "whatever")
    ).first()
    assert row is None
