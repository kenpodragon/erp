import { useState, useEffect } from 'react'
import { api } from '../api'
import './AccessControl.css'

interface WhitelistEmail {
  email: string
  added_by: string | null
  created_at: string
}

interface WhitelistIP {
  ip_address: string
  note: string | null
  added_by: string | null
  created_at: string
}

interface AccessControlData {
  emails: WhitelistEmail[]
  ips: WhitelistIP[]
  current_ip: string
  current_email: string
}

export default function AccessControl() {
  const [data, setData] = useState<AccessControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Form states
  const [newEmail, setNewEmail] = useState('')
  const [newIP, setNewIP] = useState('')
  const [newIPNote, setNewIPNote] = useState('')

  const fetchData = async () => {
    try {
      const res = await api.get('/api/admin/access-control')
      if (!res.ok) throw new Error('Failed to load access control settings')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post('/api/admin/access-control/emails', { email: newEmail })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to add email')
      }
      setNewEmail('')
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding email')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveEmail = async (email: string) => {
    if (email === data?.current_email) {
      alert('You cannot remove your own email from the whitelist.')
      return
    }
    if (!confirm(`Are you sure you want to remove ${email} from the admin whitelist?`)) return
    
    setActionLoading(true)
    try {
      const res = await api.delete(`/api/admin/access-control/emails/${encodeURIComponent(email)}`)
      if (!res.ok) throw new Error('Failed to remove email')
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error removing email')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddIP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIP.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post('/api/admin/access-control/ips', { ip: newIP, note: newIPNote })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to add IP')
      }
      setNewIP('')
      setNewIPNote('')
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error adding IP')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveIP = async (ip: string) => {
    if (ip === data?.current_ip) {
      alert('You cannot remove your current IP address from the whitelist.')
      return
    }
    if (!confirm(`Are you sure you want to remove IP ${ip} from the whitelist?`)) return
    
    setActionLoading(true)
    try {
      const res = await api.delete(`/api/admin/access-control/ips/${ip}`)
      if (!res.ok) throw new Error('Failed to remove IP')
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error removing IP')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="ac-loading">Loading Access Control...</div>
  if (error) return <div className="ac-error">Error: {error}</div>
  if (!data) return null

  return (
    <div className="access-control-page">
      <header className="ac-header">
        <h2>Admin Access Control</h2>
        <p className="ac-subtitle">Manage who can access this Admin Panel by Email and IP Address.</p>
      </header>

      <section className="ac-current-info">
        <div className="info-box">
          <label>Your Current IP</label>
          <div className="ip-display">
            <code>{data.current_ip}</code>
            <button 
              className="btn-add-current"
              onClick={() => setNewIP(data.current_ip)}
              disabled={data.ips.some(i => i.ip_address === data.current_ip)}
            >
              {data.ips.some(i => i.ip_address === data.current_ip) ? 'Already Whitelisted' : 'Use This IP'}
            </button>
          </div>
        </div>
        <div className="info-box">
          <label>Your Email</label>
          <code>{data.current_email}</code>
        </div>
      </section>

      <div className="ac-grid">
        {/* Email Whitelist */}
        <div className="ac-card">
          <h3>Allowed Admin Emails</h3>
          <form className="ac-form" onSubmit={handleAddEmail}>
            <input 
              type="email" 
              placeholder="Enter gmail address..." 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={actionLoading}>Add Email</button>
          </form>
          <div className="ac-list">
            {data.emails.map(e => (
              <div key={e.email} className="ac-item">
                <div className="ac-item-info">
                  <span className="ac-main">{e.email}</span>
                  <span className="ac-sub">Added by {e.added_by} on {new Date(e.created_at).toLocaleDateString()}</span>
                </div>
                <button 
                  className="btn-remove" 
                  onClick={() => handleRemoveEmail(e.email)}
                  disabled={actionLoading || e.email === data.current_email}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* IP Whitelist */}
        <div className="ac-card">
          <h3>Allowed Admin IPs</h3>
          <form className="ac-form" onSubmit={handleAddIP}>
            <input 
              type="text" 
              placeholder="0.0.0.0" 
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="Note (e.g. Home, Office)" 
              value={newIPNote}
              onChange={(e) => setNewIPNote(e.target.value)}
            />
            <button type="submit" disabled={actionLoading}>Add IP</button>
          </form>
          <div className="ac-list">
            {data.ips.map(i => (
              <div key={i.ip_address} className="ac-item">
                <div className="ac-item-info">
                  <span className="ac-main">{i.ip_address} {i.note && <small>({i.note})</small>}</span>
                  <span className="ac-sub">Added by {i.added_by} on {new Date(i.created_at).toLocaleDateString()}</span>
                </div>
                <button 
                  className="btn-remove" 
                  onClick={() => handleRemoveIP(i.ip_address)}
                  disabled={actionLoading || i.ip_address === data.current_ip}
                >
                  Remove
                </button>
              </div>
            ))}
            {data.ips.length === 0 && (
              <div className="ac-empty">IP whitelist is empty. All IPs are allowed if email matches.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
