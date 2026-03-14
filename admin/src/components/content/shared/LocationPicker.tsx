import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../../api'

interface LocationOption {
  id: number
  canonical_name: string
  location_type: string
}

interface LocationPickerProps {
  value: number | null | undefined
  onChange: (id: number | null, name?: string) => void
  placeholder?: string
}

export default function LocationPicker({ value, onChange, placeholder }: LocationPickerProps) {
  const [options, setOptions] = useState<LocationOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchLocations = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page_size: '20' })
      if (query) params.set('search', query)
      const res = await api.get(`/api/admin/content/locations?${params}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setOptions(items.map((l: any) => ({
          id: l.id,
          canonical_name: l.canonical_name || l.name || '',
          location_type: l.location_type || '',
        })))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLocations('') }, [fetchLocations])

  const handleSearch = (query: string) => {
    setSearch(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchLocations(query), 300)
  }

  const selectedLabel = options.find(o => o.id === value)

  return (
    <div>
      {selectedLabel && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
          Current: {selectedLabel.canonical_name} ({selectedLabel.location_type})
        </div>
      )}
      <input
        className="form-input"
        type="text"
        placeholder={loading ? 'Loading...' : (placeholder || 'Search locations...')}
        value={search}
        onChange={e => handleSearch(e.target.value)}
        style={{ marginBottom: '4px', fontSize: '12px' }}
      />
      <select
        className="form-select"
        value={value || ''}
        onChange={e => {
          const id = e.target.value ? Number(e.target.value) : null
          const loc = options.find(o => o.id === id)
          onChange(id, loc?.canonical_name)
        }}
      >
        <option value="">-- None --</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>
            {o.canonical_name} [{o.location_type}]
          </option>
        ))}
      </select>
    </div>
  )
}
