import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock Firebase Library
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(() => Promise.resolve({ user: { email: 'test@example.com' } })),
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

// Default mock response factory for api calls
const mockResponse = (data: any = {}) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(data),
});

// Mock API
vi.mock('./api', () => ({
  api: {
    get: vi.fn(() => mockResponse()),
    post: vi.fn(() => mockResponse()),
    patch: vi.fn(() => mockResponse()),
  },
  apiEvents: new EventTarget(),
}))

// Mock chatClient
vi.mock('./game/services/chatClient', () => ({
  chatClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    onMessage: vi.fn(),
    offMessage: vi.fn(),
  },
}))

// Mock @pixi/react to avoid react-reconciler resolution issues in jsdom
vi.mock('@pixi/react', () => ({
  Application: ({ children }: any) => children,
  extend: vi.fn(),
  useTick: vi.fn(),
  TilingSprite: ({ children }: any) => children,
}))

// Mock pixi.js
vi.mock('pixi.js', () => ({
  Container: vi.fn(),
  Graphics: vi.fn(),
  Text: vi.fn(),
  Sprite: vi.fn(),
  TilingSprite: vi.fn(),
  TextStyle: vi.fn().mockImplementation(() => ({})),
  Assets: { load: vi.fn().mockResolvedValue({}) },
  Texture: vi.fn(),
}))

// Mock scrollTo for jsdom (used by NarrativeBlock)
Element.prototype.scrollTo = vi.fn() as any;
