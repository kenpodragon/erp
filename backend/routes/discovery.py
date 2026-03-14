"""
Discovery & Registry endpoints — entity bestiary, skill/item library,
completion stats, batch unlocks, and new-badge clearing.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func, col

from db import get_session
from auth import get_current_player
from models import Entity, EntityGameplayData, PlayerProgress, Skill, EntityType, EntityFamily
from models.discovery import PlayerEntityDiscovery, PlayerDiscoveryLog
from models.story_mode import GameConfig

router = APIRouter(prefix="/api/game/registry", tags=["discovery"])

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class EntitySummary(BaseModel):
    entity_id: int
    canonical_name: str
    entity_type_id: Optional[int] = None
    entity_type_name: Optional[str] = None
    entity_family_id: Optional[int] = None
    entity_family_name: Optional[str] = None
    sprite_key: Optional[str] = None
    encounters: int = 0
    kills: int = 0
    rank: str = "E"
    is_new: bool = False
    visibility: str = "mist"  # mist | grey | revealed


class EntityDetail(BaseModel):
    entity_id: int
    canonical_name: str
    entity_type_id: Optional[int] = None
    entity_type_name: Optional[str] = None
    entity_family_id: Optional[int] = None
    entity_family_name: Optional[str] = None
    sprite_key: Optional[str] = None
    rank: str = "E"
    encounters: int = 0
    kills: int = 0
    is_new: bool = False
    # rank-gated fields
    base_description: Optional[str] = None
    base_hp: Optional[int] = None
    base_gold: Optional[int] = None
    stat_block: Optional[dict] = None
    hidden_lore: Optional[str] = None


class LibraryItem(BaseModel):
    discovery_type: str
    reference_id: int
    discovered_at: Optional[datetime] = None
    is_new: bool = False


class LibraryResponse(BaseModel):
    groups: dict[str, list[LibraryItem]]
    counts: dict[str, int]


class StatsResponse(BaseModel):
    total_entities: int
    discovered_entities: int
    entity_completion_pct: float
    total_skills: int
    discovered_skills: int
    skill_completion_pct: float


class UnlockEntry(BaseModel):
    entity_id: int
    encounters: int = 0
    kills: int = 0


class UnlockBatchRequest(BaseModel):
    entries: list[UnlockEntry]


class RankChange(BaseModel):
    entity_id: int
    old_rank: str
    new_rank: str


class UnlockBatchResponse(BaseModel):
    new_ranks: list[RankChange]


class ClearNewRequest(BaseModel):
    type: str  # "entities" | "library"
    ids: list[int]


# ---------------------------------------------------------------------------
# Rank helpers
# ---------------------------------------------------------------------------

RANK_ORDER = ["E", "D", "C", "B", "A", "S", "SS"]

def _compute_rank(encounters: int, kills: int) -> str:
    """Determine discovery rank from cumulative encounter/kill counts."""
    score = encounters + kills * 2
    if score >= 500:
        return "SS"
    if score >= 200:
        return "S"
    if score >= 100:
        return "A"
    if score >= 40:
        return "B"
    if score >= 15:
        return "C"
    if score >= 5:
        return "D"
    return "E"


# ---------------------------------------------------------------------------
# 1. GET /entities — paginated entity registry
# ---------------------------------------------------------------------------

@router.get("/entities", response_model=list[EntitySummary])
def get_entity_registry(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    family: Optional[str] = Query(None),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Unauthorized")

    player_id = player.id

    # Get player's current chapter for visibility gating
    progress = session.exec(
        select(PlayerProgress).where(PlayerProgress.player_id == player_id)
    ).first()
    current_chapter_id = progress.current_chapter_id if progress else None

    # Build base query — join EntityType and EntityFamily for display info
    stmt = (
        select(
            Entity,
            EntityGameplayData,
            PlayerEntityDiscovery,
            EntityType,
            EntityFamily,
        )
        .join(EntityType, Entity.entity_type_id == EntityType.id)
        .outerjoin(EntityFamily, Entity.entity_family_id == EntityFamily.id)
        .outerjoin(EntityGameplayData, Entity.id == EntityGameplayData.entity_id)
        .outerjoin(
            PlayerEntityDiscovery,
            (Entity.id == PlayerEntityDiscovery.entity_id)
            & (PlayerEntityDiscovery.player_id == player_id),
        )
    )

    if family:
        stmt = stmt.where(EntityFamily.name == family)

    stmt = stmt.offset((page - 1) * per_page).limit(per_page)

    rows = session.exec(stmt).all()

    results: list[EntitySummary] = []
    for entity, gameplay, discovery, entity_type, entity_family in rows:
        # Visibility logic
        if discovery and discovery.encounters > 0:
            visibility = "revealed"
        elif current_chapter_id and entity.first_appearance_scene_id:
            # Entity is visible as grey if player has reached or passed the chapter
            visibility = "grey"
        else:
            visibility = "mist"

        results.append(
            EntitySummary(
                entity_id=entity.id,
                canonical_name=entity.canonical_name if visibility != "mist" else "???",
                entity_type_id=entity.entity_type_id if visibility != "mist" else None,
                entity_type_name=entity_type.name if visibility != "mist" else None,
                entity_family_id=entity.entity_family_id if visibility != "mist" else None,
                entity_family_name=entity_family.name if entity_family and visibility != "mist" else None,
                sprite_key=gameplay.sprite_key if gameplay and visibility == "revealed" else None,
                encounters=discovery.encounters if discovery else 0,
                kills=discovery.kills if discovery else 0,
                rank=discovery.rank if discovery else "E",
                is_new=discovery.is_new if discovery else False,
                visibility=visibility,
            )
        )

    return results


# ---------------------------------------------------------------------------
# 2. GET /entities/{entity_id} — rank-gated detail view
# ---------------------------------------------------------------------------

@router.get("/entities/{entity_id}", response_model=EntityDetail)
def get_entity_detail(
    entity_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Unauthorized")

    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Lookup entity type and family for display info
    entity_type = session.get(EntityType, entity.entity_type_id) if entity.entity_type_id else None
    entity_family = session.get(EntityFamily, entity.entity_family_id) if entity.entity_family_id else None

    gameplay = session.exec(
        select(EntityGameplayData).where(EntityGameplayData.entity_id == entity_id)
    ).first()

    discovery = session.exec(
        select(PlayerEntityDiscovery).where(
            PlayerEntityDiscovery.player_id == player.id,
            PlayerEntityDiscovery.entity_id == entity_id,
        )
    ).first()

    rank = discovery.rank if discovery else "E"
    rank_idx = RANK_ORDER.index(rank) if rank in RANK_ORDER else 0

    result = EntityDetail(
        entity_id=entity.id,
        canonical_name=entity.canonical_name,
        entity_type_id=entity.entity_type_id,
        entity_type_name=entity_type.name if entity_type else None,
        entity_family_id=entity.entity_family_id,
        entity_family_name=entity_family.name if entity_family else None,
        sprite_key=gameplay.sprite_key if gameplay else None,
        rank=rank,
        encounters=discovery.encounters if discovery else 0,
        kills=discovery.kills if discovery else 0,
        is_new=discovery.is_new if discovery else False,
    )

    # E rank: name, sprite, basic description — always visible
    # C rank (idx >= 2): + base_hp, base_gold
    if rank_idx >= 2 and gameplay:
        result.base_hp = gameplay.base_hp
        result.base_gold = gameplay.base_gold

    # A rank (idx >= 4): + full stat_block
    if rank_idx >= 4 and gameplay:
        result.stat_block = gameplay.stat_block

    # SS rank (idx >= 6): + hidden lore (base_description)
    if rank_idx >= 6:
        result.hidden_lore = entity.base_description

    return result


# ---------------------------------------------------------------------------
# 3. GET /library — discovered skills/items grouped by type
# ---------------------------------------------------------------------------

@router.get("/library", response_model=LibraryResponse)
def get_library(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Unauthorized")

    logs = session.exec(
        select(PlayerDiscoveryLog).where(
            PlayerDiscoveryLog.player_id == player.id
        )
    ).all()

    groups: dict[str, list[LibraryItem]] = {}
    for log in logs:
        item = LibraryItem(
            discovery_type=log.discovery_type,
            reference_id=log.reference_id,
            discovered_at=log.discovered_at,
            is_new=log.is_new,
        )
        groups.setdefault(log.discovery_type, []).append(item)

    counts = {dtype: len(items) for dtype, items in groups.items()}

    return LibraryResponse(groups=groups, counts=counts)


# ---------------------------------------------------------------------------
# 4. GET /stats — discovery completion counters
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=StatsResponse)
def get_stats(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Unauthorized")

    total_entities = session.exec(select(func.count(Entity.id))).one()
    discovered_entities = session.exec(
        select(func.count(PlayerEntityDiscovery.id)).where(
            PlayerEntityDiscovery.player_id == player.id
        )
    ).one()

    total_skills = session.exec(select(func.count(Skill.id))).one()
    discovered_skills = session.exec(
        select(func.count(PlayerDiscoveryLog.id)).where(
            PlayerDiscoveryLog.player_id == player.id,
            PlayerDiscoveryLog.discovery_type == "skill",
        )
    ).one()

    entity_pct = (discovered_entities / total_entities * 100) if total_entities else 0.0
    skill_pct = (discovered_skills / total_skills * 100) if total_skills else 0.0

    return StatsResponse(
        total_entities=total_entities,
        discovered_entities=discovered_entities,
        entity_completion_pct=round(entity_pct, 2),
        total_skills=total_skills,
        discovered_skills=discovered_skills,
        skill_completion_pct=round(skill_pct, 2),
    )


# ---------------------------------------------------------------------------
# 5. POST /unlock-batch — batch upsert discoveries (tick catch-up)
# ---------------------------------------------------------------------------

@router.post("/unlock-batch", response_model=UnlockBatchResponse)
def unlock_batch(
    body: UnlockBatchRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Unauthorized")

    new_ranks: list[RankChange] = []

    for entry in body.entries:
        existing = session.exec(
            select(PlayerEntityDiscovery).where(
                PlayerEntityDiscovery.player_id == player.id,
                PlayerEntityDiscovery.entity_id == entry.entity_id,
            )
        ).first()

        if existing:
            old_rank = existing.rank
            existing.encounters += entry.encounters
            existing.kills += entry.kills
            new_rank = _compute_rank(existing.encounters, existing.kills)
            if new_rank != old_rank:
                existing.rank = new_rank
                existing.is_new = True
                new_ranks.append(
                    RankChange(
                        entity_id=entry.entity_id,
                        old_rank=old_rank,
                        new_rank=new_rank,
                    )
                )
            session.add(existing)
        else:
            rank = _compute_rank(entry.encounters, entry.kills)
            discovery = PlayerEntityDiscovery(
                player_id=player.id,
                entity_id=entry.entity_id,
                encounters=entry.encounters,
                kills=entry.kills,
                rank=rank,
                first_seen_at=datetime.now(timezone.utc),
                is_new=True,
            )
            session.add(discovery)
            if rank != "E":
                new_ranks.append(
                    RankChange(
                        entity_id=entry.entity_id,
                        old_rank="E",
                        new_rank=rank,
                    )
                )

    session.commit()

    return UnlockBatchResponse(new_ranks=new_ranks)


# ---------------------------------------------------------------------------
# 6. PATCH /clear-new — clear "new" badges on entities or library items
# ---------------------------------------------------------------------------

@router.patch("/clear-new")
def clear_new(
    body: ClearNewRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if body.type == "entities":
        records = session.exec(
            select(PlayerEntityDiscovery).where(
                PlayerEntityDiscovery.player_id == player.id,
                col(PlayerEntityDiscovery.id).in_(body.ids),
            )
        ).all()
        for record in records:
            record.is_new = False
            session.add(record)
    elif body.type == "library":
        records = session.exec(
            select(PlayerDiscoveryLog).where(
                PlayerDiscoveryLog.player_id == player.id,
                col(PlayerDiscoveryLog.id).in_(body.ids),
            )
        ).all()
        for record in records:
            record.is_new = False
            session.add(record)
    else:
        raise HTTPException(status_code=400, detail="type must be 'entities' or 'library'")

    session.commit()

    return {"cleared": len(records)}
