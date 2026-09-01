import { apiRequest } from './authApi.js'

function gameQuery(gameId, extras = {}) {
  const query = new URLSearchParams({ game: String(gameId || '').toUpperCase() })
  Object.entries(extras).forEach(([key, value]) => {
    if (value != null) query.set(key, String(value))
  })
  return query.toString()
}

function path(careerId, suffix = '', gameId, extras) {
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/finances${suffix}?${gameQuery(gameId, extras)}`
}

export const financeApi = {
  get: (gameId, careerId, options = {}) => apiRequest(path(careerId, '', gameId), { auth: true, signal: options.signal }),
  createExpense: (gameId, careerId, body) => apiRequest(path(careerId, '/monthly-expenses', gameId), { auth: true, method: 'POST', body }),
  updateExpense: (gameId, careerId, expenseId, body) => apiRequest(path(careerId, `/monthly-expenses/${encodeURIComponent(expenseId)}`, gameId), { auth: true, method: 'PATCH', body }),
  deleteExpense: (gameId, careerId, expenseId, context) => apiRequest(path(careerId, `/monthly-expenses/${encodeURIComponent(expenseId)}`, gameId, context), { auth: true, method: 'DELETE' }),
  applyExpenses: (gameId, careerId, body) => apiRequest(path(careerId, '/monthly-expense-applications', gameId), { auth: true, method: 'POST', body }),
  depositReserve: (gameId, careerId, body) => apiRequest(path(careerId, '/emergency-reserve/deposits', gameId), { auth: true, method: 'POST', body }),
  withdrawReserve: (gameId, careerId, body) => apiRequest(path(careerId, '/emergency-reserve/withdrawals', gameId), { auth: true, method: 'POST', body }),
  configureAutoReserve: (gameId, careerId, configuration, options = {}) => apiRequest(path(careerId, '/emergency-reserve/auto-contribution', gameId), {
    auth: true,
    method: 'PATCH',
    body: {
      expectedOperationalWeek: Number(configuration.expectedOperationalWeek),
      expectedPayrollMonth: configuration.expectedPayrollMonth == null ? null : Number(configuration.expectedPayrollMonth),
      enabled: Boolean(configuration.enabled),
      amount: Math.max(0, Number(configuration.amount) || 0),
    },
    signal: options.signal,
  }),
  adjustBalance: (gameId, careerId, body) => apiRequest(path(careerId, '/balance-adjustments', gameId), { auth: true, method: 'POST', body }),
  listLedger: (gameId, careerId, limit = 100, options = {}) => apiRequest(path(careerId, '/ledger', gameId, { limit }), { auth: true, signal: options.signal }),
}
