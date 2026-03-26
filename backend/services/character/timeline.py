"""Player activity timeline — aggregates gameplay, economy, admin, social, anticheat events."""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from models import (
    PlayerCharacter, Scene, BossCompletion,
    PlayerStorySession, PlayerAchievement, Achievement,
    ActivityEvent, AdminAuditLog, SupportTicket,
    ShardTransaction,
)
from models.admin import AdminEssenceAdjustment
from models.payments import PaymentOrder

logger = logging.getLogger(__name__)


def get_player_timeline(
    session: Session,
    player_id: int,
    categories: list[str],
    before: Optional[datetime] = None,
    limit: int = 50,
) -> dict:
    """Aggregate player activity timeline from multiple sources."""
    if not before:
        before = datetime.now(timezone.utc)

    events = []

    # Get character IDs for this player
    characters = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
    ).all()
    character_ids = [c.id for c in characters]

    if "gameplay" in categories:
        # Story sessions
        sessions = session.exec(
            select(PlayerStorySession)
            .where(PlayerStorySession.player_id == player_id)
            .where(PlayerStorySession.created_at < before)
            .order_by(PlayerStorySession.created_at.desc())
            .limit(limit)
        ).all()
        for s in sessions:
            scene = session.get(Scene, s.scene_id) if s.scene_id else None
            scene_title = scene.title if scene else "Unknown"

            events.append({
                "timestamp": s.created_at.isoformat() if s.created_at else None,
                "category": "gameplay",
                "type": "session_start",
                "summary": f"Started session on '{scene_title}'",
                "detail": {"session_id": str(s.id), "scene_id": s.scene_id},
            })
            if not s.is_active and s.updated_at:
                duration = (s.updated_at - s.created_at).total_seconds() if s.created_at else 0
                events.append({
                    "timestamp": s.updated_at.isoformat(),
                    "category": "gameplay",
                    "type": "session_complete",
                    "summary": f"Completed session on '{scene_title}'",
                    "detail": {
                        "session_id": str(s.id),
                        "waves_completed": s.current_wave,
                        "session_gold": s.session_gold,
                        "deaths": s.deaths,
                        "dark_ritual_multiplier": s.dark_ritual_multiplier,
                        "duration_seconds": duration,
                    },
                })

        # Achievements
        achievements = session.exec(
            select(PlayerAchievement)
            .where(PlayerAchievement.player_id == player_id)
            .where(PlayerAchievement.is_completed == True)
            .where(PlayerAchievement.earned_at < before)
            .order_by(PlayerAchievement.earned_at.desc())
            .limit(limit)
        ).all()
        for a in achievements:
            ach = session.get(Achievement, a.achievement_id)
            events.append({
                "timestamp": a.earned_at.isoformat() if a.earned_at else None,
                "category": "gameplay",
                "type": "achievement_unlocked",
                "summary": f"Unlocked '{ach.name}'" if ach else "Unlocked achievement",
                "detail": {
                    "achievement_id": a.achievement_id,
                    "category": ach.category if ach else None,
                },
            })

    if "economy" in categories:
        # Payment orders
        orders = session.exec(
            select(PaymentOrder)
            .where(PaymentOrder.player_id == player_id)
            .where(PaymentOrder.created_at < before)
            .order_by(PaymentOrder.created_at.desc())
            .limit(limit)
        ).all()
        for o in orders:
            events.append({
                "timestamp": o.created_at.isoformat() if o.created_at else None,
                "category": "economy",
                "type": "purchase",
                "summary": f"Purchase: {o.product_type} — ${o.amount_cents / 100:.2f}" if o.amount_cents else f"Purchase: {o.product_type}",
                "detail": {"order_id": o.id, "status": o.status},
            })

        # Shard transactions
        shard_txns = session.exec(
            select(ShardTransaction)
            .where(ShardTransaction.player_id == player_id)
            .where(ShardTransaction.created_at < before)
            .order_by(ShardTransaction.created_at.desc())
            .limit(limit)
        ).all()
        for t in shard_txns:
            events.append({
                "timestamp": t.created_at.isoformat() if t.created_at else None,
                "category": "economy",
                "type": "shard_transaction",
                "summary": f"Shards {t.source_type}: {'+' if t.amount > 0 else ''}{t.amount}",
                "detail": {"transaction_id": t.id, "source_type": t.source_type, "amount": t.amount},
            })

        # Essence adjustments
        if character_ids:
            essence_adjs = session.exec(
                select(AdminEssenceAdjustment)
                .where(AdminEssenceAdjustment.player_id == player_id)
                .where(AdminEssenceAdjustment.created_at < before)
                .order_by(AdminEssenceAdjustment.created_at.desc())
                .limit(limit)
            ).all()
            for ea in essence_adjs:
                sign = "+" if ea.adjustment_type == "grant" else "-"
                events.append({
                    "timestamp": ea.created_at.isoformat() if ea.created_at else None,
                    "category": "economy",
                    "type": "essence_adjustment",
                    "summary": f"Admin: Essence {ea.adjustment_type} {sign}{ea.amount} by {ea.admin_email}",
                    "detail": {
                        "amount": ea.amount, "direction": ea.adjustment_type,
                        "reason": ea.reason,
                        "balance_before": ea.balance_before, "balance_after": ea.balance_after,
                    },
                })

    if "admin" in categories:
        # Admin audit log entries targeting this player
        audit_entries = session.exec(
            select(AdminAuditLog)
            .where(AdminAuditLog.target_type == "player")
            .where(AdminAuditLog.target_id == str(player_id))
            .where(AdminAuditLog.created_at < before)
            .order_by(AdminAuditLog.created_at.desc())
            .limit(limit)
        ).all()
        # Also include character-targeted entries
        if character_ids:
            char_entries = session.exec(
                select(AdminAuditLog)
                .where(AdminAuditLog.target_type == "character")
                .where(AdminAuditLog.target_id.in_([str(cid) for cid in character_ids]))
                .where(AdminAuditLog.created_at < before)
                .order_by(AdminAuditLog.created_at.desc())
                .limit(limit)
            ).all()
            audit_entries = list(audit_entries) + list(char_entries)

        for entry in audit_entries:
            events.append({
                "timestamp": entry.created_at.isoformat() if entry.created_at else None,
                "category": "admin",
                "type": entry.action,
                "summary": f"Admin: {entry.action} by {entry.admin_email}",
                "detail": entry.details or {},
            })

    if "social" in categories:
        tickets = session.exec(
            select(SupportTicket)
            .where(SupportTicket.player_id == player_id)
            .where(SupportTicket.created_at < before)
            .order_by(SupportTicket.created_at.desc())
            .limit(limit)
        ).all()
        for t in tickets:
            events.append({
                "timestamp": t.created_at.isoformat() if t.created_at else None,
                "category": "social",
                "type": "ticket_created",
                "summary": f"Support ticket: '{t.subject}'",
                "detail": {"ticket_id": t.id, "status": t.status},
            })

    if "anticheat" in categories:
        anomalies = session.exec(
            select(ActivityEvent)
            .where(ActivityEvent.player_id == player_id)
            .where(ActivityEvent.event_type == "anti_cheat_anomaly")
            .where(ActivityEvent.created_at < before)
            .order_by(ActivityEvent.created_at.desc())
            .limit(limit)
        ).all()
        for a in anomalies:
            events.append({
                "timestamp": a.created_at.isoformat() if a.created_at else None,
                "category": "anticheat",
                "type": "anti_cheat_anomaly",
                "summary": "Anti-cheat anomaly detected",
                "detail": a.event_data or {},
            })

    # Sort all events by timestamp descending
    events.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    events = events[:limit]

    return {
        "events": events,
        "next_cursor": events[-1]["timestamp"] if events else None,
        "has_more": len(events) == limit,
    }
