import React from 'react'

interface AuditSummary {
  by_status: Record<string, number>
  by_type: Record<string, number>
  total: number
}

interface Props {
  summary: AuditSummary | null
  onStatusFilter: (status: string | null) => void
  activeStatus: string | null
}

const CARDS: { key: string; label: string; cssClass: string }[] = [
  { key: 'open', label: 'Open', cssClass: 'card-open' },
  { key: 'acknowledged', label: 'Acknowledged', cssClass: 'card-acknowledged' },
  { key: 'in_progress', label: 'In Progress', cssClass: 'card-in_progress' },
  { key: 'resolved', label: 'Resolved', cssClass: 'card-resolved' },
  { key: 'wont_fix', label: "Won't Fix", cssClass: 'card-wont_fix' },
]

export default function AuditSummaryCards({ summary, onStatusFilter, activeStatus }: Props) {
  if (!summary) return null

  return (
    <div className="audit-summary-cards">
      {CARDS.map(({ key, label, cssClass }) => {
        const count = summary.by_status[key] || 0
        const isActive = activeStatus === key

        return (
          <div
            key={key}
            className={`audit-summary-card ${cssClass} ${isActive ? 'active' : ''}`}
            onClick={() => onStatusFilter(isActive ? null : key)}
          >
            <div className="audit-card-label">{label}</div>
            <div className="audit-card-count">{count}</div>
            {key === 'open' && summary.by_type && (
              <div className="audit-card-breakdown">
                {Object.entries(summary.by_type)
                  .filter(([, v]) => v > 0)
                  .map(([type, typeCount]) => (
                    <span key={type} className="audit-type-mini-badge">
                      {type.replace(/_/g, ' ')}: {typeCount}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
