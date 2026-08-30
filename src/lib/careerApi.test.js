// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { careerApi } from './careerApi.js'

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
  setAccessSession({ accessToken: 'career-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('career API client', () => {
  it('reads owner careers, one career and its events with authenticated no-store requests', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, { id: 'server-career' }))
      .mockResolvedValueOnce(response(200, []))

    await careerApi.list('ats')
    await careerApi.get('ats', 'server career/1')
    await careerApi.events('ats', 'server career/1')

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers?game=ATS`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer career-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/server%20career%2F1?game=ATS`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer career-token' }) }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/api/v1/careers/server%20career%2F1/events?game=ATS`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer career-token' }) }),
    )
  })

  it('sends optimistic-locking payloads only to the server career mutation endpoints', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValue(response(200, { id: 'server-career', version: 8 }))

    const profile = { version: 5, driverName: 'Ana', biography: 'Bio' }
    const employer = { version: 6, companyName: 'Nova Transportes', effectiveDay: 'monday' }
    const base = {
      version: 7,
      effectiveDay: 'tuesday',
      stateCode: 'TX',
      countryCode: null,
      baseCity: 'Dallas, TX',
      baseCurrency: 'USD',
      exchangeRate: 1,
      exchangeRateAsOf: '2026-08-01',
      cityMarketVersion: 'v1',
      cityMarketLabel: 'Dallas',
      cityCostFactor: 1.1,
      citySalaryFactor: 1.05,
    }

    await careerApi.updateProfile('ats', 'server-career', profile)
    await careerApi.changeEmployer('ats', 'server-career', employer)
    await careerApi.changeBase('ats', 'server-career', base)

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/server-career?game=ATS`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(profile) }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/server-career/employer?game=ATS`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(employer) }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/api/v1/careers/server-career/base?game=ATS`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(base) }),
    )
  })
})
