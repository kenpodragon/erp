
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from datetime import datetime, timezone

from models import (
    Book, Chapter, Scene, Entity, EntitySceneAppearance, Player
)
from models.classification import EntityType
from db import get_session
from auth import get_current_player

def test_get_enemies_pool(client: TestClient, session: Session, test_player: Player):
    # Setup Auth Mock for this specific test
    def get_current_player_override():
        return {"player": test_player}
    from main import app
    app.dependency_overrides[get_current_player] = get_current_player_override

    # Setup Book/Chapter/Scenes
    book = Book(book_number=1, title="Book 1", source_file="b1.docx")
    session.add(book)
    session.commit()
    
    ch1 = Chapter(book_id=book.id, chapter_number=1, title="Ch 1", sort_order=1)
    session.add(ch1)
    session.commit()
    
    sc1 = Scene(chapter_id=ch1.id, scene_number=1, title="Sc 1", sort_order=1)
    sc2 = Scene(chapter_id=ch1.id, scene_number=2, title="Sc 2", sort_order=2)
    session.add(sc1)
    session.add(sc2)
    session.commit()
    
    # Setup Entity Type
    et = EntityType(name="enemy", display_name="Enemy")
    session.add(et)
    session.commit()
    session.refresh(et)

    # Setup Entities
    # Entity 1: Introduced in Scene 1
    e1 = Entity(canonical_name="Enemy 1", entity_type_id=et.id, first_appearance_scene_id=sc1.id)
    # Entity 2: Introduced in Scene 2
    e2 = Entity(canonical_name="Enemy 2", entity_type_id=et.id, first_appearance_scene_id=sc2.id)
    # Entity 3: Boss in Scene 1
    e3 = Entity(canonical_name="Boss 1", entity_type_id=et.id, first_appearance_scene_id=sc1.id)
    
    session.add(e1)
    session.add(e2)
    session.add(e3)
    session.commit()
    
    # Setup Appearances
    ea1 = EntitySceneAppearance(entity_id=e1.id, scene_id=sc1.id, role="enemy")
    ea2 = EntitySceneAppearance(entity_id=e2.id, scene_id=sc2.id, role="enemy")
    ea3 = EntitySceneAppearance(entity_id=e3.id, scene_id=sc1.id, role="boss")
    
    session.add(ea1)
    session.add(ea2)
    session.add(ea3)
    session.commit()
    
    # 1. Test Scene 1 enemies
    # Should only include Enemy 1 (Boss 1 is excluded)
    resp = client.get(f"/api/game/story/scenes/{sc1.id}/enemies")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["enemies"]) == 10
    names = [e["canonical_name"] for e in data["enemies"]]
    assert all(name == "Enemy 1" for name in names)
    
    # 2. Test Scene 2 enemies
    # Should include Enemy 1 AND Enemy 2
    resp = client.get(f"/api/game/story/scenes/{sc2.id}/enemies")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["enemies"]) == 10
    names = set(e["canonical_name"] for e in data["enemies"])
    assert "Enemy 1" in names
    assert "Enemy 2" in names
    assert "Boss 1" not in names

    app.dependency_overrides.pop(get_current_player, None)
