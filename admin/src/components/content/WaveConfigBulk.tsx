import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import CascadingPicker from './shared/CascadingPicker'

interface ScenePreview {
  scene_id: number
  scene_number: number
  title: string | null
  projected_wave_count: number
  projected_hp_multiplier: number
  projected_gold_multiplier: number
  selected: boolean
}

export default function WaveConfigBulk() {
  const [scope, setScope] = useState<'chapter' | 'book'>('chapter')
  const [scopeValue, setScopeValue] = useState<{ bookId?: number; chapterId?: number }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Template form
  const [baseWaveCount, setBaseWaveCount] = useState(3)
  const [baseMaxEnemies, setBaseMaxEnemies] = useState(5)
  const [baseSpawnInterval, setBaseSpawnInterval] = useState(1000)
  const [baseScalingFactor, setBaseScalingFactor] = useState(1.0)
  const [baseHpMultiplier, setBaseHpMultiplier] = useState(1.0)
  const [baseGoldMultiplier, setBaseGoldMultiplier] = useState(1.0)
  const [scalingStart, setScalingStart] = useState(1.0)
  const [scalingIncrement, setScalingIncrement] = useState(0.1)

  // Preview
  const [previews, setPreviews] = useState<ScenePreview[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  // Bulk multiplier
  const [bulkHpMult, setBulkHpMult] = useState(1.0)
  const [bulkGoldMult, setBulkGoldMult] = useState(1.0)
  const [bulkScenes, setBulkScenes] = useState<ScenePreview[]>([])

  const fetchScenes = useCallback(async () => {
    const scopeId = scope === 'chapter' ? scopeValue.chapterId : scopeValue.bookId
    if (!scopeId) { setPreviews([]); setBulkScenes([]); return }

    setPreviewLoading(true)
    try {
      const params = new URLSearchParams()
      if (scope === 'chapter') params.set('chapter_id', String(scopeId))
      else params.set('book_id', String(scopeId))
      const res = await api.get(`/api/admin/content/scenes?${params}`)
      if (res.ok) {
        const data = await res.json()
        const scenes = (Array.isArray(data) ? data : data.items || []).map((s: any, i: number) => ({
          scene_id: s.id,
          scene_number: s.scene_number,
          title: s.title,
          projected_wave_count: baseWaveCount + Math.floor(i * scalingIncrement),
          projected_hp_multiplier: +(baseHpMultiplier + i * scalingIncrement).toFixed(2),
          projected_gold_multiplier: +(baseGoldMultiplier + i * scalingIncrement).toFixed(2),
          selected: true,
        }))
        setPreviews(scenes)
        setBulkScenes(scenes)
      }
    } catch { /* ignore */ }
    setPreviewLoading(false)
  }, [scope, scopeValue, baseWaveCount, baseHpMultiplier, baseGoldMultiplier, scalingIncrement])

  useEffect(() => { fetchScenes() }, [fetchScenes])

  const applyTemplate = async () => {
    const scopeId = scope === 'chapter' ? scopeValue.chapterId : scopeValue.bookId
    if (!scopeId) return
    setSaving(true)
    try {
      const res = await api.post('/api/admin/content/wave-configs/bulk-template', {
        scope,
        scope_id: scopeId,
        base_wave_count: baseWaveCount,
        base_max_enemies: baseMaxEnemies,
        base_spawn_interval_ms: baseSpawnInterval,
        base_scaling_factor: baseScalingFactor,
        base_hp_multiplier: baseHpMultiplier,
        base_gold_multiplier: baseGoldMultiplier,
        scaling_start: scalingStart,
        scaling_increment: scalingIncrement,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Template applied successfully' })
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to apply template' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const applyBulkMultipliers = async () => {
    const selectedIds = bulkScenes.filter(s => s.selected).map(s => s.scene_id)
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      const res = await api.patch('/api/admin/content/wave-configs/bulk-multipliers', {
        scene_ids: selectedIds,
        hp_multiplier: bulkHpMult,
        gold_multiplier: bulkGoldMult,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Multipliers updated' })
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to update' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const toggleScene = (sceneId: number) => {
    setBulkScenes(prev => prev.map(s => s.scene_id === sceneId ? { ...s, selected: !s.selected } : s))
  }

  const toggleAll = (checked: boolean) => {
    setBulkScenes(prev => prev.map(s => ({ ...s, selected: checked })))
  }

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      {/* Template Form */}
      <div className="detail-panel">
        <h3>Wave Config Template</h3>

        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Scope</label>
            <select className="form-select" value={scope} onChange={e => setScope(e.target.value as 'chapter' | 'book')}>
              <option value="chapter">Chapter</option>
              <option value="book">Book</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Target</label>
            <CascadingPicker
              level={scope === 'chapter' ? 'chapter' : 'book'}
              value={scopeValue}
              onChange={setScopeValue}
            />
          </div>
        </div>

        <div className="section-header">Base Config</div>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Wave Count</label>
            <input className="form-input" type="number" value={baseWaveCount} onChange={e => setBaseWaveCount(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label className="form-label">Max Enemies/Wave</label>
            <input className="form-input" type="number" value={baseMaxEnemies} onChange={e => setBaseMaxEnemies(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label className="form-label">Spawn Interval (ms)</label>
            <input className="form-input" type="number" value={baseSpawnInterval} onChange={e => setBaseSpawnInterval(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label className="form-label">Scaling Factor</label>
            <input className="form-input" type="number" step="0.1" value={baseScalingFactor} onChange={e => setBaseScalingFactor(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label className="form-label">HP Multiplier</label>
            <input className="form-input" type="number" step="0.1" value={baseHpMultiplier} onChange={e => setBaseHpMultiplier(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label className="form-label">Gold Multiplier</label>
            <input className="form-input" type="number" step="0.1" value={baseGoldMultiplier} onChange={e => setBaseGoldMultiplier(Number(e.target.value))} />
          </div>
        </div>

        <div className="section-header">Scaling</div>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Start Value</label>
            <input className="form-input" type="number" step="0.1" value={scalingStart} onChange={e => setScalingStart(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label className="form-label">Increment Per Scene</label>
            <input className="form-input" type="number" step="0.01" value={scalingIncrement} onChange={e => setScalingIncrement(Number(e.target.value))} />
          </div>
        </div>

        {/* Preview */}
        {previewLoading ? (
          <div className="editor-loading" style={{ padding: '12px' }}>Loading preview...</div>
        ) : previews.length > 0 && (
          <>
            <div className="section-header">Preview</div>
            <div className="editor-table-wrapper" style={{ maxHeight: '250px' }}>
              <table className="editor-table">
                <thead>
                  <tr>
                    <th>Scene</th>
                    <th>Waves</th>
                    <th>HP Mult</th>
                    <th>Gold Mult</th>
                  </tr>
                </thead>
                <tbody>
                  {previews.map(p => (
                    <tr key={p.scene_id}>
                      <td>Scene {p.scene_number}: {p.title || 'Untitled'}</td>
                      <td>{p.projected_wave_count}</td>
                      <td>{p.projected_hp_multiplier}</td>
                      <td>{p.projected_gold_multiplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="form-actions">
          <button className="btn btn-success" onClick={applyTemplate} disabled={saving || !scopeValue.bookId}>
            {saving ? 'Applying...' : 'Apply Template'}
          </button>
        </div>
      </div>

      {/* Bulk Multiplier Adjustment */}
      <div className="detail-panel" style={{ marginTop: '16px' }}>
        <h3>Bulk Multiplier Adjustment</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">HP Multiplier Factor</label>
            <input className="form-input" type="number" step="0.1" value={bulkHpMult} onChange={e => setBulkHpMult(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label className="form-label">Gold Multiplier Factor</label>
            <input className="form-input" type="number" step="0.1" value={bulkGoldMult} onChange={e => setBulkGoldMult(Number(e.target.value))} />
          </div>
        </div>

        {bulkScenes.length > 0 && (
          <>
            <div style={{ marginTop: '8px', marginBottom: '8px' }}>
              <label className="form-checkbox-row">
                <input type="checkbox" checked={bulkScenes.every(s => s.selected)} onChange={e => toggleAll(e.target.checked)} />
                <span style={{ fontSize: '12px' }}>Select All</span>
              </label>
            </div>
            <div className="editor-table-wrapper" style={{ maxHeight: '250px' }}>
              <table className="editor-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Scene</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkScenes.map(s => (
                    <tr key={s.scene_id}>
                      <td><input type="checkbox" checked={s.selected} onChange={() => toggleScene(s.scene_id)} /></td>
                      <td>Scene {s.scene_number}: {s.title || 'Untitled'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="form-actions">
          <button className="btn btn-warning" onClick={applyBulkMultipliers} disabled={saving || bulkScenes.filter(s => s.selected).length === 0}>
            {saving ? 'Applying...' : 'Apply Multipliers'}
          </button>
        </div>
      </div>
    </div>
  )
}
