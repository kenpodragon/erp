import { useState, useCallback, lazy, Suspense } from 'react'
import '../content/content-editor.css'

const BookEditor = lazy(() => import('./BookEditor'))
const ChapterEditor = lazy(() => import('./ChapterEditor'))
const SceneEditor = lazy(() => import('./SceneEditor'))
const StoryBeatEditor = lazy(() => import('./StoryBeatEditor'))
const EntityEditor = lazy(() => import('./EntityEditor'))
const EntitySceneMapper = lazy(() => import('./EntitySceneMapper'))
const BackgroundEditor = lazy(() => import('./BackgroundEditor'))
const LocationEditor = lazy(() => import('./LocationEditor'))
const SemanticTagManager = lazy(() => import('./SemanticTagManager'))
const WaveConfigBulk = lazy(() => import('./WaveConfigBulk'))

type TabKey = 'books' | 'chapters' | 'scenes' | 'beats' | 'entities' | 'mapper' | 'backgrounds' | 'locations' | 'tags' | 'waves'

interface TabDef {
  key: TabKey
  label: string
}

const TABS: TabDef[] = [
  { key: 'books', label: 'Books' },
  { key: 'chapters', label: 'Chapters' },
  { key: 'scenes', label: 'Scenes' },
  { key: 'beats', label: 'Beats' },
  { key: 'entities', label: 'Entities' },
  { key: 'mapper', label: 'Mapper' },
  { key: 'backgrounds', label: 'Backgrounds' },
  { key: 'locations', label: 'Locations' },
  { key: 'tags', label: 'Tags' },
  { key: 'waves', label: 'Waves' },
]

export default function NarrativeEditor() {
  // Read initial tab from URL query param
  const getInitialTab = (): TabKey => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some(t => t.key === tab)) return tab as TabKey
    return 'books'
  }

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab())
  const [navParams, setNavParams] = useState<Record<string, string>>({})

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    setNavParams({})
    // Update URL without reload
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }

  const handleNavigate = useCallback((tab: string, params?: Record<string, string>) => {
    const tabKey = tab as TabKey
    if (TABS.some(t => t.key === tabKey)) {
      setActiveTab(tabKey)
      setNavParams(params || {})
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tabKey)
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const renderTab = () => {
    const fallback = <div className="editor-loading">Loading editor...</div>

    switch (activeTab) {
      case 'books':
        return <Suspense fallback={fallback}><BookEditor onNavigate={handleNavigate} /></Suspense>
      case 'chapters':
        return <Suspense fallback={fallback}><ChapterEditor initialBookId={navParams.book_id ? Number(navParams.book_id) : undefined} onNavigate={handleNavigate} /></Suspense>
      case 'scenes':
        return <Suspense fallback={fallback}><SceneEditor initialBookId={navParams.book_id ? Number(navParams.book_id) : undefined} initialChapterId={navParams.chapter_id ? Number(navParams.chapter_id) : undefined} onNavigate={handleNavigate} /></Suspense>
      case 'beats':
        return <Suspense fallback={fallback}><StoryBeatEditor initialBookId={navParams.book_id ? Number(navParams.book_id) : undefined} initialChapterId={navParams.chapter_id ? Number(navParams.chapter_id) : undefined} initialSceneId={navParams.scene_id ? Number(navParams.scene_id) : undefined} /></Suspense>
      case 'entities':
        return <Suspense fallback={fallback}><EntityEditor onNavigate={handleNavigate} /></Suspense>
      case 'mapper':
        return <Suspense fallback={fallback}><EntitySceneMapper /></Suspense>
      case 'backgrounds':
        return <Suspense fallback={fallback}><BackgroundEditor /></Suspense>
      case 'locations':
        return <Suspense fallback={fallback}><LocationEditor /></Suspense>
      case 'tags':
        return <Suspense fallback={fallback}><SemanticTagManager /></Suspense>
      case 'waves':
        return <Suspense fallback={fallback}><WaveConfigBulk /></Suspense>
      default:
        return null
    }
  }

  return (
    <div className="ne-container">
      <div className="ne-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`ne-tab ${activeTab === tab.key ? 'ne-tab--active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderTab()}
    </div>
  )
}
