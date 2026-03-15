import React from 'react'
import { useNavigate } from 'react-router-dom'
import StatusDropdown from './StatusDropdown'

interface AuditRecord {
  id: number
  audit_type: string
  entity_type: string | null
  entity_id: number | null
  entity_name: string | null
  missing_field: string | null
  scene_id: number | null
  scene_title: string | null
  zone_level: number | null
  status: string
  logged_at: string
}

interface Props {
  records: AuditRecord[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onStatusChange: (recordId: number, status: string) => void
}

function getTypeBadgeClass(auditType: string): string {
  if (auditType.startsWith('missing_')) return 'type-missing'
  if (auditType.startsWith('generic_')) return 'type-generic'
  return 'type-other'
}

function getFixRoute(record: AuditRecord): string | null {
  switch (record.audit_type) {
    case 'missing_stat':
    case 'missing_sprite':
    case 'missing_sfx':
      return `/world-builder?tab=narrative&entity_id=${record.entity_id}`
    case 'missing_entity':
      return `/world-builder?tab=narrative&scene_id=${record.scene_id}`
    case 'missing_atmosphere':
      return `/world-builder?tab=narrative&chapter_id=${record.entity_id}`
    case 'missing_lore_text':
      if (record.entity_type === 'book') {
        return `/world-builder?tab=narrative&book_id=${record.entity_id}`
      }
      return `/world-builder?tab=narrative&chapter_id=${record.entity_id}`
    case 'generic_stat_block':
      return `/world-builder?tab=classification&sub=audit&entity_id=${record.entity_id}`
    default:
      return record.entity_id
        ? `/world-builder?tab=narrative&entity_id=${record.entity_id}`
        : null
  }
}

export default function AuditTable({
  records,
  total,
  page,
  pageSize,
  onPageChange,
  selectedIds,
  onSelectionChange,
  onStatusChange,
}: Props) {
  const navigate = useNavigate()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const allOnPageSelected = records.length > 0 && records.every((r) => selectedIds.includes(r.id))

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      onSelectionChange(selectedIds.filter((id) => !records.some((r) => r.id === id)))
    } else {
      const pageIds = records.map((r) => r.id)
      const merged = Array.from(new Set([...selectedIds, ...pageIds]))
      onSelectionChange(merged)
    }
  }

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const handleFix = (record: AuditRecord) => {
    const route = getFixRoute(record)
    if (route) navigate(route)
  }

  return (
    <>
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Type</th>
              <th>Entity Type</th>
              <th>Entity Name</th>
              <th>Missing Field</th>
              <th>Scene</th>
              <th>Status</th>
              <th>Logged</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                  No audit records found.
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const fixRoute = getFixRoute(record)
                return (
                  <tr key={record.id}>
                    <td className="td-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={() => toggleSelect(record.id)}
                      />
                    </td>
                    <td>
                      <span className={`type-badge ${getTypeBadgeClass(record.audit_type)}`}>
                        {record.audit_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{record.entity_type || '-'}</td>
                    <td>{record.entity_name || '-'}</td>
                    <td>{record.missing_field || '-'}</td>
                    <td>
                      {record.scene_title
                        ? `${record.scene_title}${record.zone_level != null ? ` (Z${record.zone_level})` : ''}`
                        : '-'}
                    </td>
                    <td>
                      <StatusDropdown
                        currentStatus={record.status}
                        recordId={record.id}
                        onChange={onStatusChange}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#888' }}>
                      {new Date(record.logged_at).toLocaleDateString()}
                    </td>
                    <td>
                      {fixRoute && (
                        <button className="btn-fix" onClick={() => handleFix(record)}>
                          Fix
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="audit-pagination">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages} ({total} records)
          </span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  )
}
