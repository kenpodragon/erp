import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface EntityRow {
  id: number
  canonical_name: string
  entity_type_name: string | null
  entity_family_name: string | null
  attack_type_count: number
  has_stat_block: boolean
  visual_behavior_name: string | null
}

interface LookupItem {
  id: number
  name: string
  display_name?: string
}

type BulkAction =
  | 'assign_type'
  | 'assign_family'
  | 'add_attack_types'
  | 'replace_attack_types'
  | 'set_primary'
  | 'create_family'

const ACTION_OPTIONS: { value: BulkAction; label: string }[] = [
  { value: 'assign_type', label: 'Assign Type' },
  { value: 'assign_family', label: 'Assign Family' },
  { value: 'add_attack_types', label: 'Add Attack Types' },
  { value: 'replace_attack_types', label: 'Replace Attack Types' },
  { value: 'set_primary', label: 'Set Primary' },
  { value: 'create_family', label: 'Create Family from Selection' },
]

export default function BulkAssignmentPanel() {
  const PAGE_SIZE = 50

  const [entities, setEntities] = useState<EntityRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [filterTypeId, setFilterTypeId] = useState<string>('')
  const [filterFamilyId, setFilterFamilyId] = useState<string>('')

  // Lookups
  const [entityTypes, setEntityTypes] = useState<LookupItem[]>([])
  const [entityFamilies, setEntityFamilies] = useState<LookupItem[]>([])
  const [attackTypes, setAttackTypes] = useState<LookupItem[]>([])

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Action
  const [action, setAction] = useState<BulkAction>('assign_type')
  const [payloadTypeId, setPayloadTypeId] = useState<string>('')
  const [payloadFamilyId, setPayloadFamilyId] = useState<string>('')
  const [payloadAttackTypeIds, setPayloadAttackTypeIds] = useState<Set<number>>(new Set())
  const [payloadPrimaryId, setPayloadPrimaryId] = useState<string>('')
  const [payloadFamilyName, setPayloadFamilyName] = useState('')
  const [payloadFamilyDisplayName, setPayloadFamilyDisplayName] = useState('')

  // UI
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Fetch lookups once
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [typesRes, familiesRes, attackRes] = await Promise.all([
          api.get('/api/admin/classification/entity-types'),
          api.get('/api/admin/classification/entity-families'),
          api.get('/api/admin/classification/attack-types'),
        ])
        if (typesRes.ok) {
          const d = await typesRes.json()
          setEntityTypes(Array.isArray(d) ? d : d.items || [])
        }
        if (familiesRes.ok) {
          const d = await familiesRes.json()
          setEntityFamilies(Array.isArray(d) ? d : d.items || [])
        }
        if (attackRes.ok) {
          const d = await attackRes.json()
          setAttackTypes(Array.isArray(d) ? d : d.items || [])
        }
      } catch { /* ignore */ }
    }
    fetchLookups()
  }, [])

  const fetchEntities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (searchText) params.set('search', searchText)
      if (filterTypeId) params.set('entity_type_id', filterTypeId)
      if (filterFamilyId) params.set('entity_family_id', filterFamilyId)
      const res = await api.get(`/api/admin/classification/bulk-assign/entities?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setEntities(data)
          setTotal(data.length)
        } else {
          setEntities(data.items || [])
          setTotal(data.total || data.items?.length || 0)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, searchText, filterTypeId, filterFamilyId])

  useEffect(() => { fetchEntities() }, [fetchEntities])

  // Selection helpers
  const allSelected = entities.length > 0 && entities.every(e => selectedIds.has(e.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entities.map(e => e.id)))
    }
  }

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAttackType = (id: number) => {
    setPayloadAttackTypeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Build payload
  const buildPayload = (): Record<string, unknown> => {
    switch (action) {
      case 'assign_type':
        return { entity_type_id: Number(payloadTypeId) }
      case 'assign_family':
        return { entity_family_id: Number(payloadFamilyId) }
      case 'add_attack_types':
      case 'replace_attack_types':
        return { attack_type_ids: Array.from(payloadAttackTypeIds) }
      case 'set_primary':
        return { attack_type_id: Number(payloadPrimaryId) }
      case 'create_family':
        return { name: payloadFamilyName, display_name: payloadFamilyDisplayName }
    }
  }

  const handleApply = async () => {
    setConfirmOpen(false)
    setApplying(true)
    try {
      const res = await api.post('/api/admin/classification/bulk-assign', {
        entity_ids: Array.from(selectedIds),
        action,
        payload: buildPayload(),
      })
      if (res.ok) {
        const data = await res.json()
        const successCount = data.success ?? data.updated ?? selectedIds.size
        const skipCount = data.skipped ?? 0
        const errorCount = data.errors ?? 0
        setMessage({
          type: 'success',
          text: `Done. Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`,
        })
        setSelectedIds(new Set())
        await fetchEntities()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Bulk operation failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    }
    setApplying(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const renderSubForm = () => {
    switch (action) {
      case 'assign_type':
        return (
          <select className="form-select" value={payloadTypeId} onChange={e => setPayloadTypeId(e.target.value)} style={{ width: 180 }}>
            <option value="">-- Select Type --</option>
            {entityTypes.map(t => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}
          </select>
        )
      case 'assign_family':
        return (
          <select className="form-select" value={payloadFamilyId} onChange={e => setPayloadFamilyId(e.target.value)} style={{ width: 180 }}>
            <option value="">-- Select Family --</option>
            {entityFamilies.map(f => <option key={f.id} value={f.id}>{f.display_name || f.name}</option>)}
          </select>
        )
      case 'add_attack_types':
      case 'replace_attack_types':
        return (
          <div className="cls-attack-checkboxes">
            {attackTypes.map(at => (
              <label key={at.id} className="cls-checkbox-label">
                <input
                  type="checkbox"
                  checked={payloadAttackTypeIds.has(at.id)}
                  onChange={() => toggleAttackType(at.id)}
                />
                {at.display_name || at.name}
              </label>
            ))}
          </div>
        )
      case 'set_primary':
        return (
          <select className="form-select" value={payloadPrimaryId} onChange={e => setPayloadPrimaryId(e.target.value)} style={{ width: 180 }}>
            <option value="">-- Select Attack Type --</option>
            {attackTypes.map(at => <option key={at.id} value={at.id}>{at.display_name || at.name}</option>)}
          </select>
        )
      case 'create_family':
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="form-input" placeholder="name (snake_case)" value={payloadFamilyName} onChange={e => setPayloadFamilyName(e.target.value)} style={{ width: 150 }} />
            <input className="form-input" placeholder="Display Name" value={payloadFamilyDisplayName} onChange={e => setPayloadFamilyDisplayName(e.target.value)} style={{ width: 180 }} />
          </div>
        )
    }
  }

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="editor-filters cls-bulk-filters">
        <input
          className="form-input"
          placeholder="Search entities..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setPage(1) }}
          style={{ width: 200 }}
        />
        <select className="form-select" value={filterTypeId} onChange={e => { setFilterTypeId(e.target.value); setPage(1) }} style={{ width: 160 }}>
          <option value="">All Types</option>
          {entityTypes.map(t => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}
        </select>
        <select className="form-select" value={filterFamilyId} onChange={e => { setFilterFamilyId(e.target.value); setPage(1) }} style={{ width: 160 }}>
          <option value="">All Families</option>
          {entityFamilies.map(f => <option key={f.id} value={f.id}>{f.display_name || f.name}</option>)}
        </select>
      </div>

      {/* Action bar */}
      <div className="cls-action-bar">
        <select className="form-select" value={action} onChange={e => setAction(e.target.value as BulkAction)} style={{ width: 200 }}>
          {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {renderSubForm()}
        <button
          className="btn btn-primary"
          disabled={selectedIds.size === 0 || applying}
          onClick={() => setConfirmOpen(true)}
        >
          {applying ? 'Applying...' : `Apply (${selectedIds.size})`}
        </button>
      </div>

      {/* Entity table */}
      {loading ? (
        <div className="editor-loading">Loading entities...</div>
      ) : entities.length === 0 ? (
        <div className="editor-empty">No entities found.</div>
      ) : (
        <>
          <div className="editor-table-wrapper">
            <table className="editor-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Family</th>
                  <th>Attacks</th>
                  <th>Stats</th>
                  <th>Visual</th>
                </tr>
              </thead>
              <tbody>
                {entities.map(e => (
                  <tr key={e.id} className={selectedIds.has(e.id) ? 'row-selected' : ''}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleOne(e.id)} />
                    </td>
                    <td>{e.canonical_name}</td>
                    <td>{e.entity_type_name || <span className="cls-missing-tag">--</span>}</td>
                    <td>{e.entity_family_name || <span className="cls-missing-tag">--</span>}</td>
                    <td>{e.attack_type_count}</td>
                    <td>{e.has_stat_block ? <span className="cls-status-yes">&#10003;</span> : <span className="cls-status-no">&#10007;</span>}</td>
                    <td>{e.visual_behavior_name || <span className="cls-missing-tag">--</span>}</td>
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

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="cls-modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="cls-modal-content cls-modal-sm" onClick={e => e.stopPropagation()}>
            <h3>Confirm Bulk Action</h3>
            <p>
              Apply <strong>{ACTION_OPTIONS.find(o => o.value === action)?.label}</strong> to <strong>{selectedIds.size}</strong> entities?
            </p>
            <div className="form-actions">
              <button className="btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApply}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
