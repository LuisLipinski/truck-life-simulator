import { apiRequest } from './authApi.js'

function gameQuery(gameId) {
  return new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
}

function basePath(careerId, gameId) {
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/finances?${gameQuery(gameId)}`
}

function path(careerId, gameId, suffix) {
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/finances${suffix}?${gameQuery(gameId)}`
}

export const financeApi = {
  get: (gameId, careerId, options = {}) => apiRequest(basePath(careerId, gameId), {
    auth: true,
    signal: options.signal,
  }),
  createExpense: (gameId, careerId, payload, options = {}) => apiRequest(path(careerId, gameId, '/monthly-expenses'), {
    auth: true, method: 'POST', body: payload, signal: options.signal,
  }),
  updateExpense: (gameId, careerId, expenseId, payload, options = {}) => apiRequest(
    path(careerId, gameId, `/monthly-expenses/${encodeURIComponent(String(expenseId))}`),
    { auth: true, method: 'PATCH', body: payload, signal: options.signal },
  ),
  deleteExpense: (gameId, careerId, expenseId, expectedOperationalWeek, expectedPayrollMonth, options = {}) => {
    const query = new URLSearchParams({
      game: String(gameId || '').toUpperCase(),
      expectedOperationalWeek: String(expectedOperationalWeek),
    })
    if (expectedPayrollMonth != null) query.set('expectedPayrollMonth', String(expectedPayrollMonth))
    return apiRequest(`/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/finances/monthly-expenses/${encodeURIComponent(String(expenseId))}?${query}`, {
      auth: true, method: 'DELETE', signal: options.signal,
    })
  },
  applyExpenses: (gameId, careerId, payload, options = {}) => apiRequest(path(careerId, gameId, '/monthly-expense-applications'), {
    auth: true, method: 'POST', body: payload, signal: options.signal,
  }),
  depositReserve: (gameId, careerId, payload, options = {}) => apiRequest(path(careerId, gameId, '/emergency-reserve/deposits'), {
    auth: true, method: 'POST', body: payload, signal: options.signal,
  }),
  withdrawReserve: (gameId, careerId, payload, options = {}) => apiRequest(path(careerId, gameId, '/emergency-reserve/withdrawals'), {
    auth: true, method: 'POST', body: payload, signal: options.signal,
  }),
  configureAutoReserve: (gameId, careerId, payload, options = {}) => apiRequest(path(careerId, gameId, '/emergency-reserve/auto-contribution'), {
    auth: true, method: 'PATCH', body: payload, signal: options.signal,
  }),
  ledger: (gameId, careerId, limit = 100, options = {}) => apiRequest(
    `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/finances/ledger?${gameQuery(gameId)}&limit=${encodeURIComponent(String(limit))}`,
    { auth: true, signal: options.signal },
  ),
  adjustBalance: (gameId, careerId, payload, options = {}) => apiRequest(path(careerId, gameId, '/balance-adjustments'), {
    auth: true, method: 'POST', body: payload, signal: options.signal,
  }),
}
