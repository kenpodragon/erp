import { useState, useEffect } from 'react'
import { api } from '../../api'
import './FinanceTabs.css'

/* ── Types ── */

interface ShopItem {
  id?: number
  item_key: string
  name: string
  description: string
  category: string
  price_shards: number
  icon_asset_key: string
  class_restriction: string | null
  is_active: boolean
  is_featured: boolean
  featured_from: string | null
  featured_until: string | null
  available_from: string | null
  available_until: string | null
  sort_order: number
  item_metadata: Record<string, unknown> | null
}

interface ShopItemModalProps {
  item: ShopItem | null  // null = create mode
  onClose: () => void
  onSaved: () => void
}

const CATEGORIES = ['skin', 'flair', 'badge', 'avatar', 'booster', 'marketplace_permit']
const BOOST_TYPES = ['xp', 'essence', 'drop_rate']

function emptyItem(): ShopItem {
  return {
    item_key: '',
    name: '',
    description: '',
    category: 'skin',
    price_shards: 0,
    icon_asset_key: '',
    class_restriction: null,
    is_active: true,
    is_featured: false,
    featured_from: null,
    featured_until: null,
    available_from: null,
    available_until: null,
    sort_order: 0,
    item_metadata: null,
  }
}

/* ── Component ── */

export default function ShopItemModal({ item, onClose, onSaved }: ShopItemModalProps) {
  const isEdit = item !== null && item.id !== undefined
  const [form, setForm] = useState<ShopItem>(item ?? emptyItem())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Booster-specific fields
  const [boostType, setBoostType] = useState('xp')
  const [boostDuration, setBoostDuration] = useState('3600')
  const [boostMagnitude, setBoostMagnitude] = useState('1.5')

  // Hydrate booster fields from existing metadata
  useEffect(() => {
    if (item?.category === 'booster' && item.item_metadata) {
      const md = item.item_metadata
      if (md.boost_type) setBoostType(String(md.boost_type))
      if (md.duration_seconds) setBoostDuration(String(md.duration_seconds))
      if (md.magnitude) setBoostMagnitude(String(md.magnitude))
    }
  }, [item])

  const setField = <K extends keyof ShopItem>(key: K, val: ShopItem[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    // Build payload
    const payload: Record<string, unknown> = { ...form }

    // Inject booster metadata
    if (form.category === 'booster') {
      payload.item_metadata = {
        boost_type: boostType,
        duration_seconds: parseInt(boostDuration) || 3600,
        magnitude: parseFloat(boostMagnitude) || 1.0,
      }
    }

    // Clean nulls for datetime fields
    for (const k of ['featured_from', 'featured_until', 'available_from', 'available_until']) {
      if (!payload[k]) payload[k] = null
    }

    try {
      const res = isEdit
        ? await api.put(`/api/admin/shop/items/${item!.id}`, payload)
        : await api.post('/api/admin/shop/items', payload)

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `HTTP ${res.status}`)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="ftab-modal-overlay" onClick={onClose}>
      <div className="ftab-modal" onClick={e => e.stopPropagation()}>
        <h3>{isEdit ? 'Edit Shop Item' : 'Create Shop Item'}</h3>

        {error && <div className="ftab-error">{error}</div>}

        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Item Key</label>
            <input value={form.item_key} onChange={e => setField('item_key', e.target.value)} placeholder="unique_item_key" />
          </div>
          <div className="ftab-form-row">
            <label>Name</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Display Name" />
          </div>
        </div>

        <div className="ftab-form-row">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            rows={2}
            placeholder="Item description..."
          />
        </div>

        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Category</label>
            <select value={form.category} onChange={e => setField('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="ftab-form-row">
            <label>Price (Shards)</label>
            <input
              type="number"
              min="0"
              value={form.price_shards}
              onChange={e => setField('price_shards', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Icon Asset Key</label>
            <input value={form.icon_asset_key} onChange={e => setField('icon_asset_key', e.target.value)} placeholder="skin_void_walker" />
          </div>
          <div className="ftab-form-row">
            <label>Class Restriction</label>
            <input
              value={form.class_restriction || ''}
              onChange={e => setField('class_restriction', e.target.value || null)}
              placeholder="None"
            />
          </div>
        </div>

        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
            />
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', paddingTop: '18px' }}>
            <label className="ftab-form-checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setField('is_active', e.target.checked)}
              />
              Active
            </label>
            <label className="ftab-form-checkbox">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={e => setField('is_featured', e.target.checked)}
              />
              Featured
            </label>
          </div>
        </div>

        {/* Featured window */}
        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Featured From</label>
            <input
              type="datetime-local"
              value={form.featured_from?.slice(0, 16) || ''}
              onChange={e => setField('featured_from', e.target.value || null)}
            />
          </div>
          <div className="ftab-form-row">
            <label>Featured Until</label>
            <input
              type="datetime-local"
              value={form.featured_until?.slice(0, 16) || ''}
              onChange={e => setField('featured_until', e.target.value || null)}
            />
          </div>
        </div>

        {/* Availability window */}
        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Available From</label>
            <input
              type="datetime-local"
              value={form.available_from?.slice(0, 16) || ''}
              onChange={e => setField('available_from', e.target.value || null)}
            />
          </div>
          <div className="ftab-form-row">
            <label>Available Until</label>
            <input
              type="datetime-local"
              value={form.available_until?.slice(0, 16) || ''}
              onChange={e => setField('available_until', e.target.value || null)}
            />
          </div>
        </div>

        {/* Booster-specific fields */}
        {form.category === 'booster' && (
          <>
            <h4 style={{ color: '#f59e0b', margin: '16px 0 8px', borderTop: '1px solid #333', paddingTop: '12px' }}>
              Booster Configuration
            </h4>
            <div className="ftab-form-inline">
              <div className="ftab-form-row">
                <label>Boost Type</label>
                <select value={boostType} onChange={e => setBoostType(e.target.value)}>
                  {BOOST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="ftab-form-row">
                <label>Duration (seconds)</label>
                <input
                  type="number"
                  min="1"
                  value={boostDuration}
                  onChange={e => setBoostDuration(e.target.value)}
                />
              </div>
              <div className="ftab-form-row">
                <label>Magnitude (multiplier)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={boostMagnitude}
                  onChange={e => setBoostMagnitude(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Non-booster metadata (read-only) */}
        {form.category !== 'booster' && form.item_metadata && Object.keys(form.item_metadata).length > 0 && (
          <>
            <h4 style={{ color: '#888', margin: '16px 0 8px', borderTop: '1px solid #333', paddingTop: '12px' }}>
              Item Metadata (read-only)
            </h4>
            <pre style={{ background: '#111', padding: '8px', borderRadius: '4px', fontSize: '12px', color: '#aaa', overflow: 'auto' }}>
              {JSON.stringify(form.item_metadata, null, 2)}
            </pre>
          </>
        )}

        <div className="ftab-modal-actions">
          <button className="ftab-btn" onClick={onClose}>Cancel</button>
          <button className="ftab-btn ftab-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Item' : 'Create Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
