import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../../api'

interface EntityOption {
  id: number
  canonical_name: string
  entity_type: string
}

interface EntityPickerProps {
  value: number | null | undefined
  onChange: (id: number | null, name?: string) => void
  placeholder?: string
}

export default function EntityPicker({ value, onChange, placeholder }: EntityPickerProps) {
  const [options, setOptions] = useState<EntityOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchEntities = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page_size: '20' })
      if (query) params.set('search', query)
      const res = await api.get(`/api/admin/content/entities?${params}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setOptions(items.map((e: any) => ({
          id: e.id,
          canonical_name: e.canonical_name || e.name || '',
          entity_type: e.entity_type || '',
        })))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEntities('') }, [fetchEntities])

  const handleSearch = (query: string) => {
    setSearch(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchEntities(query), 300)
  }

  const selectedLabel = options.find(o => o.id === value)

  return (
    <div>
      {selectedLabel && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
          Current: {selectedLabel.canonical_name} ({selectedLabel.entity_type})
        </div>
      )}
      <input
        className="form-input"
        type="text"
        placeholder={loading ? 'Loading...' : (placeholder || 'Search entities...')}
        value={search}
        onChange={e => handleSearch(e.target.value)}
        style={{ marginBottom: '4px', fontSize: '12px' }}
      />
      <select
        className="form-select"
        value={value || ''}
        onChange={e => {
          const id = e.target.value ? Number(e.target.value) : null
          const entity = options.find(o => o.id === id)
          onChange(id, entity?.canonical_name)
        }}
      >
        <option value="">-- None --</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>
            {o.canonical_name} [{o.entity_type}]
          </option>
        ))}
      </select>
    </div>
  )
}
