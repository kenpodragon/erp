import { useState, lazy, Suspense } from 'react'
import './scaling-editor.css'
import AdminTabs from '../AdminTabs'

const VisualWeightEditor = lazy(() => import('./VisualWeightEditor'))
const WavePresetManager = lazy(() => import('./WavePresetManager'))
const DifficultyCurveManager = lazy(() => import('./DifficultyCurveManager'))
const ScalingPreview = lazy(() => import('./ScalingPreview'))
const DifficultyPresetManager = lazy(() => import('./DifficultyPresetManager'))

type SubTab = 'visual-weights' | 'wave-presets' | 'curves' | 'preview' | 'presets'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'visual-weights', label: 'Visual Weights' },
  { key: 'wave-presets', label: 'Wave Presets' },
  { key: 'curves', label: 'Difficulty Curves' },
  { key: 'preview', label: 'Scaling Preview' },
  { key: 'presets', label: 'Difficulty Presets' },
]

export default function ScalingEditor() {
  const [activeTab, setActiveTab] = useState<SubTab>('visual-weights')

  const renderContent = () => {
    switch (activeTab) {
      case 'visual-weights':
        return <VisualWeightEditor />
      case 'wave-presets':
        return <WavePresetManager />
      case 'curves':
        return <DifficultyCurveManager />
      case 'preview':
        return <ScalingPreview />
      case 'presets':
        return <DifficultyPresetManager />
    }
  }

  return (
    <div className="editor-panel">
      <AdminTabs tabs={SUB_TABS} activeTab={activeTab} onTabChange={(k) => setActiveTab(k as SubTab)} variant="secondary" />
      <Suspense fallback={<div className="editor-loading">Loading...</div>}>
        {renderContent()}
      </Suspense>
    </div>
  )
}
