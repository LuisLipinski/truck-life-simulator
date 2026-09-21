import { apiRequest } from './authApi.js'

function gameQuery(gameId, extras = {}) {
  const query = new URLSearchParams({ game: String(gameId || '').toUpperCase() })
  Object.entries(extras).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

function basePath(careerId) {
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/financing`
}

export const financingApi = {
  offers: (gameId, careerId, productType, requestedAmount, options = {}) => apiRequest(
    `${basePath(careerId)}/offers?${gameQuery(gameId, { productType, requestedAmount })}`,
    { auth: true, signal: options.signal },
  ),

  listContracts: (gameId, careerId, options = {}) => apiRequest(
    `${basePath(careerId)}/contracts?${gameQuery(gameId)}`,
    { auth: true, signal: options.signal },
  ),

  getContract: (gameId, careerId, contractId, options = {}) => apiRequest(
    `${basePath(careerId)}/contracts/${encodeURIComponent(String(contractId || ''))}?${gameQuery(gameId)}`,
    { auth: true, signal: options.signal },
  ),

  createContract: (gameId, careerId, body, options = {}) => apiRequest(
    `${basePath(careerId)}/contracts?${gameQuery(gameId)}`,
    { auth: true, method: 'POST', body, signal: options.signal },
  ),

  pay: (gameId, careerId, contractId, body, options = {}) => apiRequest(
    `${basePath(careerId)}/contracts/${encodeURIComponent(String(contractId || ''))}/payments?${gameQuery(gameId)}`,
    { auth: true, method: 'POST', body, signal: options.signal },
  ),
}
