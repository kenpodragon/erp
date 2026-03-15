import React from 'react'
import { EssenceXPCurve } from './EssenceXPCurve'
import { EssenceEconomyPanel } from './EssenceEconomyPanel'
import { SalvageRateTable } from './SalvageRateTable'
import { SubscriptionBoostPanel } from './SubscriptionBoostPanel'
import { ProgressionPanel } from './ProgressionPanel'
import './tuning.css'

interface EconomyTuningPanelProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
  dirtyKeys: Set<string>
  onSave: () => Promise<void>
  onReset: () => void
  saving: boolean
}

export const EconomyTuningPanel: React.FC<EconomyTuningPanelProps> = ({
  configs,
  onConfigChange,
  dirtyKeys,
  onSave,
  onReset,
  saving,
}) => {
  return (
    <div className="tuning-panel">
      <div className="tuning-section">
        <h3 className="tuning-section-title">Essence XP Curve</h3>
        <EssenceXPCurve configs={configs} onConfigChange={onConfigChange} />
      </div>

      <div className="tuning-section">
        <h3 className="tuning-section-title">Essence Economy</h3>
        <EssenceEconomyPanel configs={configs} onConfigChange={onConfigChange} />
      </div>

      <div className="tuning-section">
        <h3 className="tuning-section-title">Salvage Rates</h3>
        <SalvageRateTable configs={configs} onConfigChange={onConfigChange} />
      </div>

      <div className="tuning-section">
        <h3 className="tuning-section-title">Subscription Boosts</h3>
        <SubscriptionBoostPanel configs={configs} onConfigChange={onConfigChange} />
      </div>

      <div className="tuning-section">
        <h3 className="tuning-section-title">Progression</h3>
        <ProgressionPanel configs={configs} onConfigChange={onConfigChange} />
      </div>

      {dirtyKeys.size > 0 && (
        <div className="tuning-unsaved">
          {dirtyKeys.size} unsaved change{dirtyKeys.size !== 1 ? 's' : ''}
        </div>
      )}

      <div className="tuning-actions">
        <button
          className="tuning-btn tuning-btn--reset"
          onClick={onReset}
          disabled={dirtyKeys.size === 0 || saving}
        >
          Reset
        </button>
        <button
          className="tuning-btn tuning-btn--save"
          onClick={onSave}
          disabled={dirtyKeys.size === 0 || saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
