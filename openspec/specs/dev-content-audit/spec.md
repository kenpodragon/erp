# Dev Content Audit Dashboard Specification

## Purpose
Section 5.6 provides a reactive dashboard for surfacing and managing content gaps flagged by the backend at runtime. When the game engine falls back to generic or placeholder data (missing stat blocks, missing atmosphere assignments, missing lore text), it logs a record to `dev_content_audit`. This dashboard surfaces those records so admins can triage them and navigate to the relevant content editor. The audit system is fully generic — any new fallback path can log to `dev_content_audit` and records appear automatically without UI changes.

## Requirements

### Requirement: Audit Status Management
The system SHALL extend `dev_content_audit` with a `status` column replacing the boolean `resolved` column. Valid statuses SHALL be: 'open', 'acknowledged', 'in_progress', 'resolved', 'wont_fix'. Admins SHALL be able to update status on individual records or bulk-update across multiple selected records.

#### Scenario: Status updated from open to in_progress
- GIVEN 16 'missing_stat' records with status 'open'
- WHEN an admin selects all 16 and applies bulk status 'in_progress'
- THEN all 16 records update to `status = 'in_progress'`

#### Scenario: Resolved record excluded from open count
- GIVEN a content gap that has been fixed
- WHEN an admin sets its status to 'resolved'
- THEN the summary card for that `audit_type` decrements its open count

### Requirement: Deduplication on Log
The system SHALL check for an existing unresolved matching record before inserting. A duplicate is defined as: same `audit_type`, `entity_id`, `missing_field`, and `scene_id` with `status NOT IN ('resolved', 'wont_fix')`. If a match exists, the insert SHALL be skipped.

#### Scenario: Duplicate suppressed
- GIVEN a 'missing_stat' record for entity_id=42 with status='open'
- WHEN the same entity triggers the missing stat fallback again in the next game session
- THEN no new record is inserted (deduplication via `log_content_audit()` helper)

### Requirement: Runtime Fallback Instrumentation
The system SHALL log the following fallback types to `dev_content_audit`:
- `missing_entity` — scene has no entity assignments (existing, story_mode.py)
- `missing_stat` — entity has no `entity_gameplay_data` record (existing, story_mode.py)
- `missing_atmosphere` — atmosphere resolution falls back to global default (new, audio.py)
- `missing_lore_text` — boss completion requests null `transition_lore_text` (new, story_mode.py)

All new paths SHALL use the shared `log_content_audit()` helper from `dev_audit_service.py`.

#### Scenario: Missing atmosphere logged on fallback
- GIVEN a chapter with no `base_atmosphere` and a book with no fallback atmosphere
- WHEN a story session renders audio for a scene in that chapter
- THEN a `missing_atmosphere` audit record is created for the chapter with `missing_field = 'base_atmosphere'`

#### Scenario: Missing lore text logged at boss completion
- GIVEN a chapter whose `transition_lore_text` is NULL
- WHEN a player completes the chapter boss and `/session/{id}/complete` is called
- THEN a `missing_lore_text` audit record is created for the chapter

### Requirement: Deep-Link Fix Actions
Each audit record in the dashboard SHALL display a "Fix →" button that deep-links to the relevant content editor with the flagged item pre-selected:
- `missing_stat` / `missing_entity` → Entity Editor (WorldBuilder → Narrative → Entities, entity pre-selected)
- `missing_atmosphere` → Chapter Editor (chapter pre-selected, atmosphere field highlighted)
- `missing_lore_text` → Chapter or Book Editor (lore text field highlighted)

#### Scenario: Deep-link navigates to correct editor
- GIVEN a 'missing_stat' record for entity "Shadow Wraith" (entity_id=142)
- WHEN the admin clicks "Fix →"
- THEN they are navigated to WorldBuilder → Narrative → Entity Editor with entity 142 pre-loaded

### Requirement: Summary Cards
The system SHALL display summary cards at the top of the dashboard showing counts by audit_type and status (open + in_progress). Cards SHALL update when records are resolved.

## Design

### System Diagram
```
DevAudit.tsx (NEW top-level admin page)
  ├── AuditSummaryCards   ── GET /api/admin/dev-audit/summary
  ├── AuditFilterBar      ── GET /api/admin/dev-audit/filter-options
  ├── AuditTable          ── GET /api/admin/dev-audit
  │     └── StatusDropdown ─ PATCH /api/admin/dev-audit/{id}
  └── BulkStatusBar       ── POST /api/admin/dev-audit/bulk-status

Runtime → log_content_audit() → dev_content_audit table
```

### Shared `log_content_audit()` Helper
```python
def log_content_audit(session, audit_type, entity_type, entity_id, entity_name,
                       missing_field, scene_id=None, zone_level=None):
    # Dedup check: skip if matching open/acknowledged/in_progress record exists
    existing = session.exec(select(DevContentAudit).where(
        DevContentAudit.audit_type == audit_type,
        DevContentAudit.entity_id == entity_id,
        DevContentAudit.missing_field == missing_field,
        DevContentAudit.status.notin_(["resolved", "wont_fix"])
    )).first()
    if existing: return None
    # Insert new record with status='open'
```

### Module Structure
```
backend/
├── routes/admin_dev_audit.py       # CRUD + bulk + summary endpoints
└── services/dev_audit_service.py   # log_content_audit() + query logic

admin/src/pages/DevAudit.tsx
admin/src/components/audit/
├── AuditSummaryCards.tsx
├── AuditFilterBar.tsx
├── AuditTable.tsx + StatusDropdown.tsx
└── BulkStatusBar.tsx
```

## Schema

**Migration 060** (applied).

### Modified Table: `dev_content_audit`

Schema change: replace boolean `resolved` with `status` VARCHAR(20).

```sql
-- Step 1: Add status
ALTER TABLE dev_content_audit ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'open';

-- Step 2: Migrate existing data
UPDATE dev_content_audit SET status = 'resolved' WHERE resolved = TRUE;
UPDATE dev_content_audit SET status = 'open' WHERE resolved = FALSE;

-- Step 3: Drop old column
ALTER TABLE dev_content_audit DROP COLUMN resolved;

-- Step 4: Indexes
CREATE INDEX idx_dev_content_audit_status ON dev_content_audit(status);
CREATE INDEX idx_dev_content_audit_type ON dev_content_audit(audit_type);
```

### Updated Column Reference

| Column | Type | Description |
|:---|:---|:---|
| `id` | SERIAL PK | Auto-increment |
| `audit_type` | VARCHAR(50) NOT NULL | 'missing_stat', 'missing_entity', 'missing_atmosphere', 'missing_lore_text', etc. |
| `entity_type` | VARCHAR(50) | 'enemy', 'scene', 'chapter', 'book' |
| `entity_id` | INTEGER | ID of flagged entity (not FK — polymorphic) |
| `entity_name` | VARCHAR(255) | Denormalized display name |
| `missing_field` | VARCHAR(100) | Specific missing field name |
| `scene_id` | INTEGER FK scenes(id) SET NULL | Scene that triggered the fallback |
| `zone_level` | INTEGER | Zone level context |
| `logged_at` | TIMESTAMPTZ DEFAULT NOW() | When first logged |
| `status` | VARCHAR(20) DEFAULT 'open' | Triage status (see valid values below) |

### Valid Status Values
| Status | Display Color |
|:---|:---|
| `open` | Red pill |
| `acknowledged` | Blue pill |
| `in_progress` | Yellow pill |
| `resolved` | Green pill |
| `wont_fix` | Gray pill |
