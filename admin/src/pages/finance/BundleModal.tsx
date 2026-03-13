import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import './FinanceTabs.css'

/* ── Types ── */

interface ShopItemSummary {
  id: number
  name: string
  price_shards: number
  category: string
  is_active: boolean
}

interface Bundle {
  id?: number
  bundle_key: string
  name: string
  description: string
  price_shards: number
  original_price_shards: number
  discount_pct: number
  icon_asset_key: string
  is_active: boolean
  sort_order: number
  item_ids: number[]
}

interface BundleModalProps {
  bundle: Bundle | null  // null = create mode
  onClose: () => void
  onSaved: () => void
}

function emptyBundle(): Bundle {
  return {
    bundle_key: '',
    name: '',
    description: '',
    price_shards: 0,
    original_price_shards: 0,
    discount_pct: 0,
    icon_asset_key: '',
    is_active: true,
    sort_order: 0,
    item_ids: [],
  }
}

/* ── Component ── */

export default function BundleModal({ bundle, onClose, onSaved }: BundleModalProps) {
  const isEdit = bundle !== null && bundle.id !== undefined
  const [form, setForm] = useState<Bundle>(bundle ?? emptyBundle())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Available items for picker
  const [allItems, setAllItems] = useState<ShopItemSummary[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemSearch, setItemSearch] = useState('')

  const fetchItems = useCallback(async () => {
    setItemsLoading(true)
    try {
      const res = await api.get('/api/admin/shop/items?page_size=500')
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setAllItems(items.filter((i: ShopItemSummary) => i.is_active))
      }
    } catch { /* ignore */ }
    setItemsLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const setField = <K extends keyof Bundle>(key: K, val: Bundle[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const toggleItem = (itemId: number) => {
    setForm(prev => {
      const ids = prev.item_ids.includes(itemId)
        ? prev.item_ids.filter(id => id !== itemId)
        : [...prev.item_ids, itemId]
      return { ...prev, item_ids: ids }
    })
  }

  // Calculate actual savings
  const selectedItemsTotal = allItems
    .filter(i => form.item_ids.includes(i.id))
    .reduce((sum, i) => sum + i.price_shards, 0)

  const actualSavingsPct = selectedItemsTotal > 0
    ? ((selectedItemsTotal - form.price_shards) / selectedItemsTotal * 100)
    : 0

  const filteredItems = allItems.filter(i =>
    !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())
  )

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      const res = isEdit
        ? await api.put(`/api/admin/shop/bundles/${bundle!.id}`, payload)
        : await api.post('/api/admin/shop/bundles', payload)

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
        <h3>{isEdit ? 'Edit Bundle' : 'Create Bundle'}</h3>

        {error && <div className="ftab-error">{error}</div>}

        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Bundle Key</label>
            <input value={form.bundle_key} onChange={e => setField('bundle_key', e.target.value)} placeholder="unique_bundle_key" />
          </div>
          <div className="ftab-form-row">
            <label>Name</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Bundle Name" />
          </div>
        </div>

        <div className="ftab-form-row">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            rows={2}
            placeholder="Bundle description..."
          />
        </div>

        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Price (Shards)</label>
            <input
              type="number"
              min="0"
              value={form.price_shards}
              onChange={e => setField('price_shards', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="ftab-form-row">
            <label>Original Price (Shards)</label>
            <input
              type="number"
              min="0"
              value={form.original_price_shards}
              onChange={e => setField('original_price_shards', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="ftab-form-row">
            <label>Discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.discount_pct}
              onChange={e => setField('discount_pct', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="ftab-form-inline">
          <div className="ftab-form-row">
            <label>Icon Asset Key</label>
            <input value={form.icon_asset_key} onChange={e => setField('icon_asset_key', e.target.value)} placeholder="ui_bundle_starter" />
          </div>
          <div className="ftab-form-row">
            <label>Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <label className="ftab-form-checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setField('is_active', e.target.checked)}
          />
          Active
        </label>

        {/* Item picker */}
        <div className="ftab-form-row">
          <label>Bundle Items ({form.item_ids.length} selected)</label>
          <input
            placeholder="Search items..."
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            style={{ marginBottom: '6px' }}
          />
          {itemsLoading ? (
            <div className="ftab-loading" style={{ padding: '12px' }}>Loading items...</div>
          ) : (
            <div className="ftab-item-picker">
              {filteredItems.length === 0 ? (
                <div className="ftab-empty" style={{ padding: '8px' }}>No items found.</div>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="ftab-item-picker-row"
                    onClick={() => toggleItem(item.id)}
                  >
                    <input
                      type="checkbox"
                      checked={form.item_ids.includes(item.id)}
                      readOnly
                    />
                    <span>{item.name}</span>
                    <span style={{ marginLeft: 'auto', color: '#888', fontSize: '12px' }}>
                      {item.price_shards.toLocaleString()} shards &middot; {item.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Discount calculator */}
        {form.item_ids.length > 0 && (
          <div className="ftab-discount-calc">
            Sum of individual items: <strong>{selectedItemsTotal.toLocaleString()}</strong> shards
            &nbsp;&middot;&nbsp;
            Bundle price: <strong>{form.price_shards.toLocaleString()}</strong> shards
            &nbsp;&middot;&nbsp;
            Savings: <strong>{actualSavingsPct.toFixed(1)}%</strong>
          </div>
        )}

        <div className="ftab-modal-actions">
          <button className="ftab-btn" onClick={onClose}>Cancel</button>
          <button className="ftab-btn ftab-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Bundle' : 'Create Bundle'}
          </button>
        </div>
      </div>
    </div>
  )
}
