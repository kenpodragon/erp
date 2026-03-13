import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import ShopItemModal from './ShopItemModal'
import BundleModal from './BundleModal'
import './FinanceTabs.css'

/* ── Types ── */

interface ShopItem {
  id: number
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

interface Bundle {
  id: number
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
  items_count?: number
}

interface ShopAnalytics {
  total_items_sold: number
  revenue_by_category: Record<string, number>
  top_selling_items: { name: string; sold: number }[]
  active_boosters: number
}

/* ── Helpers ── */

function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString()
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

function featuredStatus(from: string | null, until: string | null): 'active' | 'scheduled' | 'expired' | 'none' {
  if (!from && !until) return 'none'
  const now = Date.now()
  const start = from ? new Date(from).getTime() : 0
  const end = until ? new Date(until).getTime() : Infinity
  if (now >= start && now <= end) return 'active'
  if (now < start) return 'scheduled'
  return 'expired'
}

/* ── Collapsible section component ── */

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="ftab-section">
      <div className="ftab-section-header" onClick={() => setOpen(o => !o)}>
        <h4>{title}</h4>
        <span className={`ftab-section-toggle ${open ? 'ftab-section-toggle--open' : ''}`}>&#9654;</span>
      </div>
      {open && <div className="ftab-section-body">{children}</div>}
    </div>
  )
}

/* ── Main Component ── */

export default function ShopManagementTab() {
  // Items
  const [items, setItems] = useState<ShopItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [itemCategoryFilter, setItemCategoryFilter] = useState('')
  const [itemActiveFilter, setItemActiveFilter] = useState('')
  const [itemPage, setItemPage] = useState(1)

  // Bundles
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [bundlesLoading, setBundlesLoading] = useState(true)

  // Analytics
  const [analytics, setAnalytics] = useState<ShopAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Modals
  const [editItem, setEditItem] = useState<ShopItem | null | 'create'>(null)
  const [editBundle, setEditBundle] = useState<Bundle | null | 'create'>(null)

  // Error
  const [error, setError] = useState('')

  const ITEM_PAGE_SIZE = 25
  const CATEGORIES = ['skin', 'flair', 'badge', 'avatar', 'booster', 'marketplace_permit']

  /* ── Data fetching ── */

  const fetchItems = useCallback(async () => {
    setItemsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(itemPage))
      params.set('page_size', String(ITEM_PAGE_SIZE))
      if (itemCategoryFilter) params.set('category', itemCategoryFilter)
      if (itemActiveFilter) params.set('is_active', itemActiveFilter)
      if (itemSearch) params.set('search', itemSearch)
      const res = await api.get(`/api/admin/shop/items?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : data.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items')
    }
    setItemsLoading(false)
  }, [itemPage, itemCategoryFilter, itemActiveFilter, itemSearch])

  const fetchBundles = useCallback(async () => {
    setBundlesLoading(true)
    try {
      const res = await api.get('/api/admin/shop/bundles')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBundles(Array.isArray(data) ? data : data.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bundles')
    }
    setBundlesLoading(false)
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const res = await api.get('/api/admin/finance/shop-analytics')
      if (res.ok) setAnalytics(await res.json())
    } catch { /* ignore */ }
    setAnalyticsLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { fetchBundles() }, [fetchBundles])
  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  /* ── Item actions ── */

  const handleDeactivateItem = async (item: ShopItem) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return
    try {
      const res = await api.put(`/api/admin/shop/items/${item.id}`, { ...item, is_active: false })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deactivation failed')
    }
  }

  /* ── Featured rotation logic ── */

  const featuredItems = items.filter(i => i.is_featured || i.featured_from || i.featured_until)
  const featuredBundles = bundles.filter(b => (b as unknown as ShopItem).is_featured)

  // Check for overlaps: count how many items/bundles are featured at the same time
  const activeFeaturedCount = [...featuredItems, ...featuredBundles].filter(item => {
    const fi = item as ShopItem
    return featuredStatus(fi.featured_from, fi.featured_until) === 'active'
  }).length
  const hasConflict = activeFeaturedCount > 3

  const handleFeatureNow = async (item: ShopItem) => {
    const now = new Date()
    const until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    try {
      const res = await api.put(`/api/admin/shop/items/${item.id}`, {
        ...item,
        is_featured: true,
        featured_from: now.toISOString(),
        featured_until: until.toISOString(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feature failed')
    }
  }

  const handleEndFeature = async (item: ShopItem) => {
    try {
      const res = await api.put(`/api/admin/shop/items/${item.id}`, {
        ...item,
        is_featured: false,
        featured_until: new Date().toISOString(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fetchItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'End feature failed')
    }
  }

  /* ── Modal callbacks ── */

  const handleItemSaved = () => {
    setEditItem(null)
    fetchItems()
    fetchAnalytics()
  }

  const handleBundleSaved = () => {
    setEditBundle(null)
    fetchBundles()
  }

  /* ── Render ── */

  return (
    <div>
      <h2 className="ftab-section-title">Shop Management</h2>
      {error && <div className="ftab-error">{error}</div>}

      {/* ── Purchase Analytics ── */}
      <Section title="Purchase Analytics" defaultOpen={true}>
        {analyticsLoading ? (
          <div className="ftab-loading">Loading analytics...</div>
        ) : analytics ? (
          <>
            <div className="ftab-metrics">
              <div className="ftab-metric-card">
                <span className="ftab-metric-label">Total Items Sold</span>
                <span className="ftab-metric-value">{analytics.total_items_sold.toLocaleString()}</span>
              </div>
              <div className="ftab-metric-card">
                <span className="ftab-metric-label">Active Boosters</span>
                <span className="ftab-metric-value ftab-metric-value--amber">{analytics.active_boosters.toLocaleString()}</span>
              </div>
            </div>

            {analytics.revenue_by_category && Object.keys(analytics.revenue_by_category).length > 0 && (
              <>
                <h5 className="ftab-sub-title">Revenue by Category (Shards)</h5>
                <div className="ftab-metrics">
                  {Object.entries(analytics.revenue_by_category).map(([cat, val]) => (
                    <div className="ftab-metric-card" key={cat}>
                      <span className="ftab-metric-label">{cat}</span>
                      <span className="ftab-metric-value">{val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {analytics.top_selling_items && analytics.top_selling_items.length > 0 && (
              <>
                <h5 className="ftab-sub-title">Top Selling Items</h5>
                <table className="ftab-table" style={{ maxWidth: '400px' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.top_selling_items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.sold.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        ) : (
          <div className="ftab-empty">No analytics data available.</div>
        )}
      </Section>

      {/* ── Item Catalog ── */}
      <Section title="Item Catalog" defaultOpen={true}>
        <div className="ftab-toolbar">
          <input
            className="ftab-input"
            placeholder="Search items..."
            value={itemSearch}
            onChange={e => { setItemSearch(e.target.value); setItemPage(1) }}
          />
          <select
            className="ftab-select"
            value={itemCategoryFilter}
            onChange={e => { setItemCategoryFilter(e.target.value); setItemPage(1) }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="ftab-select"
            value={itemActiveFilter}
            onChange={e => { setItemActiveFilter(e.target.value); setItemPage(1) }}
          >
            <option value="">Active &amp; Inactive</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
          <div className="ftab-toolbar-right">
            <button className="ftab-btn ftab-btn-primary" onClick={() => setEditItem('create')}>
              Create Item
            </button>
          </div>
        </div>

        {itemsLoading ? (
          <div className="ftab-loading">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="ftab-empty">No items found.</div>
        ) : (
          <div className="ftab-table-wrap">
            <table className="ftab-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price (Shards)</th>
                  <th>Active</th>
                  <th>Featured</th>
                  <th>Sort Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td style={{ color: '#7dd3fc', fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.price_shards.toLocaleString()}</td>
                    <td>
                      <span className={`ftab-badge ftab-badge--${item.is_active ? 'active' : 'expired'}`}>
                        {item.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`ftab-badge ftab-badge--${item.is_featured ? 'yes' : 'no'}`}>
                        {item.is_featured ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{item.sort_order}</td>
                    <td style={{ display: 'flex', gap: '4px' }}>
                      <button className="ftab-btn ftab-btn-sm" onClick={() => setEditItem(item)}>
                        Edit
                      </button>
                      {item.is_active && (
                        <button className="ftab-btn ftab-btn-sm ftab-btn-danger" onClick={() => handleDeactivateItem(item)}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="ftab-pagination">
          <button className="ftab-btn ftab-btn-sm" disabled={itemPage <= 1} onClick={() => setItemPage(p => p - 1)}>
            Prev
          </button>
          <span>Page {itemPage}</span>
          <button className="ftab-btn ftab-btn-sm" disabled={items.length < ITEM_PAGE_SIZE} onClick={() => setItemPage(p => p + 1)}>
            Next
          </button>
        </div>
      </Section>

      {/* ── Bundle Management ── */}
      <Section title="Bundle Management" defaultOpen={false}>
        <div className="ftab-toolbar">
          <div className="ftab-toolbar-right">
            <button className="ftab-btn ftab-btn-primary" onClick={() => setEditBundle('create')}>
              Create Bundle
            </button>
          </div>
        </div>

        {bundlesLoading ? (
          <div className="ftab-loading">Loading bundles...</div>
        ) : bundles.length === 0 ? (
          <div className="ftab-empty">No bundles found.</div>
        ) : (
          <div className="ftab-table-wrap">
            <table className="ftab-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Original Price</th>
                  <th>Discount %</th>
                  <th>Active</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map(b => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td style={{ color: '#7dd3fc', fontWeight: 600 }}>{b.name}</td>
                    <td>{b.price_shards.toLocaleString()}</td>
                    <td>{b.original_price_shards.toLocaleString()}</td>
                    <td>{b.discount_pct}%</td>
                    <td>
                      <span className={`ftab-badge ftab-badge--${b.is_active ? 'active' : 'expired'}`}>
                        {b.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{b.items_count ?? b.item_ids?.length ?? 0}</td>
                    <td>
                      <button className="ftab-btn ftab-btn-sm" onClick={() => setEditBundle(b)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Featured Rotation ── */}
      <Section title="Featured Rotation" defaultOpen={false}>
        {hasConflict && (
          <div className="ftab-error" style={{ background: 'rgba(245,158,11,0.15)', borderColor: '#b45309', color: '#fbbf24' }}>
            Warning: More than 3 items are currently featured simultaneously. Consider reducing to avoid UI clutter.
          </div>
        )}

        {featuredItems.length === 0 ? (
          <div className="ftab-empty">No featured items configured.</div>
        ) : (
          <div className="ftab-table-wrap">
            <table className="ftab-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Featured From</th>
                  <th>Featured Until</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {featuredItems.map(item => {
                  const status = featuredStatus(item.featured_from, item.featured_until)
                  const isConflicting = hasConflict && status === 'active'
                  return (
                    <tr key={item.id} className={isConflicting ? 'ftab-row--conflict' : ''}>
                      <td style={{ color: '#7dd3fc', fontWeight: 600 }}>
                        {isConflicting && <span className="ftab-conflict-indicator" />}
                        {item.name}
                      </td>
                      <td>{item.category}</td>
                      <td>{fmtDateTime(item.featured_from)}</td>
                      <td>{fmtDateTime(item.featured_until)}</td>
                      <td>
                        <span className={`ftab-badge ftab-badge--${status}`}>{status}</span>
                      </td>
                      <td style={{ display: 'flex', gap: '4px' }}>
                        {status !== 'active' && (
                          <button className="ftab-btn ftab-btn-sm ftab-btn-success" onClick={() => handleFeatureNow(item)}>
                            Feature Now
                          </button>
                        )}
                        {status === 'active' && (
                          <button className="ftab-btn ftab-btn-sm ftab-btn-danger" onClick={() => handleEndFeature(item)}>
                            End Feature
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Quick-feature any item */}
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '12px', color: '#888' }}>
            To feature an item, edit it and set the featured window, or use the Item Catalog section above.
          </p>
        </div>
      </Section>

      {/* ── Modals ── */}
      {editItem !== null && (
        <ShopItemModal
          item={editItem === 'create' ? null : editItem}
          onClose={() => setEditItem(null)}
          onSaved={handleItemSaved}
        />
      )}

      {editBundle !== null && (
        <BundleModal
          bundle={editBundle === 'create' ? null : editBundle}
          onClose={() => setEditBundle(null)}
          onSaved={handleBundleSaved}
        />
      )}
    </div>
  )
}
