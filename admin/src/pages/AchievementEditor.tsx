import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './AchievementEditor.css'

interface AchievementListItem {
  id: number
  name: string
  description: string
  category: string
  tracking_type: string
  tracking_source: string
  threshold_value: number
  parent_achievement_id: number | null
  reward_shards: number
  reward_essence: number
  reward_title_id: number | null
  sort_order: number
  is_active: boolean
  completed_count: number
  total_tracked: number
}

interface AchievementDetail extends AchievementListItem {
  icon_sprite_key: string
  reward_title_name: string | null
  in_progress_count: number
  children: { id: number; name: string; threshold_value: number }[]
}

interface Analytics {
  total_achievements: number
  total_completions: number
  category_stats: Record<string, { total: number; total_completions: number }>
  most_completed: { id: number; name: string; completions: number }[]
}

const CATEGORIES = ['combat', 'narrative', 'collection', 'training', 'social', 'exploration']
const TRACKING_TYPES = ['cumulative', 'milestone', 'unique']

export default function AchievementEditor() {
  const [achievements, setAchievements] = useState<AchievementListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AchievementDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('combat')
  const [editIcon, setEditIcon] = useState('achievement_default')
  const [editTrackingType, setEditTrackingType] = useState('cumulative')
  const [editTrackingSource, setEditTrackingSource] = useState('')
  const [editThreshold, setEditThreshold] = useState('1')
  const [editParentId, setEditParentId] = useState('')
  const [editRewardShards, setEditRewardShards] = useState('0')
  const [editRewardEssence, setEditRewardEssence] = useState('0')
  const [editRewardTitleId, setEditRewardTitleId] = useState('')
  const [editSortOrder, setEditSortOrder] = useState('0')
  const [editIsActive, setEditIsActive] = useState(true)

  // Override state
  const [overridePlayerId, setOverridePlayerId] = useState('')
  const [overrideAction, setOverrideAction] = useState<'grant' | 'revoke'>('grant')

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/achievements')
      if (res.ok) setAchievements(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  const fetchDetail = async (id: number) => {
    try {
      const res = await api.get(`/api/admin/achievements/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelected(data)
        populateForm(data)
      }
    } catch {}
  }

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/api/admin/achievements/analytics')
      if (res.ok) setAnalytics(await res.json())
    } catch {}
  }

  const populateForm = (data: AchievementDetail) => {
    setEditName(data.name)
    setEditDescription(data.description)
    setEditCategory(data.category)
    setEditIcon(data.icon_sprite_key)
    setEditTrackingType(data.tracking_type)
    setEditTrackingSource(data.tracking_source)
    setEditThreshold(data.threshold_value.toString())
    setEditParentId(data.parent_achievement_id?.toString() || '')
    setEditRewardShards(data.reward_shards.toString())
    setEditRewardEssence(data.reward_essence.toString())
    setEditRewardTitleId(data.reward_title_id?.toString() || '')
    setEditSortOrder(data.sort_order.toString())
    setEditIsActive(data.is_active)
  }

  const startCreate = () => {
    setSelected(null)
    setEditing(false)
    setCreating(true)
    setMessage('')
    setEditName('')
    setEditDescription('')
    setEditCategory('combat')
    setEditIcon('achievement_default')
    setEditTrackingType('cumulative')
    setEditTrackingSource('')
    setEditThreshold('1')
    setEditParentId('')
    setEditRewardShards('0')
    setEditRewardEssence('0')
    setEditRewardTitleId('')
    setEditSortOrder('0')
    setEditIsActive(true)
  }

  const buildPayload = () => ({
    name: editName,
    description: editDescription,
    category: editCategory,
    icon_sprite_key: editIcon,
    tracking_type: editTrackingType,
    tracking_source: editTrackingSource,
    threshold_value: parseFloat(editThreshold),
    parent_achievement_id: editParentId ? parseInt(editParentId) : null,
    reward_shards: parseInt(editRewardShards),
    reward_essence: parseInt(editRewardEssence),
    reward_title_id: editRewardTitleId ? parseInt(editRewardTitleId) : null,
    sort_order: parseInt(editSortOrder),
    is_active: editIsActive,
  })

  const handleCreate = async () => {
    if (!editName.trim()) { setMessage('Name is required'); return }
    setSaving(true)
    setMessage('')
    try {
      const res = await api.post('/api/admin/achievements', buildPayload())
      if (res.ok) {
        const data = await res.json()
        setMessage(`Created achievement #${data.id}`)
        setCreating(false)
        fetchList()
        fetchDetail(data.id)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setMessage('')
    try {
      const res = await api.put(`/api/admin/achievements/${selected.id}`, buildPayload())
      if (res.ok) {
        setMessage('Saved')
        setEditing(false)
        fetchList()
        fetchDetail(selected.id)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selected || !confirm(`Deactivate "${selected.name}"?`)) return
    try {
      const res = await api.delete(`/api/admin/achievements/${selected.id}`)
      if (res.ok) {
        setMessage('Deactivated')
        setSelected(null)
        setEditing(false)
        fetchList()
      }
    } catch { setMessage('Network error') }
  }

  const handleOverride = async () => {
    if (!selected || !overridePlayerId) return
    setSaving(true)
    setMessage('')
    try {
      const res = await api.post('/api/admin/achievements/player-override', {
        player_id: parseInt(overridePlayerId),
        achievement_id: selected.id,
        action: overrideAction,
      })
      if (res.ok) {
        setMessage(`${overrideAction === 'grant' ? 'Granted' : 'Revoked'} for player #${overridePlayerId}`)
        setOverridePlayerId('')
        fetchDetail(selected.id)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const filtered = filterCategory
    ? achievements.filter(a => a.category === filterCategory)
    : achievements

  if (loading) return <div className="ache-loading">Loading achievements...</div>

  return (
    <div className="ache-page">
      <div className="ache-header">
        <h2>Achievement Editor</h2>
        <div className="ache-header-actions">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="ache-btn" onClick={() => { setShowAnalytics(!showAnalytics); if (!analytics) fetchAnalytics() }}>
            {showAnalytics ? 'Hide Analytics' : 'Analytics'}
          </button>
          <button className="ache-btn ache-btn-primary" onClick={startCreate}>+ New Achievement</button>
        </div>
      </div>

      {message && <div className="ache-message">{message}</div>}

      {showAnalytics && analytics && (
        <div className="ache-analytics">
          <div className="ache-analytics-row">
            <div className="ache-stat"><span className="ache-stat-val">{analytics.total_achievements}</span><span className="ache-stat-label">Achievements</span></div>
            <div className="ache-stat"><span className="ache-stat-val">{analytics.total_completions}</span><span className="ache-stat-label">Total Completions</span></div>
          </div>
          <div className="ache-analytics-cats">
            {Object.entries(analytics.category_stats).map(([cat, s]) => (
              <div key={cat} className="ache-cat-stat">
                <span className="ache-cat-name">{cat}</span>
                <span>{s.total} achievements, {s.total_completions} completions</span>
              </div>
            ))}
          </div>
          {analytics.most_completed.length > 0 && (
            <div className="ache-most-completed">
              <strong>Most Completed:</strong>
              {analytics.most_completed.map(m => (
                <span key={m.id} className="ache-mc-item">{m.name} ({m.completions})</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ache-layout">
        <div className="ache-list-panel">
          <table className="ache-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Threshold</th>
                <th>Rewards</th>
                <th>Done</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ach => (
                <tr
                  key={ach.id}
                  className={selected?.id === ach.id ? 'ache-row--selected' : ''}
                  onClick={() => { fetchDetail(ach.id); setEditing(false); setCreating(false) }}
                >
                  <td className="ache-name">{ach.name}</td>
                  <td><span className={`ache-cat--${ach.category}`}>{ach.category}</span></td>
                  <td>{ach.threshold_value}</td>
                  <td>
                    {ach.reward_shards > 0 && <span className="ache-reward-badge ache-reward-shards">{ach.reward_shards}S</span>}
                    {ach.reward_essence > 0 && <span className="ache-reward-badge ache-reward-essence">{ach.reward_essence}E</span>}
                    {ach.reward_title_id && <span className="ache-reward-badge ache-reward-title">T</span>}
                  </td>
                  <td>{ach.completed_count}</td>
                  <td>{ach.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="ache-empty">No achievements found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ache-detail-panel">
          {(editing || creating) ? renderEditForm() : selected ? renderDetail() : (
            <div className="ache-empty-detail">Select an achievement or create a new one.</div>
          )}
        </div>
      </div>
    </div>
  )

  function renderDetail() {
    if (!selected) return null
    return (
      <div className="ache-detail">
        <div className="ache-detail-header">
          <h3>{selected.name}</h3>
          <div className="ache-detail-actions">
            <button className="ache-btn" onClick={() => setEditing(true)}>Edit</button>
            <button className="ache-btn ache-btn-danger" onClick={handleDelete}>Deactivate</button>
          </div>
        </div>
        <div className="ache-detail-grid">
          <div className="ache-field"><label>Description</label><p>{selected.description}</p></div>
          <div className="ache-field"><label>Category</label><p className={`ache-cat--${selected.category}`}>{selected.category}</p></div>
          <div className="ache-field"><label>Tracking</label><p>{selected.tracking_type}: {selected.tracking_source}</p></div>
          <div className="ache-field"><label>Threshold</label><p>{selected.threshold_value}</p></div>
          <div className="ache-field"><label>Parent</label><p>{selected.parent_achievement_id || '—'}</p></div>
          <div className="ache-field"><label>Icon</label><p>{selected.icon_sprite_key}</p></div>
          <div className="ache-field"><label>Shards</label><p>{selected.reward_shards}</p></div>
          <div className="ache-field"><label>Essence</label><p>{selected.reward_essence}</p></div>
          <div className="ache-field"><label>Title</label><p>{selected.reward_title_name || '—'}</p></div>
          <div className="ache-field"><label>Completed</label><p>{selected.completed_count}</p></div>
          <div className="ache-field"><label>In Progress</label><p>{selected.in_progress_count}</p></div>
          <div className="ache-field"><label>Active</label><p>{selected.is_active ? 'Yes' : 'No'}</p></div>
        </div>

        {selected.children.length > 0 && (
          <>
            <h4>Child Achievements</h4>
            <ul className="ache-children">
              {selected.children.map(c => (
                <li key={c.id}>
                  <span className="ache-name" onClick={() => fetchDetail(c.id)} style={{ cursor: 'pointer' }}>
                    {c.name}
                  </span> — threshold: {c.threshold_value}
                </li>
              ))}
            </ul>
          </>
        )}

        <h4>Player Override</h4>
        <div className="ache-override">
          <input
            type="number"
            placeholder="Player ID"
            value={overridePlayerId}
            onChange={e => setOverridePlayerId(e.target.value)}
          />
          <select value={overrideAction} onChange={e => setOverrideAction(e.target.value as 'grant' | 'revoke')}>
            <option value="grant">Grant</option>
            <option value="revoke">Revoke</option>
          </select>
          <button className="ache-btn ache-btn-primary" onClick={handleOverride} disabled={saving || !overridePlayerId}>
            {saving ? 'Processing...' : 'Apply'}
          </button>
        </div>
      </div>
    )
  }

  function renderEditForm() {
    return (
      <div className="ache-edit-form">
        <h3>{creating ? 'New Achievement' : `Editing: ${selected?.name}`}</h3>
        <div className="ache-form-row">
          <label>Name</label>
          <input value={editName} onChange={e => setEditName(e.target.value)} />
        </div>
        <div className="ache-form-row">
          <label>Description</label>
          <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} />
        </div>
        <div className="ache-form-row">
          <label>Category</label>
          <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="ache-form-row">
          <label>Icon Sprite Key</label>
          <input value={editIcon} onChange={e => setEditIcon(e.target.value)} />
        </div>
        <div className="ache-form-row">
          <label>Tracking Type</label>
          <select value={editTrackingType} onChange={e => setEditTrackingType(e.target.value)}>
            {TRACKING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="ache-form-row">
          <label>Tracking Source</label>
          <input value={editTrackingSource} onChange={e => setEditTrackingSource(e.target.value)} placeholder="e.g. total_enemies_killed" />
        </div>
        <div className="ache-form-row">
          <label>Threshold Value</label>
          <input type="number" value={editThreshold} onChange={e => setEditThreshold(e.target.value)} />
        </div>
        <div className="ache-form-row">
          <label>Parent Achievement ID</label>
          <input type="number" value={editParentId} onChange={e => setEditParentId(e.target.value)} placeholder="Optional" />
        </div>
        <div className="ache-form-row">
          <label>Reward Shards</label>
          <input type="number" value={editRewardShards} onChange={e => setEditRewardShards(e.target.value)} />
        </div>
        <div className="ache-form-row">
          <label>Reward Essence</label>
          <input type="number" value={editRewardEssence} onChange={e => setEditRewardEssence(e.target.value)} />
        </div>
        <div className="ache-form-row">
          <label>Reward Title ID</label>
          <input type="number" value={editRewardTitleId} onChange={e => setEditRewardTitleId(e.target.value)} placeholder="Optional" />
        </div>
        <div className="ache-form-row">
          <label>Sort Order</label>
          <input type="number" value={editSortOrder} onChange={e => setEditSortOrder(e.target.value)} />
        </div>
        <div className="ache-form-row ache-form-checkbox">
          <label>
            <input type="checkbox" checked={editIsActive} onChange={e => setEditIsActive(e.target.checked)} />
            Active
          </label>
        </div>

        <div className="ache-detail-actions">
          {creating ? (
            <button className="ache-btn ache-btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          ) : (
            <button className="ache-btn ache-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button className="ache-btn" onClick={() => { setEditing(false); setCreating(false); if (selected) populateForm(selected) }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }
}
