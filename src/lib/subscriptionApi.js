import { apiRequest } from './authApi.js'

export const subscriptionApi = {
  plans: (options = {}) => apiRequest('/api/v1/plans', {
    signal: options.signal,
  }),

  entitlements: (options = {}) => apiRequest('/api/v1/me/entitlements', {
    auth: true,
    signal: options.signal,
  }),
}
