import { useState, useEffect } from 'react'
import { api } from '../../api'

interface PreviewEntity {
  entity_id: number
  entity_name: string
  family_name: string | null
  primary_attack_type: string | null
  current_stats: Record<string, number> | null
  proposed_stats: Record<string, number> | null
  status: 'ready' | 'skipped'
  warning: string | null
}

interface Props {
  entityIds: number[]
  onClose: () => void
}

export default function TemplateApplyModal({ entityIds, onClose }: Props) {
  const [previews, setPreviews] = useState<PreviewEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  useEffect(() => {
    const fetchPreviews = async () => {
      setLoading(true)
      try {
        const res = await api.post('/api/admin/classification/apply-template', {
          entity_ids: entityIds,
          preview_only: true,
        })
        if (res.ok) {
          const data = await res.json()
          setPreviews(data.previews || data.items || data || [])
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to load previews' })
        }
      } catch {
        setMessage({ type: 'error', text: 'Network error' })
      }
      setLoading(false)
    }
    fetchPreviews()
  }, [entityIds])

  const readyCount = previews.filter(p => p.status === 'ready').length
  const skippedCount = previews.filter(p => p.status === 'skipped').length

  const handleApply = async () => {
    setApplying(true)
    try {
      const res = await api.post('/api/admin/classification/apply-template', {
        entity_ids: entityIds,
        preview_only: false,
      })
      if (res.ok) {
        const data = await res.json()
        const applied = data.applied ?? readyCount
        setMessage({ type: 'success', text: `Templates applied to ${applied} entities.` })
        setTimeout(onClose, 1200)
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to apply templates' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    }
    setApplying(false)
  }

  const renderStats = (stats: Record<string, number> | null, label: string) => {
    if (!stats) return <div className="cls-stat-preview-empty">{label}: --</div>
    return (
      <div className="cls-stat-preview">
        <div className="cls-stat-preview-label">{label}</div>
        <div className="cls-stat-preview-grid">
          {Object.entries(stats).map(([key, val]) => (
            <span key={key} className="cls-stat-pill">{key}: {val}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="cls-modal-overlay" onClick={onClose}>
      <div className="cls-modal-content cls-modal-lg" onClick={e => e.stopPropagation()}>
        <h3>Apply Templates</h3>

        {message && (
          <div className={`editor-message editor-message--${message.type}`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)}>x</button>
          </div>
        )}

        {loading ? (
          <div className="editor-loading">Loading previews...</div>
        ) : previews.length === 0 ? (
          <div className="editor-empty">No entities to preview.</div>
        ) : (
          <div className="cls-template-previews">
            {previews.map(p => (
              <div key={p.entity_id} className={`cls-template-card ${p.status === 'skipped' ? 'cls-template-card--skipped' : ''}`}>
                <div className="cls-template-card-header">
                  <strong>{p.entity_name}</strong>
                  {p.family_name && <span className="badge badge--info">{p.family_name}</span>}
                  {p.primary_attack_type && <span className="badge">{p.primary_attack_type}</span>}
                  <span className={`cls-template-status cls-template-status--${p.status}`}>
                    {p.status === 'ready' ? 'Ready to apply' : 'Skipped'}
                  </span>
                </div>
                {p.warning && <div className="cls-template-warning">{p.warning}</div>}
                <div className="cls-template-card-body">
                  {renderStats(p.current_stats, 'Current')}
                  {renderStats(p.proposed_stats, 'Proposed')}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cls-modal-footer">
          <span className="cls-template-summary">
            Ready: {readyCount} / {previews.length}. Skipped: {skippedCount}
          </span>
          <div className="form-actions">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleApply}
              disabled={applying || readyCount === 0}
            >
              {applying ? 'Applying...' : `Apply ${readyCount} Templates`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
