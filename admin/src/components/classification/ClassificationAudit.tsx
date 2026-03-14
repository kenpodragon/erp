import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import TemplateApplyModal from './TemplateApplyModal'

interface AuditSummary {
  total: number
  with_type: number
  with_family: number
  with_attack_types: number
  with_primary_attack_type: number
  with_stat_block: number
  with_visual_behavior: number
}

interface AuditEntity {
  id: number
  canonical_name: string
  entity_type_name: string | null
  entity_family_name: string | null
  attack_type_count: number
  has_stat_block: boolean
  visual_behavior_name: string | null
  missing: string[]
}

interface LookupItem {
  id: number
  name: string
  display_name?: string
}

type MissingFilter = 'type' | 'family' | 'attack_types' | 'primary_attack_type' | 'stat_block' | 'visual_behavior'

const MISSING_OPTIONS: { value: MissingFilter; label: string }[] = [
  { value: 'type', label: 'Type' },
  { value: 'family', label: 'Family' },
  { value: 'attack_types', label: 'Attack Types' },
  { value: 'primary_attack_type', label: 'Primary Attack' },
  { value: 'stat_block', label: 'Stat Block' },
  { value: 'visual_behavior', label: 'Visual Behavior' },
]

export default function ClassificationAudit() {
  const PAGE_SIZE = 50

  const [entities, setEntities] = useState<AuditEntity[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [searchText, setSearchText] = useState('')
  const [missingFilters, setMissingFilters] = useState<Set<MissingFilter>>(new Set())

  // Lookups for quick-action dropdowns
  const [entityTypes, setEntityTypes] = useState<LookupItem[]>([])
  const [entityFamilies, setEntityFamilies] = useState<LookupItem[]>([])

  // Quick action state
  const [quickAction, setQuickAction] = useState<{ entityId: number; field: string } | null>(null)
  const [quickValue, setQuickValue] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)

  // Template modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Fetch lookups once
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [typesRes, familiesRes] = await Promise.all([
          api.get('/api/admin/classification/entity-types'),
          api.get('/api/admin/classification/entity-families'),
        ])
        if (typesRes.ok) {
          const d = await typesRes.json()
          setEntityTypes(Array.isArray(d) ? d : d.items || [])
        }
        if (familiesRes.ok) {
          const d = await familiesRes.json()
          setEntityFamilies(Array.isArray(d) ? d : d.items || [])
        }
      } catch { /* ignore */ }
    }
    fetchLookups()
  }, [])

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (searchText) params.set('search', searchText)
      if (missingFilters.size > 0) params.set('missing', Array.from(missingFilters).join(','))
      const res = await api.get(`/api/admin/classification/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary || null)
        if (Array.isArray(data.items)) {
          setEntities(data.items)
          setTotal(data.total || data.items.length)
        } else if (Array.isArray(data)) {
          setEntities(data)
          setTotal(data.length)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, searchText, missingFilters])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  const toggleMissing = (filter: MissingFilter) => {
    setMissingFilters(prev => {
      const next = new Set(prev)
      if (next.has(filter)) next.delete(filter)
      else next.add(filter)
      return next
    })
    setPage(1)
  }

  const setSingleMissing = (filter: MissingFilter) => {
    setMissingFilters(new Set([filter]))
    setPage(1)
  }

  // Quick assign
  const handleQuickAssign = async (entityId: number, field: 'type' | 'family', valueId: string) => {
    if (!valueId) return
    setQuickSaving(true)
    try {
      const actionName = field === 'type' ? 'assign_type' : 'assign_family'
      const payload = field === 'type'
        ? { entity_type_id: Number(valueId) }
        : { entity_family_id: Number(valueId) }
      const res = await api.post('/api/admin/classification/bulk-assign', {
        entity_ids: [entityId],
        action: actionName,
        payload,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: `${field === 'type' ? 'Type' : 'Family'} assigned` })
        setQuickAction(null)
        setQuickValue('')
        await fetchAudit()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    }
    setQuickSaving(false)
  }

  // CSV export
  const handleExportCsv = () => {
    const headers = ['Name', 'Type', 'Family', 'Attack Types', 'Has Stats', 'Visual Behavior', 'Missing']
    const rows = entities.map(e => [
      e.canonical_name,
      e.entity_type_name || '',
      e.entity_family_name || '',
      String(e.attack_type_count),
      e.has_stat_block ? 'Yes' : 'No',
      e.visual_behavior_name || '',
      (e.missing || []).join('; '),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'classification_audit.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Toggle entity selection for template modal
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pct = (num: number, denom: number) => denom > 0 ? Math.round((num / denom) * 100) : 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const renderSummaryCard = (
    label: string,
    value: number,
    total: number,
    filter: MissingFilter,
    color: string,
  ) => (
    <div
      className={`cls-audit-card ${missingFilters.has(filter) ? 'cls-audit-card--active' : ''}`}
      onClick={() => setSingleMissing(filter)}
    >
      <div className="cls-audit-card-value" style={{ color }}>{value} / {total}</div>
      <div className="cls-audit-card-pct">{pct(value, total)}%</div>
      <div className="cls-audit-card-label">{label}</div>
    </div>
  )

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="cls-audit-cards">
          {renderSummaryCard('Type', summary.with_type, summary.total, 'type', 'var(--color-info)')}
          {renderSummaryCard('Family', summary.with_family, summary.total, 'family', 'var(--color-success)')}
          {renderSummaryCard('Attack Types', summary.with_attack_types, summary.total, 'attack_types', 'var(--color-warning)')}
          {renderSummaryCard('Primary', summary.with_primary_attack_type, summary.total, 'primary_attack_type', 'var(--color-secondary)')}
          {renderSummaryCard('Stats', summary.with_stat_block, summary.total, 'stat_block', 'var(--color-info)')}
          {renderSummaryCard('Visual', summary.with_visual_behavior, summary.total, 'visual_behavior', 'var(--color-success)')}
        </div>
      )}

      {/* Filter bar */}
      <div className="editor-filters cls-audit-filters">
        <input
          className="form-input"
          placeholder="Search entities..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setPage(1) }}
          style={{ width: 200 }}
        />
        <div className="cls-missing-checkboxes">
          {MISSING_OPTIONS.map(o => (
            <label key={o.value} className="cls-checkbox-label">
              <input
                type="checkbox"
                checked={missingFilters.has(o.value)}
                onChange={() => toggleMissing(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setTemplateModalOpen(true)} disabled={selectedIds.size === 0}>
          Bulk Apply Templates ({selectedIds.size})
        </button>
        <button className="btn cls-export-btn" onClick={handleExportCsv}>
          Export CSV
        </button>
      </div>

      {/* Entity table */}
      {loading ? (
        <div className="editor-loading">Loading audit data...</div>
      ) : entities.length === 0 ? (
        <div className="editor-empty">No incomplete entities found.</div>
      ) : (
        <>
          <div className="editor-table-wrapper">
            <table className="editor-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={entities.length > 0 && entities.every(e => selectedIds.has(e.id))}
                      onChange={() => {
                        if (entities.every(e => selectedIds.has(e.id))) {
                          setSelectedIds(new Set())
                        } else {
                          setSelectedIds(new Set(entities.map(e => e.id)))
                        }
                      }}
                    />
                  </th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Family</th>
                  <th>Attacks</th>
                  <th>Stats</th>
                  <th>Visual</th>
                  <th>Missing</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.map(e => (
                  <tr key={e.id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} />
                    </td>
                    <td>{e.canonical_name}</td>
                    <td>{e.entity_type_name || <span className="cls-missing-tag">&mdash;</span>}</td>
                    <td>{e.entity_family_name || <span className="cls-missing-tag">&mdash;</span>}</td>
                    <td>{e.attack_type_count > 0 ? e.attack_type_count : <span className="cls-missing-tag">&mdash;</span>}</td>
                    <td>{e.has_stat_block ? <span className="cls-status-yes">&#10003;</span> : <span className="cls-status-no">&#10007;</span>}</td>
                    <td>{e.visual_behavior_name || <span className="cls-missing-tag">&mdash;</span>}</td>
                    <td>
                      {(e.missing || []).map(m => (
                        <span key={m} className="cls-missing-badge">{m}</span>
                      ))}
                    </td>
                    <td>
                      {quickAction?.entityId === e.id && quickAction.field === 'type' ? (
                        <select
                          className="form-select"
                          value={quickValue}
                          onChange={ev => { setQuickValue(ev.target.value); handleQuickAssign(e.id, 'type', ev.target.value) }}
                          disabled={quickSaving}
                          style={{ width: 120 }}
                          autoFocus
                        >
                          <option value="">-- Type --</option>
                          {entityTypes.map(t => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}
                        </select>
                      ) : quickAction?.entityId === e.id && quickAction.field === 'family' ? (
                        <select
                          className="form-select"
                          value={quickValue}
                          onChange={ev => { setQuickValue(ev.target.value); handleQuickAssign(e.id, 'family', ev.target.value) }}
                          disabled={quickSaving}
                          style={{ width: 120 }}
                          autoFocus
                        >
                          <option value="">-- Family --</option>
                          {entityFamilies.map(f => <option key={f.id} value={f.id}>{f.display_name || f.name}</option>)}
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {!e.entity_type_name && (
                            <button className="btn btn-sm" onClick={() => { setQuickAction({ entityId: e.id, field: 'type' }); setQuickValue('') }}>
                              + Type
                            </button>
                          )}
                          {!e.entity_family_name && (
                            <button className="btn btn-sm" onClick={() => { setQuickAction({ entityId: e.id, field: 'family' }); setQuickValue('') }}>
                              + Family
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="editor-pagination">
              <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Template apply modal */}
      {templateModalOpen && (
        <TemplateApplyModal
          entityIds={Array.from(selectedIds)}
          onClose={() => { setTemplateModalOpen(false); fetchAudit() }}
        />
      )}
    </div>
  )
}
