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
