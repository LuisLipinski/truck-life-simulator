import { apiRequest } from './authApi.js'

function basePath(gameId, careerId) {
  const query = new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/phase2-transition?${query}`
}

export const phase2Api = {
  transition: (gameId, careerId, options = {}) => apiRequest(
    basePath(gameId, careerId),
    { auth: true, signal: options.signal },
  ),

  completeTransition: (gameId, careerId, body, options = {}) => {
    const query = new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
    return apiRequest(
      `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}/phase2-transition/complete?${query}`,
      { auth: true, method: 'POST', body, signal: options.signal },
    )
  },
}
