import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import './MarketplaceDisputes.css'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FlaggedAccount {
  player_id: number
  player_name: string
  flag: string
  flagged_since: string
  disputed_order_id: number | null
  total_spent: number
  shard_balance: number
}

interface InvestigationData {
  purchase_history: PurchaseRecord[]
  shard_transactions: ShardTransaction[]
  spend_history: SpendRecord[]
  subscription_history: SubscriptionRecord[]
  donation_history: DonationRecord[]
  activity_events: ActivityEvent[]
}

interface PurchaseRecord {
  id: number
  amount: number
  currency: string
  status: string
  created_at: string
  description: string
}

interface ShardTransaction {
  id: number
  type: string
  amount: number
  balance_after: number
  description: string
  created_at: string
}

interface SpendRecord {
  id: number
  source: string
  item_name: string
  amount: number
  created_at: string
}

interface SubscriptionRecord {
  id: number
  plan: string
  status: string
  started_at: string
  expires_at: string | null
}

interface DonationRecord {
  id: number
  amount: number
  currency: string
  created_at: string
  message: string
}

interface ActivityEvent {
  type: string
  description: string
  timestamp: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatShards(n: number): string {
  return n.toLocaleString('en-US')
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DisputeQueueTab() {
  const [accounts, setAccounts] = useState<FlaggedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Investigation
  const [investigatingId, setInvestigatingId] = useState<number | null>(null)
  const [investigation, setInvestigation] = useState<InvestigationData | null>(null)
  const [investigationLoading, setInvestigationLoading] = useState(false)
  const [investigationSection, setInvestigationSection] = useState<string>('purchases')

  // Resolution modals
  const [resolveModal, setResolveModal] = useState<{ playerId: number; playerName: string; action: 'clear' | 'warn' | 'ban' } | null>(null)
  const [resolveReason, setResolveReason] = useState('')
  const [banConfirmStep, setBanConfirmStep] = useState(0) // 0=form, 1=first confirm, 2=final confirm
  const [actionLoading, setActionLoading] = useState(false)

  /* -- Fetch flagged accounts ------------------------------------- */
  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/finance/disputes')
      if (!res.ok) throw new Error('Failed to load dispute queue')
      const data = await res.json()
      setAccounts(Array.isArray(data) ? data : data.items || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  /* -- Investigate ------------------------------------------------ */
  const handleInvestigate = async (playerId: number) => {
    if (investigatingId === playerId) {
      setInvestigatingId(null)
      setInvestigation(null)
      return
    }
    setInvestigatingId(playerId)
    setInvestigationLoading(true)
    setInvestigation(null)
    setInvestigationSection('purchases')
    try {
      const res = await api.get(`/api/admin/finance/disputes/${playerId}/investigate`)
      if (!res.ok) throw new Error('Failed to load investigation data')
      setInvestigation(await res.json())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Investigation failed')
      setInvestigatingId(null)
    } finally {
      setInvestigationLoading(false)
    }
  }

  /* -- Resolve ---------------------------------------------------- */
  const openResolve = (playerId: number, playerName: string, action: 'clear' | 'warn' | 'ban') => {
    setResolveModal({ playerId, playerName, action })
    setResolveReason('')
    setBanConfirmStep(0)
  }

  const handleResolve = async () => {
    if (!resolveModal || !resolveReason.trim()) return

    // Ban requires double confirmation
    if (resolveModal.action === 'ban') {
      if (banConfirmStep === 0) {
        setBanConfirmStep(1)
        return
      }
      if (banConfirmStep === 1) {
        setBanConfirmStep(2)
        return
      }
    }

    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/finance/disputes/${resolveModal.playerId}/resolve`, {
        action: resolveModal.action,
        reason: resolveReason,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to resolve dispute')
      }
      setResolveModal(null)
      setResolveReason('')
      setBanConfirmStep(0)
      if (investigatingId === resolveModal.playerId) {
        setInvestigatingId(null)
        setInvestigation(null)
      }
      fetchAccounts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve dispute')
    } finally {
      setActionLoading(false)
    }
  }

  /* -- CSV export ------------------------------------------------- */
  const exportCsv = () => {
    const headers = ['Player ID', 'Player Name', 'Flag', 'Flagged Since', 'Order ID', 'Total Spent', 'Shard Balance']
    const rows = accounts.map(a => [
      String(a.player_id), a.player_name, a.flag, a.flagged_since,
      a.disputed_order_id ? String(a.disputed_order_id) : '', String(a.total_spent), String(a.shard_balance),
    ])
    downloadCsv('dispute_queue.csv', toCsv(headers, rows))
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) return <p className="mkt-loading">Loading dispute queue...</p>
  if (error) return <p className="mkt-error">{error}</p>

  return (
    <div className="dispute-tab">
      <div className="dispute-header">
        <h3>Flagged Accounts ({accounts.length})</h3>
        <div className="dispute-header-actions">
          <button className="mkt-btn mkt-btn-sm" onClick={fetchAccounts}>Refresh</button>
          <button className="mkt-btn mkt-btn-sm" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p className="mkt-empty">No flagged accounts in the queue.</p>
      ) : (
        <div className="dispute-list">
          {accounts.map(acct => (
            <div key={acct.player_id} className={`dispute-card ${investigatingId === acct.player_id ? 'expanded' : ''}`}>
              <div className="dispute-card-row">
                <div className="dispute-player-info">
                  <span className="dispute-player-name">{acct.player_name}</span>
                  <span className="id-tag">#{acct.player_id}</span>
                </div>
                <div className="dispute-flag">
                  <span className="dispute-flag-badge">{acct.flag}</span>
                </div>
                <div className="dispute-meta">
                  <span className="dispute-meta-item">
                    <label>Flagged</label>
                    {new Date(acct.flagged_since).toLocaleDateString()}
                  </span>
                  {acct.disputed_order_id && (
                    <span className="dispute-meta-item">
                      <label>Order</label>
                      #{acct.disputed_order_id}
                    </span>
                  )}
                  <span className="dispute-meta-item">
                    <label>Total Spent</label>
                    ${formatShards(acct.total_spent)}
                  </span>
                  <span className="dispute-meta-item">
                    <label>Balance</label>
                    {formatShards(acct.shard_balance)} shards
                  </span>
                </div>
                <div className="dispute-actions">
                  <button className="mkt-btn mkt-btn-sm mkt-btn-info" onClick={() => handleInvestigate(acct.player_id)}>
                    {investigatingId === acct.player_id ? 'Close' : 'Investigate'}
                  </button>
                  <button className="mkt-btn mkt-btn-sm mkt-btn-success" onClick={() => openResolve(acct.player_id, acct.player_name, 'clear')}>
                    Clear
                  </button>
                  <button className="mkt-btn mkt-btn-sm mkt-btn-warn" onClick={() => openResolve(acct.player_id, acct.player_name, 'warn')}>
                    Warn
                  </button>
                  <button className="mkt-btn mkt-btn-sm mkt-btn-ban" onClick={() => openResolve(acct.player_id, acct.player_name, 'ban')}>
                    Ban
                  </button>
                </div>
              </div>

              {/* Investigation Panel */}
              {investigatingId === acct.player_id && (
                <div className="investigation-panel">
                  {investigationLoading ? (
                    <p className="mkt-loading">Loading investigation data...</p>
                  ) : investigation ? (
                    <>
                      <div className="investigation-tabs">
                        {[
                          { key: 'purchases', label: 'Purchases' },
                          { key: 'shards', label: 'Shard Transactions' },
                          { key: 'spending', label: 'Spend History' },
                          { key: 'subscriptions', label: 'Subscriptions' },
                          { key: 'donations', label: 'Donations' },
                          { key: 'activity', label: 'Activity' },
                        ].map(tab => (
                          <button
                            key={tab.key}
                            className={`investigation-tab ${investigationSection === tab.key ? 'active' : ''}`}
                            onClick={() => setInvestigationSection(tab.key)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="investigation-content">
                        {/* Purchase History */}
                        {investigationSection === 'purchases' && (
                          investigation.purchase_history.length === 0 ? (
                            <p className="mkt-empty">No purchase records.</p>
                          ) : (
                            <table className="mkt-table mkt-table-compact">
                              <thead>
                                <tr><th>ID</th><th>Amount</th><th>Currency</th><th>Status</th><th>Description</th><th>Date</th></tr>
                              </thead>
                              <tbody>
                                {investigation.purchase_history.map(p => (
                                  <tr key={p.id}>
                                    <td className="mono">{p.id}</td>
                                    <td className="mono">${p.amount.toFixed(2)}</td>
                                    <td>{p.currency}</td>
                                    <td><span className={`txn-status ${p.status}`}>{p.status}</span></td>
                                    <td>{p.description}</td>
                                    <td>{new Date(p.created_at).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}

                        {/* Shard Transactions */}
                        {investigationSection === 'shards' && (
                          investigation.shard_transactions.length === 0 ? (
                            <p className="mkt-empty">No shard transactions.</p>
                          ) : (
                            <table className="mkt-table mkt-table-compact">
                              <thead>
                                <tr><th>ID</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Description</th><th>Date</th></tr>
                              </thead>
                              <tbody>
                                {investigation.shard_transactions.map(t => (
                                  <tr key={t.id}>
                                    <td className="mono">{t.id}</td>
                                    <td><span className={`txn-type ${t.type}`}>{t.type}</span></td>
                                    <td className={`mono ${t.amount >= 0 ? 'positive' : 'negative'}`}>
                                      {t.amount >= 0 ? '+' : ''}{formatShards(t.amount)}
                                    </td>
                                    <td className="mono">{formatShards(t.balance_after)}</td>
                                    <td>{t.description}</td>
                                    <td>{new Date(t.created_at).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}

                        {/* Spend History */}
                        {investigationSection === 'spending' && (
                          investigation.spend_history.length === 0 ? (
                            <p className="mkt-empty">No spend records.</p>
                          ) : (
                            <table className="mkt-table mkt-table-compact">
                              <thead>
                                <tr><th>ID</th><th>Source</th><th>Item</th><th>Amount</th><th>Date</th></tr>
                              </thead>
                              <tbody>
                                {investigation.spend_history.map(s => (
                                  <tr key={s.id}>
                                    <td className="mono">{s.id}</td>
                                    <td>{s.source}</td>
                                    <td>{s.item_name}</td>
                                    <td className="mono">{formatShards(s.amount)}</td>
                                    <td>{new Date(s.created_at).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}

                        {/* Subscription History */}
                        {investigationSection === 'subscriptions' && (
                          investigation.subscription_history.length === 0 ? (
                            <p className="mkt-empty">No subscription records.</p>
                          ) : (
                            <table className="mkt-table mkt-table-compact">
                              <thead>
                                <tr><th>ID</th><th>Plan</th><th>Status</th><th>Started</th><th>Expires</th></tr>
                              </thead>
                              <tbody>
                                {investigation.subscription_history.map(s => (
                                  <tr key={s.id}>
                                    <td className="mono">{s.id}</td>
                                    <td>{s.plan}</td>
                                    <td><span className={`txn-status ${s.status}`}>{s.status}</span></td>
                                    <td>{new Date(s.started_at).toLocaleString()}</td>
                                    <td>{s.expires_at ? new Date(s.expires_at).toLocaleString() : 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}

                        {/* Donation History */}
                        {investigationSection === 'donations' && (
                          investigation.donation_history.length === 0 ? (
                            <p className="mkt-empty">No donation records.</p>
                          ) : (
                            <table className="mkt-table mkt-table-compact">
                              <thead>
                                <tr><th>ID</th><th>Amount</th><th>Currency</th><th>Message</th><th>Date</th></tr>
                              </thead>
                              <tbody>
                                {investigation.donation_history.map(d => (
                                  <tr key={d.id}>
                                    <td className="mono">{d.id}</td>
                                    <td className="mono">${d.amount.toFixed(2)}</td>
                                    <td>{d.currency}</td>
                                    <td>{d.message || '-'}</td>
                                    <td>{new Date(d.created_at).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}

                        {/* Activity Events */}
                        {investigationSection === 'activity' && (
                          investigation.activity_events.length === 0 ? (
                            <p className="mkt-empty">No activity events.</p>
                          ) : (
                            <table className="mkt-table mkt-table-compact">
                              <thead>
                                <tr><th>Type</th><th>Description</th><th>Timestamp</th></tr>
                              </thead>
                              <tbody>
                                {investigation.activity_events.map((e, i) => (
                                  <tr key={i}>
                                    <td><span className={`activity-type ${e.type}`}>{e.type}</span></td>
                                    <td>{e.description}</td>
                                    <td>{new Date(e.timestamp).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- Resolution Modal ---- */}
      {resolveModal && (
        <div className="mkt-modal-overlay">
          <div className={`mkt-modal ${resolveModal.action === 'ban' ? 'mkt-modal-ban' : ''}`}>
            <h3>
              {resolveModal.action === 'clear' && 'Clear Flag'}
              {resolveModal.action === 'warn' && 'Warn Player'}
              {resolveModal.action === 'ban' && 'Ban Player'}
              : {resolveModal.playerName}
            </h3>

            {resolveModal.action === 'ban' && banConfirmStep === 0 && (
              <p className="mkt-modal-warn-critical">
                Banning this player will immediately prevent them from accessing their account.
                This action should only be taken after thorough investigation.
              </p>
            )}

            {banConfirmStep === 0 && (
              <>
                <label className="mkt-modal-label">Reason (required):</label>
                <textarea
                  value={resolveReason}
                  onChange={e => setResolveReason(e.target.value)}
                  placeholder="Enter reason for this action..."
                  rows={3}
                />
              </>
            )}

            {resolveModal.action === 'ban' && banConfirmStep === 1 && (
              <p className="ban-confirm-text">
                Are you sure you want to ban <strong>{resolveModal.playerName}</strong>?
                <br />Reason: <em>{resolveReason}</em>
              </p>
            )}

            {resolveModal.action === 'ban' && banConfirmStep === 2 && (
              <p className="ban-confirm-text ban-final-warning">
                FINAL CONFIRMATION: Really ban <strong>{resolveModal.playerName}</strong>? This will take effect immediately.
              </p>
            )}

            <div className="mkt-modal-actions">
              <button className="mkt-btn mkt-btn-secondary" onClick={() => { setResolveModal(null); setBanConfirmStep(0) }}>
                Cancel
              </button>

              {resolveModal.action !== 'ban' && (
                <button
                  className={`mkt-btn ${resolveModal.action === 'clear' ? 'mkt-btn-success' : 'mkt-btn-warn'}`}
                  onClick={handleResolve}
                  disabled={resolveReason.trim().length < 5 || actionLoading}
                >
                  {actionLoading ? 'Processing...' : resolveModal.action === 'clear' ? 'Confirm Clear' : 'Confirm Warn'}
                </button>
              )}

              {resolveModal.action === 'ban' && banConfirmStep === 0 && (
                <button
                  className="mkt-btn mkt-btn-ban"
                  onClick={handleResolve}
                  disabled={resolveReason.trim().length < 10}
                >
                  Proceed to Ban
                </button>
              )}

              {resolveModal.action === 'ban' && banConfirmStep === 1 && (
                <button className="mkt-btn mkt-btn-ban" onClick={handleResolve}>
                  Yes, I am sure
                </button>
              )}

              {resolveModal.action === 'ban' && banConfirmStep === 2 && (
                <button
                  className="mkt-btn mkt-btn-ban-final"
                  onClick={handleResolve}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Banning...' : 'REALLY BAN THIS PLAYER'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
