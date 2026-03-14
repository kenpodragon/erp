import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api'

interface AssetOption {
  id: number
  asset_key: string
  display_name: string
  file_path: string
}

interface AssetPickerProps {
  category: string
  value: string | null | undefined
  onChange: (assetKey: string | null) => void
}

export default function AssetPicker({ category, value, onChange }: AssetPickerProps) {
  const [options, setOptions] = useState<AssetOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/admin/assets?category=${encodeURIComponent(category)}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || data.assets || []
        setOptions(items.map((a: any) => ({
          id: a.id,
          asset_key: a.asset_key || a.key || '',
          display_name: a.display_name || a.name || a.asset_key || '',
          file_path: a.file_path || '',
        })))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [category])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  const filtered = search
    ? options.filter(o =>
        o.display_name.toLowerCase().includes(search.toLowerCase()) ||
        o.asset_key.toLowerCase().includes(search.toLowerCase())
      )
    : options

  return (
    <div>
      <input
        className="form-input"
        type="text"
        placeholder={loading ? 'Loading assets...' : `Search ${category} assets...`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '4px', fontSize: '12px' }}
      />
      <select
        className="form-select"
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">-- None --</option>
        {filtered.map(o => (
          <option key={o.id} value={o.asset_key}>
            {o.display_name} ({o.asset_key})
          </option>
        ))}
      </select>
    </div>
  )
}
