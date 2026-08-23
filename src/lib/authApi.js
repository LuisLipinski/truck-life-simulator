const DEFAULT_API_BASE_URL = 'https://truck-life-simulator-api.onrender.com'

export const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
).replace(/\/+$/, '')

export class ApiProblemError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'ApiProblemError'
    this.status = Number(options.status || 0)
    this.code = options.code || 'REQUEST_FAILED'
    this.correlationId = options.correlationId || null
    this.retryAfter = options.retryAfter || null
    this.violations = Array.isArray(options.violations) ? options.violations : []
  }
}

async function readPayload(response) {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function apiRequest(path, options = {}) {
  const method = options.method || 'GET'
  const hasBody = options.body !== undefined
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      signal: options.signal,
      headers: {
        Accept: 'application/json, application/problem+json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    })
  } catch (cause) {
    throw new ApiProblemError('A API não pôde ser acessada.', {
      status: 0,
      code: 'API_UNAVAILABLE',
      cause,
    })
  }

  const payload = await readPayload(response)
  if (!response.ok) {
    throw new ApiProblemError(payload?.detail || 'A solicitação não pôde ser concluída.', {
      status: response.status,
      code: payload?.code || `HTTP_${response.status}`,
      correlationId: payload?.correlationId,
      retryAfter: response.headers.get('retry-after'),
      violations: payload?.violations,
    })
  }

  return payload
}

export const authApi = {
  register: (data, options = {}) => apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: data,
    signal: options.signal,
  }),
  verifyEmail: (token, options = {}) => apiRequest('/api/v1/auth/verify-email', {
    method: 'POST',
    body: { token },
    signal: options.signal,
  }),
  resendVerification: (email, options = {}) => apiRequest('/api/v1/auth/resend-verification', {
    method: 'POST',
    body: { email },
    signal: options.signal,
  }),
  login: (data, options = {}) => apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: data,
    signal: options.signal,
  }),
  forgotPassword: (email, options = {}) => apiRequest('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { email },
    signal: options.signal,
  }),
  resetPassword: (token, newPassword, options = {}) => apiRequest('/api/v1/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
    signal: options.signal,
  }),
}
