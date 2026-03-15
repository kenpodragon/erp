import React, { useState, useEffect, useRef } from 'react'

interface AuditFilters {
  audit_type: string | null
  status: string | null
  entity_type: string | null
  search: string
  date_from: string | null
  date_to: string | null
}

interface FilterOptions {
  audit_types: { value: string; count: number }[]
  entity_types: { value: string; count: number }[]
  statuses: string[]
}

interface Props {
  filters: AuditFilters
  filterOptions: FilterOptions | null
  onChange: (filters: AuditFilters) => void
}

const STATUS_CHOICES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active (Open + Ack + In Progress)' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont_fix', label: "Won't Fix" },
]

export default function AuditFilterBar({ filters, filterOptions, onChange }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value })
    }, 300)
  }

  const update = (patch: Partial<AuditFilters>) => {
    onChange({ ...filters, ...patch })
  }

  const clearAll = () => {
    setSearchInput('')
    onChange({
      audit_type: null,
      status: null,
      entity_type: null,
      search: '',
      date_from: null,
      date_to: null,
    })
  }

  const hasFilters =
    filters.audit_type || filters.status || filters.entity_type ||
    filters.search || filters.date_from || filters.date_to

  return (
    <div className="audit-filter-bar">
      <label>
        Type
        <select
          value={filters.audit_type || ''}
          onChange={(e) => update({ audit_type: e.target.value || null })}
        >
          <option value="">All Types</option>
          {filterOptions?.audit_types.map(({ value, count }) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')} ({count})
            </option>
          ))}
        </select>
      </label>

      <label>
        Status
        <select
          value={filters.status || ''}
          onChange={(e) => update({ status: e.target.value || null })}
        >
          {STATUS_CHOICES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label>
        Entity Type
        <select
          value={filters.entity_type || ''}
          onChange={(e) => update({ entity_type: e.target.value || null })}
        >
          <option value="">All Entities</option>
          {filterOptions?.entity_types.map(({ value, count }) => (
            <option key={value} value={value}>
              {value} ({count})
            </option>
          ))}
        </select>
      </label>

      <label>
        Search
        <input
          type="text"
          className="filter-search"
          placeholder="Entity name, field..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </label>

      <label>
        From
        <input
          type="date"
          value={filters.date_from || ''}
          onChange={(e) => update({ date_from: e.target.value || null })}
        />
      </label>

      <label>
        To
        <input
          type="date"
          value={filters.date_to || ''}
          onChange={(e) => update({ date_to: e.target.value || null })}
        />
      </label>

      {hasFilters && (
        <button className="audit-filter-clear" onClick={clearAll}>
          Clear Filters
        </button>
      )}
    </div>
  )
}
