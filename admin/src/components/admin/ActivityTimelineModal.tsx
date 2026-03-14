import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import './ActivityTimelineModal.css'

/* ── Types ───────────────────────────────────────────────── */

type EventCategory = 'gameplay' | 'economy' | 'admin' | 'social' | 'anticheat'

interface TimelineEvent {
  timestamp: string
  category: EventCategory
  type: string
  summary: string
  detail: Record<string, any>
}

interface TimelineResponse {
  events: TimelineEvent[]
  next_cursor: string | null
  has_more: boolean
}

interface Props {
  playerId: number
  playerAlias: string
  onClose: () => void
}

/* ── Constants ───────────────────────────────────────────── */

const CATEGORIES: { key: EventCategory; label: string; icon: string }[] = [
  { key: 'gameplay', label: 'Gameplay', icon: '\uD83C\uDFAE' },
  { key: 'economy', label: 'Economy', icon: '\uD83D\uDCB0' },
  { key: 'admin', label: 'Admin', icon: '\uD83D\uDEE1\uFE0F' },
  { key: 'social', label: 'Social', icon: '\uD83D\uDCCB' },
  { key: 'anticheat', label: 'AntiCheat', icon: '\uD83D\uDEA8' },
]

const CATEGORY_ICONS: Record<EventCategory, string> = {
  gameplay: '\uD83C\uDFAE',
  economy: '\uD83D\uDCB0',
  admin: '\uD83D\uDEE1\uFE0F',
  social: '\uD83D\uDCCB',
  anticheat: '\uD83D\uDEA8',
}

/* ── Helpers ─────────────────────────────────────────────── */

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function groupByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const groups = new Map<string, TimelineEvent[]>()
  for (const ev of events) {
    const dateKey = formatDate(ev.timestamp)
    const list = groups.get(dateKey) ?? []
    list.push(ev)
    groups.set(dateKey, list)
  }
  return groups
}

/* ── Component ───────────────────────────────────────────── */

export default function ActivityTimelineModal({ playerId, playerAlias, onClose }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set())
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    new Set(['gameplay', 'economy', 'admin', 'social', 'anticheat'])
  )

  /* ── Fetch timeline events ─────────────────────────────── */

  const fetchTimeline = useCallback(async (cursor?: string | null) => {
    try {
      if (cursor) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const cats = Array.from(activeCategories).join(',')
      let url = `/api/admin/players/${playerId}/timeline?categories=${cats}&limit=50`
      if (cursor) {
        url += `&before=${encodeURIComponent(cursor)}`
      }

      const res = await api.get(url)
      if (!res.ok) throw new Error('Failed to load timeline')

      const data: TimelineResponse = await res.json()

      if (cursor) {
        setEvents(prev => [...prev, ...data.events])
      } else {
        setEvents(data.events)
        setExpandedIndices(new Set())
      }

      setHasMore(data.has_more)
      setNextCursor(data.next_cursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [playerId, activeCategories])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  /* ── Category filter toggle ────────────────────────────── */

  const toggleCategory = (cat: EventCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  /* ── Expand/collapse detail ────────────────────────────── */

  const toggleDetail = (globalIndex: number) => {
    setExpandedIndices(prev => {
      const next = new Set(prev)
      if (next.has(globalIndex)) {
        next.delete(globalIndex)
      } else {
        next.add(globalIndex)
      }
      return next
    })
  }

  /* ── Keyboard: close on Escape ─────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* ── Render ────────────────────────────────────────────── */

  const dateGroups = groupByDate(events)
  let globalIndex = -1

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="atm-modal" onClick={e => e.stopPropagation()}>
        {/* Title bar */}
        <div className="atm-title-bar">
          <h3>Activity Timeline &mdash; &ldquo;{playerAlias}&rdquo;</h3>
          <button className="atm-close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {/* Category filters */}
        <div className="atm-filters">
          <span className="atm-filters-label">Filters:</span>
          {CATEGORIES.map(cat => (
            <label key={cat.key} className="atm-filter-checkbox">
              <input
                type="checkbox"
                checked={activeCategories.has(cat.key)}
                onChange={() => toggleCategory(cat.key)}
              />
              <span className={`atm-filter-tag atm-cat-${cat.key}`}>
                {cat.icon} {cat.label}
              </span>
            </label>
          ))}
        </div>

        {/* Body */}
        <div className="atm-body">
          {loading && <div className="atm-loading">Loading timeline...</div>}
          {error && <div className="atm-error">{error}</div>}

          {!loading && !error && events.length === 0 && (
            <div className="atm-empty">No events found for the selected filters.</div>
          )}

          {!loading && !error && events.length > 0 && (
            <>
              {Array.from(dateGroups.entries()).map(([dateLabel, dayEvents]) => (
                <div key={dateLabel} className="atm-date-group">
                  <div className="atm-date-separator">
                    <span>{dateLabel}</span>
                  </div>

                  {dayEvents.map(ev => {
                    globalIndex++
                    const idx = globalIndex
                    const isExpanded = expandedIndices.has(idx)
                    const hasDetail = ev.detail && Object.keys(ev.detail).length > 0

                    return (
                      <div
                        key={idx}
                        className={`atm-event atm-event-${ev.category}`}
                      >
                        <div className="atm-event-row">
                          <span className="atm-event-icon">{CATEGORY_ICONS[ev.category]}</span>
                          <span className="atm-event-time">{formatTime(ev.timestamp)}</span>
                          <span className="atm-event-summary">{ev.summary}</span>
                          {hasDetail && (
                            <button
                              className="atm-detail-toggle"
                              onClick={() => toggleDetail(idx)}
                              aria-label={isExpanded ? 'Collapse detail' : 'Expand detail'}
                            >
                              {isExpanded ? '\u25BE detail' : '\u25B8 detail'}
                            </button>
                          )}
                        </div>

                        {/* Inline stats for session-complete gameplay events */}
                        {ev.category === 'gameplay' && ev.detail && (
                          ev.detail.waves !== undefined ||
                          ev.detail.gold !== undefined ||
                          ev.detail.deaths !== undefined ||
                          ev.detail.duration !== undefined
                        ) ? (
                          <div className="atm-event-stats">
                            {ev.detail.waves !== undefined && <span>{ev.detail.waves} waves</span>}
                            {ev.detail.gold !== undefined && <span>{Number(ev.detail.gold).toLocaleString()} gold</span>}
                            {ev.detail.deaths !== undefined && <span>{ev.detail.deaths} deaths</span>}
                            {ev.detail.duration !== undefined && <span>{ev.detail.duration} duration</span>}
                          </div>
                        ) : null}

                        {/* Expandable detail section */}
                        {isExpanded && hasDetail && (
                          <div className="atm-event-detail">
                            <pre>{JSON.stringify(ev.detail, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="atm-load-more">
                  <button
                    onClick={() => fetchTimeline(nextCursor)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
