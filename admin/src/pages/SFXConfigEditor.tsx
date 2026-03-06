import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import { useSFXPreview } from './AtmosphereEditor'
import './SFXConfigEditor.css'

interface SFXConfig {
  id: number
  config_key: string
  category: string
  display_name: string | null
  preset_definition: any
  base_volume: number
  pitch_variation: number
  spatial_enabled: boolean
}

export default function SFXConfigEditor() {
  const [configs, setConfigs] = useState<SFXConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editJson, setEditJson] = useState('')
  const [editVolume, setEditVolume] = useState(1.0)
  const [editPitch, setEditPitch] = useState(0.0)
  const [editSpatial, setEditSpatial] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const preview = useSFXPreview()

  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/audio-configs')
      if (res.ok) setConfigs(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfigs() }, [fetchConfigs])

  const startEdit = (cfg: SFXConfig) => {
    setEditingId(cfg.id)
    setEditJson(JSON.stringify(cfg.preset_definition, null, 2))
    setEditVolume(cfg.base_volume)
    setEditPitch(cfg.pitch_variation)
    setEditSpatial(cfg.spatial_enabled)
    setEditDisplayName(cfg.display_name || '')
    setEditCategory(cfg.category)
    setMessage('')
  }

  const handleSave = async () => {
    if (editingId === null) return
    setSaving(true)
    setMessage('')

    let parsedDef: any
    try {
      parsedDef = JSON.parse(editJson)
    } catch {
      setMessage('Invalid JSON in preset definition')
      setSaving(false)
      return
    }

    try {
      const res = await api.put(`/api/admin/audio-configs/${editingId}`, {
        preset_definition: parsedDef,
        base_volume: editVolume,
        pitch_variation: editPitch,
        spatial_enabled: editSpatial,
        display_name: editDisplayName || null,
        category: editCategory,
      })
      if (res.ok) {
        setMessage('Saved')
        setEditingId(null)
        fetchConfigs()
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const handlePreview = (cfg: SFXConfig) => {
    preview.play(cfg.preset_definition, cfg.base_volume)
  }

  const handlePreviewEdit = () => {
    try {
      const parsed = JSON.parse(editJson)
      preview.play(parsed, editVolume)
    } catch {
      setMessage('Invalid JSON — cannot preview')
    }
  }

  if (loading) return <div className="sfx-loading">Loading SFX configs...</div>

  return (
    <div className="sfx-page">
      <h2>SFX Config Editor</h2>

      <table className="sfx-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Display Name</th>
            <th>Category</th>
            <th>Volume</th>
            <th>Pitch Var</th>
            <th>Spatial</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {configs.map(cfg => (
            <tr key={cfg.id} className={editingId === cfg.id ? 'sfx-row--editing' : ''}>
              <td className="sfx-key">{cfg.config_key}</td>
              <td>{cfg.display_name || '—'}</td>
              <td>{cfg.category}</td>
              <td>{cfg.base_volume}</td>
              <td>{cfg.pitch_variation}</td>
              <td>{cfg.spatial_enabled ? 'Yes' : 'No'}</td>
              <td className="sfx-actions">
                <button className="sfx-btn" onClick={() => handlePreview(cfg)} title="Preview">Play</button>
                <button className="sfx-btn" onClick={() => startEdit(cfg)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingId !== null && (
        <div className="sfx-edit-panel">
          <h3>
            Editing: {configs.find(c => c.id === editingId)?.config_key}
          </h3>
          <div className="sfx-edit-grid">
            <div className="sfx-edit-row">
              <label>Display Name</label>
              <input type="text" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
            </div>
            <div className="sfx-edit-row">
              <label>Category</label>
              <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} />
            </div>
            <div className="sfx-edit-row">
              <label>Base Volume</label>
              <input type="number" step="0.05" min="0" max="1" value={editVolume} onChange={e => setEditVolume(Number(e.target.value))} />
            </div>
            <div className="sfx-edit-row">
              <label>Pitch Variation</label>
              <input type="number" step="0.01" min="0" max="1" value={editPitch} onChange={e => setEditPitch(Number(e.target.value))} />
            </div>
            <div className="sfx-edit-row">
              <label>Spatial Enabled</label>
              <select value={String(editSpatial)} onChange={e => setEditSpatial(e.target.value === 'true')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="sfx-edit-row">
            <label>Preset Definition (JSON)</label>
            <textarea
              className="sfx-json-editor"
              value={editJson}
              onChange={e => setEditJson(e.target.value)}
              rows={12}
              spellCheck={false}
            />
          </div>

          <div className="sfx-edit-actions">
            <button className="sfx-btn" onClick={handlePreviewEdit}>Preview</button>
            <button className="sfx-btn" onClick={() => { setEditingId(null); setMessage('') }}>Cancel</button>
            <button className="sfx-btn sfx-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {message && <div className="sfx-message">{message}</div>}
        </div>
      )}
    </div>
  )
}
