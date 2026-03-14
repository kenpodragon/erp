import { useState } from 'react'

interface DeleteConfirmDialogProps {
  resourceType: string
  resourceName: string
  childCounts: Record<string, number>
  isBlocked: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmDialog({
  resourceType,
  resourceName,
  childCounts,
  isBlocked,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('')

  const totalChildren = Object.values(childCounts).reduce((a, b) => a + b, 0)
  const canConfirm = !isBlocked && confirmText === 'DELETE'

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={e => e.stopPropagation()}>
        <h4>Delete {resourceType}</h4>
        <p>
          Are you sure you want to delete <strong>{resourceName}</strong>?
        </p>

        {totalChildren > 0 && (
          <div className="dialog-child-counts">
            {isBlocked ? (
              <p style={{ margin: 0, fontWeight: 600 }}>Cannot delete: child records exist.</p>
            ) : (
              <p style={{ margin: 0 }}>Warning: this will affect child records.</p>
            )}
            <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '12px' }}>
              {Object.entries(childCounts).map(([key, count]) => (
                count > 0 && <li key={key}>{count} {key}</li>
              ))}
            </ul>
          </div>
        )}

        {!isBlocked && (
          <>
            <p style={{ fontSize: '12px', color: '#888' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              className="dialog-confirm-input"
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
            />
          </>
        )}

        <div className="dialog-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          {!isBlocked && (
            <button className="btn btn-danger" onClick={onConfirm} disabled={!canConfirm}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
