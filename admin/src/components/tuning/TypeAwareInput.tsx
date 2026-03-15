import { useState } from 'react'
import { inferInputType } from './tuning-utils'
import './tuning.css'

interface TypeAwareInputProps {
  value: any
  onChange: (value: any) => void
  onSave?: () => void
}

export default function TypeAwareInput({ value, onChange, onSave }: TypeAwareInputProps) {
  const type = inferInputType(value)
  const [jsonExpanded, setJsonExpanded] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleBlur = () => {
    onSave?.()
  }

  switch (type) {
    case 'slider_01':
      return (
        <div className="tuning-field-input">
          <input
            className="tuning-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            onMouseUp={handleBlur}
          />
          <input
            className="tuning-input"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={e => {
              const n = parseFloat(e.target.value)
              if (!isNaN(n)) onChange(Math.max(0, Math.min(1, n)))
            }}
            onBlur={handleBlur}
            style={{ width: 70 }}
          />
        </div>
      )

    case 'integer':
      return (
        <div className="tuning-field-input">
          <input
            className="tuning-input"
            type="number"
            step={1}
            min={0}
            value={value}
            onChange={e => {
              const n = parseInt(e.target.value, 10)
              if (!isNaN(n)) onChange(n)
            }}
            onBlur={handleBlur}
          />
        </div>
      )

    case 'float':
      return (
        <div className="tuning-field-input">
          <input
            className="tuning-input"
            type="number"
            step={0.01}
            value={value}
            onChange={e => {
              const n = parseFloat(e.target.value)
              if (!isNaN(n)) onChange(n)
            }}
            onBlur={handleBlur}
          />
        </div>
      )

    case 'string':
      return (
        <div className="tuning-field-input">
          <input
            className="tuning-input tuning-input--wide"
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            onBlur={handleBlur}
          />
        </div>
      )

    case 'boolean':
      return (
        <div className="tuning-field-input">
          <input
            className="tuning-toggle"
            type="checkbox"
            checked={!!value}
            onChange={e => {
              onChange(e.target.checked)
              onSave?.()
            }}
          />
          <span style={{ fontSize: 12, color: '#888' }}>{value ? 'true' : 'false'}</span>
        </div>
      )

    case 'json_array':
    case 'json_object': {
      const toggleExpand = () => {
        if (!jsonExpanded) {
          setJsonText(JSON.stringify(value, null, 2))
          setJsonError(null)
        }
        setJsonExpanded(!jsonExpanded)
      }

      const handleJsonChange = (text: string) => {
        setJsonText(text)
        try {
          const parsed = JSON.parse(text)
          setJsonError(null)
          onChange(parsed)
        } catch {
          setJsonError('Invalid JSON')
        }
      }

      return (
        <div className="tuning-field-input" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <button className="tuning-json-toggle" onClick={toggleExpand}>
            {jsonExpanded ? 'Collapse' : 'Expand'} {type === 'json_array' ? 'Array' : 'Object'}
            {!jsonExpanded && (
              <span style={{ marginLeft: 6, color: '#666' }}>
                ({type === 'json_array' ? `${(value as any[]).length} items` : `${Object.keys(value).length} keys`})
              </span>
            )}
          </button>
          {jsonExpanded && (
            <div style={{ width: '100%', marginTop: 6 }}>
              <textarea
                className="tuning-json-editor"
                value={jsonText}
                onChange={e => handleJsonChange(e.target.value)}
                onBlur={handleBlur}
                rows={Math.min(12, jsonText.split('\n').length + 1)}
                style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12, color: '#ccc', background: '#111', border: jsonError ? '1px solid #aa4444' : '1px solid #333', borderRadius: 4, padding: 8 }}
              />
              {jsonError && <div style={{ fontSize: 11, color: '#cc6666', marginTop: 2 }}>{jsonError}</div>}
            </div>
          )}
        </div>
      )
    }

    default:
      return (
        <div className="tuning-field-input">
          <input
            className="tuning-input tuning-input--wide"
            type="text"
            value={String(value ?? '')}
            onChange={e => onChange(e.target.value)}
            onBlur={handleBlur}
          />
        </div>
      )
  }
}
