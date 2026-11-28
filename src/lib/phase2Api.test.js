// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { phase2Api } from './phase2Api.js'

function response(status, payload) {
  const headers = new Map([['content-type', 'application/json']])
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers.get(String(name).toLowerCase()) || null },
    json: vi.fn(async () => payload),
  }
}

beforeEach(() => {
  clearAccessSession()
  setAccessSession({ accessToken: 'phase2-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('phase2 API client', () => {
  it('loads and completes the authenticated transition', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(200, { status: 'PENDING' }))
      .mockResolvedValueOnce(response(200, { status: 'COMPLETED' }))

    const body = {
      operationId: 'phase2-op-1',
      affiliation: 'OTHER_COMPANY',
      carrierName: 'Texas Haul',
      carrierStateCode: 'TX',
      effectiveDay: 'MONDAY',
      expectedBalance: '10000.00',
    }

    await phase2Api.transition('ats', 'career/1')
    await phase2Api.completeTransition('ats', 'career/1', body)

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/career%2F1/phase2-transition?game=ATS`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer phase2-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/career%2F1/phase2-transition/complete?game=ATS`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: expect.objectContaining({ Authorization: 'Bearer phase2-token' }),
      }),
    )
  })
})
