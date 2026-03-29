import { useState, useRef, useEffect, useMemo } from 'react'
import qaData from './qa-data.json'
import * as BackgroundRenderer from '../game/renderers/BackgroundRenderer'

const ITEMS_PER_PAGE = 24

type Tab = 'sprites' | 'achievements' | 'items' | 'artifacts' | 'backgrounds' | 'bg_elements'

interface AssetItem {
  key: string
  svg?: string
  config?: string
  label: string
  family?: string
  desc?: string
  category?: string
  tags?: string
  len: number
  far_def?: string
  mid_def?: string
  near_def?: string
  boss_def?: string
  populated?: boolean
  far_asset_key?: string
  mid_asset_key?: string
  near_asset_key?: string
  boss_asset_key?: string
}

const tabs: { id: Tab; name: string; count: number }[] = [
  { id: 'sprites', name: 'Entity Sprites', count: (qaData as any).sprites?.length || 0 },
  { id: 'achievements', name: 'Achievements', count: (qaData as any).achievements?.length || 0 },
  { id: 'items', name: 'Items', count: (qaData as any).items?.length || 0 },
  { id: 'artifacts', name: 'Artifacts', count: (qaData as any).artifacts?.length || 0 },
  { id: 'backgrounds', name: 'Backgrounds', count: (qaData as any).backgrounds?.length || 0 },
  { id: 'bg_elements', name: 'BG Elements', count: (qaData as any).bg_elements?.length || 0 },
]

function getItems(tab: Tab): AssetItem[] {
  return (qaData as Record<string, AssetItem[]>)[tab] || []
}

/** Get unique family names from sprites for the filter dropdown. */
function getFamilies(): string[] {
  const items = getItems('sprites')
  const families = new Set(items.map(i => i.family || i.label || 'unknown'))
  return ['All', ...Array.from(families).sort()]
}

/** Get unique categories for bg_elements filter. */
function getBgElementCategories(): string[] {
  const items = getItems('bg_elements')
  const cats = new Set(items.map(i => i.category || 'unknown'))
  return ['All', ...Array.from(cats).sort()]
}

/** Get unique tag groups for bg_elements. */
function getBgElementTagGroups(): string[] {
  const items = getItems('bg_elements')
  const tagSet = new Set<string>()
  for (const item of items) {
    try {
      const tags = JSON.parse(item.tags || '[]') as string[]
      tags.forEach(t => tagSet.add(t))
    } catch { /* */ }
  }
  return ['All', ...Array.from(tagSet).sort()]
}

function BackgroundCard({ item }: { item: AssetItem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  let p: Record<string, any> = {}
  try { p = JSON.parse(item.config || '{}') } catch { /* */ }

  const isPopulated = item.populated || false
  const layers = ['far', 'mid', 'near', 'boss'] as const

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, 260, 160)

    let y = 0
    for (const layer of ['far', 'mid', 'near'] as const) {
      const defStr = item[`${layer}_def` as keyof AssetItem] as string | undefined
      if (defStr) {
        try {
          const def = JSON.parse(defStr) as BackgroundRenderer.RenderDefinition
          const result = BackgroundRenderer.render({ ...def, width: 260, height: 53 })
          ctx.drawImage(result.canvas, 0, y)
        } catch { /* skip bad defs */ }
      }
      y += 53
    }

    if (!isPopulated) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, 0, 260, 160)
      ctx.fillStyle = '#666'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Not yet populated', 130, 80)
    }
  }, [item])

  return (
    <div style={{ border: '1px solid #444', borderRadius: 6, overflow: 'hidden', width: 260 }}>
      <canvas ref={canvasRef} width={260} height={160} style={{ display: 'block', width: 260, height: 160 }} />
      <div style={{ padding: 8, color: 'white', fontSize: 11, background: '#111' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{item.key}</div>
        <div style={{ color: '#aaa' }}>{p.mood || '?'} / {p.time_of_day || '?'} | {item.len} chars</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {layers.map(l => {
            const key = item[`${l}_asset_key` as keyof AssetItem] as string | undefined
            return (
              <span key={l} style={{
                fontSize: 9, padding: '1px 4px', borderRadius: 2,
                background: key ? '#2a5a2a' : '#3a2a2a',
                color: key ? '#88ff88' : '#ff8888',
              }}>
                {l}: {key ? 'yes' : 'no'}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BgElementCard({ item }: { item: AssetItem }) {
  let tags: string[] = []
  try { tags = JSON.parse(item.tags || '[]') } catch { /* */ }
  const isDef = item.category === 'bg_element_def'

  return (
    <div style={{
      border: `1px solid ${isDef ? '#556' : '#444'}`,
      borderRadius: 6, overflow: 'hidden', width: 240,
      background: isDef ? '#1a1a30' : '#111118',
    }}>
      <div style={{ padding: 8, color: 'white', fontSize: 11 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2, color: isDef ? '#88aaff' : '#aaa' }}>
          {isDef ? '[ DEF ]' : '[ CMP ]'} {item.label}
        </div>
        <div style={{ color: '#777', fontSize: 10, marginBottom: 4 }}>{item.key}</div>
        {item.desc && <div style={{ color: '#999', fontSize: 10, marginBottom: 4 }}>{item.desc}</div>}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
          {tags.map(t => (
            <span key={t} style={{
              fontSize: 9, padding: '1px 4px', borderRadius: 2,
              background: '#2a2a4a', color: '#aabbdd',
            }}>{t}</span>
          ))}
        </div>
        <div style={{ color: '#555', fontSize: 9 }}>{item.len} chars</div>
      </div>
    </div>
  )
}

export default function SpriteReview() {
  const [tab, setTab] = useState<Tab>('sprites')
  const [page, setPage] = useState(0)
  const [familyFilter, setFamilyFilter] = useState('All')
  const [bgElemFilter, setBgElemFilter] = useState('All')
  const [bgTagFilter, setBgTagFilter] = useState('All')

  const families = useMemo(() => getFamilies(), [])
  const bgElemCats = useMemo(() => getBgElementCategories(), [])
  const bgTagGroups = useMemo(() => getBgElementTagGroups(), [])

  const allItems = getItems(tab)

  // Apply filters
  const filteredItems = useMemo(() => {
    let items = allItems
    if (tab === 'sprites' && familyFilter !== 'All') {
      items = items.filter(i => (i.family || i.label) === familyFilter)
    }
    if (tab === 'bg_elements') {
      if (bgElemFilter !== 'All') {
        items = items.filter(i => i.category === bgElemFilter)
      }
      if (bgTagFilter !== 'All') {
        items = items.filter(i => {
          try {
            const tags = JSON.parse(i.tags || '[]') as string[]
            return tags.includes(bgTagFilter)
          } catch { return false }
        })
      }
    }
    return items
  }, [allItems, tab, familyFilter, bgElemFilter, bgTagFilter])

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const pageItems = filteredItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  const handleTabChange = (t: Tab) => { setTab(t); setPage(0); setFamilyFilter('All'); setBgElemFilter('All'); setBgTagFilter('All') }

  const cardSize = tab === 'sprites' ? 96 : tab === 'backgrounds' ? 260 : tab === 'bg_elements' ? 240 : 80

  const selectStyle = {
    padding: '4px 8px', background: '#222', color: 'white', border: '1px solid #444',
    borderRadius: 4, fontSize: 11, cursor: 'pointer' as const,
  }

  return (
    <div style={{ background: '#1a1a2e', minHeight: '100vh', padding: 16 }}>
      <h2 style={{ color: 'white', margin: '0 0 4px' }}>Visual QA Review</h2>
      <p style={{ color: '#666', margin: '0 0 12px', fontSize: 11 }}>
        TODO: Remove after QA (SpriteReview.tsx, qa-data.json, App.tsx route)
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)}
            style={{
              padding: '6px 14px', cursor: 'pointer', border: 'none', borderRadius: 4,
              background: tab === t.id ? '#e94560' : '#333', color: 'white', fontSize: 12
            }}>
            {t.name} ({t.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {tab === 'sprites' && (
          <label style={{ color: '#aaa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Family:
            <select value={familyFilter} onChange={e => { setFamilyFilter(e.target.value); setPage(0) }} style={selectStyle}>
              {families.map(f => <option key={f} value={f}>{f} {f !== 'All' ? `(${allItems.filter(i => (i.family || i.label) === f).length})` : ''}</option>)}
            </select>
          </label>
        )}
        {tab === 'bg_elements' && (
          <>
            <label style={{ color: '#aaa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              Type:
              <select value={bgElemFilter} onChange={e => { setBgElemFilter(e.target.value); setPage(0) }} style={selectStyle}>
                {bgElemCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ color: '#aaa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              Tag:
              <select value={bgTagFilter} onChange={e => { setBgTagFilter(e.target.value); setPage(0) }} style={selectStyle}>
                {bgTagGroups.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </>
        )}
        <span style={{ color: '#888', fontSize: 11 }}>
          Showing {filteredItems.length} of {allItems.length}
        </span>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button onClick={() => setPage(0)} disabled={page === 0}
          style={{ padding: '4px 8px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: 4 }}>
          &#171;
        </button>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          style={{ padding: '4px 10px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: 4 }}>
          Prev
        </button>
        <span style={{ color: 'white', fontSize: 12 }}>
          Page {page + 1} / {Math.max(1, totalPages)} ({filteredItems.length} total)
        </span>
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
          style={{ padding: '4px 10px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: 4 }}>
          Next
        </button>
        <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
          style={{ padding: '4px 8px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: 4 }}>
          &#187;
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tab === 'backgrounds' ? 16 : tab === 'bg_elements' ? 8 : 8 }}>
        {pageItems.map(item => (
          tab === 'backgrounds' ? (
            <BackgroundCard key={item.key} item={item} />
          ) : tab === 'bg_elements' ? (
            <BgElementCard key={item.key} item={item} />
          ) : (
            <div key={item.key} style={{ textAlign: 'center', color: 'white' }}>
              <div
                style={{
                  width: cardSize, height: cardSize,
                  border: '1px solid #444', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#0d0d1a'
                }}
                dangerouslySetInnerHTML={{ __html: item.svg || '' }}
              />
              {tab === 'sprites' && (
                <>
                  <small style={{ display: 'block', marginTop: 2, fontSize: 9, color: '#8888cc', maxWidth: cardSize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.family || '?'}
                  </small>
                  <small style={{ display: 'block', fontSize: 9, maxWidth: cardSize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </small>
                  <span style={{ color: '#666', fontSize: 8 }}>{item.len}c</span>
                </>
              )}
              {tab !== 'sprites' && (
                <>
                  <small style={{ display: 'block', marginTop: 2, fontSize: 9, maxWidth: cardSize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </small>
                  <span style={{ color: '#666', fontSize: 8 }}>{item.len}c</span>
                </>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  )
}
