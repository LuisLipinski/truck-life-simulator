// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { financeApi } from './financeApi.js'

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

describe('finance API client', () => {
  it('loads the authoritative finance state from the backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, { emergencyReserve: { autoContributionEnabled: false } }))

    await financeApi.get('ats', 'career / 1')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career%20%2F%201/finances?game=ATS`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer finance-token' }),
      }),
    )
  })

  it('persists automatic reserve contribution with the expected career period', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, {
      emergencyReserve: { autoContributionEnabled: true, autoContributionAmount: 75 },
    }))

    await financeApi.configureAutoReserve('ats', 'career-1', {
      expectedOperationalWeek: 4,
      expectedPayrollMonth: null,
      enabled: true,
      amount: 75,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career-1/finances/emergency-reserve/auto-contribution?game=ATS`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          expectedOperationalWeek: 4,
          expectedPayrollMonth: null,
          enabled: true,
          amount: 75,
        }),
      }),
    )
  })

  it('applies monthly expenses with an idempotent server operation', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(201, { balance: 1200 }))

    await financeApi.applyExpenses('ets2', 'career-2', {
      operationId: '11111111-1111-1111-1111-111111111111',
      expectedOperationalWeek: 5,
      expectedPayrollMonth: 2,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career-2/finances/monthly-expense-applications?game=ETS2`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          operationId: '11111111-1111-1111-1111-111111111111',
          expectedOperationalWeek: 5,
          expectedPayrollMonth: 2,
        }),
      }),
    )
  })

  it('sends operational preconditions when deleting a custom expense', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, { expenses: [] }))

    await financeApi.deleteExpense('ats', 'career-1', 'expense / 1', {
      expectedOperationalWeek: 3,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career-1/finances/monthly-expenses/expense%20%2F%201?game=ATS&expectedOperationalWeek=3`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
