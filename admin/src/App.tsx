import { useState, useEffect, useCallback, useMemo } from 'react'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import './App.css'
import ServerConfig from './pages/ServerConfig'

interface HealthData {
  status: string;
  database: string;
  database_error?: string;
  environment: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authEnabled] = useState(() => !!auth)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [backendVerified, setBackendVerified] = useState<boolean | null>(null)
  const [clientIp, setClientIp] = useState<string>('')
  const [health, setHealth] = useState<HealthData | null>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')
  const [activePage, setActivePage] = useState<'dashboard' | 'config'>('dashboard')

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  // Memoized to prevent re-creating arrays on every render (which would cause useCallback/useEffect loops).
  const ALLOWED_EMAILS = useMemo(() => (import.meta.env.VITE_ALLOWED_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean), [])
  const ALLOWED_IPS = useMemo(() => (import.meta.env.VITE_ALLOWED_IPS || '').split(',').map((i: string) => i.trim()).filter(Boolean), [])

  const checkAuthorization = useCallback(async (currentUser: User) => {
    const userEmail = (currentUser.email || '').trim().toLowerCase()
    const currentIp = clientIp.trim()

    const emailOk = ALLOWED_EMAILS.length === 0 || ALLOWED_EMAILS.some((e: string) => e.toLowerCase() === userEmail)
    const ipOk = ALLOWED_IPS.length === 0 || ALLOWED_IPS.includes(currentIp)

    if (!emailOk || !ipOk) {
      if (auth) await signOut(auth)
      setUser(null)
      setIsAuthorized(false)
      setBackendVerified(null)
      return
    }

    setUser(currentUser)
    setIsAuthorized(true)
    setBackendVerified(null)

    try {
      const idToken = await currentUser.getIdToken()
      const res = await fetch(
        `${API_URL}/api/admin/ping`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      )
      if (res.ok) {
        setBackendVerified(true)
      } else {
        console.error('Admin backend check failed:', res.status, await res.text())
        setBackendVerified(false)
        if (auth) await signOut(auth)
        setUser(null)
        setIsAuthorized(false)
      }
    } catch (err) {
      console.error('Admin backend check error:', err)
      setBackendVerified(null)
    }
  }, [ALLOWED_EMAILS, ALLOWED_IPS, API_URL, clientIp])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const helloRes = await fetch(`${API_URL}/hello`)
        const helloData = await helloRes.json()
        setApiMessage(helloData.message)

        const healthRes = await fetch(`${API_URL}/health`)
        const healthData = await healthRes.json()
        setHealth(healthData)
      } catch (err) {
        console.error("Status check failed:", err)
        setApiMessage('Offline')
      }
    }
    fetchStatus()

    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIp(data.ip))
      .catch(err => console.error("Failed to get IP:", err))
  }, [API_URL])

  useEffect(() => {
    if (!auth) return

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && clientIp) {
        checkAuthorization(currentUser)
      } else if (currentUser && !clientIp) {
        // IP not loaded yet — will re-run when clientIp updates
      } else {
        setUser(null)
        setIsAuthorized(null)
        setBackendVerified(null)
      }
    })
    return () => unsubscribe()
  }, [clientIp, checkAuthorization])

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase is not configured correctly.")
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Admin Login failed: " + err.message)
      } else {
        alert("Admin Login failed: An unknown error occurred")
      }
    }
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      setBackendVerified(null)
      setActivePage('dashboard')
    }
  }

  // Status dot helpers
  const apiOnline = apiMessage !== 'Connecting...' && apiMessage !== 'Offline'
  const dbOnline = health?.database === 'connected'

  const renderPage = () => {
    switch (activePage) {
      case 'config':
        return (
          <div className="admin-content">
            <ServerConfig />
          </div>
        )
      default:
        return (
          <div className="admin-content">
            <div className="dashboard-header">
              <h2>Dashboard</h2>
            </div>
            <div className="dashboard-status-bar">
              <span className="status-label">System</span>
              <span className="status-item">
                API <span className={`status-dot ${apiOnline ? 'online' : apiMessage === 'Connecting...' ? 'loading' : 'offline'}`}>●</span>
              </span>
              <span className="status-item">
                DB <span className={`status-dot ${health ? (dbOnline ? 'online' : 'offline') : 'loading'}`}>●</span>
              </span>
              <span className="status-item" style={{ color: '#555' }}>
                ENV: {health?.environment || '...'}
              </span>
            </div>
          </div>
        )
    }
  }

  // ── Unauthenticated: centered login card ──
  if (!user || !backendVerified) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login-card">
            <h2>ERP Admin</h2>

            {!authEnabled ? (
              <p style={{ color: 'orange' }}>Firebase configuration missing. Check your .env file.</p>
            ) : isAuthorized === false ? (
              <div className="access-denied">
                <p>ACCESS DENIED</p>
                <p>Unauthorized access ({clientIp})</p>
                <button className="btn-retry" onClick={() => { setIsAuthorized(null); setBackendVerified(null) }}>Try Again</button>
              </div>
            ) : user && backendVerified === null && isAuthorized ? (
              <p>Verifying admin access...</p>
            ) : user && backendVerified === false ? (
              <div className="access-denied">
                <p>Backend rejected admin access.</p>
                <button className="btn-logout" onClick={handleLogout} style={{ marginTop: '0.75rem' }}>Logout</button>
              </div>
            ) : (
              <>
                <p>Sign in with your admin account.</p>
                <p style={{ fontSize: '0.75rem' }}>IP: {clientIp || 'detecting...'}</p>
                <button className="btn-login" onClick={handleLogin}>Login with Google</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Authenticated: compact nav bar + page content ──
  return (
    <div className="App">
      <nav className="admin-navbar">
        <div className="admin-brand">
          <span className="brand-erp">ERP</span>
          <span className="brand-admin">Admin</span>
        </div>

        <div className="admin-nav-links">
          <button
            className={`admin-nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`admin-nav-link ${activePage === 'config' ? 'active' : ''}`}
            onClick={() => setActivePage('config')}
          >
            Config
          </button>
        </div>

        <div className="admin-nav-right">
          <div className="nav-status">
            <span>API <span className={`status-dot ${apiOnline ? 'online' : 'offline'}`}>●</span></span>
            <span>DB <span className={`status-dot ${health ? (dbOnline ? 'online' : 'offline') : 'loading'}`}>●</span></span>
          </div>
          <span className="admin-email">{user.email}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {renderPage()}
    </div>
  )
}

export default App
