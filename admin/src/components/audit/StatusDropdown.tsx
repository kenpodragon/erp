import React from 'react'

interface Props {
  currentStatus: string
  recordId: number
  onChange: (recordId: number, newStatus: string) => void
}

const STATUS_OPTIONS = ['open', 'acknowledged', 'in_progress', 'resolved', 'wont_fix']

export default function StatusDropdown({ currentStatus, recordId, onChange }: Props) {
  return (
    <select
      className={`status-dropdown bg-${currentStatus}`}
      value={currentStatus}
      onChange={(e) => onChange(recordId, e.target.value)}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </option>
      ))}
    </select>
  )
}
