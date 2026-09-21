// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { financingApi } from './financingApi.js'

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
  setAccessSession({ accessToken: 'finance-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('financing API client', () => {
  it('reads offers and contracts with authenticated jurisdiction queries', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, { id: 'contract-1' }))

    await financingApi.offers('ats', 'career/1', 'PERSONAL_LOAN', '5000.00')
    await financingApi.listContracts('ats', 'career/1')
    await financingApi.getContract('ats', 'career/1', 'contract/1')

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/career%2F1/financing/offers?game=ATS&productType=PERSONAL_LOAN&requestedAmount=5000.00`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer finance-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/career%2F1/financing/contracts?game=ATS`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer finance-token' }) }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/api/v1/careers/career%2F1/financing/contracts/contract%2F1?game=ATS`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer finance-token' }) }),
    )
  })

  it('creates contracts and applies financing payments only on authenticated server endpoints', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(201, { id: 'contract-1' }))
      .mockResolvedValueOnce(response(200, { id: 'contract-1', status: 'PAID_OFF' }))

    const createBody = {
      operationId: 'op-create',
      productType: 'VEHICLE_FINANCING',
      requestedAmount: '50000.00',
      termPeriods: 78,
      expectedOperationalWeek: 4,
      expectedBalance: '15000.00',
    }
    const paymentBody = {
      operationId: 'op-payoff',
      paymentType: 'PAYOFF',
      expectedOperationalWeek: 4,
      expectedBalance: '5000.00',
    }

    await financingApi.createContract('ats', 'career-1', createBody)
    await financingApi.pay('ats', 'career-1', 'contract-1', paymentBody)

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/career-1/financing/contracts?game=ATS`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(createBody),
        headers: expect.objectContaining({ Authorization: 'Bearer finance-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/career-1/financing/contracts/contract-1/payments?game=ATS`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(paymentBody),
        headers: expect.objectContaining({ Authorization: 'Bearer finance-token' }),
      }),
    )
  })
})
