import AdminTabs from '../components/AdminTabs'
import { StatBonusesEditor, VisualConfigEditor, AffinitiesEditor } from './contentEditorWidgets'
import { useContentEditor, TABS, COMPONENT_TYPES } from './useContentEditor'
import type { EntityType } from './useContentEditor'
import './ContentEditor.css'

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function ContentEditor() {
  const c = useContentEditor()

  return (
    <div className="content-editor">
      {/* Top-level tabs */}
      <AdminTabs
        tabs={TABS.map(t => ({ key: t.key, label: t.label }))}
        activeTab={c.activeTab}
        onTabChange={(key) => c.setActiveTab(key as EntityType)}
      />

      {/* Sub-tabs for item components */}
      {c.activeTab === 'items' && (
        <AdminTabs
          tabs={COMPONENT_TYPES.map(ct => ({ key: ct, label: ct.replace('_', ' ') }))}
          activeTab={c.activeComp}
          onTabChange={c.changeActiveComp}
          variant="secondary"
        />
      )}

      <div className="ce-toolbar">
        <button className="ce-btn ce-btn--create" onClick={c.handleCreate}>
          + New {c.activeTab === 'items' ? c.activeComp.replace('_', ' ').replace(/s$/, '') : c.tab.label.replace(/s$/, '')}
        </button>
      </div>

      {c.loading ? (
        <div className="ce-loading">Loading...</div>
      ) : (
        <table className="ce-table">
          <thead>
            <tr>
              {c.displayColumns.map(col => <th key={col}>{col}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {c.displayItems.map((item: any) => (
              <tr key={item.id} className={c.selected?.id === item.id ? 'ce-row--selected' : ''}>
                {c.displayColumns.map(col => (
                  <td key={col}>
                    {typeof item[col] === 'boolean' ? (item[col] ? 'Yes' : 'No') :
                     typeof item[col] === 'object' ? JSON.stringify(item[col]) :
                     col === 'lore_blurb' ? (item[col] ? (item[col] as string).substring(0, 60) + '...' : '\u2014') :
                     String(item[col] ?? '\u2014')}
                  </td>
                ))}
                <td>
                  <button className="ce-btn ce-btn--edit" onClick={() => c.handleSelect(item)}>Edit</button>
                  <button className="ce-btn ce-btn--delete" onClick={() => c.handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(c.selected || c.creating) && (
        <div className="ce-detail">
          <h3>{c.creating ? `Create ${c.activeTab === 'items' ? c.activeComp.replace('_', ' ') : c.tab.label.replace(/s$/, '')}` : `Edit #${c.selected?.id}`}</h3>
          <DetailForm c={c} />
          <div className="ce-form-actions">
            <button className="ce-btn ce-btn--save" onClick={c.handleSave} disabled={c.saving}>
              {c.saving ? 'Saving...' : 'Save'}
            </button>
            <button className="ce-btn ce-btn--cancel" onClick={c.cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Detail Form                                                         */
/* ------------------------------------------------------------------ */

function DetailForm({ c }: { c: ReturnType<typeof useContentEditor> }) {
  if (c.activeTab === 'items') return <ItemForm c={c} />
  if (c.activeTab === 'classes') return <ClassForm c={c} />
  if (c.activeTab === 'gear_slots') return <GearSlotForm c={c} />

  // Generic form for stats, skills, benefits
  return (
    <div className="ce-form">
      {(c.creating ? c.tab.columns.filter(col => col !== 'id') : c.tab.columns).map(col => (
        <label key={col}>
          {col}
          {col === 'id' ? (
            <input type="text" value={c.editForm[col] ?? ''} disabled />
          ) : (
            <input
              type="text"
              value={c.editForm[col] ?? ''}
              onChange={e => c.setEditForm(p => ({ ...p, [col]: e.target.value }))}
            />
          )}
        </label>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Item Component Form                                                 */
/* ------------------------------------------------------------------ */

function ItemForm({ c }: { c: ReturnType<typeof useContentEditor> }) {
  const hasStatBonuses = ['prefixes', 'suffixes', 'qualities', 'type_bases'].includes(c.activeComp)

  return (
    <div className="ce-form">
      <label>Code <input type="text" value={c.editForm.code || ''} onChange={e => c.setEditForm(p => ({ ...p, code: e.target.value }))} /></label>
      <label>Display Name <input type="text" value={c.editForm.display_name || ''} onChange={e => c.setEditForm(p => ({ ...p, display_name: e.target.value }))} /></label>

      {c.activeComp === 'type_bases' && (
        <label>Gear Slot
          <select
            value={c.editForm.gear_slot_id || ''}
            onChange={e => c.setEditForm(p => ({ ...p, gear_slot_id: parseInt(e.target.value) || null }))}
          >
            <option value="">-- select --</option>
            {c.gearSlots.map((gs: any) => (
              <option key={gs.id} value={gs.id}>{gs.display_name}</option>
            ))}
          </select>
        </label>
      )}

      {c.activeComp === 'type_bases' && (
        <label>Base Stat Range
          <div className="stat-bonuses-editor">
            <StatBonusesEditor
              value={typeof c.editForm.base_stat_range === 'object' ? c.editForm.base_stat_range || {} : {}}
              onChange={v => c.setEditForm(p => ({ ...p, base_stat_range: v }))}
              stats={c.statDefs}
              benefits={c.benefitDefs}
            />
          </div>
        </label>
      )}

      {hasStatBonuses && c.activeComp !== 'type_bases' && (
        <label>Stat Bonuses
          <StatBonusesEditor
            value={typeof c.editForm.stat_bonuses === 'object' ? c.editForm.stat_bonuses || {} : {}}
            onChange={v => c.setEditForm(p => ({ ...p, stat_bonuses: v }))}
            stats={c.statDefs}
            benefits={c.benefitDefs}
          />
        </label>
      )}

      {(c.activeComp === 'prefixes' || c.activeComp === 'suffixes' || c.activeComp === 'type_bases') && (
        <label>Lore Reference
          <input type="text" value={c.editForm.lore_reference || ''} onChange={e => c.setEditForm(p => ({ ...p, lore_reference: e.target.value }))} />
        </label>
      )}

      {c.activeComp === 'lore_tags' && (
        <label>Narrative Context
          <textarea value={c.editForm.narrative_context || ''} onChange={e => c.setEditForm(p => ({ ...p, narrative_context: e.target.value }))} />
        </label>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Gear Slot Form                                                      */
/* ------------------------------------------------------------------ */

function GearSlotForm({ c }: { c: ReturnType<typeof useContentEditor> }) {
  return (
    <div className="ce-form">
      {!c.creating && <label>ID <input type="text" value={c.editForm.id ?? ''} disabled /></label>}
      <label>Name <input type="text" value={c.editForm.name || ''} onChange={e => c.setEditForm(p => ({ ...p, name: e.target.value }))} /></label>
      <label>Display Name <input type="text" value={c.editForm.display_name || ''} onChange={e => c.setEditForm(p => ({ ...p, display_name: e.target.value }))} /></label>
      <label>Sort Order <input type="number" value={c.editForm.sort_order ?? 0} onChange={e => c.setEditForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></label>
      <label>Description
        <textarea value={c.editForm.description || ''} onChange={e => c.setEditForm(p => ({ ...p, description: e.target.value }))} />
      </label>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Character Class Form                                                */
/* ------------------------------------------------------------------ */

function ClassForm({ c }: { c: ReturnType<typeof useContentEditor> }) {
  const affinities = c.editForm.affinities || []

  return (
    <div className="ce-form">
      {!c.creating && (
        <label>ID <input type="text" value={c.editForm.id ?? ''} disabled /></label>
      )}
      <label>Name <input type="text" value={c.editForm.name || ''} onChange={e => c.setEditForm(p => ({ ...p, name: e.target.value }))} /></label>
      <label>Lore Blurb
        <textarea value={c.editForm.lore_blurb || ''} onChange={e => c.setEditForm(p => ({ ...p, lore_blurb: e.target.value }))} />
      </label>
      <label>Sprite Key <input type="text" value={c.editForm.sprite_key || ''} onChange={e => c.setEditForm(p => ({ ...p, sprite_key: e.target.value }))} /></label>
      <label className="ce-checkbox-label">
        <input type="checkbox" checked={c.editForm.is_available !== false} onChange={e => c.setEditForm(p => ({ ...p, is_available: e.target.checked }))} />
        Available
      </label>

      <div className="ce-section-header">Base Stats</div>
      <div className="ce-stat-row">
        <label>STR <input type="number" value={c.editForm.base_strength ?? 10} onChange={e => c.setEditForm(p => ({ ...p, base_strength: parseInt(e.target.value) || 0 }))} /></label>
        <label>AGI <input type="number" value={c.editForm.base_agility ?? 10} onChange={e => c.setEditForm(p => ({ ...p, base_agility: parseInt(e.target.value) || 0 }))} /></label>
        <label>INT <input type="number" value={c.editForm.base_intelligence ?? 10} onChange={e => c.setEditForm(p => ({ ...p, base_intelligence: parseInt(e.target.value) || 0 }))} /></label>
      </div>

      <div className="ce-section-header">Stat Affinities</div>
      <AffinitiesEditor
        affinities={affinities}
        stats={c.statDefs}
        onChange={affs => c.setEditForm(p => ({ ...p, affinities: affs }))}
      />

      <div className="ce-section-header">Visual Config</div>
      <VisualConfigEditor
        value={c.editForm.visual_config || {}}
        onChange={vc => c.setEditForm(p => ({ ...p, visual_config: vc }))}
        avatarOptions={c.avatarOptions}
      />
    </div>
  )
}
