// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { vehicleApi } from './vehicleApi.js'

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
  setAccessSession({ accessToken: 'vehicle-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('vehicle API client', () => {
  it('lists and acquires owned trucks only through authenticated career endpoints', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(201, { id: 'truck-1', currentPhase: 2 }))

    const body = {
      operationId: 'truck-op-1',
      acquisitionType: 'FINANCED',
      make: 'Kenworth',
      model: 'T680',
      modelYear: 2026,
      initialOdometer: '0.000',
      purchasePrice: '100000.00',
      financingTermPeriods: 78,
      expectedOperationalWeek: 1,
      expectedBalance: '30000.00',
    }

    await vehicleApi.list('ats', 'career/1')
    await vehicleApi.acquire('ats', 'career/1', body)

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/career%2F1/vehicles?game=ATS`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer vehicle-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/career%2F1/vehicles/acquisitions?game=ATS`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: expect.objectContaining({ Authorization: 'Bearer vehicle-token' }),
      }),
    )
  })
})
