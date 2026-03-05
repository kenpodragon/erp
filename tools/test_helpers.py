import sys
import os
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, create_engine, select

# Add backend to path for models
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from models import CharacterSkillLevel, PlayerCharacter, Skill, SkillAction, GameConfig

# Use the same DB logic as backend
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///erp_test.db")
engine = create_engine(DATABASE_URL)

def seed_basics():
    with Session(engine) as session:
        # Seed Skills
        attack = session.exec(select(Skill).where(Skill.name == 'Attack')).first()
        if not attack:
            attack = Skill(name='Attack', category='combat', idle_flavor_title='COMBAT PROTOCOL')
            session.add(attack)
            session.commit()
            session.refresh(attack)
            
            a1 = SkillAction(
                skill_id=attack.id, 
                name='shadowboxing_garage', 
                display_name='Shadowboxing in the Garage', 
                lore_description='Training alone.', 
                level_required=1, 
                interval_ms=3000, 
                xp_per_action=10
            )
            a2 = SkillAction(
                skill_id=attack.id, 
                name='scorp_security_drills', 
                display_name='S Corp Security Drills', 
                lore_description='Corporate routines.', 
                level_required=10, 
                interval_ms=4000, 
                xp_per_action=18
            )
            session.add_all([a1, a2])

        magic = session.exec(select(Skill).where(Skill.name == 'Magic')).first()
        if not magic:
            magic = Skill(name='Magic', category='combat', idle_flavor_title='DREAMWALKING', unlock_scene_id=714)
            session.add(magic)
        
        # Ensure GameConfigs exist
        configs = {
            'idle_offline_cap_hours': '24',
            'idle_essence_drain_per_minute': '1',
            'idle_essence_xp_full_threshold': '0.75'
        }
        for k, v in configs.items():
            if not session.exec(select(GameConfig).where(GameConfig.key == k)).first():
                session.add(GameConfig(key=k, value_json=v))

        session.commit()
        print("Basic seeds complete")

def backdate_training(hours=8):
    with Session(engine) as session:
        char = session.exec(select(PlayerCharacter)).first()
        if not char:
            print("No character found")
            return
        
        char_skill = session.exec(
            select(CharacterSkillLevel)
            .where(CharacterSkillLevel.character_id == char.id)
            .where(CharacterSkillLevel.is_active_training == True)
        ).first()
        
        if not char_skill:
            print("No active training found to backdate")
            return

        backdate_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        char_skill.last_offline_calc_at = backdate_time
        session.add(char_skill)
        session.commit()
        print(f"Backdated training for char {char.id} to {backdate_time}")

def set_xp(skill_name, level, xp):
    with Session(engine) as session:
        char = session.exec(select(PlayerCharacter)).first()
        if not char:
            print("No character found")
            return
        
        skill = session.exec(select(Skill).where(Skill.name == skill_name)).first()
        if not skill:
            print(f"Skill {skill_name} not found")
            return

        char_skill = session.exec(
            select(CharacterSkillLevel)
            .where(CharacterSkillLevel.character_id == char.id)
            .where(CharacterSkillLevel.skill_id == skill.id)
        ).first()

        if not char_skill:
            char_skill = CharacterSkillLevel(character_id=char.id, skill_id=skill.id)

        char_skill.level = level
        char_skill.current_xp = xp
        session.add(char_skill)
        session.commit()
        print(f"Set {skill_name} to level {level} with {xp} XP for char {char.id}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        action = sys.argv[1]
        if action == "seed":
            seed_basics()
        elif action == "backdate":
            hours = int(sys.argv[2]) if len(sys.argv) > 2 else 8
            backdate_training(hours)
        elif action == "set_xp":
            skill_name = sys.argv[2]
            level = int(sys.argv[3])
            xp = int(sys.argv[4])
            set_xp(skill_name, level, xp)
