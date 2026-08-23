import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, authApi } from './authApi.js'

afterEach(() => {
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('authApi', () => {
  it('sends newPassword using the backend reset-password contract', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 204,
      headers: { get: () => null },
    }))

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
})
