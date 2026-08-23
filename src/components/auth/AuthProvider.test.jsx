// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '../../lib/authApi.js'
import { clearAccessSession } from '../../lib/authSession.js'
import { AuthProvider, useAuth } from './AuthProvider.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

let container
let root

function response(status, payload = null, extraHeaders = {}) {
  const headers = new Map(Object.entries({
    ...(payload === null ? {} : { 'content-type': 'application/json' }),
    ...extraHeaders,
  }).map(([key, value]) => [key.toLowerCase(), String(value)]))
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers.get(String(name).toLowerCase()) || null },
    json: vi.fn(async () => payload),
  }
}

function Probe() {
  const auth = useAuth()
  return <div>{auth.status}:{auth.user?.email || 'none'}</div>
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  window.location.hash = '#/'
  clearAccessSession()
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  clearAccessSession()
  delete document.documentElement.dataset.authenticated
  window.location.hash = '#/'
  vi.restoreAllMocks()
  delete globalThis.fetch
  root = null
  container = null
})

describe('AuthProvider', () => {
  it('restores the account from the refresh cookie without persisting the access token', async () => {
    const csrfToken = 'e'.repeat(43)
    globalThis.fetch = vi.fn(async (url) => {
      if (url === `${API_BASE_URL}/api/v1/auth/csrf`) {
        return response(200, { token: csrfToken, headerName: 'X-CSRF-TOKEN' })
      }
      if (url === `${API_BASE_URL}/api/v1/auth/refresh`) {
        return response(200, { accessToken: 'restored-token', tokenType: 'Bearer', expiresIn: 600 })
      }
      if (url === `${API_BASE_URL}/api/v1/me`) {
        return response(200, {
          id: 'user-1',
          email: 'restored@example.com',
          displayName: 'Restored Driver',
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: true,
        })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    await act(async () => {
      root.render(<AuthProvider><Probe /></AuthProvider>)
      await vi.waitFor(() => expect(container.textContent).toContain('authenticated:restored@example.com'))
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
    expect(globalThis.fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer restored-token')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.documentElement.dataset.authenticated).toBe('true')
  })

  it('redirects an anonymous protected route to login and preserves the destination', async () => {
    const csrfToken = 'f'.repeat(43)
    globalThis.fetch = vi.fn(async (url) => {
      if (url === `${API_BASE_URL}/api/v1/auth/csrf`) {
        return response(200, { token: csrfToken, headerName: 'X-CSRF-TOKEN' })
      }
      if (url === `${API_BASE_URL}/api/v1/auth/refresh`) {
        return response(401, { code: 'REFRESH_TOKEN_INVALID', detail: 'missing' }, { 'content-type': 'application/problem+json' })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    await act(async () => {
      root.render(
        <AuthProvider>
          <ProtectedRoute returnTo="/account"><div>private account</div></ProtectedRoute>
        </AuthProvider>,
      )
      await vi.waitFor(() => expect(window.location.hash).toBe('#/login?returnTo=%2Faccount'))
    })

    expect(container.textContent).not.toContain('private account')
  })
})
