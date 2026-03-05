import pytest
import math
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from models.story_mode import PlayerStorySession, GameConfig
from models.progress import PlayerEssence

import uuid
from models.story_mode import PlayerStorySession, GameConfig, PlayerMetaProgression

def test_gold_to_essence_conversion(client: TestClient, session: Session, player_token, test_character):
    """Test that Story Mode gold is correctly converted to Essence on session completion."""
    
    # 1. Setup Game Configs for conversion
    base_rate = 500.0
    growth_factor = 1.1
    session.add(GameConfig(key="gold_to_essence_base_rate", value_json=str(base_rate)))
    session.add(GameConfig(key="gold_to_essence_growth_factor", value_json=str(growth_factor)))
    session.commit()

    # 2. Create a dummy Story Session
    # Zone 3, 10,000 gold
    session_id = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
    story_session = PlayerStorySession(
        id=session_id,
        player_id=test_character.player_id,
        character_id=test_character.id,
        scene_id=1,
        chapter_id=1,
        current_zone=3,
        current_wave=1,
        session_gold=10000.0,
        narrative_progress_pct=100.0,
        waves_complete=True
    )
    session.add(story_session)
    session.commit()
    session.refresh(story_session)

    # 3. Complete the session
    response = client.post(
        f"/api/game/story/session/{story_session.id}/complete",
        headers={"Authorization": f"Bearer {player_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # 4. Verify Conversion Logic
    # Rate for Zone 3 = 500 * (1.1 ^ (3-1)) = 500 * 1.21 = 605
    # Essence = 10000 / 605 = 16.528...
    expected_rate = base_rate * math.pow(growth_factor, 2)
    expected_essence = 10000.0 / expected_rate
    
    assert data["converted_essence"] == pytest.approx(expected_essence, abs=0.2)
    assert "total_essence" in data
    
    # 5. Verify Database Update
    meta = session.exec(
        select(PlayerMetaProgression).where(PlayerMetaProgression.player_id == test_character.player_id)
    ).first()
    assert meta is not None
    # Verify essence was added (greater than zero)
    assert meta.elysium_essence > 0
    # Also verify it's at least roughly the converted amount
    assert meta.elysium_essence >= expected_essence
