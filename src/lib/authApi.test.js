import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, authApi } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'

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

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('authApi', () => {
  it('sends newPassword using the backend reset-password contract', async () => {
    globalThis.fetch = vi.fn(async () => response(204))

    const token = 'a'.repeat(43)
    await authApi.resetPassword(token, 'uma nova senha segura')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/auth/reset-password`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ token, newPassword: 'uma nova senha segura' }),
      }),
    )
  })

  it('deduplicates concurrent refresh requests and sends the CSRF token', async () => {
    const csrfToken = 'c'.repeat(43)
    globalThis.fetch = vi.fn(async (url) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return response(200, { token: csrfToken, headerName: 'X-CSRF-TOKEN' })
      }
      if (url.endsWith('/api/v1/auth/refresh')) {
        return response(200, { accessToken: 'renewed-token', tokenType: 'Bearer', expiresIn: 600 })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    await Promise.all([authApi.refresh(), authApi.refresh()])

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(globalThis.fetch.mock.calls[1][0]).toBe(`${API_BASE_URL}/api/v1/auth/refresh`)
    expect(globalThis.fetch.mock.calls[1][1].headers['X-CSRF-TOKEN']).toBe(csrfToken)
  })

  it('retries a protected request once after 401 using a rotated access token', async () => {
    setAccessSession({ accessToken: 'expired-on-server', tokenType: 'Bearer', expiresIn: 600 })
    const csrfToken = 'd'.repeat(43)
    const user = { id: 'user-1', email: 'driver@example.com', displayName: 'Driver' }
    let meCalls = 0

    globalThis.fetch = vi.fn(async (url) => {
      if (url.endsWith('/api/v1/me')) {
        meCalls += 1
        return meCalls === 1
          ? response(401, { code: 'ACCESS_TOKEN_INVALID', detail: 'invalid' }, { 'content-type': 'application/problem+json' })
          : response(200, user)
      }
      if (url.endsWith('/api/v1/auth/csrf')) {
        return response(200, { token: csrfToken, headerName: 'X-CSRF-TOKEN' })
      }
      if (url.endsWith('/api/v1/auth/refresh')) {
        return response(200, { accessToken: 'fresh-token', tokenType: 'Bearer', expiresIn: 600 })
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    await expect(authApi.me()).resolves.toEqual(user)

    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
    expect(globalThis.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer expired-on-server')
    expect(globalThis.fetch.mock.calls[3][1].headers.Authorization).toBe('Bearer fresh-token')
  })
})
