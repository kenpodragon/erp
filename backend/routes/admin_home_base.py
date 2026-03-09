"""Admin routes for Home Base: Artifact and Achievement management (2.7.4)."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select, func, text

from db import get_session
from auth import get_current_admin, get_client_ip
from models.home_base import (
    CuratedArtifact, CuratedArtifactTier, PlayerArtifact,
    Achievement, PlayerAchievement, Title, PlayerTitle,
)
from audit import write_audit_log

router = APIRouter(prefix="/api/admin", tags=["admin-home-base"])


# ---------------------------------------------------------------------------
# Pydantic Bodies
# ---------------------------------------------------------------------------

class ArtifactCreate(BaseModel):
    name: str
    description: str
    lore_text: Optional[str] = None
    icon_sprite_key: str = "artifact_default"
    source_type: str = "boss"
    source_id: Optional[int] = None
    source_hint: str = ""
    base_drop_chance: float = 0.01
    synergy_set_id: Optional[int] = None
    is_active: bool = True


class ArtifactUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lore_text: Optional[str] = None
    icon_sprite_key: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    source_hint: Optional[str] = None
    base_drop_chance: Optional[float] = None
    synergy_set_id: Optional[int] = None
    is_active: Optional[bool] = None


class ArtifactTierBody(BaseModel):
    rarity: str
    stat_bonuses: Optional[Any] = None
    unique_effect_text: Optional[str] = None
    drop_chance_multiplier: float = 1.0


class ArtifactBulkAssign(BaseModel):
    artifact_ids: list[int]
    source_type: str
    source_id: int


class AchievementCreate(BaseModel):
    name: str
    description: str
    category: str
    icon_sprite_key: str = "achievement_default"
    tracking_type: str = "cumulative"
    tracking_source: str = ""
    threshold_value: float = 1
    parent_achievement_id: Optional[int] = None
    reward_shards: int = 0
    reward_essence: int = 0
    reward_title_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True


class AchievementUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon_sprite_key: Optional[str] = None
    tracking_type: Optional[str] = None
    tracking_source: Optional[str] = None
    threshold_value: Optional[float] = None
    parent_achievement_id: Optional[int] = None
    reward_shards: Optional[int] = None
    reward_essence: Optional[int] = None
    reward_title_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class PlayerAchievementOverride(BaseModel):
    player_id: int
    achievement_id: int
    action: str  # "grant" or "revoke"


# ---------------------------------------------------------------------------
# Artifact CRUD
# ---------------------------------------------------------------------------

@router.get("/artifacts")
async def list_artifacts(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all curated artifacts with tier counts and drop stats."""
    artifacts = session.exec(
        select(CuratedArtifact).order_by(CuratedArtifact.id)
    ).all()

    results = []
    for art in artifacts:
        tier_count = session.exec(
            select(func.count()).select_from(CuratedArtifactTier).where(
                CuratedArtifactTier.curated_artifact_id == art.id
            )
        ).one()
        owner_count = session.exec(
            select(func.count()).select_from(PlayerArtifact).where(
                PlayerArtifact.curated_artifact_id == art.id
            )
        ).one()

        results.append({
            "id": art.id,
            "name": art.name,
            "description": art.description,
            "icon_sprite_key": art.icon_sprite_key,
            "source_type": art.source_type,
            "source_id": art.source_id,
            "source_hint": art.source_hint,
            "base_drop_chance": float(art.base_drop_chance),
            "is_active": art.is_active,
            "tier_count": tier_count,
            "owner_count": owner_count,
        })

    return results


@router.get("/artifacts/{artifact_id}")
async def get_artifact(
    artifact_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get single curated artifact with tiers and ownership data."""
    art = session.get(CuratedArtifact, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")

    tiers = session.exec(
        select(CuratedArtifactTier).where(
            CuratedArtifactTier.curated_artifact_id == artifact_id
        ).order_by(CuratedArtifactTier.rarity)
    ).all()

    owner_count = session.exec(
        select(func.count()).select_from(PlayerArtifact).where(
            PlayerArtifact.curated_artifact_id == artifact_id
        )
    ).one()

    return {
        "id": art.id,
        "name": art.name,
        "description": art.description,
        "lore_text": art.lore_text,
        "icon_sprite_key": art.icon_sprite_key,
        "source_type": art.source_type,
        "source_id": art.source_id,
        "source_hint": art.source_hint,
        "base_drop_chance": float(art.base_drop_chance),
        "synergy_set_id": art.synergy_set_id,
        "is_active": art.is_active,
        "tiers": [
            {
                "id": t.id,
                "rarity": t.rarity,
                "stat_bonuses": t.stat_bonuses,
                "unique_effect_text": t.unique_effect_text,
                "drop_chance_multiplier": float(t.drop_chance_multiplier),
            }
            for t in tiers
        ],
        "owner_count": owner_count,
    }


@router.post("/artifacts", status_code=201)
async def create_artifact(
    body: ArtifactCreate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new curated artifact."""
    existing = session.exec(
        select(CuratedArtifact).where(CuratedArtifact.name == body.name)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Artifact '{body.name}' already exists")

    now = datetime.now(timezone.utc)
    art = CuratedArtifact(
        name=body.name,
        description=body.description,
        lore_text=body.lore_text,
        icon_sprite_key=body.icon_sprite_key,
        source_type=body.source_type,
        source_id=body.source_id,
        source_hint=body.source_hint,
        base_drop_chance=Decimal(str(body.base_drop_chance)),
        synergy_set_id=body.synergy_set_id,
        is_active=body.is_active,
        created_at=now,
        updated_at=now,
    )
    session.add(art)
    session.commit()
    session.refresh(art)

    write_audit_log(
        session, admin["email"], "create_artifact", "curated_artifact",
        str(art.id), {"name": art.name, "source_type": art.source_type},
        get_client_ip(request),
    )

    return {"id": art.id, "name": art.name}


@router.put("/artifacts/{artifact_id}")
async def update_artifact(
    artifact_id: int,
    body: ArtifactUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a curated artifact."""
    art = session.get(CuratedArtifact, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "base_drop_chance" and value is not None:
            value = Decimal(str(value))
        setattr(art, field, value)
        changes[field] = str(value) if isinstance(value, Decimal) else value

    art.updated_at = datetime.now(timezone.utc)
    session.add(art)
    session.commit()

    write_audit_log(
        session, admin["email"], "update_artifact", "curated_artifact",
        str(art.id), changes, get_client_ip(request),
    )

    return {"id": art.id, "name": art.name, "updated_fields": list(changes.keys())}


@router.delete("/artifacts/{artifact_id}")
async def delete_artifact(
    artifact_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a curated artifact (soft-delete by setting is_active=False)."""
    art = session.get(CuratedArtifact, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")

    art.is_active = False
    art.updated_at = datetime.now(timezone.utc)
    session.add(art)
    session.commit()

    write_audit_log(
        session, admin["email"], "delete_artifact", "curated_artifact",
        str(art.id), {"name": art.name, "soft_delete": True},
        get_client_ip(request),
    )

    return {"id": art.id, "deactivated": True}


# ---------------------------------------------------------------------------
# Artifact Tiers
# ---------------------------------------------------------------------------

@router.put("/artifacts/{artifact_id}/tiers")
async def update_artifact_tiers(
    artifact_id: int,
    tiers: list[ArtifactTierBody],
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Replace all tiers for a curated artifact."""
    art = session.get(CuratedArtifact, artifact_id)
    if not art:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Delete existing tiers
    existing = session.exec(
        select(CuratedArtifactTier).where(
            CuratedArtifactTier.curated_artifact_id == artifact_id
        )
    ).all()
    for t in existing:
        session.delete(t)

    # Create new tiers
    for tier_body in tiers:
        tier = CuratedArtifactTier(
            curated_artifact_id=artifact_id,
            rarity=tier_body.rarity,
            stat_bonuses=tier_body.stat_bonuses,
            unique_effect_text=tier_body.unique_effect_text,
            drop_chance_multiplier=Decimal(str(tier_body.drop_chance_multiplier)),
        )
        session.add(tier)

    session.commit()

    write_audit_log(
        session, admin["email"], "update_artifact_tiers", "curated_artifact",
        str(art.id), {"tier_count": len(tiers), "rarities": [t.rarity for t in tiers]},
        get_client_ip(request),
    )

    return {"artifact_id": artifact_id, "tier_count": len(tiers)}


# ---------------------------------------------------------------------------
# Artifact Bulk Assignment
# ---------------------------------------------------------------------------

@router.post("/artifacts/bulk-assign")
async def bulk_assign_artifacts(
    body: ArtifactBulkAssign,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Bulk-assign source_type and source_id to multiple artifacts."""
    updated = 0
    for art_id in body.artifact_ids:
        art = session.get(CuratedArtifact, art_id)
        if art:
            art.source_type = body.source_type
            art.source_id = body.source_id
            art.updated_at = datetime.now(timezone.utc)
            session.add(art)
            updated += 1

    session.commit()

    write_audit_log(
        session, admin["email"], "bulk_assign_artifacts", "curated_artifact",
        ",".join(str(i) for i in body.artifact_ids),
        {"source_type": body.source_type, "source_id": body.source_id, "count": updated},
        get_client_ip(request),
    )

    return {"updated": updated}


# ---------------------------------------------------------------------------
# Achievement CRUD
# ---------------------------------------------------------------------------

@router.get("/achievements")
async def list_achievements(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all achievements with completion stats."""
    achievements = session.exec(
        select(Achievement).order_by(Achievement.category, Achievement.sort_order)
    ).all()

    results = []
    for ach in achievements:
        completed_count = session.exec(
            select(func.count()).select_from(PlayerAchievement).where(
                PlayerAchievement.achievement_id == ach.id,
                PlayerAchievement.is_completed == True,
            )
        ).one()
        total_tracked = session.exec(
            select(func.count()).select_from(PlayerAchievement).where(
                PlayerAchievement.achievement_id == ach.id,
            )
        ).one()

        results.append({
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "category": ach.category,
            "tracking_type": ach.tracking_type,
            "tracking_source": ach.tracking_source,
            "threshold_value": float(ach.threshold_value),
            "parent_achievement_id": ach.parent_achievement_id,
            "reward_shards": ach.reward_shards,
            "reward_essence": ach.reward_essence,
            "reward_title_id": ach.reward_title_id,
            "sort_order": ach.sort_order,
            "is_active": ach.is_active,
            "completed_count": completed_count,
            "total_tracked": total_tracked,
        })

    return results


@router.get("/achievements/{achievement_id}")
async def get_achievement(
    achievement_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get single achievement with full details and analytics."""
    ach = session.get(Achievement, achievement_id)
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    completed_count = session.exec(
        select(func.count()).select_from(PlayerAchievement).where(
            PlayerAchievement.achievement_id == achievement_id,
            PlayerAchievement.is_completed == True,
        )
    ).one()
    in_progress_count = session.exec(
        select(func.count()).select_from(PlayerAchievement).where(
            PlayerAchievement.achievement_id == achievement_id,
            PlayerAchievement.is_completed == False,
        )
    ).one()

    # Get child achievements
    children = session.exec(
        select(Achievement).where(
            Achievement.parent_achievement_id == achievement_id
        ).order_by(Achievement.sort_order)
    ).all()

    # Get linked title
    title_name = None
    if ach.reward_title_id:
        title = session.get(Title, ach.reward_title_id)
        if title:
            title_name = title.name

    return {
        "id": ach.id,
        "name": ach.name,
        "description": ach.description,
        "category": ach.category,
        "icon_sprite_key": ach.icon_sprite_key,
        "tracking_type": ach.tracking_type,
        "tracking_source": ach.tracking_source,
        "threshold_value": float(ach.threshold_value),
        "parent_achievement_id": ach.parent_achievement_id,
        "reward_shards": ach.reward_shards,
        "reward_essence": ach.reward_essence,
        "reward_title_id": ach.reward_title_id,
        "reward_title_name": title_name,
        "sort_order": ach.sort_order,
        "is_active": ach.is_active,
        "completed_count": completed_count,
        "in_progress_count": in_progress_count,
        "children": [
            {"id": c.id, "name": c.name, "threshold_value": float(c.threshold_value)}
            for c in children
        ],
    }


@router.post("/achievements", status_code=201)
async def create_achievement(
    body: AchievementCreate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new achievement."""
    existing = session.exec(
        select(Achievement).where(Achievement.name == body.name)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Achievement '{body.name}' already exists")

    if body.parent_achievement_id:
        parent = session.get(Achievement, body.parent_achievement_id)
        if not parent:
            raise HTTPException(status_code=400, detail="Parent achievement not found")

    now = datetime.now(timezone.utc)
    ach = Achievement(
        name=body.name,
        description=body.description,
        category=body.category,
        icon_sprite_key=body.icon_sprite_key,
        tracking_type=body.tracking_type,
        tracking_source=body.tracking_source,
        threshold_value=Decimal(str(body.threshold_value)),
        parent_achievement_id=body.parent_achievement_id,
        reward_shards=body.reward_shards,
        reward_essence=body.reward_essence,
        reward_title_id=body.reward_title_id,
        sort_order=body.sort_order,
        is_active=body.is_active,
        created_at=now,
        updated_at=now,
    )
    session.add(ach)
    session.commit()
    session.refresh(ach)

    write_audit_log(
        session, admin["email"], "create_achievement", "achievement",
        str(ach.id), {"name": ach.name, "category": ach.category},
        get_client_ip(request),
    )

    return {"id": ach.id, "name": ach.name}


@router.put("/achievements/{achievement_id}")
async def update_achievement(
    achievement_id: int,
    body: AchievementUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update an achievement."""
    ach = session.get(Achievement, achievement_id)
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "threshold_value" and value is not None:
            value = Decimal(str(value))
        setattr(ach, field, value)
        changes[field] = str(value) if isinstance(value, Decimal) else value

    ach.updated_at = datetime.now(timezone.utc)
    session.add(ach)
    session.commit()

    write_audit_log(
        session, admin["email"], "update_achievement", "achievement",
        str(ach.id), changes, get_client_ip(request),
    )

    return {"id": ach.id, "name": ach.name, "updated_fields": list(changes.keys())}


@router.delete("/achievements/{achievement_id}")
async def delete_achievement(
    achievement_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Soft-delete an achievement by setting is_active=False."""
    ach = session.get(Achievement, achievement_id)
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    ach.is_active = False
    ach.updated_at = datetime.now(timezone.utc)
    session.add(ach)
    session.commit()

    write_audit_log(
        session, admin["email"], "delete_achievement", "achievement",
        str(ach.id), {"name": ach.name, "soft_delete": True},
        get_client_ip(request),
    )

    return {"id": ach.id, "deactivated": True}


# ---------------------------------------------------------------------------
# Player Achievement Override
# ---------------------------------------------------------------------------

@router.post("/achievements/player-override")
async def player_achievement_override(
    body: PlayerAchievementOverride,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Grant or revoke an achievement for a specific player."""
    ach = session.get(Achievement, body.achievement_id)
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    existing = session.exec(
        select(PlayerAchievement).where(
            PlayerAchievement.player_id == body.player_id,
            PlayerAchievement.achievement_id == body.achievement_id,
        )
    ).first()

    if body.action == "grant":
        if existing and existing.is_completed:
            raise HTTPException(status_code=409, detail="Player already has this achievement")

        now = datetime.now(timezone.utc)
        if existing:
            existing.is_completed = True
            existing.progress_value = ach.threshold_value
            existing.earned_at = now
            existing.is_new = True
            session.add(existing)
        else:
            pa = PlayerAchievement(
                player_id=body.player_id,
                achievement_id=body.achievement_id,
                progress_value=ach.threshold_value,
                is_completed=True,
                is_new=True,
                earned_at=now,
            )
            session.add(pa)

    elif body.action == "revoke":
        if not existing or not existing.is_completed:
            raise HTTPException(status_code=404, detail="Player does not have this achievement")

        existing.is_completed = False
        existing.progress_value = Decimal("0")
        existing.earned_at = None
        existing.is_new = False
        session.add(existing)

    else:
        raise HTTPException(status_code=400, detail="action must be 'grant' or 'revoke'")

    session.commit()

    write_audit_log(
        session, admin["email"], f"{body.action}_achievement", "player_achievement",
        f"{body.player_id}:{body.achievement_id}",
        {"player_id": body.player_id, "achievement": ach.name, "action": body.action},
        get_client_ip(request),
    )

    return {"player_id": body.player_id, "achievement_id": body.achievement_id, "action": body.action}


# ---------------------------------------------------------------------------
# Achievement Analytics
# ---------------------------------------------------------------------------

@router.get("/achievements/analytics")
async def achievement_analytics(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get achievement completion analytics across all players."""
    total_achievements = session.exec(
        select(func.count()).select_from(Achievement).where(Achievement.is_active == True)
    ).one()

    total_completions = session.exec(
        select(func.count()).select_from(PlayerAchievement).where(
            PlayerAchievement.is_completed == True
        )
    ).one()

    # Category breakdown
    categories = session.exec(
        select(
            Achievement.category,
            func.count(Achievement.id),
        ).where(Achievement.is_active == True).group_by(Achievement.category)
    ).all()

    category_stats = {}
    for cat, count in categories:
        completed = session.exec(
            select(func.count()).select_from(PlayerAchievement).join(
                Achievement, PlayerAchievement.achievement_id == Achievement.id
            ).where(
                Achievement.category == cat,
                PlayerAchievement.is_completed == True,
            )
        ).one()
        category_stats[cat] = {"total": count, "total_completions": completed}

    # Most/least completed
    most_completed = session.exec(
        select(
            Achievement.id, Achievement.name,
            func.count(PlayerAchievement.id).label("completions"),
        ).join(
            PlayerAchievement, PlayerAchievement.achievement_id == Achievement.id
        ).where(
            PlayerAchievement.is_completed == True
        ).group_by(Achievement.id, Achievement.name)
        .order_by(func.count(PlayerAchievement.id).desc())
        .limit(5)
    ).all()

    return {
        "total_achievements": total_achievements,
        "total_completions": total_completions,
        "category_stats": category_stats,
        "most_completed": [
            {"id": row[0], "name": row[1], "completions": row[2]}
            for row in most_completed
        ],
    }
