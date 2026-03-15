import { useState } from 'react'
import { api } from '../../api'

interface PresetApplyModalProps {
  preset: {
    id: number
    name: string
    description?: string | null
    difficulty_curve_id?: number | null
    difficulty_curve_name?: string | null
    wave_preset_id?: number | null
    wave_preset_name?: string | null
    config_snapshot: Record<string, any>
  }
  currentConfig: Record<string, any>
  onClose: () => void
  onApplied: () => void
}

export default function PresetApplyModal({ preset, currentConfig, onClose, onApplied }: PresetApplyModalProps) {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changes: { key: string; oldVal: any; newVal: any }[] = []
  for (const [key, newVal] of Object.entries(preset.config_snapshot || {})) {
    const oldVal = currentConfig[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ key, oldVal, newVal })
    }
  }

  const handleApply = async () => {
    setApplying(true)
    setError(null)
    try {
      const res = await api.post(`/api/admin/scaling/presets/${preset.id}/apply`)
      if (res.ok) {
        onApplied()
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.detail || 'Failed to apply preset')
      }
    } catch {
      setError('Network error')
    }
    setApplying(false)
  }

  const formatValue = (v: any) => {
    if (v === undefined || v === null) return '(not set)'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div className="modal-content" style={{
        background: 'var(--color-bg, #1a1a2e)',
        border: '1px solid var(--color-border, #333)',
        borderRadius: 8,
        padding: 24,
        maxWidth: 700,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Apply Preset: {preset.name}</h3>

        {/* Warning banner */}
        <div style={{
          padding: '10px 14px',
          marginBottom: 16,
          background: 'rgba(204, 153, 0, 0.12)',
          border: '1px solid rgba(204, 153, 0, 0.4)',
          borderRadius: 4,
          fontSize: '13px',
          fontWeight: 600,
          color: '#cc9900',
        }}>
          Warning: This will affect live gameplay immediately.
        </div>

        {preset.description && (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            {preset.description}
          </p>
        )}

        {/* Curve / Wave changes */}
        {(preset.difficulty_curve_id || preset.wave_preset_id) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: 6 }}>System Assignments</div>
            {preset.difficulty_curve_id && (
              <div style={{ fontSize: '13px', marginBottom: 4 }}>
                Difficulty Curve: <strong>{preset.difficulty_curve_name || `#${preset.difficulty_curve_id}`}</strong> (applied to all books)
              </div>
            )}
            {preset.wave_preset_id && (
              <div style={{ fontSize: '13px', marginBottom: 4 }}>
                Wave Preset Default: <strong>{preset.wave_preset_name || `#${preset.wave_preset_id}`}</strong>
              </div>
            )}
          </div>
        )}

        {/* Config changes */}
        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: 8 }}>
          Game Config Changes ({changes.length} of {Object.keys(preset.config_snapshot || {}).length} keys differ)
        </div>

        {changes.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            No config value differences detected.
          </p>
        ) : (
          <div className="editor-table-wrapper" style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
            <table className="editor-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Current</th>
                  <th></th>
                  <th>New</th>
                </tr>
              </thead>
              <tbody>
                {changes.map(c => (
                  <tr key={c.key}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.key}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#cc6666' }}>{formatValue(c.oldVal)}</td>
                    <td style={{ textAlign: 'center', fontSize: '12px' }}>&rarr;</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#66cc66' }}>{formatValue(c.newVal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <div className="editor-message editor-message--error" style={{ marginBottom: 12 }}>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} disabled={applying}>Cancel</button>
          <button className="btn btn-danger" onClick={handleApply} disabled={applying}>
            {applying ? 'Applying...' : 'Apply Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
