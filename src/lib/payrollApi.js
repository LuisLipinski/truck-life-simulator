import { apiRequest } from './authApi.js'

function gameQuery(gameId) {
  return new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
}

function careerResourcePath(careerId, resource, gameId, suffix = '') {
  const career = encodeURIComponent(String(careerId || ''))
  return `/api/v1/careers/${career}/${resource}${suffix}?${gameQuery(gameId)}`
}

export const payrollApi = {
  listPeriods: (gameId, careerId, options = {}) => apiRequest(
    careerResourcePath(careerId, 'payroll-periods', gameId),
    { auth: true, signal: options.signal },
  ),
  closeOperationalWeek: (gameId, careerId, expectedOperationalWeek, options = {}) => apiRequest(
    careerResourcePath(careerId, 'payroll-periods', gameId, '/close'),
    {
      auth: true,
      method: 'POST',
      body: { expectedOperationalWeek: Number(expectedOperationalWeek) },
      signal: options.signal,
    },
  ),
  listPayslips: (gameId, careerId, options = {}) => apiRequest(
    careerResourcePath(careerId, 'payslips', gameId),
    { auth: true, signal: options.signal },
  ),
  getPayslip: (gameId, careerId, payslipId, options = {}) => apiRequest(
    careerResourcePath(
      careerId,
      'payslips',
      gameId,
      `/${encodeURIComponent(String(payslipId || ''))}`,
    ),
    { auth: true, signal: options.signal },
  ),
  generatePayslip: (gameId, careerId, expected = {}, options = {}) => {
    const payload = String(gameId || '').toLowerCase() === 'ets2'
      ? { expectedPayrollMonth: Number(expected.expectedPayrollMonth) }
      : { expectedOperationalWeek: Number(expected.expectedOperationalWeek) }
    return apiRequest(careerResourcePath(careerId, 'payslips', gameId), {
      auth: true,
      method: 'POST',
      body: payload,
      signal: options.signal,
    })
  },
}
