import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import AuditSummaryCards from '../components/audit/AuditSummaryCards'
import AuditFilterBar from '../components/audit/AuditFilterBar'
import AuditTable from '../components/audit/AuditTable'
import BulkStatusBar from '../components/audit/BulkStatusBar'
import '../components/audit/dev-audit.css'

interface AuditSummary {
  by_status: Record<string, number>
  by_type: Record<string, number>
  total: number
}

interface FilterOptions {
  audit_types: { value: string; count: number }[]
  entity_types: { value: string; count: number }[]
  statuses: string[]
}

interface AuditFilters {
  audit_type: string | null
  status: string | null
  entity_type: string | null
  search: string
  date_from: string | null
  date_to: string | null
}

interface AuditRecord {
  id: number
  audit_type: string
  entity_type: string | null
  entity_id: number | null
  entity_name: string | null
  missing_field: string | null
  scene_id: number | null
  scene_title: string | null
  zone_level: number | null
  status: string
  logged_at: string
}

const PAGE_SIZE = 50

export default function DevAudit() {
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<AuditFilters>({
    audit_type: null,
    status: 'active',
    entity_type: null,
    search: '',
    date_from: null,
    date_to: null,
  })

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/dev-audit/summary')
      if (res.ok) {
        setSummary(await res.json())
      }
    } catch {
      // silent
    }
  }, [])

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/dev-audit/filter-options')
      if (res.ok) {
        setFilterOptions(await res.json())
      }
    } catch {
      // silent
    }
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      })
      if (filters.audit_type) params.set('audit_type', filters.audit_type)
      if (filters.status) params.set('status', filters.status)
      if (filters.entity_type) params.set('entity_type', filters.entity_type)
      if (filters.search) params.set('search', filters.search)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)

      const res = await api.get(`/api/admin/dev-audit?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRecords(data.records || [])
      setTotal(data.total || 0)
    } catch {
      setError('Failed to load audit records.')
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchSummary()
    fetchFilterOptions()
  }, [fetchSummary, fetchFilterOptions])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const refreshAll = () => {
    fetchSummary()
    fetchFilterOptions()
    fetchRecords()
  }

  const handleStatusFilter = (status: string | null) => {
    setFilters((prev) => ({ ...prev, status }))
    setPage(1)
    setSelectedIds([])
  }

  const handleFiltersChange = (newFilters: AuditFilters) => {
    setFilters(newFilters)
    setPage(1)
    setSelectedIds([])
  }

  const handleStatusChange = async (recordId: number, newStatus: string) => {
    try {
      const res = await api.patch(`/api/admin/dev-audit/${recordId}`, { status: newStatus })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      refreshAll()
    } catch {
      setError('Failed to update status.')
    }
  }

  const handleBulkUpdate = async (status: string) => {
    try {
      const res = await api.post('/api/admin/dev-audit/bulk-status', {
        ids: selectedIds,
        status,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSelectedIds([])
      refreshAll()
    } catch {
      setError('Failed to bulk update statuses.')
    }
  }

  return (
    <div>
      <div className="dev-audit-header">
        <h1>Dev Content Audit</h1>
        <button className="refresh-btn" onClick={refreshAll}>Refresh</button>
      </div>

      {error && <div className="audit-error">{error}</div>}

      <AuditSummaryCards
        summary={summary}
        onStatusFilter={handleStatusFilter}
        activeStatus={filters.status}
      />

      <AuditFilterBar
        filters={filters}
        filterOptions={filterOptions}
        onChange={handleFiltersChange}
      />

      <BulkStatusBar
        selectedIds={selectedIds}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={() => setSelectedIds([])}
      />

      {loading ? (
        <div className="audit-loading">Loading audit records...</div>
      ) : (
        <AuditTable
          records={records}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
