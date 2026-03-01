import pytest
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from fastapi.testclient import TestClient

from main import app
from db import get_session
from models import Player, PlayerCharacter, CharacterClass, AdminAuditLog

def test_admin_list_players(admin_client, test_player, test_character):
    """Test paginated player list for admins."""
    response = admin_client.get("/api/admin/players")
    assert response.status_code == 200
    data = response.json()
    
    assert "players" in data
    assert "summary" in data
    assert data["total"] >= 1
    
    # Check if our test player is in the list
    player_ids = [p["id"] for p in data["players"]]
    assert test_player.id in player_ids
    
    # Check character count enrichment
    tp_in_list = next(p for p in data["players"] if p["id"] == test_player.id)
    assert tp_in_list["character_count"] == 1

def test_admin_get_player_detail(admin_client, test_player, test_character):
    """Test fetching full player detail."""
    response = admin_client.get(f"/api/admin/players/{test_player.id}")
    assert response.status_code == 200
    data = response.json()
    
    assert data["player"]["id"] == test_player.id
    assert len(data["characters"]) == 1
    assert data["characters"][0]["character_name"] == test_character.character_name

def test_admin_ban_unban_player(admin_client, test_player, session):
    """Test banning and unbanning a player with audit logging."""
    # 1. Ban
    ban_reason = "Test ban for violation of terms."
    response = admin_client.post(
        f"/api/admin/players/{test_player.id}/ban",
        json={"reason": ban_reason}
    )
    assert response.status_code == 200
    assert response.json()["is_banned"] is True
    assert response.json()["ban_reason"] == ban_reason
    
    # Check audit log
    audit = session.exec(select(AdminAuditLog).where(AdminAuditLog.action == "player_banned")).first()
    assert audit is not None
    assert audit.target_id == str(test_player.id)
    assert audit.details["reason"] == ban_reason

    # 2. Unban
    response = admin_client.post(f"/api/admin/players/{test_player.id}/unban")
    assert response.status_code == 200
    assert response.json()["is_banned"] is False
    assert response.json()["ban_reason"] is None
    
    # Check audit log
    audit_unban = session.exec(select(AdminAuditLog).where(AdminAuditLog.action == "player_unbanned")).first()
    assert audit_unban is not None

def test_admin_force_logout(admin_client, test_player, session):
    """Test forcing a logout by invalidating sessions."""
    response = admin_client.post(f"/api/admin/players/{test_player.id}/logout")
    assert response.status_code == 200
    
    session.refresh(test_player)
    assert test_player.sessions_invalid_before is not None
    
    # Check audit log
    audit = session.exec(select(AdminAuditLog).where(AdminAuditLog.action == "player_force_logout")).first()
    assert audit is not None

def test_admin_update_player(admin_client, test_player, session):
    """Test administrative update of player fields."""
    new_alias = "AdminEditedAlias"
    response = admin_client.patch(
        f"/api/admin/players/{test_player.id}",
        json={"alias": new_alias}
    )
    assert response.status_code == 200
    assert response.json()["alias"] == new_alias
    
    # Check audit log
    audit = session.exec(select(AdminAuditLog).where(AdminAuditLog.action == "player_edited")).first()
    assert audit is not None
    assert audit.details["alias"]["new"] == new_alias
