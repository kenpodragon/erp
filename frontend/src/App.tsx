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
import { OnboardingFlow } from './components/OnboardingFlow'
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

// Placeholder components for new pages
const LicensePage = () => (
  <div className="page">
    <div className="page-hero page-hero-compact">
      <h1 className="page-title">License</h1>
    </div>
    <div className="page-content legal-content">
      <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', border: '1px solid #222' }}>
        <h3>Creative Commons Attribution-NonCommercial 4.0 International</h3>
        <p style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>
          By exercising the Licensed Rights, You accept and agree to be bound by the terms and conditions of this 
          Creative Commons Attribution-NonCommercial 4.0 International Public License.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4', marginTop: '1.5rem', color: '#bbb' }}>
{`Section 1 – Definitions.
Adapted Material means material subject to Copyright and Similar Rights that is derived from or based upon the Licensed Material and in which the Licensed Material is translated, altered, arranged, transformed, or otherwise modified in a manner requiring permission under the Copyright and Similar Rights held by the Licensor. 

Section 2 – Scope.
a. License grant.
1. Subject to the terms and conditions of this Public License, the Licensor hereby grants You a worldwide, royalty-free, non-sublicensable, non-exclusive, irrevocable license to exercise the Licensed Rights in the Licensed Material to:
A. reproduce and Share the Licensed Material, in whole or in part, for NonCommercial purposes only; and
B. produce, reproduce, and Share Adapted Material for NonCommercial purposes only.

Section 3 – License Conditions.
Your exercise of the Licensed Rights is expressly made subject to the following conditions.
a. Attribution.
1. If You Share the Licensed Material (including in modified form), You must:
A. retain the following if it is supplied by the Licensor with the Licensed Material:
i. identification of the creator(s) of the Licensed Material and any others designated to receive attribution...

Section 5 – Disclaimer of Warranties and Limitation of Liability.
a. Unless otherwise separately undertaken by the Licensor, to the extent possible, the Licensor offers the Licensed Material as-is and as-available, and makes no representations or warranties of any kind concerning the Licensed Material...

Full license text available at: https://github.com/kenpodragon/erp/blob/main/LICENSE`}
        </pre>
      </div>
    </div>
  </div>
)

const SupportPage = ({ isLoggedIn }: { isLoggedIn: boolean }) => (
  <div className="page">
    <div className="page-hero page-hero-compact">
      <h1 className="page-title">Contact Support</h1>
    </div>
    <div className="page-content">
      <div className="profile-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {isLoggedIn ? (
          <div>
            <h3>Support Center</h3>
            <p>Support ticket system is coming soon. For now, please email us.</p>
            <p><strong>Email:</strong> <a href="mailto:support@does-god-exist.org">support@does-god-exist.org</a></p>
          </div>
        ) : (
          <div>
            <h3>Guest Support</h3>
            <p>Please use the form below to contact us.</p>
            <form onSubmit={(e) => { e.preventDefault(); alert("Sent!"); }}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input type="text" className="form-control" required />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea className="form-control" style={{ height: '150px' }} required></textarea>
              </div>
              <button type="submit" className="btn-primary">Send Message</button>
            </form>
          </div>
        )}
      </div>
    </div>
  </div>
)

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEnabled] = useState(() => !!auth)
  const [backendUser, setBackendUser] = useState<PlayerProfile | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')
  const [showOnboarding, setShowOnboarding] = useState(false)

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

        // Show onboarding if new player or no terms accepted or no character
        if (loginData.is_new_player || !data.terms_accepted_at || !loginData.characters.length) {
          setShowOnboarding(true)
        }
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
      setShowOnboarding(false)
      setAuthLoading(false)

      if (currentUser) {
        verifyUserWithBackend()
      }
    })
    return () => unsubscribe()
  }, [verifyUserWithBackend])

  // Auto-redirect: authenticated user on splash → /profile
  useEffect(() => {
    if (!authLoading && user && location.pathname === '/' && !showOnboarding) {
      navigate('/profile', { replace: true })
    }
  }, [authLoading, user, location.pathname, navigate, showOnboarding])

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase is not configured correctly.")
      return
    }
    try {
      await signInWithPopup(auth, googleProvider)
      // verifyUserWithBackend will handle showOnboarding and navigation
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
      setShowOnboarding(false)
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
      
      {showOnboarding && backendUser && (
        <OnboardingFlow 
          player={backendUser} 
          onComplete={() => {
            setShowOnboarding(false);
            verifyUserWithBackend();
            navigate('/profile');
          }} 
        />
      )}

      <Routes>
        <Route path="/" element={<SplashPage onLogin={handleLogin} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/license" element={<LicensePage />} />
        <Route path="/support" element={<SupportPage isLoggedIn={isLoggedIn} />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </div>
  )
}

export default App
