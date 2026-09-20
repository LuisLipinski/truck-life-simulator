import { apiRequest } from './authApi.js'

function gameQuery(gameId, extras = {}) {
  const query = new URLSearchParams({ game: String(gameId || '').toUpperCase() })
  Object.entries(extras).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

function basePath(careerId, suffix = '', gameId, extras = {}) {
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/financing${suffix}?${gameQuery(gameId, extras)}`
}

export const financingApi = {
  offers: (gameId, careerId, productType, requestedAmount, options = {}) => apiRequest(
    basePath(careerId, '/offers', gameId, { productType, requestedAmount }),
    { auth: true, signal: options.signal },
  ),
  createContract: (gameId, careerId, body) => apiRequest(
    basePath(careerId, '/contracts', gameId),
    { auth: true, method: 'POST', body },
  ),
  listContracts: (gameId, careerId, options = {}) => apiRequest(
    basePath(careerId, '/contracts', gameId),
    { auth: true, signal: options.signal },
  ),
  getContract: (gameId, careerId, contractId, options = {}) => apiRequest(
    basePath(careerId, `/contracts/${encodeURIComponent(String(contractId || ''))}`, gameId),
    { auth: true, signal: options.signal },
  ),
  pay: (gameId, careerId, contractId, body) => apiRequest(
    basePath(careerId, `/contracts/${encodeURIComponent(String(contractId || ''))}/payments`, gameId),
    { auth: true, method: 'POST', body },
  ),
}
