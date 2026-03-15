import React, { useMemo, useState } from 'react'
import { SkillBalanceRow, formatGold } from './tuning-utils'

interface SkillBalanceTableProps {
  skills: SkillBalanceRow[]
  originalSkills: SkillBalanceRow[]
  categoryFilter: string
  classFilter: string
}

type SortKey = keyof SkillBalanceRow
type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'display_name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'class_name', label: 'Class' },
  { key: 'base_cooldown_seconds', label: 'Base CD (s)' },
  { key: 'base_cost_gold', label: 'Base Cost' },
  { key: 'cost_at_5', label: 'Cost@5' },
  { key: 'cost_at_10', label: 'Cost@10' },
  { key: 'cost_at_25', label: 'Cost@25' },
  { key: 'eff_cd_at_10', label: 'Eff CD@10' },
  { key: 'eff_cd_at_25', label: 'Eff CD@25' },
]

export const SkillBalanceTable: React.FC<SkillBalanceTableProps> = ({
  skills,
  originalSkills,
  categoryFilter,
  classFilter,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('category')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const originalMap = useMemo(() => {
    const m = new Map<number, SkillBalanceRow>()
    for (const s of originalSkills) m.set(s.id, s)
    return m
  }, [originalSkills])

  const filtered = useMemo(() => {
    let rows = skills
    if (categoryFilter) rows = rows.filter(s => s.category === categoryFilter)
    if (classFilter) rows = rows.filter(s => s.class_name === classFilter)
    return rows
  }, [skills, categoryFilter, classFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const aVal = av ?? ''
      const bVal = bv ?? ''
      let cmp: number
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = String(aVal).localeCompare(String(bVal))
      }
      // Secondary sort by name when primary sort is category
      if (cmp === 0 && sortKey === 'category') {
        cmp = a.display_name.localeCompare(b.display_name)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const isChanged = (row: SkillBalanceRow, key: SortKey): boolean => {
    const orig = originalMap.get(row.id)
    if (!orig) return false
    return orig[key] !== row[key]
  }

  const formatCell = (key: SortKey, value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (
      typeof value === 'number' &&
      ['base_cost_gold', 'cost_at_5', 'cost_at_10', 'cost_at_25'].includes(key)
    ) {
      return formatGold(value)
    }
    return String(value)
  }

  return (
    <table className="skill-table">
      <thead>
        <tr>
          {COLUMNS.map(col => (
            <th
              key={col.key}
              className={sortKey === col.key ? 'sorted' : ''}
              onClick={() => handleSort(col.key)}
            >
              {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
            </th>
          ))}
          <th>Edit</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(row => (
          <tr key={row.id}>
            {COLUMNS.map(col => (
              <td
                key={col.key}
                className={isChanged(row, col.key) ? 'changed' : ''}
              >
                {formatCell(col.key, row[col.key])}
              </td>
            ))}
            <td>
              <span
                className="skill-link"
                onClick={() => {
                  window.location.href = `/content?tab=skills&id=${row.id}`
                }}
              >
                Edit
              </span>
            </td>
          </tr>
        ))}
        {sorted.length === 0 && (
          <tr>
            <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', color: '#666' }}>
              No skills match filters
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
