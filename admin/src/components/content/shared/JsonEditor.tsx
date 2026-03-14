import { useState } from 'react'

interface JsonEditorProps {
  value: Record<string, any>
  onChange: (value: Record<string, any>) => void
  mode: 'structured' | 'raw'
}

export default function JsonEditor({ value, onChange, mode: initialMode }: JsonEditorProps) {
  const [mode, setMode] = useState<'structured' | 'raw'>(initialMode)
  const [rawText, setRawText] = useState(JSON.stringify(value || {}, null, 2))
  const [rawError, setRawError] = useState('')
  const [newKey, setNewKey] = useState('')

  const entries = Object.entries(value || {})

  const handleRawChange = (text: string) => {
    setRawText(text)
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        onChange(parsed)
        setRawError('')
      } else {
        setRawError('Must be a JSON object')
      }
    } catch {
      setRawError('Invalid JSON')
    }
  }

  const handleAddKey = () => {
    if (!newKey.trim()) return
    onChange({ ...value, [newKey.trim()]: '' })
    setNewKey('')
    setRawText(JSON.stringify({ ...value, [newKey.trim()]: '' }, null, 2))
  }

  const handleRemoveKey = (key: string) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
    setRawText(JSON.stringify(next, null, 2))
  }

  const handleValueChange = (key: string, val: string) => {
    let parsed: any = val
    if (val === 'true') parsed = true
    else if (val === 'false') parsed = false
    else if (val !== '' && !isNaN(Number(val))) parsed = Number(val)

    const next = { ...value, [key]: parsed }
    onChange(next)
    setRawText(JSON.stringify(next, null, 2))
  }

  return (
    <div style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '4px', padding: '4px 8px', background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border-subtle)' }}>
        <button
          className={`btn btn-sm ${mode === 'structured' ? 'btn-primary' : ''}`}
          onClick={() => setMode('structured')}
        >
          Structured
        </button>
        <button
          className={`btn btn-sm ${mode === 'raw' ? 'btn-primary' : ''}`}
          onClick={() => { setMode('raw'); setRawText(JSON.stringify(value || {}, null, 2)) }}
        >
          Raw JSON
        </button>
      </div>

      <div style={{ padding: '8px' }}>
        {mode === 'structured' ? (
          <>
            {entries.map(([key, val]) => (
              <div key={key} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                <input
                  className="form-input"
                  value={key}
                  disabled
                  style={{ width: '140px', fontSize: '12px', fontFamily: 'monospace' }}
                />
                <input
                  className="form-input"
                  value={String(val)}
                  onChange={e => handleValueChange(key, e.target.value)}
                  style={{ flex: 1, fontSize: '12px' }}
                />
                <button className="btn-icon" onClick={() => handleRemoveKey(key)} title="Remove">x</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
              <input
                className="form-input"
                placeholder="New key..."
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddKey()}
                style={{ width: '140px', fontSize: '12px' }}
              />
              <button className="btn btn-sm btn-success" onClick={handleAddKey}>+ Add</button>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="form-textarea"
              value={rawText}
              onChange={e => handleRawChange(e.target.value)}
              style={{ width: '100%', minHeight: '120px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            />
            {rawError && <div style={{ color: 'var(--color-error)', fontSize: '11px', marginTop: '4px' }}>{rawError}</div>}
          </>
        )}
      </div>
    </div>
  )
}
