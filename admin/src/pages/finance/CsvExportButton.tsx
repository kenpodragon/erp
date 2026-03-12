interface CsvColumn {
  key: string
  label: string
}

interface CsvExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  columns?: CsvColumn[]
  className?: string
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export default function CsvExportButton({ data, filename, columns, className }: CsvExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return

    const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }))
    const headerRow = cols.map(c => escapeCsvValue(c.label)).join(',')
    const rows = data.map(row =>
      cols.map(c => escapeCsvValue(row[c.key])).join(',')
    )
    const csv = [headerRow, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      className={className || 'fin-btn fin-btn-secondary fin-btn-sm'}
      onClick={handleExport}
      disabled={!data || data.length === 0}
      title="Export as CSV"
    >
      Export CSV
    </button>
  )
}
