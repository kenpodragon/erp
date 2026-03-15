import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../api'
import {
  computeProjections,
  computeDelta,
  type ScalingConfig,
  type ChapterInfo,
  type ScalingProjection,
  type CurveData,
  type WavePresetConfig,
} from './scaling-utils'

interface BookOption {
  id: number
  title: string
  book_number: number
  difficulty_curve_id: number | null
  chapters?: ChapterInfo[]
}

interface CurveOption {
  id: number
  name: string
  curve_data: CurveData
}

interface WavePresetOption {
  id: number
  name: string
  config: WavePresetConfig
  is_default: boolean
}

interface PresetOption {
  id: number
  name: string
  difficulty_curve_id: number | null
  wave_preset_id: number | null
  config_snapshot: Record<string, any>
  is_active: boolean
}

type ConfigSource = 'current' | number // 'current' or preset id

function ScalingComparisonTable({
  projectionsA,
  projectionsB,
  labelA,
  labelB,
}: {
  projectionsA: ScalingProjection[]
  projectionsB: ScalingProjection[]
  labelA: string
  labelB: string
}) {
  if (projectionsA.length === 0) return null

  const hasBoth = projectionsB.length > 0

  // Compute averages
  const avgA = projectionsA.length > 0
    ? Math.round(projectionsA.reduce((s, p) => s + p.effective_difficulty, 0) / projectionsA.length)
    : 0
  const avgB = hasBoth && projectionsB.length > 0
    ? Math.round(projectionsB.reduce((s, p) => s + p.effective_difficulty, 0) / projectionsB.length)
    : 0

  const avgDelta = hasBoth ? computeDelta(avgA, avgB) : { pct: 0, cls: 'neutral', label: '' }

  return (
    <div className="editor-table-wrapper" style={{ maxHeight: 500, overflowY: 'auto', marginTop: 16 }}>
      <table className="editor-table">
        <thead>
          <tr>
            <th rowSpan={2}>Ch</th>
            <th rowSpan={2}>Title</th>
            <th colSpan={5} style={{ textAlign: 'center', borderBottom: '2px solid var(--color-border)' }}>{labelA}</th>
            {hasBoth && (
              <>
                <th colSpan={5} style={{ textAlign: 'center', borderBottom: '2px solid var(--color-border)' }}>{labelB}</th>
                <th rowSpan={2}>Delta</th>
              </>
            )}
          </tr>
          <tr>
            <th>HP</th>
            <th>Gold</th>
            <th>Enemies</th>
            <th>Spawn ms</th>
            <th>Eff. Diff</th>
            {hasBoth && (
              <>
                <th>HP</th>
                <th>Gold</th>
                <th>Enemies</th>
                <th>Spawn ms</th>
                <th>Eff. Diff</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {projectionsA.map((pA, i) => {
            const pB = hasBoth ? projectionsB[i] : null
            const hpDelta = pB ? computeDelta(pA.base_hp, pB.base_hp) : null
            const goldDelta = pB ? computeDelta(pA.base_gold, pB.base_gold) : null
            const enemyDelta = pB ? computeDelta(pA.enemies_per_wave, pB.enemies_per_wave) : null
            const spawnDelta = pB ? computeDelta(pA.spawn_interval_ms, pB.spawn_interval_ms) : null
            const effDelta = pB ? computeDelta(pA.effective_difficulty, pB.effective_difficulty) : null

            return (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{pA.chapter_number}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pA.chapter_title}
                </td>
                <td>{pA.base_hp.toLocaleString()}</td>
                <td>{pA.base_gold.toLocaleString()}</td>
                <td>{pA.enemies_per_wave}</td>
                <td>{pA.spawn_interval_ms}</td>
                <td style={{ fontWeight: 600 }}>{pA.effective_difficulty.toLocaleString()}</td>
                {pB && (
                  <>
                    <td className={`delta-cell delta-cell--${hpDelta?.cls}`}>
                      {pB.base_hp.toLocaleString()}
                      {hpDelta?.label && <span className="delta-badge">{hpDelta.label}</span>}
                    </td>
                    <td className={`delta-cell delta-cell--${goldDelta?.cls}`}>
                      {pB.base_gold.toLocaleString()}
                      {goldDelta?.label && <span className="delta-badge">{goldDelta.label}</span>}
                    </td>
                    <td className={`delta-cell delta-cell--${enemyDelta?.cls}`}>
                      {pB.enemies_per_wave}
                      {enemyDelta?.label && <span className="delta-badge">{enemyDelta.label}</span>}
                    </td>
                    <td className={`delta-cell delta-cell--${spawnDelta?.cls}`}>
                      {pB.spawn_interval_ms}
                      {spawnDelta?.label && <span className="delta-badge">{spawnDelta.label}</span>}
                    </td>
                    <td className={`delta-cell delta-cell--${effDelta?.cls}`} style={{ fontWeight: 600 }}>
                      {pB.effective_difficulty.toLocaleString()}
                      {effDelta?.label && <span className="delta-badge">{effDelta.label}</span>}
                    </td>
                    <td className={`delta-cell delta-cell--${effDelta?.cls}`}>{effDelta?.label || '--'}</td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
        {hasBoth && (
          <tfoot>
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={6} style={{ textAlign: 'right' }}>Avg Effective Difficulty:</td>
              <td>{avgA.toLocaleString()}</td>
              <td colSpan={4} />
              <td>{avgB.toLocaleString()}</td>
              <td className={`delta-cell delta-cell--${avgDelta.cls}`}>{avgDelta.label || '--'}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default function ScalingPreview() {
  const [books, setBooks] = useState<BookOption[]>([])
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [chapterFrom, setChapterFrom] = useState(1)
  const [chapterTo, setChapterTo] = useState(999)
  const [loading, setLoading] = useState(false)

  // Shared data
  const [gameConfigs, setGameConfigs] = useState<Record<string, any>>({})
  const [curves, setCurves] = useState<CurveOption[]>([])
  const [wavePresets, setWavePresets] = useState<WavePresetOption[]>([])
  const [presets, setPresets] = useState<PresetOption[]>([])

  // Config sources
  const [sourceA, setSourceA] = useState<ConfigSource>('current')
  const [sourceB, setSourceB] = useState<ConfigSource>('current')

  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [booksRes, configsRes, curvesRes, wavesRes, presetsRes] = await Promise.all([
        api.get('/api/admin/content/books'),
        api.get('/api/admin/scaling/presets/capture-current'),
        api.get('/api/admin/scaling/difficulty-curves'),
        api.get('/api/admin/scaling/wave-presets'),
        api.get('/api/admin/scaling/presets'),
      ])

      if (booksRes.ok) {
        const data = await booksRes.json()
        setBooks(Array.isArray(data) ? data : data.items || [])
      }
      if (configsRes.ok) {
        const data = await configsRes.json()
        setGameConfigs(data.config_snapshot || {})
      }
      if (curvesRes.ok) {
        const data = await curvesRes.json()
        setCurves((data.items || []).map((c: any) => ({ id: c.id, name: c.name, curve_data: c.curve_data })))
      }
      if (wavesRes.ok) {
        const data = await wavesRes.json()
        setWavePresets((data.items || []).map((w: any) => ({ id: w.id, name: w.name, config: w.config, is_default: w.is_default })))
      }
      if (presetsRes.ok) {
        const data = await presetsRes.json()
        setPresets(data.items || [])
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load data' })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Get chapters for selected book
  const selectedBook = books.find(b => b.id === selectedBookId)
  const allChapters: ChapterInfo[] = useMemo(() => {
    if (!selectedBook?.chapters) return []
    return selectedBook.chapters
      .sort((a, b) => a.chapter_number - b.chapter_number)
      .filter(c => c.chapter_number >= chapterFrom && c.chapter_number <= chapterTo)
  }, [selectedBook, chapterFrom, chapterTo])

  // Build ScalingConfig from source
  const buildConfig = useCallback((source: ConfigSource): ScalingConfig => {
    if (source === 'current') {
      // Use current game configs
      const defaultCurve = curves.find(c => {
        if (!selectedBook) return false
        return selectedBook.difficulty_curve_id === c.id
      })
      const defaultWave = wavePresets.find(w => w.is_default)
      return {
        game_configs: gameConfigs,
        curve: defaultCurve?.curve_data ?? null,
        wave_preset: defaultWave?.config ?? null,
      }
    }

    // Use a preset
    const preset = presets.find(p => p.id === source)
    if (!preset) {
      return { game_configs: gameConfigs, curve: null, wave_preset: null }
    }

    const presetCurve = preset.difficulty_curve_id
      ? curves.find(c => c.id === preset.difficulty_curve_id)
      : null

    const presetWave = preset.wave_preset_id
      ? wavePresets.find(w => w.id === preset.wave_preset_id)
      : null

    return {
      game_configs: { ...gameConfigs, ...preset.config_snapshot },
      curve: presetCurve?.curve_data ?? null,
      wave_preset: presetWave?.config ?? null,
    }
  }, [gameConfigs, curves, wavePresets, presets, selectedBook])

  const configA = useMemo(() => buildConfig(sourceA), [buildConfig, sourceA])
  const configB = useMemo(() => buildConfig(sourceB), [buildConfig, sourceB])

  const projectionsA = useMemo(() => computeProjections(configA, allChapters), [configA, allChapters])
  const projectionsB = useMemo(
    () => sourceA !== sourceB ? computeProjections(configB, allChapters) : [],
    [configB, allChapters, sourceA, sourceB],
  )

  const sourceLabel = (s: ConfigSource) => {
    if (s === 'current') return 'Current Settings'
    const p = presets.find(pr => pr.id === s)
    return p ? p.name : `Preset #${s}`
  }

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="section-header">Scaling Preview</div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: 12 }}>
        Compare difficulty projections between configurations. Select a book and optionally
        choose two different config sources for side-by-side comparison.
      </p>

      {loading ? (
        <div className="editor-loading">Loading data...</div>
      ) : (
        <>
          {/* Controls */}
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-field">
              <label className="form-label">Book</label>
              <select
                className="form-select"
                value={selectedBookId ?? ''}
                onChange={e => setSelectedBookId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- select book --</option>
                {books.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Chapter From</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={chapterFrom}
                onChange={e => setChapterFrom(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Chapter To</label>
              <input
                className="form-input"
                type="number"
                min={1}
                value={chapterTo}
                onChange={e => setChapterTo(parseInt(e.target.value) || 999)}
              />
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-field">
              <label className="form-label">Config A</label>
              <select
                className="form-select"
                value={sourceA === 'current' ? 'current' : String(sourceA)}
                onChange={e => setSourceA(e.target.value === 'current' ? 'current' : Number(e.target.value))}
              >
                <option value="current">Current Settings</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.is_active ? ' (active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Config B</label>
              <select
                className="form-select"
                value={sourceB === 'current' ? 'current' : String(sourceB)}
                onChange={e => setSourceB(e.target.value === 'current' ? 'current' : Number(e.target.value))}
              >
                <option value="current">Current Settings</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.is_active ? ' (active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results */}
          {!selectedBookId ? (
            <div className="editor-empty">Select a book to preview scaling projections.</div>
          ) : allChapters.length === 0 ? (
            <div className="editor-empty">No chapters found for this book in the specified range.</div>
          ) : (
            <ScalingComparisonTable
              projectionsA={projectionsA}
              projectionsB={projectionsB}
              labelA={sourceLabel(sourceA)}
              labelB={sourceLabel(sourceB)}
            />
          )}
        </>
      )}

      <style>{`
        .delta-cell { position: relative; }
        .delta-cell--harder { background: rgba(204, 51, 51, 0.08); }
        .delta-cell--easier { background: rgba(51, 153, 51, 0.08); }
        .delta-cell--neutral { }
        .delta-badge {
          display: inline-block;
          font-size: 10px;
          margin-left: 4px;
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 600;
        }
        .delta-cell--harder .delta-badge { color: #cc3333; background: rgba(204, 51, 51, 0.12); }
        .delta-cell--easier .delta-badge { color: #339933; background: rgba(51, 153, 51, 0.12); }
      `}</style>
    </div>
  )
}
