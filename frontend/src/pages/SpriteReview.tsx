import { useState } from 'react'
import qaData from './qa-data.json'

const ITEMS_PER_PAGE = 24

type Tab = 'sprites' | 'achievements' | 'items' | 'artifacts' | 'backgrounds'

interface AssetItem {
  key: string
  svg?: string
  config?: string
  label: string
  len: number
}

const tabs: { id: Tab; name: string; count: number }[] = [
  { id: 'sprites', name: 'Entity Sprites', count: qaData.sprites.length },
  { id: 'achievements', name: 'Achievements', count: qaData.achievements.length },
  { id: 'items', name: 'Items', count: qaData.items.length },
  { id: 'artifacts', name: 'Artifacts', count: qaData.artifacts.length },
  { id: 'backgrounds', name: 'Backgrounds', count: qaData.backgrounds.length },
]

function getItems(tab: Tab): AssetItem[] {
  return (qaData as Record<string, AssetItem[]>)[tab] || []
}

function BackgroundCard({ item }: { item: AssetItem }) {
  let p: Record<string, any> = {}
  try { p = JSON.parse(item.config || '{}') } catch { /* */ }
  const far = p.far || {}
  const mid = p.mid || {}
  const near = p.near || {}

  const getColor = (layer: any): string => {
    if (Array.isArray(layer.colors) && layer.colors.length > 0) return layer.colors[0]
    if (typeof layer.color === 'string') return layer.color
    return '#222'
  }
  const getColors = (layer: any): string[] => {
    if (Array.isArray(layer.colors)) return layer.colors
    if (typeof layer.color === 'string') return [layer.color]
    return ['#222']
  }

  const farC = getColors(far)
  const midC = getColors(mid)
  const nearC = getColors(near)

  return (
    <div style={{ border: '1px solid #444', borderRadius: 6, overflow: 'hidden', width: 260 }}>
      {/* Visual render of parallax layers */}
      <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
        {/* Far layer */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
          background: farC.length > 1 ? `linear-gradient(180deg, ${farC.join(', ')})` : getColor(far),
          opacity: far.opacity || 0.8
        }} />
        {/* Mid layer */}
        <div style={{
          position: 'absolute', top: '30%', left: 0, right: 0, height: '40%',
          background: midC.length > 1 ? `linear-gradient(180deg, ${midC.join(', ')})` : getColor(mid),
          opacity: mid.opacity || 0.7,
          borderRadius: '40% 60% 0 0'
        }} />
        {/* Near layer */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: nearC.length > 1 ? `linear-gradient(180deg, ${nearC.join(', ')})` : getColor(near),
          opacity: near.opacity || 0.9,
          borderRadius: '30% 50% 0 0'
        }} />
        {/* Fog overlay */}
        {p.fog_density > 0.3 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.15)' }} />
        )}
        {/* Labels on visual */}
        <div style={{ position: 'absolute', top: 4, left: 6, color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>
          far: {far.type || '?'}
        </div>
        <div style={{ position: 'absolute', top: '38%', left: 6, color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>
          mid: {mid.type || '?'}
        </div>
        <div style={{ position: 'absolute', bottom: 4, left: 6, color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>
          near: {near.type || '?'}
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: 8, color: 'white', fontSize: 11, background: '#111' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{item.key}</div>
        <div style={{ color: '#aaa' }}>{p.mood || '?'} / {p.time_of_day || '?'} | {item.len} chars</div>
        <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
          {[...farC, ...midC, ...nearC].map((c: string, i: number) => (
            <div key={i} style={{ width: 14, height: 14, background: c, border: '1px solid #555', borderRadius: 2 }} title={c} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SpriteReview() {
  const [tab, setTab] = useState<Tab>('sprites')
  const [page, setPage] = useState(0)

  const items = getItems(tab)
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const pageItems = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  const handleTabChange = (t: Tab) => { setTab(t); setPage(0) }

  const cardSize = tab === 'sprites' ? 96 : tab === 'backgrounds' ? 260 : 80

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
          Page {page + 1} / {totalPages} ({items.length} total)
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tab === 'backgrounds' ? 16 : 8 }}>
        {pageItems.map(item => (
          tab === 'backgrounds' ? (
            <BackgroundCard key={item.key} item={item} />
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
              <small style={{ display: 'block', marginTop: 2, fontSize: 9, maxWidth: cardSize, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </small>
              <span style={{ color: '#666', fontSize: 8 }}>{item.len}c</span>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
