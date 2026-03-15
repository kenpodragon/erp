import React, { useState } from 'react'

interface Props {
  selectedIds: number[]
  onBulkUpdate: (status: string) => void
  onClearSelection: () => void
}

const STATUS_OPTIONS = ['open', 'acknowledged', 'in_progress', 'resolved', 'wont_fix']

export default function BulkStatusBar({ selectedIds, onBulkUpdate, onClearSelection }: Props) {
  const [bulkStatus, setBulkStatus] = useState('acknowledged')

  if (selectedIds.length === 0) return null

  const handleApply = () => {
    const label = bulkStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const confirmed = window.confirm(
      `Update ${selectedIds.length} record${selectedIds.length > 1 ? 's' : ''} to "${label}"?`
    )
    if (confirmed) {
      onBulkUpdate(bulkStatus)
    }
  }

  return (
    <div className="bulk-status-bar">
      <span className="bulk-count">{selectedIds.length} selected</span>
      <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
      <button className="btn-apply" onClick={handleApply}>Apply</button>
      <button className="btn-clear" onClick={onClearSelection}>Clear Selection</button>
    </div>
  )
}
