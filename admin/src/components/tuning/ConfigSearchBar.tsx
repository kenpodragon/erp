import { useState, useMemo, useRef } from 'react'
import './tuning.css'

interface GameConfigEntry {
  key: string
  value_json: any
  description: string | null
  game_impact: string | null
  category: string | null
}

interface ConfigSearchBarProps {
  configs: GameConfigEntry[]
  onJumpTo: (key: string, category: string) => void
  matchingCategories: Set<string>
  onSearchChange: (query: string, matchingCategories: Set<string>) => void
}

export default function ConfigSearchBar({ configs, onJumpTo, onSearchChange }: ConfigSearchBarProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return configs.filter(c =>
      c.key.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    ).slice(0, 20)
  }, [configs, query])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    const q = value.toLowerCase().trim()
    const matching = new Set<string>()
    if (q) {
      configs.forEach(c => {
        if (
          c.key.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.category || '').toLowerCase().includes(q)
        ) {
          if (c.category) matching.add(c.category)
        }
      })
    }
    onSearchChange(value, matching)
  }

  const handleResultClick = (key: string, category: string) => {
    onJumpTo(key, category)
    setQuery('')
    onSearchChange('', new Set())
  }

  const handleFocus = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current)
    setFocused(true)
  }

  const handleBlur = () => {
    // Delay to allow click on result
    blurTimeout.current = setTimeout(() => setFocused(false), 200)
  }

  const showDropdown = focused && query.trim().length > 0 && results.length > 0

  return (
    <div className="config-search-bar">
      <input
        className="config-search-input"
        type="text"
        placeholder="Search configs by key, description, or category..."
        value={query}
        onChange={e => handleQueryChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showDropdown && (
        <div className="config-search-results">
          {results.map(c => (
            <div
              key={c.key}
              className="config-search-result"
              onMouseDown={() => handleResultClick(c.key, c.category || '')}
            >
              <span className="config-search-result-key">{c.key}</span>
              {c.category && (
                <span className="config-search-result-category">{c.category}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
