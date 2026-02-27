import { useState, useEffect } from 'react'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { api } from './api'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authEnabled, setAuthEnabled] = useState(false)
  const [backendUser, setBackendUser] = useState<any>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [health, setHealth] = useState<any>(null)
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
  }, [])

  // Firebase auth listener + backend verification
  useEffect(() => {
    if (!auth) return

    setAuthEnabled(true)
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      setBackendUser(null)
      setBackendError(null)

      if (currentUser) {
        // Verify token with backend
        try {
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
      }
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase is not configured correctly.")
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: any) {
      console.error("Login error:", err)
      alert("Login failed: " + err.message)
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
              <p style={{ color: '#4caf50', fontSize: '0.85em' }}>
                Backend verified (uid: {backendUser.uid})
              </p>
            )}
            {backendError && (
              <p style={{ color: '#ff4444', fontSize: '0.85em' }}>
                Backend: {backendError}
              </p>
            )}
            <button onClick={handleLogout} style={{ background: '#ff4444', color: 'white' }}>
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
