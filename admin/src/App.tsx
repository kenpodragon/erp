import { useState, useEffect } from 'react'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authEnabled, setAuthEnabled] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [clientIp, setClientIp] = useState<string>('')
  const [health, setHealth] = useState<any>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean)
  const ALLOWED_IPS = (import.meta.env.VITE_ALLOWED_IPS || '').split(',').map((i: string) => i.trim()).filter(Boolean)

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

    // Fetch IP address
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIp(data.ip))
      .catch(err => console.error("Failed to get IP:", err))

    if (auth) {
      setAuthEnabled(true)
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser && clientIp) {
          checkAuthorization(currentUser)
        } else if (currentUser && !clientIp) {
          console.log("Waiting for IP before authorizing...")
        } else {
          setUser(null)
          setIsAuthorized(null)
        }
      })
      return () => unsubscribe()
    }
  }, [clientIp])

  const checkAuthorization = (currentUser: User) => {
    const userEmail = (currentUser.email || '').trim().toLowerCase()
    const currentIp = clientIp.trim()
    
    const emailOk = ALLOWED_EMAILS.some(e => e.toLowerCase() === userEmail)
    const ipOk = ALLOWED_IPS.includes(currentIp)

    console.log('Auth Debug:', {
      checkingEmail: userEmail,
      allowedEmails: ALLOWED_EMAILS,
      emailMatch: emailOk,
      checkingIp: currentIp,
      allowedIps: ALLOWED_IPS,
      ipMatch: ipOk
    })

    if (emailOk && ipOk) {
      setUser(currentUser)
      setIsAuthorized(true)
    } else {
      signOut(auth)
      setUser(null)
      setIsAuthorized(false)
    }
  }

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase is not configured correctly.")
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: any) {
      alert("Admin Login failed: " + err.message)
    }
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth)
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
            <p>ADDRESS BLOCKED</p>
            <p style={{ fontSize: '0.8em', color: '#888' }}>Unauthorized Email or IP ({clientIp})</p>
            <button onClick={() => setIsAuthorized(null)} style={{ marginTop: '10px' }}>Try Again</button>
          </div>
        ) : user ? (
          <div>
            <p style={{ color: '#4caf50' }}>Authorized Admin: <strong>{user.email}</strong></p>
            <p style={{ fontSize: '0.8em', color: '#888' }}>Login IP: {clientIp}</p>
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
