import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { api, setAuthBypass, isAuthBypassed } from './api'
import './App.css'
import ServerConfig from './pages/ServerConfig'
import SupportTickets from './pages/SupportTickets'
import PlayersList from './pages/PlayersList'
import PlayerDetail from './pages/PlayerDetail'
import Dashboard from './pages/Dashboard'
import AccessControl from './pages/AccessControl'
import AuditLog from './pages/AuditLog'
import GameConfigs from './pages/GameConfigs'
import ContentEditor from './pages/ContentEditor'
import WorldBuilder from './pages/WorldBuilder'
import AtmosphereEditor from './pages/AtmosphereEditor'
import SFXConfigEditor from './pages/SFXConfigEditor'
import ChatManager from './pages/ChatManager'
import ArtifactEditor from './pages/ArtifactEditor'
import AchievementEditor from './pages/AchievementEditor'
import FinanceDashboard from './pages/FinanceDashboard'
import AssetRegistry from './pages/AssetRegistry'
import DevAudit from './pages/DevAudit'
import AdminHelp from './pages/help/AdminHelp'

/* ── Nav Dropdown (hover-based grouped menu) ── */
function NavDropdown({ label, children, activePaths }: {
  label: string;
  children: React.ReactNode;
  activePaths: string[];
}) {
  const location = useLocation();
  const isGroupActive = activePaths.some(p => location.pathname.startsWith(p));
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); };
  const handleLeave = () => { closeTimer.current = setTimeout(() => setOpen(false), 150); };

  return (
    <div className="nav-dropdown" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button className={`admin-nav-link nav-dropdown-trigger ${isGroupActive ? 'active' : ''}`}>
        {label} <span className="nav-caret">▾</span>
      </button>
      {open && (
        <div className="nav-dropdown-menu" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Admin Navbar ── */
function AdminNavbar({ user, me, apiOnline, dbOnline, health, onLogout }: {
  user: User;
  me: MeInfo | null;
  apiOnline: boolean;
  dbOnline: boolean;
  health: HealthData | null;
  onLogout: () => void;
}) {
  return (
    <nav className="admin-navbar">
      <div className="admin-brand">
        <span className="brand-erp">ERP</span>
        <span className="brand-admin">Admin</span>
      </div>

      <div className="admin-nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>

        <NavDropdown label="Players" activePaths={['/players', '/support', '/chat']}>
          <NavLink to="/players" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Player List</NavLink>
          <NavLink to="/support" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Support Tickets</NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Chat Manager</NavLink>
        </NavDropdown>

        <NavDropdown label="Content" activePaths={['/world-builder', '/atmospheres', '/sfx-configs', '/asset-registry']}>
          <NavLink to="/world-builder" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>World Builder</NavLink>
          <NavLink to="/atmospheres" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Atmospheres</NavLink>
          <NavLink to="/sfx-configs" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Sound Effects</NavLink>
          <NavLink to="/asset-registry" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Asset Registry</NavLink>
        </NavDropdown>

        <NavDropdown label="Game" activePaths={['/game-configs', '/artifacts', '/achievements']}>
          <NavLink to="/game-configs" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Game Configs</NavLink>
          <NavLink to="/artifacts" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Artifacts</NavLink>
          <NavLink to="/achievements" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Achievements</NavLink>
        </NavDropdown>

        <NavLink to="/finance" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Finance</NavLink>
        <NavLink to="/help" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>Help</NavLink>

        <NavDropdown label="System" activePaths={['/config', '/audit-log', '/dev-audit', '/access-control']}>
          <NavLink to="/config" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Server Config</NavLink>
          <NavLink to="/audit-log" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Audit Log</NavLink>
          <NavLink to="/dev-audit" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Dev Audit</NavLink>
          {me?.is_owner && (
            <NavLink to="/access-control" className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}>Access Control</NavLink>
          )}
        </NavDropdown>
      </div>

      <div className="admin-nav-right">
        <div className="nav-status">
          <span>API <span className={`status-dot ${apiOnline ? 'online' : 'offline'}`}>●</span></span>
          <span>DB <span className={`status-dot ${health ? (dbOnline ? 'online' : 'offline') : 'loading'}`}>●</span></span>
        </div>
        <span className="admin-email">{user.email}</span>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}

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

  // Check for auth bypass on startup
  const verifyBypass = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/config/public`)
      if (!res.ok) return
      const data = await res.json()
      if (data.auth_bypass_available && data.auth_bypass_player_id) {
        console.warn('[AUTH BYPASS] Active — spoofing player ID:', data.auth_bypass_player_id)
        setAuthBypass(data.auth_bypass_player_id)
        // Verify admin access via bypass
        const pingRes = await api.get('/api/admin/ping')
        if (pingRes.ok) {
          setBackendVerified(true)
          setIsAuthorized(true)
          // Create a minimal User-like object for the navbar
          const meRes = await api.get('/api/admin/me')
          if (meRes.ok) {
            const meData = await meRes.json()
            setMe(meData)
            // Set a synthetic user for display
            setUser({ email: meData.email || 'bypass@test' } as User)
          }
        }
      }
    } catch (err) {
      console.error('Auth bypass check failed:', err)
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
    verifyBypass()
  }, [API_URL, verifyBypass])

  useEffect(() => {
    if (!auth) return

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        checkAuthorization(currentUser)
      } else if (!isAuthBypassed()) {
        // Only reset state if bypass is NOT active
        setUser(null)
        setMe(null)
        setIsAuthorized(null)
        setBackendVerified(null)
      }
    })
    return () => unsubscribe()
  }, [checkAuthorization])

  const handleLogin = async () => {
    // Auth bypass: skip Firebase SSO entirely
    if (isAuthBypassed()) {
      verifyBypass()
      return
    }

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
        <AdminNavbar
          user={user}
          me={me}
          apiOnline={apiOnline}
          dbOnline={dbOnline}
          health={health}
          onLogout={handleLogout}
        />

        <div className="admin-content-wrapper">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<div className="admin-content"><Dashboard /></div>} />
            <Route path="/players" element={<div className="admin-content"><PlayersList /></div>} />
            <Route path="/players/:id" element={<div className="admin-content"><PlayerDetail /></div>} />
            <Route path="/support/*" element={<div className="admin-content"><SupportTickets /></div>} />
            <Route path="/config" element={<div className="admin-content"><ServerConfig /></div>} />
            <Route path="/game-configs" element={<div className="admin-content"><GameConfigs /></div>} />
            <Route path="/world-builder/*" element={<div className="admin-content"><WorldBuilder /></div>} />
            <Route path="/content" element={<Navigate to="/world-builder" replace />} />
            <Route path="/atmospheres" element={<div className="admin-content"><AtmosphereEditor /></div>} />
            <Route path="/sfx-configs" element={<div className="admin-content"><SFXConfigEditor /></div>} />
            <Route path="/artifacts" element={<div className="admin-content"><ArtifactEditor /></div>} />
            <Route path="/achievements" element={<div className="admin-content"><AchievementEditor /></div>} />
            <Route path="/asset-registry" element={<div className="admin-content"><AssetRegistry /></div>} />
            <Route path="/chat" element={<div className="admin-content"><ChatManager /></div>} />
            <Route path="/finance" element={<div className="admin-content"><FinanceDashboard /></div>} />
            <Route path="/audit-log" element={<div className="admin-content"><AuditLog /></div>} />
            <Route path="/dev-audit" element={<div className="admin-content"><DevAudit /></div>} />
            <Route path="/help" element={<div className="admin-content"><AdminHelp /></div>} />
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
