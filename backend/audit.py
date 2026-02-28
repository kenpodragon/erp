"""
Reusable audit log helper for admin actions.

Writes synchronously to admin_audit_log before the response is returned,
ensuring audit trail integrity. Used by config, user management, support,
and any other admin action that must be recorded.
"""

import logging
from datetime import datetime, timezone
from sqlmodel import Session

from models import AdminAuditLog

logger = logging.getLogger(__name__)


def write_audit_log(
    session: Session,
    admin_email: str,
    action: str,
    target_type: str,
    target_id: str,
    details: dict | None = None,
    ip_address: str | None = None,
) -> AdminAuditLog:
    """
    Synchronous write to admin_audit_log.

    Args:
        session: Active DB session.
        admin_email: Email of the admin performing the action.
        action: Action type (e.g. config_changed, config_reset, player_banned).
        target_type: Type of target entity (e.g. config, player, ticket).
        target_id: ID or key of the affected entity.
        details: Optional JSONB payload with action-specific data.
        ip_address: Admin's IP address.

    Returns:
        The created AdminAuditLog record.
    """
    log_entry = AdminAuditLog(
        admin_email=admin_email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc),
    )
    session.add(log_entry)
    session.commit()
    session.refresh(log_entry)
    logger.info("Audit log: %s by %s on %s/%s", action, admin_email, target_type, target_id)
    return log_entry
