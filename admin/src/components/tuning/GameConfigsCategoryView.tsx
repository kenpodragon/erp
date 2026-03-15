import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import ConfigSearchBar from './ConfigSearchBar'
import TypeAwareInput from './TypeAwareInput'
import './tuning.css'

interface GameConfigEntry {
  key: string
  value_json: any
  description: string | null
  game_impact: string | null
  category: string | null
}

interface GameConfigsCategoryViewProps {
  configs: Record<string, GameConfigEntry>
  configsList: GameConfigEntry[]
  categories: string[]
  onConfigChange: (key: string, value: any) => void
  dirtyKeys: Set<string>
  onSave: () => Promise<void>
  onReset: () => void
  onMetaEdit: (config: GameConfigEntry) => void
  saving: boolean
}

export default function GameConfigsCategoryView({
  configs,
  configsList,
  categories,
  onConfigChange,
  dirtyKeys,
  onSave,
  onReset,
  onMetaEdit,
  saving,
}: GameConfigsCategoryViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [matchingCategories, setMatchingCategories] = useState<Set<string>>(new Set())
  const keyRowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Count configs per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: configsList.length }
    categories.forEach(cat => {
      counts[cat] = configsList.filter(c => c.category === cat).length
    })
    // Uncategorized
    const uncatCount = configsList.filter(c => !c.category).length
    if (uncatCount > 0) counts['Uncategorized'] = uncatCount
    return counts
  }, [configsList, categories])

  // All category options
  const allCategories = useMemo(() => {
    const cats = ['All', ...categories]
    const hasUncategorized = configsList.some(c => !c.category)
    if (hasUncategorized) cats.push('Uncategorized')
    return cats
  }, [categories, configsList])

  // Filter configs for active category
  const visibleConfigs = useMemo(() => {
    let list = configsList
    if (activeCategory !== 'All') {
      if (activeCategory === 'Uncategorized') {
        list = configsList.filter(c => !c.category)
      } else {
        list = configsList.filter(c => c.category === activeCategory)
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        c.key.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      )
    }

    return list
  }, [configsList, activeCategory, searchQuery])

  // Group by category for the "All" tab
  const grouped = useMemo(() => {
    if (activeCategory !== 'All') return null
    const groups: Record<string, GameConfigEntry[]> = {}
    visibleConfigs.forEach(c => {
      const cat = c.category || 'Uncategorized'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(c)
    })
    return groups
  }, [activeCategory, visibleConfigs])

  const handleSearchChange = useCallback((query: string, matching: Set<string>) => {
    setSearchQuery(query)
    setMatchingCategories(matching)
  }, [])

  const handleJumpTo = useCallback((key: string, category: string) => {
    // Switch to the category tab, then scroll to the key
    if (category) {
      setActiveCategory(category)
    } else {
      setActiveCategory('All')
    }
    // Wait for render, then scroll
    setTimeout(() => {
      const el = keyRowRefs.current[key]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.outline = '2px solid #4466aa'
        setTimeout(() => { el.style.outline = '' }, 2000)
      }
    }, 100)
  }, [])

  // Track ref for each row
  const setRowRef = useCallback((key: string, el: HTMLDivElement | null) => {
    keyRowRefs.current[key] = el
  }, [])

  const hasDirty = dirtyKeys.size > 0

  const renderKeyRow = (c: GameConfigEntry) => (
    <div
      key={c.key}
      className="config-key-row"
      ref={el => setRowRef(c.key, el)}
      style={dirtyKeys.has(c.key) ? { borderColor: '#554400', background: 'rgba(200,180,50,0.05)' } : undefined}
    >
      <div className="config-key-name">{c.key}</div>
      <div className="config-key-value">
        <TypeAwareInput
          value={configs[c.key]?.value_json}
          onChange={val => onConfigChange(c.key, val)}
        />
        {c.description && <div className="config-key-description">{c.description}</div>}
      </div>
      <div className="config-key-meta">
        {c.game_impact && (
          <span className="config-key-impact" title={c.game_impact}>i</span>
        )}
        <button
          className="gc-btn gc-btn--meta"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => onMetaEdit(c)}
        >
          Meta
        </button>
      </div>
    </div>
  )

  return (
    <div className="tuning-panel">
      <ConfigSearchBar
        configs={configsList}
        onJumpTo={handleJumpTo}
        matchingCategories={matchingCategories}
        onSearchChange={handleSearchChange}
      />

      {/* Category tabs */}
      <div className="category-tabs">
        {allCategories.map(cat => (
          <button
            key={cat}
            className={
              'category-tab' +
              (activeCategory === cat ? ' category-tab--active' : '') +
              (searchQuery && matchingCategories.has(cat) ? ' category-tab--highlight' : '')
            }
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
            <span className="count-badge">({categoryCounts[cat] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Config key list */}
      {activeCategory === 'All' && grouped ? (
        <div className="config-key-list">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h4 className="tuning-section-title" style={{ marginTop: 16 }}>{cat}</h4>
              {items.map(renderKeyRow)}
            </div>
          ))}
        </div>
      ) : (
        <div className="config-key-list">
          {visibleConfigs.map(renderKeyRow)}
        </div>
      )}

      {visibleConfigs.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: 24, fontSize: 13 }}>
          No configs found.
        </div>
      )}

      {/* Save / Reset bar */}
      {hasDirty && (
        <div className="tuning-unsaved">
          <span>{dirtyKeys.size} unsaved change{dirtyKeys.size > 1 ? 's' : ''}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="tuning-btn tuning-btn--reset" onClick={onReset} disabled={saving}>
              Reset
            </button>
            <button className="tuning-btn tuning-btn--save" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
