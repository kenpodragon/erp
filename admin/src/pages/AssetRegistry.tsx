import AssetPreview from '../components/AssetPreview'
import AssetTable from './AssetTable'
import { relativeTime, sourceClass } from './AssetTable'
import { useAssetFilters } from './useAssetFilters'
import { useAssetOperations } from './useAssetOperations'
import type { MissingAsset } from './useAssetOperations'
import './AssetRegistry.css'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const VALID_CATEGORIES = [
  'entity_sprite', 'class_sprite', 'background',
  'item_icon', 'artifact_icon', 'achievement_icon', 'skill_icon',
  'avatar', 'skin', 'badge', 'flair',
  'spell_effect', 'ui_icon', 'narrative_image', 'portrait',
]

const SOURCE_OPTIONS = ['admin', 'seed', 'generator', 'migrated']

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function AssetRegistry() {
  const filters = useAssetFilters()
  const ops = useAssetOperations({
    filterCategory: filters.filterCategory,
    searchTerm: filters.searchTerm,
    tagFilter: filters.tagFilter,
    page: filters.page,
    pageSize: filters.pageSize,
    setTotal: filters.setTotal,
  })

  return (
    <div className="ar-page">
      {/* --- Header --- */}
      <div className="ar-header">
        <h2>Asset Registry</h2>
        <div className="ar-header-actions">
          <input
            type="text"
            className="ar-search-input"
            placeholder="Search assets..."
            value={filters.searchInput}
            onChange={e => filters.setSearchInput(e.target.value)}
          />
          <button className="ar-btn ar-btn-primary" onClick={ops.openCreate}>+ New Asset</button>
        </div>
      </div>

      {/* --- Category Tabs --- */}
      <div className="ar-category-tabs">
        <button
          className={`ar-category-tab ${!filters.filterCategory ? 'ar-category-tab--active' : ''}`}
          onClick={() => filters.setFilterCategory('')}
        >
          All
        </button>
        {VALID_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`ar-category-tab ${filters.filterCategory === cat ? 'ar-category-tab--active' : ''}`}
            onClick={() => filters.setFilterCategory(cat)}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* --- Message --- */}
      {ops.message && (
        <div className={`ar-message ${ops.messageError ? 'ar-message--error' : ''}`}>
          {ops.message}
        </div>
      )}

      {/* --- Asset Table --- */}
      <AssetTable
        assets={ops.assets}
        loading={ops.loading}
        onEdit={ops.openEdit}
        onDelete={ops.confirmDelete}
      />

      {/* --- Pagination --- */}
      <div className="ar-pagination">
        <span>
          {filters.total} asset{filters.total !== 1 ? 's' : ''} total
          {filters.filterCategory && ` in "${filters.filterCategory.replace(/_/g, ' ')}"`}
        </span>
        <div className="ar-pagination-controls">
          <button disabled={filters.page <= 1} onClick={() => filters.setPage(p => p - 1)}>Prev</button>
          <span>Page {filters.page} of {filters.totalPages}</span>
          <button disabled={filters.page >= filters.totalPages} onClick={() => filters.setPage(p => p + 1)}>Next</button>
        </div>
      </div>

      {/* --- Orphan Detection Panel --- */}
      <div className="ar-orphan-panel">
        <div className="ar-orphan-header" onClick={() => ops.setOrphanOpen(!ops.orphanOpen)}>
          <h3>Orphan Detection</h3>
          <span className="ar-orphan-toggle">{ops.orphanOpen ? 'Collapse' : 'Expand'}</span>
        </div>
        {ops.orphanOpen && (
          <div className="ar-orphan-body">
            <div className="ar-orphan-tabs">
              <button
                className={`ar-orphan-tab ${ops.orphanTab === 'missing' ? 'ar-orphan-tab--active' : ''}`}
                onClick={() => ops.setOrphanTab('missing')}
              >
                Missing Assets ({ops.missingAssets.length})
              </button>
              <button
                className={`ar-orphan-tab ${ops.orphanTab === 'unused' ? 'ar-orphan-tab--active' : ''}`}
                onClick={() => ops.setOrphanTab('unused')}
              >
                Unused Assets ({ops.unusedAssets.length})
              </button>
            </div>

            {ops.orphanLoading ? (
              <div className="ar-loading">Scanning...</div>
            ) : ops.orphanTab === 'missing' ? (
              ops.missingAssets.length === 0 ? (
                <div className="ar-empty">No missing assets detected.</div>
              ) : (
                <table className="ar-orphan-table">
                  <thead>
                    <tr>
                      <th>Asset Key</th>
                      <th>Referenced In</th>
                      <th>Suggested Category</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.missingAssets.map((m: MissingAsset, i: number) => (
                      <tr key={i}>
                        <td className="ar-key-cell">{m.asset_key}</td>
                        <td>
                          {m.referenced_in.map((ref, j) => (
                            <div key={j} className="ar-orphan-ref">
                              {ref.table}.{ref.column} ({ref.count})
                            </div>
                          ))}
                        </td>
                        <td><span className="ar-category-badge">{m.suggested_category.replace(/_/g, ' ')}</span></td>
                        <td>
                          <button className="ar-btn ar-btn-sm ar-btn-primary" onClick={() => ops.openCreateFromMissing(m)}>
                            Create
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <>
                {ops.unusedAssets.length === 0 ? (
                  <div className="ar-empty">No unused assets detected.</div>
                ) : (
                  <>
                    <table className="ar-orphan-table">
                      <thead>
                        <tr>
                          <th>Asset Key</th>
                          <th>Category</th>
                          <th>Source</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ops.unusedAssets.map((u, i) => (
                          <tr key={i}>
                            <td className="ar-key-cell">{u.asset_key}</td>
                            <td><span className="ar-category-badge">{u.category.replace(/_/g, ' ')}</span></td>
                            <td><span className={sourceClass(u.source)}>{u.source}</span></td>
                            <td className="ar-time-cell">{relativeTime(u.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="ar-bulk-actions">
                      <button className="ar-btn ar-btn-danger" onClick={ops.handleBulkDeleteUnused}>
                        Delete All Unused ({ops.unusedAssets.length})
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* --- Create/Edit Modal --- */}
      {ops.isModalOpen && (
        <div className="ar-modal-backdrop" onClick={() => ops.setIsModalOpen(false)}>
          <div className="ar-modal" onClick={e => e.stopPropagation()}>
            <h3>{ops.selectedAsset ? 'Edit Asset' : 'Create Asset'}</h3>
            <div className="ar-modal-body">
              {/* Left panel — form fields */}
              <div className="ar-modal-left">
                <div className="ar-form-row">
                  <label>Asset Key</label>
                  <input
                    type="text"
                    value={ops.editKey}
                    onChange={e => ops.setEditKey(e.target.value)}
                    disabled={!!ops.selectedAsset}
                    placeholder="e.g., enemy_sludge_stalker"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Category</label>
                  <select value={ops.editCategory} onChange={e => ops.setEditCategory(e.target.value)}>
                    {VALID_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="ar-form-row">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={ops.editDisplayName}
                    onChange={e => ops.setEditDisplayName(e.target.value)}
                    placeholder="Human-readable name"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Description</label>
                  <textarea
                    value={ops.editDescription}
                    onChange={e => ops.setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={ops.editTags}
                    onChange={e => ops.setEditTags(e.target.value)}
                    placeholder="book_1, chapter_1, melee"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Source</label>
                  <select value={ops.editSource} onChange={e => ops.setEditSource(e.target.value)}>
                    {SOURCE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right panel — JSON editor + live preview */}
              <div className="ar-modal-right">
                <div>
                  <div className="ar-json-label">Render Definition (JSON)</div>
                  <textarea
                    className="ar-json-editor"
                    value={ops.editJson}
                    onChange={e => ops.setEditJson(e.target.value)}
                    spellCheck={false}
                    placeholder='{ "base_shape": "circle", "radius": 20, "fill_color": "#aa44cc" }'
                  />
                </div>
                <div className="ar-live-preview">
                  <div className="ar-live-preview-label">Live Preview</div>
                  <AssetPreview
                    category={ops.editCategory}
                    renderDefinition={ops.previewDef}
                    width={192}
                    height={192}
                  />
                </div>
              </div>
            </div>

            <div className="ar-modal-actions">
              <button className="ar-btn" onClick={() => ops.setIsModalOpen(false)}>Cancel</button>
              <button
                className="ar-btn ar-btn-primary"
                onClick={ops.handleSave}
                disabled={ops.saving || !ops.editKey.trim()}
              >
                {ops.saving ? 'Saving...' : ops.selectedAsset ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation --- */}
      {ops.deleteTarget && (
        <div className="ar-modal-backdrop" onClick={() => ops.setDeleteTarget(null)}>
          <div className="ar-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Delete Asset</h3>
            <p>
              Are you sure you want to delete <strong>{ops.deleteTarget.asset_key}</strong>?
            </p>
            {ops.deleteRefWarning && (
              <div className="ar-ref-warning">{ops.deleteRefWarning}</div>
            )}
            <div className="ar-modal-actions">
              <button className="ar-btn" onClick={() => ops.setDeleteTarget(null)}>Cancel</button>
              <button className="ar-btn ar-btn-danger" onClick={ops.handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
