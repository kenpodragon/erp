import AssetPreview from '../components/AssetPreview'
import type { AssetEntry } from './useAssetOperations'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  if (!dateStr) return '--'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function sourceClass(source: string): string {
  if (source === 'admin') return 'ar-source-badge ar-source-badge--admin'
  if (source === 'generator') return 'ar-source-badge ar-source-badge--generator'
  if (source === 'migrated') return 'ar-source-badge ar-source-badge--migrated'
  return 'ar-source-badge'
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface AssetTableProps {
  assets: AssetEntry[]
  loading: boolean
  onEdit: (asset: AssetEntry) => void
  onDelete: (asset: AssetEntry) => void
}

export default function AssetTable({ assets, loading, onEdit, onDelete }: AssetTableProps) {
  if (loading) {
    return <div className="ar-loading">Loading assets...</div>
  }

  if (assets.length === 0) {
    return <div className="ar-empty">No assets found. Create one or adjust filters.</div>
  }

  return (
    <div className="ar-table-wrapper">
      <table className="ar-table">
        <thead>
          <tr>
            <th>Preview</th>
            <th>Asset Key</th>
            <th>Display Name</th>
            <th>Category</th>
            <th>Tags</th>
            <th>Source</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => (
            <tr key={asset.id}>
              <td className="ar-preview-cell">
                <AssetPreview
                  category={asset.category}
                  renderDefinition={asset.render_definition}
                  width={48}
                  height={48}
                />
              </td>
              <td className="ar-key-cell">{asset.asset_key}</td>
              <td className="ar-name-cell">{asset.display_name || '--'}</td>
              <td><span className="ar-category-badge">{asset.category.replace(/_/g, ' ')}</span></td>
              <td>
                <div className="ar-tag-chips">
                  {(asset.tags || []).slice(0, 5).map((tag, i) => (
                    <span key={i} className="ar-tag-chip">{tag}</span>
                  ))}
                  {(asset.tags || []).length > 5 && (
                    <span className="ar-tag-chip">+{(asset.tags || []).length - 5}</span>
                  )}
                </div>
              </td>
              <td><span className={sourceClass(asset.source)}>{asset.source}</span></td>
              <td className="ar-time-cell">{relativeTime(asset.updated_at)}</td>
              <td>
                <div className="ar-actions-cell">
                  <button className="ar-btn ar-btn-sm" onClick={() => onEdit(asset)}>Edit</button>
                  <button className="ar-btn ar-btn-sm ar-btn-danger" onClick={() => onDelete(asset)}>Del</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { relativeTime, sourceClass }
