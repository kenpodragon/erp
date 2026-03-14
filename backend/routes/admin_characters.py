"""Admin character management routes — 5.1 Player & Character Management."""

import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import Session

from db import get_session
from auth import get_current_admin, get_client_ip
from audit import write_audit_log
from services.admin_character_service import (
    edit_character, get_stat_breakdown, get_item_components,
    craft_item_manual, craft_item_random, grant_crafted_item,
    get_character_inventory, edit_item, delete_item, edit_artifact,
    adjust_essence, get_essence_history,
    get_content_tree, set_progression, get_boss_completions, reset_boss_completions,
    get_character_skills, update_character_skills,
    get_player_timeline,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/characters", tags=["admin-characters"])

# Also create a separate router for non-character-scoped endpoints
items_router = APIRouter(prefix="/api/admin", tags=["admin-characters"])
players_timeline_router = APIRouter(prefix="/api/admin", tags=["admin-characters"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class CharacterEditRequest(BaseModel):
    character_name: Optional[str] = None
    level: Optional[int] = None
    character_xp: Optional[float] = None
    class_id: Optional[int] = None


class CraftItemRequest(BaseModel):
    mode: str = "manual"  # "manual" or "random"
    gear_slot_id: Optional[int] = None
    type_base_id: Optional[int] = None
    prefix_id: Optional[int] = None
    quality_id: Optional[int] = None
    lore_tag_id: Optional[int] = None
    suffix_id: Optional[int] = None
    rarity: Optional[str] = None
    item_level: Optional[int] = None
    base_stat_values: Optional[dict] = None


class EditItemRequest(BaseModel):
    prefix_id: Optional[int] = None
    quality_id: Optional[int] = None
    lore_tag_id: Optional[int] = None
    suffix_id: Optional[int] = None
    rarity: Optional[str] = None


class EditArtifactRequest(BaseModel):
    rarity: Optional[str] = None
    prefix_code: Optional[str] = None
    suffix_code: Optional[str] = None


class EssenceAdjustRequest(BaseModel):
    amount: float = Field(gt=0)
    direction: str  # "grant" or "debit"
    reason: str = Field(min_length=10, max_length=500)


class ProgressionSetRequest(BaseModel):
    book_number: int
    chapter_number: int
    scene_number: int


class BossResetRequest(BaseModel):
    scene_ids: list[int]


class SkillUpdateItem(BaseModel):
    skill_id: int
    level: int = 1
    xp: float = 0


class SkillUpdateRequest(BaseModel):
    updates: list[SkillUpdateItem]


# ---------------------------------------------------------------------------
# §2 — Character Deep Editor
# ---------------------------------------------------------------------------

@router.patch("/{character_id}")
async def admin_edit_character(
    character_id: int,
    body: CharacterEditRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Edit character fields (name, level, XP, class_id). §2"""
    admin_email = token.get("email", "unknown")
    try:
        result = edit_character(session, character_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if result is None:
        raise HTTPException(status_code=404, detail="Character not found")

    write_audit_log(
        session=session, admin_email=admin_email,
        action="character_edited", target_type="character",
        target_id=str(character_id),
        details={"old_state": result["old_state"], "changes": result["changes"]},
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", "changes": result["changes"]}


@router.get("/{character_id}/stats")
async def admin_get_stat_breakdown(
    character_id: int,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get full stat breakdown with 6 source detail. §2.3"""
    result = get_stat_breakdown(session, character_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return result


# ---------------------------------------------------------------------------
# §3 — Item Crafting Tool
# ---------------------------------------------------------------------------

@items_router.get("/items/components")
async def admin_get_item_components(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get all item/artifact component options for crafting UI. §3.1"""
    return get_item_components(session)


@router.post("/{character_id}/items/craft")
async def admin_craft_item(
    character_id: int,
    body: CraftItemRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Craft and grant an item to a character. §3.2"""
    admin_email = token.get("email", "unknown")
    from models import PlayerCharacter
    character = session.get(PlayerCharacter, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    try:
        if body.mode == "random":
            item = craft_item_random(session, character, body.model_dump())
        else:
            item = craft_item_manual(session, character, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    grant_result = grant_crafted_item(session, character_id, item)

    write_audit_log(
        session=session, admin_email=admin_email,
        action="item_crafted", target_type="character",
        target_id=str(character_id),
        details={
            "item_id": item.id, "item_name": item.name,
            "rarity": item.rarity, "mode": body.mode,
            "bag_count": grant_result["bag_count"],
        },
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {
        "status": "ok",
        "item": {
            "id": item.id, "name": item.name, "rarity": item.rarity,
            "base_stats": item.base_stats, "item_code": item.item_code,
            "item_level": item.item_level,
        },
        "inventory_id": grant_result["inventory_id"],
        "bag_warning": grant_result["bag_warning"],
    }


@router.get("/{character_id}/inventory")
async def admin_get_inventory(
    character_id: int,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get character's full inventory (equipped + bag + artifacts). §8.3"""
    result = get_character_inventory(session, character_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return result


@items_router.patch("/items/{item_id}")
async def admin_edit_item(
    item_id: int,
    body: EditItemRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Edit item components and recalculate stats. §3.4"""
    admin_email = token.get("email", "unknown")
    try:
        result = edit_item(session, item_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if result is None:
        raise HTTPException(status_code=404, detail="Item not found")

    write_audit_log(
        session=session, admin_email=admin_email,
        action="item_edited", target_type="character",
        target_id=str(result["item_id"]),
        details={"before": result["before"], "after": result["after"]},
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", **result}


@items_router.delete("/items/{item_id}")
async def admin_delete_item(
    item_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete item from inventory. §3.7"""
    admin_email = token.get("email", "unknown")
    result = delete_item(session, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Item not found")

    write_audit_log(
        session=session, admin_email=admin_email,
        action="item_deleted", target_type="character",
        target_id=str(result.get("character_id", "")),
        details=result,
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", **result}


@items_router.patch("/artifacts/{artifact_id}")
async def admin_edit_artifact(
    artifact_id: int,
    body: EditArtifactRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Edit artifact components and recalculate stat bonuses. §3.5"""
    admin_email = token.get("email", "unknown")
    try:
        result = edit_artifact(session, artifact_id, body.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if result is None:
        raise HTTPException(status_code=404, detail="Artifact not found")

    write_audit_log(
        session=session, admin_email=admin_email,
        action="artifact_edited", target_type="character",
        target_id=str(result["artifact_id"]),
        details={"before": result["before"], "after": result["after"]},
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", **result}


# ---------------------------------------------------------------------------
# §4 — Currency Editor (Essence)
# ---------------------------------------------------------------------------

@router.post("/{character_id}/essence")
async def admin_adjust_essence(
    character_id: int,
    body: EssenceAdjustRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Grant or debit Essence. §4"""
    admin_email = token.get("email", "unknown")
    try:
        result = adjust_essence(
            session, character_id, body.amount, body.direction, body.reason, admin_email,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    write_audit_log(
        session=session, admin_email=admin_email,
        action=f"essence_{body.direction}ed", target_type="character",
        target_id=str(character_id),
        details={
            "amount": body.amount, "direction": body.direction,
            "balance_before": result["balance_before"],
            "balance_after": result["balance_after"],
            "reason": body.reason,
        },
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", **result}


@router.get("/{character_id}/essence/history")
async def admin_get_essence_history(
    character_id: int,
    page: int = 1,
    page_size: int = 10,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get admin Essence adjustment history. §4.4"""
    result = get_essence_history(session, character_id, page, page_size)
    if result is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return result


# ---------------------------------------------------------------------------
# §5 — Progression Editor
# ---------------------------------------------------------------------------

@items_router.get("/content-tree")
async def admin_get_content_tree(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get book → chapter → scene tree for cascading dropdowns. §5"""
    return get_content_tree(session)


@router.patch("/{character_id}/progression")
async def admin_set_progression(
    character_id: int,
    body: ProgressionSetRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Set progression position (forward with backfill or backward). §5"""
    admin_email = token.get("email", "unknown")
    try:
        result = set_progression(
            session, character_id,
            body.book_number, body.chapter_number, body.scene_number,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    write_audit_log(
        session=session, admin_email=admin_email,
        action="progression_set", target_type="character",
        target_id=str(character_id),
        details=result,
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", **result}


@router.get("/{character_id}/boss-completions")
async def admin_get_boss_completions(
    character_id: int,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List completed bosses for a character. §5.4"""
    result = get_boss_completions(session, character_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return {"completions": result}


@router.delete("/{character_id}/boss-completions")
async def admin_reset_boss_completions(
    character_id: int,
    body: BossResetRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Reset boss completions for given scene_ids. §5.4"""
    admin_email = token.get("email", "unknown")
    try:
        deleted = reset_boss_completions(session, character_id, body.scene_ids)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    write_audit_log(
        session=session, admin_email=admin_email,
        action="boss_completions_reset", target_type="character",
        target_id=str(character_id),
        details={"scene_ids": body.scene_ids, "deleted_count": deleted},
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", "deleted_count": deleted}


# POST alias for boss reset (frontend api.delete doesn't support request bodies)
@router.post("/{character_id}/boss-completions/reset")
async def admin_reset_boss_completions_post(
    character_id: int,
    body: BossResetRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Reset boss completions (POST alias). §5.4"""
    return await admin_reset_boss_completions(character_id, body, request, token, session)


# ---------------------------------------------------------------------------
# §6 — Skill Editor
# ---------------------------------------------------------------------------

@router.get("/{character_id}/skills")
async def admin_get_skills(
    character_id: int,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get all skills with levels and prerequisite status. §6"""
    result = get_character_skills(session, character_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return {"skills": result}


@router.patch("/{character_id}/skills")
async def admin_update_skills(
    character_id: int,
    body: SkillUpdateRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Bulk update skill levels/XP. §6"""
    admin_email = token.get("email", "unknown")
    try:
        results = update_character_skills(
            session, character_id,
            [u.model_dump() for u in body.updates],
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    write_audit_log(
        session=session, admin_email=admin_email,
        action="skills_edited", target_type="character",
        target_id=str(character_id),
        details={"updates": results},
        ip_address=get_client_ip(request),
    )
    session.commit()

    return {"status": "ok", "updates": results}


# ---------------------------------------------------------------------------
# §7 — Activity Timeline
# ---------------------------------------------------------------------------

@players_timeline_router.get("/players/{player_id}/timeline")
async def admin_get_timeline(
    player_id: int,
    categories: str = "gameplay,economy,admin,social,anticheat",
    before: Optional[str] = None,
    limit: int = 50,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get activity timeline (paginated, filterable). §7"""
    cat_list = [c.strip() for c in categories.split(",") if c.strip()]
    before_dt = None
    if before:
        try:
            before_dt = datetime.fromisoformat(before.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid 'before' datetime format")

    limit = min(max(1, limit), 200)
    result = get_player_timeline(session, player_id, cat_list, before_dt, limit)
    return result
