import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { api } from './api'
import { NavBar } from './components/NavBar'
import { SplashPage } from './components/SplashPage'
import { AboutPage } from './components/AboutPage'
import { TermsPage } from './components/TermsPage'
import { PrivacyPage } from './components/PrivacyPage'
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
  uid?: string;
}

interface Character {
  id: number;
  character_name: string;
  level: number;
  strength: number | null;
  agility: number | null;
  intelligence: number | null;
  created_at: string;
  class: { id: number; name: string; lore_blurb: string | null; base_strength: number; base_agility: number; base_intelligence: number; sprite_key: string | null; is_available: boolean } | null;
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEnabled] = useState(() => !!auth)
  const [backendUser, setBackendUser] = useState<PlayerProfile | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')

  const navigate = useNavigate()
  const location = useLocation()

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
    try {
      const loginRes = await api.post('/api/auth/login')
      if (!loginRes.ok) {
        setBackendError(`Backend login failed: ${loginRes.status}`)
        return
      }
      const loginData = await loginRes.json()
      if (loginData.characters && loginData.characters.length > 0) {
        setCharacter(loginData.characters[0])
      } else {
        setCharacter(null)
      }

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
    if (!auth) {
      setAuthLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setBackendUser(null)
      setBackendError(null)
      setCharacter(null)
      setAuthLoading(false)

      if (currentUser) {
        verifyUserWithBackend()
      }
    })
    return () => unsubscribe()
  }, [verifyUserWithBackend])

  // Auto-redirect: authenticated user on splash → /profile
  useEffect(() => {
    if (!authLoading && user && location.pathname === '/') {
      navigate('/profile', { replace: true })
    }
  }, [authLoading, user, location.pathname, navigate])

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase is not configured correctly.")
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/profile')
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
      setCharacter(null)
      navigate('/')
    }
  }

  const isLoggedIn = !!user

  // Status bar component (compact, reusable)
  const StatusBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '4px 10px', margin: '0.5rem auto', maxWidth: '800px', border: '1px solid #333', borderRadius: '6px', fontSize: '0.7rem', color: '#888' }}>
      <span style={{ fontWeight: 600, color: '#555' }}>Status</span>
      <span>
        API{' '}
        {apiMessage === 'Connecting...' ? <span style={{ color: '#888' }}>…</span> : (apiMessage !== 'Offline'
          ? <span style={{ color: '#4caf50' }}>●</span>
          : <span style={{ color: '#ff4444' }}>●</span>
        )}
      </span>
      <span>
        DB{' '}
        {health ? (health.database === 'connected'
          ? <span style={{ color: '#4caf50' }}>●</span>
          : <span style={{ color: '#ff4444' }}>●</span>
        ) : <span style={{ color: '#888' }}>…</span>}
      </span>
    </div>
  )

  // Profile page content
  const ProfilePage = () => (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 2rem' }}>
      <StatusBar />
      {!authEnabled ? (
        <p style={{ color: 'orange', textAlign: 'center' }}>Firebase configuration missing. Check your .env file.</p>
      ) : !user ? (
        <Navigate to="/" replace />
      ) : backendUser ? (
        <ProfileDashboard
          player={backendUser}
          character={character}
          onRefresh={verifyUserWithBackend}
          onCharacterCreated={(c) => setCharacter(c)}
          onCharacterDeleted={() => setCharacter(null)}
          onLogout={handleLogout}
        />
      ) : backendError ? (
        <p style={{ color: '#ff4444', fontSize: '0.85em', textAlign: 'center' }}>Error: {backendError}</p>
      ) : (
        <p style={{ color: '#aaa', textAlign: 'center' }}>Loading profile…</p>
      )}
    </div>
  )

  return (
    <div className="App">
      <NavBar
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/" element={<SplashPage onLogin={handleLogin} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </div>
  )
}

export default App
