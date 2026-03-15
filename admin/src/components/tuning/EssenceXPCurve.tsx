import React, { useMemo } from 'react'
import { buildEssenceSteps } from './tuning-utils'

interface EssenceXPCurveProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
}

const Y_LABELS = ['100%', '75%', '50%', '25%', '0%']

export const EssenceXPCurve: React.FC<EssenceXPCurveProps> = ({
  configs,
  onConfigChange,
}) => {
  const steps = useMemo(() => buildEssenceSteps(configs), [configs])

  return (
    <div>
      <div className="xp-curve-container">
        <div className="xp-curve-y-axis">
          {Y_LABELS.map(label => (
            <span key={label} className="xp-curve-y-label">{label}</span>
          ))}
        </div>
        <div className="xp-curve-chart">
          {steps.map((step, i) => {
            const nextThreshold = i < steps.length - 1 ? steps[i + 1].threshold : 1.0
            const leftPct = step.threshold * 100
            const widthPct = (nextThreshold - step.threshold) * 100
            const heightPct = step.rate * 100

            return (
              <div
                key={step.configKey}
                className="xp-curve-step"
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                <span className="xp-curve-step-label">{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
        {steps.map(step => (
          <div key={step.configKey} className="tuning-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <label className="tuning-field-label" style={{ minWidth: 'auto', fontSize: '11px' }}>
              {step.label}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {step.threshold > 0 ? (
                <>
                  <span style={{ fontSize: '10px', color: '#666' }}>Threshold:</span>
                  <input
                    className="tuning-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={step.threshold}
                    onChange={e => onConfigChange(step.configKey, parseFloat(e.target.value) || 0)}
                    style={{ width: '80px' }}
                  />
                </>
              ) : (
                <>
                  <span style={{ fontSize: '10px', color: '#666' }}>Rate:</span>
                  <input
                    className="tuning-input"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={step.rate}
                    onChange={e => onConfigChange(step.configKey, parseFloat(e.target.value) || 0)}
                    style={{ width: '80px' }}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="tuning-field-help" style={{ marginTop: '12px' }}>
        Training never stops. When essence is low, XP gain is reduced but never zero.
        The step function scales XP rate based on the current essence percentage.
      </div>
    </div>
  )
}
