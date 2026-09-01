import { apiRequest } from './authApi.js'

function gameQuery(gameId) {
  return new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
}

function financePath(careerId, gameId, suffix = '') {
  const career = encodeURIComponent(String(careerId || ''))
  return `/api/v1/careers/${career}/finances${suffix}?${gameQuery(gameId)}`
}

export const financeApi = {
  get: (gameId, careerId, options = {}) => apiRequest(
    financePath(careerId, gameId),
    { auth: true, signal: options.signal },
  ),

  configureAutoReserve: (gameId, careerId, configuration, options = {}) => apiRequest(
    financePath(careerId, gameId, '/emergency-reserve/auto-contribution'),
    {
      auth: true,
      method: 'PATCH',
      body: {
        expectedOperationalWeek: Number(configuration.expectedOperationalWeek),
        expectedPayrollMonth: configuration.expectedPayrollMonth == null
          ? null
          : Number(configuration.expectedPayrollMonth),
        enabled: Boolean(configuration.enabled),
        amount: Math.max(0, Number(configuration.amount) || 0),
      },
      signal: options.signal,
    },
  ),
}
