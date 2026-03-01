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
import { SupportCenter } from './components/SupportCenter'
import MainGameLayout from './game/MainGameLayout'
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
  created_at: string;
  settings?: {
    audio_enabled: boolean;
    music_volume: number;
    sfx_volume: number;
    narration_speed: number;
  };
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

const GuestSupportPage = () => (
  <div className="page">
    <div className="page-hero page-hero-compact">
      <h1 className="page-title">Contact Support</h1>
    </div>
    <div className="page-content">
      <div className="profile-section" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3>Need Help?</h3>
        <p>Log in to access the full Support Center where you can submit and track tickets.</p>
        <p>Or email us directly:</p>
        <p>
          <a href="mailto:support@does-god-exist.org" style={{ color: '#b8860b', fontWeight: 'bold' }}>
            support@does-god-exist.org
          </a>
        </p>
      </div>
    </div>
  </div>
)

interface PublicConfig {
  'ops.maintenance_mode': boolean
  'ops.maintenance_message': string
  'ops.announcement_banner': string
  'ops.announcement_banner_type': string
  'ops.registration_open': boolean
}

// Status bar component (compact, reusable)
const StatusBar = ({ apiMessage, health }: { apiMessage: string, health: HealthData | null }) => (
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

interface ProfilePageProps {
  apiMessage: string;
  health: HealthData | null;
  authEnabled: boolean;
  user: User | null;
  backendUser: PlayerProfile | null;
  character: Character | null;
  verifyUserWithBackend: () => void;
  setCharacter: (c: Character | null) => void;
  handleLogout: () => void;
  backendError: string | null;
}

// Profile page content
const ProfilePage = ({
  apiMessage, health, authEnabled, user, backendUser, character, verifyUserWithBackend, setCharacter, handleLogout, backendError
}: ProfilePageProps) => (
  <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 2rem' }}>
    <StatusBar apiMessage={apiMessage} health={health} />
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

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(!!auth)
  const [authEnabled] = useState(() => !!auth)
  const [backendUser, setBackendUser] = useState<PlayerProfile | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [apiMessage, setApiMessage] = useState<string>('Connecting...')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  // Fetch public config (maintenance mode, announcements)
  useEffect(() => {
    const fetchPublicConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/config/public`)
        if (res.ok) {
          const data: PublicConfig = await res.json()
          setPublicConfig(data)
        }
      } catch (err) {
        console.error("Failed to fetch public config:", err)
      }
    }
    fetchPublicConfig()
  }, [API_URL])

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
    if (!auth) return

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

  // Auto-redirect: authenticated user on splash → /game (if character) or /profile
  useEffect(() => {
    // Wait until both Firebase auth AND Backend verification are done
    if (!authLoading && user && backendUser && location.pathname === '/' && !showOnboarding) {
      if (character) {
        navigate('/game', { replace: true })
      } else {
        navigate('/profile', { replace: true })
      }
    }
  }, [authLoading, user, backendUser, character, location.pathname, navigate, showOnboarding])

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
      // Fire logout event to backend before signing out (best-effort, don't block)
      try {
        await api.post('/api/auth/logout')
      } catch {
        // ignore — event logging is non-critical
      }
      await signOut(auth)
      setBackendUser(null)
      setBackendError(null)
      setCharacter(null)
      setShowOnboarding(false)
      navigate('/')
    }
  }

  const isLoggedIn = !!user

  // Maintenance mode — full-screen overlay, blocks everything
  if (publicConfig?.['ops.maintenance_mode']) {
    return (
      <div className="maintenance-overlay" style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a0a1a 100%)',
        color: '#e0e0e0', textAlign: 'center', padding: '2rem',
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#646cff' }}>Maintenance</h1>
        <p style={{ fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.6, color: '#aaa' }}>
          {publicConfig['ops.maintenance_message'] || 'Elysium is undergoing maintenance. Please return shortly.'}
        </p>
      </div>
    )
  }

  // Announcement banner colors
  const bannerColors: Record<string, { bg: string; border: string; text: string }> = {
    info: { bg: 'rgba(100, 108, 255, 0.15)', border: '#646cff', text: '#8888ff' },
    warning: { bg: 'rgba(255, 152, 0, 0.15)', border: '#ff9800', text: '#ffb74d' },
    error: { bg: 'rgba(255, 68, 68, 0.15)', border: '#ff4444', text: '#ff6666' },
  }

  const bannerText = publicConfig?.['ops.announcement_banner'] || ''
  const bannerType = publicConfig?.['ops.announcement_banner_type'] || 'info'
  const bannerStyle = bannerColors[bannerType] || bannerColors.info

  return (
    <div className="App">
      {/* Announcement banner */}
      {bannerText && !bannerDismissed && (
        <div style={{
          background: bannerStyle.bg,
          borderBottom: `1px solid ${bannerStyle.border}`,
          color: bannerStyle.text,
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
          fontSize: '0.9rem', position: 'relative',
        }}>
          <span>{bannerText}</span>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{
              background: 'none', border: 'none', color: bannerStyle.text,
              cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Dismiss announcement"
          >
            x
          </button>
        </div>
      )}

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
            // Redirect to game if character exists after onboarding, else profile
            if (character) {
              navigate('/game');
            } else {
              navigate('/profile');
            }
          }} 
        />
      )}

      <Routes>
        <Route path="/" element={
          isLoggedIn ? (
            character ? <Navigate to="/game" replace /> : <Navigate to="/profile" replace />
          ) : (
            <SplashPage onLogin={handleLogin} />
          )
        } />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/license" element={<LicensePage />} />
        <Route path="/support" element={isLoggedIn ? <SupportCenter /> : <GuestSupportPage />} />
        <Route path="/profile" element={
          <ProfilePage
            apiMessage={apiMessage}
            health={health}
            authEnabled={authEnabled}
            user={user}
            backendUser={backendUser}
            character={character}
            verifyUserWithBackend={verifyUserWithBackend}
            setCharacter={setCharacter}
            handleLogout={handleLogout}
            backendError={backendError}
          />
        } />
        <Route path="/game/*" element={
          isLoggedIn ? (
            <MainGameLayout 
              character={character} 
              onCharacterCreated={(c) => {
                setCharacter(c);
                verifyUserWithBackend();
              }} 
            />
          ) : (
            <Navigate to="/" replace />
          )
        } />
      </Routes>
    </div>
  )
}

export default App
