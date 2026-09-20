import { apiRequest } from './authApi.js'

function gameQuery(gameId) {
  return new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
}

function incidentPath(careerId, gameId, incidentId = null) {
  const career = encodeURIComponent(String(careerId || ''))
  const incident = incidentId == null ? '' : `/${encodeURIComponent(String(incidentId))}`
  return `/api/v1/careers/${career}/incidents${incident}?${gameQuery(gameId)}`
}

export const incidentApi = {
  list: (gameId, careerId, options = {}) => apiRequest(
    incidentPath(careerId, gameId),
    { auth: true, signal: options.signal },
  ),
  create: (gameId, careerId, body, options = {}) => apiRequest(
    incidentPath(careerId, gameId),
    { auth: true, method: 'POST', body, signal: options.signal },
  ),
  get: (gameId, careerId, incidentId, options = {}) => apiRequest(
    incidentPath(careerId, gameId, incidentId),
    { auth: true, signal: options.signal },
  ),
  cancel: (gameId, careerId, incidentId, options = {}) => apiRequest(
    incidentPath(careerId, gameId, incidentId),
    { auth: true, method: 'DELETE', signal: options.signal },
  ),
}
