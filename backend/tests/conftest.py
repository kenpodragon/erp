import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool
from main import app
from db import get_session
from auth import get_current_player, get_current_admin
# Explicitly import ALL models to ensure they are registered with SQLModel.metadata
from models import (
    Player, PlayerSettings, CharacterClass, PlayerCharacter,
    PlayerProgress, PlayerEssence, SupportTicket, SupportReply,
    ServerConfig, AdminAuditLog, ActivityEvent,
    AdminWhitelistEmail, AdminWhitelistIP, Book, Chapter, Scene, StoryBeat,
    Artifact, PlayerCollection, Skill, SkillAction, StatDefinition, BenefitEffectData, Location,
    Entity, EntityGameplayData, SceneGameplayData, GameConfig, CharacterSkillLevel, PlayerMetaProgression,
    IdleSkillStatContribution, ClassStatAffinity, CharacterStat, PlayerSceneRecord, SkillPrerequisite,
    GearSlot, ItemPrefix, ItemQuality, ItemLoreTag, ItemTypeBase, ItemSuffix,
    Atmosphere, AudioConfig,
)
from datetime import datetime, timezone

@pytest.fixture(name="session")
def session_fixture():
    # In-memory SQLite: no files created, no cleanup required, perfectly isolated per test.
    # StaticPool ensures all connections within the same engine share the same in-memory DB.
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
def test_player(session: Session):
    player = Player(
        firebase_uid="test_uid_123",
        email="test@example.com",
        alias="TestPlayer",
        created_at=datetime.now(timezone.utc),
        last_login_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    session.add(player)
    session.commit()
    session.refresh(player)
    return player

@pytest.fixture
def test_character_class(session: Session):
    char_class = CharacterClass(
        name="TestClass",
        base_strength=10,
        base_agility=10,
        base_intelligence=10,
        is_available=True
    )
    session.add(char_class)
    session.commit()
    session.refresh(char_class)
    return char_class

@pytest.fixture
def test_character(session: Session, test_player: Player, test_character_class: CharacterClass):
    char = PlayerCharacter(
        player_id=test_player.id,
        class_id=test_character_class.id,
        character_name="TestChar",
        level=1,
        strength=10,
        agility=10,
        intelligence=10,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    session.add(char)
    session.commit()
    session.refresh(char)
    return char

@pytest.fixture
def admin_client(session: Session):
    """Client with admin auth mocked."""
    def get_session_override():
        return session
    
    def get_current_admin_override():
        return {"uid": "admin_uid", "email": "admin@example.com", "name": "Admin User"}

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_admin] = get_current_admin_override
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def player_token(test_player: Player):
    """Mock standard player auth."""
    def get_current_player_override():
        return {"uid": test_player.firebase_uid, "email": test_player.email, "player": test_player}

    app.dependency_overrides[get_current_player] = get_current_player_override
    yield "mock_token"
    app.dependency_overrides.pop(get_current_player, None)
