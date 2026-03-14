import { useState, lazy, Suspense } from 'react'
import '../components/content/content-editor.css'
import '../components/classification/classification-editor.css'
import './WorldBuilder.css'

import NarrativeEditor from '../components/content/NarrativeEditor'
const ContentEditor = lazy(() => import('./ContentEditor'))
import ClassificationEditor from '../components/classification/ClassificationEditor'

type TopTab = 'narrative' | 'content' | 'classification'

export default function WorldBuilder() {
  const [activeTop, setActiveTop] = useState<TopTab>('narrative')

  return (
    <div className="wb-page">
      <div className="wb-top-tabs">
        <button
          className={`wb-top-tab ${activeTop === 'narrative' ? 'wb-top-tab--active' : ''}`}
          onClick={() => setActiveTop('narrative')}
        >
          Narrative Editor
        </button>
        <button
          className={`wb-top-tab ${activeTop === 'content' ? 'wb-top-tab--active' : ''}`}
          onClick={() => setActiveTop('content')}
        >
          Content Editor
        </button>
        <button
          className={`wb-top-tab ${activeTop === 'classification' ? 'wb-top-tab--active' : ''}`}
          onClick={() => setActiveTop('classification')}
        >
          Classification
        </button>
      </div>

      {activeTop === 'narrative' ? (
        <NarrativeEditor />
      ) : activeTop === 'content' ? (
        <Suspense fallback={<div className="editor-loading">Loading Content Editor...</div>}>
          <ContentEditor />
        </Suspense>
      ) : (
        <ClassificationEditor />
      )}
    </div>
  )
}
