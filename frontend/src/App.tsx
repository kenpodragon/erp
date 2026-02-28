import { useState, useEffect, useCallback } from 'react'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { api } from './api'
import { ProfileDashboard } from './components/ProfileDashboard'
import './App.css'

interface HealthData {
  status: string;
  database: string;
  database_error?: string;
  environment: string;
}

interface PlayerProfile {
  id: number;
  firebase_uid: string;
  email: string;
  google_display_name: string | null;
  google_avatar_url: string | null;
  alias: string | null;
  avatar_preset_key: string | null;
  custom_avatar_url: string | null;
  terms_accepted_at: string | null;
  uid?: string; // Add this for compatibility with the verified log line
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  // Use state initializer to avoid synchronous setState in useEffect
  const [authEnabled] = useState(() => !!auth)
  const [backendUser, setBackendUser] = useState<PlayerProfile | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

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
  }, [API_URL])

  const verifyUserWithBackend = useCallback(async () => {
    // First, ensure the user is registered/logged in with the backend
    try {
      const loginRes = await api.post('/api/auth/login')
      if (!loginRes.ok) {
        setBackendError(`Backend login failed: ${loginRes.status}`)
        return
      }

      // Now fetch the full profile
      const res = await api.get('/api/players/me')
      if (res.ok) {
        const data = await res.json()
        setBackendUser(data)
      } else if (res.status === 401) {
        setBackendError('Session expired or invalid token')
      } else if (res.status === 403) {
        const data = await res.json()
        setBackendError(data.error || 'Account suspended')
      } else {
        setBackendError(`Backend returned ${res.status}`)
      }
    } catch {
      setBackendError('Could not reach backend')
    }
  }, [])

  // Firebase auth listener + backend verification
  useEffect(() => {
    if (!auth) return

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setBackendUser(null)
      setBackendError(null)

      if (currentUser) {
        verifyUserWithBackend()
      }
    })
    return () => unsubscribe()
  }, [verifyUserWithBackend])

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase is not configured correctly.")
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      console.error("Login error:", err)
      if (err instanceof Error) {
        alert("Login failed: " + err.message)
      } else {
        alert("Login failed: An unknown error occurred")
      }
    }
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
      setBackendUser(null)
      setBackendError(null)
    }
  }

  return (
    <div className="App">
      <h1>ERP Frontend: Hello World</h1>

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

      <div className="card" style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '10px' }}>
        <h2>SSO Login Test</h2>

        {!authEnabled ? (
          <p style={{ color: 'orange' }}>Firebase configuration missing. Check your .env file.</p>
        ) : user ? (
          <div>
            <p>Welcome, <strong>{user.email}</strong></p>
            {backendUser && (
              <>
                <p style={{ color: '#4caf50', fontSize: '0.85em' }}>
                  Backend verified (uid: {backendUser.id || backendUser.firebase_uid})
                </p>
                <ProfileDashboard player={backendUser} onRefresh={verifyUserWithBackend} />
              </>
            )}
            {backendError && (
              <p style={{ color: '#ff4444', fontSize: '0.85em' }}>
                Backend: {backendError}
              </p>
            )}
            <button onClick={handleLogout} style={{ background: '#ff4444', color: 'white', marginTop: '1rem' }}>
              Logout
            </button>
          </div>
        ) : (
          <div>
            <p>User is not logged in.</p>
            <button onClick={handleLogin}>Login with Google</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
