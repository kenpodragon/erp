/**
 * API client for the ERP frontend.
 *
 * Wraps fetch() to automatically attach the Firebase ID token as a
 * Bearer token on every request. Handles token refresh on 401.
 *
 * Usage:
 *   import { api } from './api'
 *   const data = await api.get('/api/players/me')
 *   const result = await api.post('/api/auth/login')
 */

import { auth } from './firebase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Simple event target for global API events (like offline status)
export const apiEvents = new EventTarget();

// Auth bypass state — set by App.tsx when public config says bypass is available
let _authBypassPlayerId: string | null = null;

/** Called by App.tsx after fetching /api/config/public */
export function setAuthBypass(playerId: string | null) {
  _authBypassPlayerId = playerId;
}

/** Check if auth bypass is currently active */
export function isAuthBypassed(): boolean {
  return _authBypassPlayerId !== null && _authBypassPlayerId !== '';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Auth bypass: send spoof header instead of Firebase token
  if (_authBypassPlayerId) {
    return { 'X-Spoof-Player-Id': _authBypassPlayerId }
  }

  const user = auth?.currentUser
  if (!user) return {}

  try {
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders()

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    })

    // If we get here, the server at least responded
    apiEvents.dispatchEvent(new CustomEvent('api-online'));

    // On 401, try one silent token refresh and retry
    if (response.status === 401 && auth?.currentUser) {
      try {
        const freshToken = await auth.currentUser.getIdToken(true)
        const retryResponse = await fetch(`${BASE_URL}${path}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${freshToken}`,
            ...options.headers,
          },
        })
        return retryResponse
      } catch {
        // Refresh failed — return original 401
        return response
      }
    }

    return response
  } catch (err) {
    // Network error (ECONNREFUSED, timeout, etc.)
    apiEvents.dispatchEvent(new CustomEvent('api-offline'));
    throw err;
  }
}

export const api = {
  get: (path: string) => request(path),

  post: (path: string, body?: unknown) =>
    request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: (path: string, body?: unknown) =>
    request(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (path: string) => request(path, { method: 'DELETE' }),

  /** For multipart uploads (avatar, attachments) — no Content-Type header. */
  upload: async (path: string, formData: FormData) => {
    const authHeaders = await getAuthHeaders()
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })
  },
}
