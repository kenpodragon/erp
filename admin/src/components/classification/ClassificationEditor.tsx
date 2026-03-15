import { useState } from 'react'
import './classification-editor.css'
import AdminTabs from '../AdminTabs'
import EntityTypeManager from './EntityTypeManager'
import EntityFamilyManager from './EntityFamilyManager'
import AttackTypeManager from './AttackTypeManager'
import VisualBehaviorManager from './VisualBehaviorManager'
import BulkAssignmentPanel from './BulkAssignmentPanel'
import ClassificationAudit from './ClassificationAudit'

type SubTab = 'entity-types' | 'entity-families' | 'attack-types' | 'visual-behaviors' | 'bulk-assign' | 'audit'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'entity-types', label: 'Entity Types' },
  { key: 'entity-families', label: 'Families' },
  { key: 'attack-types', label: 'Attack Types' },
  { key: 'visual-behaviors', label: 'Visual Behaviors' },
  { key: 'bulk-assign', label: 'Bulk Assignment' },
  { key: 'audit', label: 'Audit' },
]

export default function ClassificationEditor() {
  const [activeTab, setActiveTab] = useState<SubTab>('entity-types')

  const renderContent = () => {
    switch (activeTab) {
      case 'entity-types':
        return <EntityTypeManager />
      case 'entity-families':
        return <EntityFamilyManager />
      case 'attack-types':
        return <AttackTypeManager />
      case 'visual-behaviors':
        return <VisualBehaviorManager />
      case 'bulk-assign':
        return <BulkAssignmentPanel />
      case 'audit':
        return <ClassificationAudit />
    }
  }

  return (
    <div className="editor-panel">
      <AdminTabs tabs={SUB_TABS} activeTab={activeTab} onTabChange={(k) => setActiveTab(k as SubTab)} variant="secondary" />
      {renderContent()}
    </div>
  )
}
