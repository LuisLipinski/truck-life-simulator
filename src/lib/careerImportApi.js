import { apiRequest } from './authApi.js'

export const careerImportApi = {
  validate: (payload, options = {}) => apiRequest('/api/v1/careers/imports/validate', {
    auth: true,
    method: 'POST',
    body: payload,
    signal: options.signal,
  }),
  importCareer: (payload, options = {}) => apiRequest('/api/v1/careers/imports', {
    auth: true,
    method: 'POST',
    body: payload,
    signal: options.signal,
  }),
  recover: (gameId, sourceCareerId, options = {}) => {
    const query = new URLSearchParams({
      game: String(gameId || '').toUpperCase(),
      sourceCareerId: String(sourceCareerId || ''),
    })
    return apiRequest(`/api/v1/careers/imports?${query.toString()}`, {
      auth: true,
      signal: options.signal,
    })
  },
}
