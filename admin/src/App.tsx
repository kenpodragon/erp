import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import './App.css'
import ServerConfig from './pages/ServerConfig'
import SupportTickets from './pages/SupportTickets'
import PlayersList from './pages/PlayersList'
import PlayerDetail from './pages/PlayerDetail'
import Dashboard from './pages/Dashboard'
import AccessControl from './pages/AccessControl'
import AuditLog from './pages/AuditLog'

interface HealthData {
  status: string;
  database: string;
  database_error?: string;
  environment: string;
}

interface MeInfo {
  email: string
  is_owner: boolean
  player: Record<string, unknown> | null
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [me, setMe] = useState<MeInfo | null>(null)
  const [authEnabled] = useState(() => !!auth)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [backendVerified, setBackendVerified] = useState<boolean | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  const checkAuthorization = useCallback(async (currentUser: User) => {
    // 1. Fast Rejection (UX-only)
    // Check against VITE_ALLOWED_EMAILS if set, to show "Access Denied" immediately
    const allowedEmailsStr = import.meta.env.VITE_ALLOWED_EMAILS || ""
    if (allowedEmailsStr && currentUser.email) {
      const allowed = allowedEmailsStr.split(",").map((e: string) => e.trim().toLowerCase())
      if (!allowed.includes(currentUser.email.toLowerCase())) {
        console.warn(`Fast rejection: email '${currentUser.email}' is NOT in VITE_ALLOWED_EMAILS. Proceeding to backend check anyway...`)
        // Comment out the fast rejection return
        // setIsAuthorized(false)
        // setBackendVerified(false)
        // return
      }
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
        // Fetch full role info
        const meRes = await fetch(`${API_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${idToken}` } })
        if (meRes.ok) {
          setMe(await meRes.json())
        }
      } else {
        setBackendVerified(false)
        if (auth) await signOut(auth)
        setUser(null)
        setIsAuthorized(false)
      }
    } catch (err) {
      console.error('Admin backend check error:', err)
      setBackendVerified(null)
    }
  }, [API_URL])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const helloRes = await fetch(`${API_URL}/hello`)
        const helloData = await helloRes.json()
        setApiMessage(helloData.message)

        const healthRes = await fetch(`${API_URL}/health`)
        const healthData = await healthRes.json()
        setHealth(healthData)
      } catch {
        setApiMessage('Offline')
      }
    }
    fetchStatus()
  }, [API_URL])

  useEffect(() => {
    if (!auth) return

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        checkAuthorization(currentUser)
      } else {
        setUser(null)
        setMe(null)
        setIsAuthorized(null)
        setBackendVerified(null)
      }
    })
    return () => unsubscribe()
  }, [checkAuthorization])

  const handleLogin = async () => {
    if (!auth || !googleProvider) return
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error("Login failed:", err)
    }
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      setBackendVerified(null)
      setMe(null)
    }
  }

  const apiOnline = apiMessage !== 'Connecting...' && apiMessage !== 'Offline'
  const dbOnline = health?.database === 'connected'

  if (!user || !backendVerified) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login-card">
            <h2>ERP Admin</h2>
            {!authEnabled ? (
              <p style={{ color: 'orange' }}>Firebase configuration missing.</p>
            ) : isAuthorized === false ? (
              <div className="access-denied">
                <p>ACCESS DENIED</p>
                <button className="btn-retry" onClick={() => { setIsAuthorized(null); setBackendVerified(null) }}>Try Again</button>
              </div>
            ) : user && backendVerified === null && isAuthorized ? (
              <p>Verifying admin access...</p>
            ) : user && backendVerified === false ? (
              <div className="access-denied">
                <p>Backend rejected admin access.</p>
                <button className="btn-logout" onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <>
                <p>Sign in with your admin account.</p>
                <button className="btn-login" onClick={handleLogin}>Login with Google</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        <nav className="admin-navbar">
          <div className="admin-brand">
            <span className="brand-erp">ERP</span>
            <span className="brand-admin">Admin</span>
          </div>

          <div className="admin-nav-links">
            <NavLink to="/dashboard" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
            <NavLink to="/players" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Players</NavLink>
            <NavLink to="/support" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Support</NavLink>
            <NavLink to="/config" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Config</NavLink>
            <NavLink to="/audit-log" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Audit Log</NavLink>
            {me?.is_owner && (
              <NavLink to="/access-control" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Access</NavLink>
            )}
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

        <div className="admin-content-wrapper">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<div className="admin-content"><Dashboard /></div>} />
            <Route path="/players" element={<div className="admin-content"><PlayersList /></div>} />
            <Route path="/players/:id" element={<div className="admin-content"><PlayerDetail /></div>} />
            <Route path="/support/*" element={<div className="admin-content"><SupportTickets /></div>} />
            <Route path="/config" element={<div className="admin-content"><ServerConfig /></div>} />
            <Route path="/audit-log" element={<div className="admin-content"><AuditLog /></div>} />
            {me?.is_owner && (
              <Route path="/access-control" element={<div className="admin-content"><AccessControl /></div>} />
            )}
            <Route path="*" element={<div className="admin-content">Page Not Found</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
