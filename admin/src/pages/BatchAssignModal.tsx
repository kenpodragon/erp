import { useState } from 'react'
import { api } from '../api'
import type { AtmosphereListItem } from './useAtmosphereEditor'

interface BatchAssignProps {
  atmospheres: AtmosphereListItem[]
  onClose: () => void
  onAssigned: () => void
}

export default function BatchAssignModal({ atmospheres, onClose, onAssigned }: BatchAssignProps) {
  const [targetType, setTargetType] = useState<'chapter' | 'book'>('chapter')
  const [targetId, setTargetId] = useState('')
  const [atmosphereId, setAtmosphereId] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleAssign = async () => {
    if (!targetId || !atmosphereId) return
    setSaving(true)
    try {
      const res = await api.post('/api/admin/atmospheres/batch-assign', {
        target_type: targetType,
        target_id: parseInt(targetId),
        atmosphere_id: parseInt(atmosphereId),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(`Updated ${data.scenes_updated} scenes`)
        onAssigned()
      } else {
        const err = await res.json()
        setResult(`Error: ${err.detail}`)
      }
    } catch {
      setResult('Network error')
    }
    setSaving(false)
  }

  return (
    <div className="ae-modal-backdrop" onClick={onClose}>
      <div className="ae-modal" onClick={e => e.stopPropagation()}>
        <h3>Batch Assign Atmosphere</h3>
        <div className="ae-form-row">
          <label>Target Type</label>
          <select value={targetType} onChange={e => setTargetType(e.target.value as 'chapter' | 'book')}>
            <option value="chapter">Chapter</option>
            <option value="book">Book</option>
          </select>
        </div>
        <div className="ae-form-row">
          <label>Target ID</label>
          <input type="number" value={targetId} onChange={e => setTargetId(e.target.value)} placeholder={`${targetType} ID`} />
        </div>
        <div className="ae-form-row">
          <label>Atmosphere</label>
          <select value={atmosphereId} onChange={e => setAtmosphereId(e.target.value)}>
            <option value="">Select...</option>
            {atmospheres.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.archetype})</option>
            ))}
          </select>
        </div>
        {result && <div className="ae-result">{result}</div>}
        <div className="ae-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="ae-btn-primary" onClick={handleAssign} disabled={saving || !targetId || !atmosphereId}>
            {saving ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}
