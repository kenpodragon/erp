"""Admin Dev Content Audit routes (5.6)."""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session

from db import get_session
from auth import get_current_admin, get_client_ip
from audit import write_audit_log
from services.dev_audit_service import (
    list_audit_records,
    get_audit_summary,
    get_filter_options,
    update_audit_status,
    bulk_update_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/dev-audit", tags=["admin-dev-audit"])


# ---------------------------------------------------------------------------
# Pydantic request/response bodies
# ---------------------------------------------------------------------------

class StatusUpdateRequest(BaseModel):
    status: str


class BulkStatusRequest(BaseModel):
    record_ids: list[int]
    status: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
def get_audit_list(
    audit_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Paginated list of dev content audit records with filters."""
    # If an explicit status filter is passed, don't auto-exclude resolved
    exclude_resolved = status is None
    return list_audit_records(
        session,
        audit_type=audit_type,
        status=status,
        entity_type=entity_type,
        search=search,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
        exclude_resolved=exclude_resolved,
    )


@router.get("/summary")
def get_summary(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Summary counts by status and by audit_type."""
    return get_audit_summary(session)


@router.get("/filter-options")
def get_filters(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Dynamic filter options for the audit table UI."""
    return get_filter_options(session)


@router.patch("/{record_id}")
def patch_audit_status(
    record_id: int,
    body: StatusUpdateRequest,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a single audit record's status."""
    try:
        result = update_audit_status(session, record_id, body.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action="dev_audit_status_update",
        target_type="dev_content_audit",
        target_id=str(record_id),
        details={"new_status": body.status},
        ip_address=get_client_ip(request),
    )
    session.commit()
    return result


@router.post("/bulk-status")
def post_bulk_status(
    body: BulkStatusRequest,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Bulk-update status for multiple audit records."""
    try:
        result = bulk_update_status(session, body.record_ids, body.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action="dev_audit_bulk_status_update",
        target_type="dev_content_audit",
        target_id=",".join(str(i) for i in body.record_ids),
        details={"new_status": body.status, "count": result["updated"]},
        ip_address=get_client_ip(request),
    )
    session.commit()
    return result
