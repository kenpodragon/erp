import React from 'react'
import { computeDropPreview } from './tuning-utils'

interface DropPreviewProps {
  configs: Record<string, any>
}

const DropPreview: React.FC<DropPreviewProps> = ({ configs }) => {
  const preview = computeDropPreview(configs)

  return (
    <div className="tuning-preview">
      <div className="tuning-preview-title">Estimated Artifact Drops per 100 Scenes</div>
      <div>From normal scenes: <strong>{preview.from_scenes}</strong></div>
      <div>From bosses: <strong>{preview.from_bosses}</strong></div>
      <div>From mastery: <strong>{preview.from_mastery}</strong></div>
      <div style={{ marginTop: 4, borderTop: '1px solid #333', paddingTop: 4 }}>
        Total: <strong style={{ color: '#88aadd' }}>{preview.total}</strong> artifacts
      </div>
    </div>
  )
}

export default DropPreview
