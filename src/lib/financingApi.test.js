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
  setAccessSession({ accessToken: 'financing-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('financing API client', () => {
  it('loads jurisdiction offers without sending an interest rate from the browser', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, [{ termPeriods: 52 }]))

    await financingApi.offers('ats', 'career / 1', 'PERSONAL_LOAN', '5000.00')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career%20%2F%201/financing/offers?game=ATS&productType=PERSONAL_LOAN&requestedAmount=5000.00`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer financing-token' }),
      }),
    )
  })

  it('creates a contract using only the selected server offer identity and operational preconditions', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(201, { id: 'contract-1' }))

    const body = {
      operationId: '11111111-1111-1111-1111-111111111111',
      productType: 'VEHICLE_FINANCING',
      requestedAmount: '25000.00',
      termPeriods: 104,
      expectedOperationalWeek: 5,
      expectedBalance: '10000.00',
    }
    await financingApi.createContract('ats', 'career-1', body)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career-1/financing/contracts?game=ATS`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }),
    )
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).not.toHaveProperty('annualInterestRate')
  })

  it('sends ETS2 operational month when recording a payoff', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, { status: 'PAID_OFF' }))

    const body = {
      operationId: '22222222-2222-2222-2222-222222222222',
      paymentType: 'PAYOFF',
      expectedOperationalWeek: 8,
      expectedPayrollMonth: 2,
      expectedBalance: '4000.00',
    }
    await financingApi.pay('ets2', 'career-2', 'contract / 2', body)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career-2/financing/contracts/contract%20%2F%202/payments?game=ETS2`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    )
  })
})
