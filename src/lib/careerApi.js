import { apiRequest } from './authApi.js'

function gameQuery(gameId) {
  return new URLSearchParams({ game: String(gameId || '').toUpperCase() }).toString()
}

function careerPath(careerId, gameId, suffix = '') {
  return `/api/v1/careers/${encodeURIComponent(String(careerId || ''))}${suffix}?${gameQuery(gameId)}`
}

export const careerApi = {
  list: (gameId, options = {}) => apiRequest(`/api/v1/careers?${gameQuery(gameId)}`, {
    auth: true,
    signal: options.signal,
  }),
  get: (gameId, careerId, options = {}) => apiRequest(careerPath(careerId, gameId), {
    auth: true,
    signal: options.signal,
  }),
  events: (gameId, careerId, options = {}) => apiRequest(careerPath(careerId, gameId, '/events'), {
    auth: true,
    signal: options.signal,
  }),
  updateProfile: (gameId, careerId, payload, options = {}) => apiRequest(careerPath(careerId, gameId), {
    auth: true,
    method: 'PATCH',
    body: payload,
    signal: options.signal,
  }),
  changeEmployer: (gameId, careerId, payload, options = {}) => apiRequest(careerPath(careerId, gameId, '/employer'), {
    auth: true,
    method: 'PATCH',
    body: payload,
    signal: options.signal,
  }),
  changeBase: (gameId, careerId, payload, options = {}) => apiRequest(careerPath(careerId, gameId, '/base'), {
    auth: true,
    method: 'PATCH',
    body: payload,
    signal: options.signal,
  }),
}
