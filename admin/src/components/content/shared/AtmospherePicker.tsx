import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api'

interface AtmosphereOption {
  id: number
  name: string
  archetype: string
}

interface AtmospherePickerProps {
  value: number | null | undefined
  onChange: (id: number | null) => void
}

export default function AtmospherePicker({ value, onChange }: AtmospherePickerProps) {
  const [options, setOptions] = useState<AtmosphereOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchAtmospheres = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/audio/atmospheres')
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || data.atmospheres || []
        setOptions(items.map((a: any) => ({ id: a.id, name: a.name, archetype: a.archetype || '' })))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAtmospheres() }, [fetchAtmospheres])

  const filtered = search
    ? options.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.archetype.toLowerCase().includes(search.toLowerCase())
      )
    : options

  const selectedLabel = options.find(o => o.id === value)

  return (
    <div>
      {selectedLabel && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
          Current: {selectedLabel.name} ({selectedLabel.archetype})
        </div>
      )}
      <input
        className="form-input"
        type="text"
        placeholder={loading ? 'Loading atmospheres...' : 'Search atmospheres...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '4px', fontSize: '12px' }}
      />
      <select
        className="form-select"
        value={value || ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">-- None --</option>
        {filtered.map(o => (
          <option key={o.id} value={o.id}>
            {o.name} {o.archetype ? `[${o.archetype}]` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
