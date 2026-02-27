/**
 * API client for the ERP admin dashboard.
 *
 * Wraps fetch() to automatically attach the Firebase ID token as a
 * Bearer token on every request. Handles token refresh on 401.
 *
 * The backend enforces admin access via get_current_admin() — checking
 * email whitelist + IP whitelist server-side. The client-side check in
 * App.tsx is retained as a UX-only fast rejection.
 *
 * Usage:
 *   import { api } from './api'
 *   const data = await api.get('/api/admin/ping')
 */

import { auth } from './firebase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function getAuthHeaders(): Promise<Record<string, string>> {
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

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  })

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

  /** For multipart uploads — no Content-Type header. */
  upload: async (path: string, formData: FormData) => {
    const authHeaders = await getAuthHeaders()
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })
  },
}
