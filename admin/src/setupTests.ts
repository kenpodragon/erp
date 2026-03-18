import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock Firebase Library
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(() => Promise.resolve({ user: { email: 'admin@example.com' } })),
  signOut: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null)
    return vi.fn()
  }),
}))

// Mock local Firebase config
vi.mock('./firebase', () => ({
  auth: {
    currentUser: null,
  },
  googleProvider: {},
}))

// Mock API
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  isAuthBypassed: vi.fn(() => false),
  setAuthBypass: vi.fn(),
}))
