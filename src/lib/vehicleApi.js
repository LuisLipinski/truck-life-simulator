import { apiRequest } from './authApi.js'

function gameQuery(gameId) {
  return new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
}

function basePath(careerId) {
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/vehicles`
}

export const vehicleApi = {
  list: (gameId, careerId, options = {}) => apiRequest(
    `${basePath(careerId)}?${gameQuery(gameId)}`,
    { auth: true, signal: options.signal },
  ),

  acquire: (gameId, careerId, body, options = {}) => apiRequest(
    `${basePath(careerId)}/acquisitions?${gameQuery(gameId)}`,
    { auth: true, method: 'POST', body, signal: options.signal },
  ),
}
