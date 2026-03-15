import { useState, lazy, Suspense } from 'react'
import '../components/content/content-editor.css'
import '../components/classification/classification-editor.css'
import '../components/scaling/scaling-editor.css'
import './WorldBuilder.css'
import AdminTabs from '../components/AdminTabs'

import NarrativeEditor from '../components/content/NarrativeEditor'
const ContentEditor = lazy(() => import('./ContentEditor'))
import ClassificationEditor from '../components/classification/ClassificationEditor'
const ScalingEditor = lazy(() => import('../components/scaling/ScalingEditor'))

const WB_TABS = [
  { key: 'narrative', label: 'Narrative Editor' },
  { key: 'content', label: 'Content Editor' },
  { key: 'classification', label: 'Classification' },
  { key: 'scaling', label: 'Scaling & Difficulty' },
]

type TopTab = 'narrative' | 'content' | 'classification' | 'scaling'

export default function WorldBuilder() {
  const [activeTop, setActiveTop] = useState<TopTab>('narrative')

  return (
    <div className="wb-page">
      <AdminTabs
        tabs={WB_TABS}
        activeTab={activeTop}
        onTabChange={(key) => setActiveTop(key as TopTab)}
      />

      {activeTop === 'narrative' ? (
        <NarrativeEditor />
      ) : activeTop === 'content' ? (
        <Suspense fallback={<div className="editor-loading">Loading Content Editor...</div>}>
          <ContentEditor />
        </Suspense>
      ) : activeTop === 'classification' ? (
        <ClassificationEditor />
      ) : (
        <Suspense fallback={<div className="editor-loading">Loading Scaling Editor...</div>}>
          <ScalingEditor />
        </Suspense>
      )}
    </div>
  )
}
