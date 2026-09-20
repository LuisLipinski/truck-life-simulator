import { apiRequest } from './authApi.js'

function gameQuery(gameId) {
  return new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
}

function progressionPath(careerId, gameId, suffix = '') {
  const career = encodeURIComponent(String(careerId || ''))
  return `/api/v1/careers/${career}/progression${suffix}?${gameQuery(gameId)}`
}

export const progressionApi = {
  get: (gameId, careerId, options = {}) => apiRequest(
    progressionPath(careerId, gameId),
    { auth: true, signal: options.signal },
  ),
  promote: (gameId, careerId, body, options = {}) => apiRequest(
    progressionPath(careerId, gameId, '/promotions'),
    { auth: true, method: 'POST', body, signal: options.signal },
  ),
  acquireDangerousGoods: (gameId, careerId, body, options = {}) => apiRequest(
    progressionPath(careerId, gameId, '/dangerous-goods'),
    { auth: true, method: 'POST', body, signal: options.signal },
  ),
}
