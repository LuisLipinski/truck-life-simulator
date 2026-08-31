// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { payrollApi } from './payrollApi.js'

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
  setAccessSession({ accessToken: 'payroll-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('payroll API client', () => {
  it('reads payroll periods and immutable payslips with authenticated no-store requests', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, { id: 'pay-1' }))

    await payrollApi.listPeriods('ets2', 'career / 1')
    await payrollApi.listPayslips('ets2', 'career / 1')
    await payrollApi.getPayslip('ets2', 'career / 1', 'pay / 1')

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/career%20%2F%201/payroll-periods?game=ETS2`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer payroll-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/career%20%2F%201/payslips?game=ETS2`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer payroll-token' }) }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      `${API_BASE_URL}/api/v1/careers/career%20%2F%201/payslips/pay%20%2F%201?game=ETS2`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer payroll-token' }) }),
    )
  })

  it('closes ETS2 week using only the expected operational week as browser input', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(201, { id: 'period-4', operationalWeek: 4 }))

    await payrollApi.closeOperationalWeek('ets2', 'career-1', 4)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career-1/payroll-periods/close?game=ETS2`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ expectedOperationalWeek: 4 }),
      }),
    )
  })

  it('generates ATS and ETS2 payslips without accepting client-calculated money values', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(201, { id: 'ats-pay' }))
      .mockResolvedValueOnce(response(201, { id: 'ets-pay' }))

    await payrollApi.generatePayslip('ats', 'career-ats', {
      expectedOperationalWeek: 7,
      grossAmount: 999999,
      depositAmount: 999999,
    })
    await payrollApi.generatePayslip('ets2', 'career-ets', {
      expectedPayrollMonth: 3,
      grossAmount: 999999,
      depositAmount: 999999,
    })

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/career-ats/payslips?game=ATS`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ expectedOperationalWeek: 7 }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/career-ets/payslips?game=ETS2`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ expectedPayrollMonth: 3 }),
      }),
    )
  })
})
