import { useState, useEffect } from 'react'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authEnabled, setAuthEnabled] = useState(false)
  const [health, setHealth] = useState<any>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')
  
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    // Health and Hello Check
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

    if (auth) {
      setAuthEnabled(true)
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser)
      })
      return () => unsubscribe()
    }
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
