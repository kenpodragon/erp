import { useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import './App.css'

interface HealthData {
  status: string;
  database: string;
  database_error?: string;
  environment: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  // Derive authEnabled from the imported auth object directly during initialization
  const [authEnabled] = useState(() => !!auth)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [backendVerified, setBackendVerified] = useState<boolean | null>(null)
  const [clientIp, setClientIp] = useState<string>('')
  const [health, setHealth] = useState<HealthData | null>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  // Client-side whitelist: UX-only fast rejection. Backend enforces the real check.
  const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean)
  const ALLOWED_IPS = (import.meta.env.VITE_ALLOWED_IPS || '').split(',').map((i: string) => i.trim()).filter(Boolean)

  const checkAuthorization = useCallback(async (currentUser: User) => {
    const userEmail = (currentUser.email || '').trim().toLowerCase()
    const currentIp = clientIp.trim()

    // Step 1: Client-side quick check (UX only — can be bypassed)
    const emailOk = ALLOWED_EMAILS.length === 0 || ALLOWED_EMAILS.some((e: string) => e.toLowerCase() === userEmail)
    const ipOk = ALLOWED_IPS.length === 0 || ALLOWED_IPS.includes(currentIp)

    if (!emailOk || !ipOk) {
      if (auth) await signOut(auth)
      setUser(null)
      setIsAuthorized(false)
      setBackendVerified(null)
      return
    }

    // Step 2: Backend verification — the real enforcement
    setUser(currentUser)
    setIsAuthorized(true)
    setBackendVerified(null)

    try {
      // Get token directly from the currentUser param (not auth.currentUser)
      // to avoid any timing issues with Firebase auth state
      const idToken = await currentUser.getIdToken()
      const res = await fetch(
        `${API_URL}/api/admin/ping`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      )
      if (res.ok) {
        setBackendVerified(true)
      } else {
        console.error('Admin backend check failed:', res.status, await res.text())
        // Backend rejected — token invalid, email/IP not whitelisted server-side
        setBackendVerified(false)
        if (auth) await signOut(auth)
        setUser(null)
        setIsAuthorized(false)
      }
    } catch (err) {
      console.error('Admin backend check error:', err)
      setBackendVerified(null) // Backend unreachable — don't block, just note it
    }
  }, [ALLOWED_EMAILS, ALLOWED_IPS, API_URL, clientIp])

  // Health checks (public endpoints — no auth needed)
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

    // Fetch client IP for UX display + client-side pre-check
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
    }
  }

  return (
    <div className="App">
      <h1>ERP Admin: Hello World</h1>

      <div className="card" style={{ border: '1px solid #444', padding: '20px', borderRadius: '10px', marginBottom: '10px' }}>
        <h3>System Status:</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <p>
            <strong>API:</strong> {apiMessage === 'Connecting...' ? '...' : (apiMessage !== 'Offline' ?
              <span style={{ color: '#4caf50' }}>● Online</span> :
              <span style={{ color: '#ff4444' }}>● Offline</span>
            )}
          </p>
          <p>
            <strong>Database:</strong> {health ? (health.database === 'connected' ?
              <span style={{ color: '#4caf50' }}>● Online</span> :
              <span style={{ color: '#ff4444' }}>● Offline</span>
            ) : '...'}
          </p>
        </div>
      </div>

      <div className="card" style={{ border: '1px solid #646cff', padding: '20px', borderRadius: '10px' }}>
        <h2>Admin SSO Login Test</h2>

        {!authEnabled ? (
          <p style={{ color: 'orange' }}>Firebase configuration missing. Check your .env file.</p>
        ) : isAuthorized === false ? (
          <div style={{ color: '#ff4444', fontWeight: 'bold', padding: '10px', border: '2px solid #ff4444' }}>
            <p>ACCESS DENIED</p>
            <p style={{ fontSize: '0.8em', color: '#888' }}>Unauthorized access ({clientIp})</p>
            <button onClick={() => { setIsAuthorized(null); setBackendVerified(null) }} style={{ marginTop: '10px' }}>Try Again</button>
          </div>
        ) : user ? (
          <div>
            <p style={{ color: '#4caf50' }}>Authorized Admin: <strong>{user.email}</strong></p>
            <p style={{ fontSize: '0.8em', color: '#888' }}>Login IP: {clientIp}</p>
            {backendVerified === true && (
              <p style={{ color: '#4caf50', fontSize: '0.8em' }}>Backend: Verified</p>
            )}
            {backendVerified === false && (
              <p style={{ color: '#ff4444', fontSize: '0.8em' }}>Backend: Rejected</p>
            )}
            {backendVerified === null && isAuthorized && (
              <p style={{ color: '#888', fontSize: '0.8em' }}>Backend: Checking...</p>
            )}
            <button onClick={handleLogout} style={{ background: '#ff4444', color: 'white' }}>
              Logout
            </button>
          </div>
        ) : (
          <div>
            <p>Admin not logged in.</p>
            <p style={{ fontSize: '0.8em', color: '#888' }}>Detecting IP: {clientIp || 'loading...'}</p>
            <button onClick={handleLogin}>Login with Google (Admin)</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
