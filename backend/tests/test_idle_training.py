import pytest
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from models import Skill, SkillAction, CharacterSkillLevel, PlayerEssence, PlayerMetaProgression, GameConfig, PlayerCharacter

def test_get_training_status_creates_rows(client, player_token, test_character, session: Session):
    # Setup skills
    skill = Skill(name="Attack", category="combat", idle_flavor_title="Combat Protocol")
    session.add(skill)
    session.commit()

    response = client.get("/api/game/training/status")
    assert response.status_code == 200
    data = response.json()
    assert len(data["skills"]) == 1
    assert data["skills"][0]["skill_name"] == "Attack"
    assert data["skills"][0]["level"] == 1

    # Verify CharacterSkillLevel was created in DB
    char_skill = session.exec(select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == test_character.id)).first()
    assert char_skill is not None
    assert char_skill.skill_id == skill.id

def test_start_stop_training(client, player_token, test_character, session: Session):
    skill = Skill(name="Attack", category="combat", idle_flavor_title="Combat Protocol")
    session.add(skill)
    session.commit()
    
    action = SkillAction(skill_id=skill.id, name="punch", display_name="Punching", lore_description="P")
    session.add(action)
    session.commit()

    # Start
    resp = client.post("/api/game/training/start", json={"skill_id": skill.id, "action_id": action.id})
    assert resp.status_code == 200
    
    char_skill = session.exec(select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == test_character.id)).first()
    assert char_skill.is_active_training is True
    assert char_skill.active_action_id == action.id

    # Stop
    resp = client.post("/api/game/training/stop")
    assert resp.status_code == 200
    session.refresh(char_skill)
    assert char_skill.is_active_training is False

def test_offline_calculation(client, player_token, test_character, session: Session):
    skill = Skill(name="Attack", category="combat", idle_flavor_title="Combat Protocol")
    session.add(skill)
    session.commit()
    
    action = SkillAction(skill_id=skill.id, name="punch", display_name="Punching", lore_description="P", 
                         interval_ms=1000, xp_per_action=10)
    session.add(action)
    session.commit()
    
    # Start training and simulate time passing by manually updating last_offline_calc_at
    char_skill = CharacterSkillLevel(
        character_id=test_character.id, 
        skill_id=skill.id, 
        is_active_training=True,
        active_action_id=action.id,
        last_offline_calc_at=datetime.now(timezone.utc) - timedelta(hours=1)
    )
    session.add(char_skill)
    
    # Also need essence to avoid low rate (character-specific)
    essence = PlayerEssence(player_id=test_character.player_id, character_id=test_character.id, current_balance=10000)
    session.add(essence)
    session.commit()

    # Get report (triggers calculation)
    resp = client.get("/api/game/training/offline-report")
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_report"] is True
    
    # 1 hour = 3600 seconds. Interval 1s = 3600 actions. 3600 * 10 XP = 36000 XP.
    # At 100% essence (10000/1000), rate is 1.0.
    assert data["report"]["actions_completed"] == 3600
    assert data["report"]["xp_earned"] == 36000
    
    # Check level gain
    assert data["report"]["new_level"] > 1

def test_magic_gate_enforcement(client, player_token, test_character, session: Session):
    # Setup Magic skill and Clickstorm skill
    magic = Skill(name="Magic", category="combat")
    cs = Skill(name="Clickstorm", category="hotbar")
    session.add_all([magic, cs])
    session.commit() # Need IDs
    
    # Character has Magic level 1
    char_magic = CharacterSkillLevel(character_id=test_character.id, skill_id=magic.id, level=1)
    session.add(char_magic)
    session.commit()

    # Try to buy Clickstorm (requires level 5)
    # Mocking config for costs
    session.add(GameConfig(key="base_skill_unlock_cost", value_json="50"))
    session.add(GameConfig(key="upgrade_cost_scaling", value_json="1.07"))
    
    # Give some gold
    from models import PlayerStorySession
    import uuid
    story_session = PlayerStorySession(id=uuid.uuid4(), player_id=test_character.player_id, scene_id=1, session_gold=1000, is_active=True)
    session.add(story_session)
    session.commit()

    # Attempt upgrade
    resp = client.post(f"/api/game/story/session/{story_session.id}/upgrade", json={
        "upgrade_type": "skill_unlock",
        "target_id": cs.id,
        "quantity": 1
    })
    
    assert resp.status_code == 403
    assert "Magic level 5 required" in resp.json()["detail"]

    # Level up magic and try again
    char_magic.level = 5
    session.add(char_magic)
    session.commit()

    resp = client.post(f"/api/game/story/session/{story_session.id}/upgrade", json={
        "upgrade_type": "skill_unlock",
        "target_id": cs.id,
        "quantity": 1
    })
    assert resp.status_code == 200

def test_essence_drain_and_rate(client, player_token, test_character, session: Session):
    skill = Skill(name="Attack", category="combat", idle_flavor_title="Combat Protocol")
    session.add(skill)
    session.commit()
    
    action = SkillAction(skill_id=skill.id, name="punch", display_name="P", lore_description="P", interval_ms=1000, xp_per_action=100)
    session.add(action)
    session.commit()
    
    # Low essence (1%) - Character-specific balance
    # Default cap 1000. Balance 10 = 1%.
    essence = PlayerEssence(player_id=test_character.player_id, character_id=test_character.id, current_balance=10)
    session.add(essence)
    
    char_skill = CharacterSkillLevel(
        character_id=test_character.id, 
        skill_id=skill.id, 
        is_active_training=True,
        active_action_id=action.id,
        last_offline_calc_at=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    session.add(char_skill)
    session.commit()

    resp = client.get("/api/game/training/offline-report")
    assert resp.status_code == 200
    data = resp.json()["report"]
    
    # 10 mins = 600 ticks. 600 * 100 XP = 60,000 base XP.
    # At 1% essence (10/1000), rate is 0.25.
    # 60,000 * 0.25 = 15,000 XP.
    assert data["xp_earned"] == 15000
    assert data["essence_consumed"] == 10 # 1 per min
    assert data["remaining_essence"] == 0
