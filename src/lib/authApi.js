import { clearAccessSession, getAccessSession, setAccessSession } from './authSession.js'
import { beginBackendActivity } from './backendActivity.js'

const DEFAULT_API_BASE_URL = 'https://truck-life-simulator-api.onrender.com'
const DEFAULT_CSRF_HEADER = 'X-CSRF-TOKEN'

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

let refreshPromise = null

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

async function requestOnce(path, options = {}) {
  const method = options.method || 'GET'
  const hasBody = options.body !== undefined
  const endBackendActivity = beginBackendActivity()

  try {
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
  } finally {
    endBackendActivity()
  }
}

async function csrfProtectedPost(path, options = {}) {
  const csrf = await requestOnce('/api/v1/auth/csrf', { signal: options.signal })
  const headerName = csrf?.headerName || DEFAULT_CSRF_HEADER
  if (!csrf?.token) {
    throw new ApiProblemError('A proteção da sessão não pôde ser preparada.', {
      status: 0,
      code: 'CSRF_TOKEN_MISSING',
    })
  }
  return requestOnce(path, {
    method: 'POST',
    signal: options.signal,
    headers: { [headerName]: csrf.token },
  })
}

export function refreshAccessSession(options = {}) {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await csrfProtectedPost('/api/v1/auth/refresh', options)
      const session = setAccessSession(response)
      if (!session) {
        throw new ApiProblemError('A API não retornou uma sessão válida.', {
          status: 0,
          code: 'ACCESS_TOKEN_MISSING',
        })
      }
      return session
    } catch (error) {
      clearAccessSession()
      throw error
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function authenticatedRequest(path, options = {}) {
  let session = getAccessSession()
  if (!session) session = await refreshAccessSession()

  const execute = (activeSession) => requestOnce(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `${activeSession.tokenType} ${activeSession.accessToken}`,
    },
  })

  try {
    return await execute(session)
  } catch (error) {
    if (!(error instanceof ApiProblemError) || error.status !== 401 || options.retryAuth === false) {
      throw error
    }
    const renewedSession = await refreshAccessSession()
    return execute(renewedSession)
  }
}

export async function apiRequest(path, options = {}) {
  if (options.auth) {
    const { auth: _auth, retryAuth, ...requestOptions } = options
    return authenticatedRequest(path, { ...requestOptions, retryAuth })
  }
  return requestOnce(path, options)
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
  csrf: (options = {}) => apiRequest('/api/v1/auth/csrf', {
    signal: options.signal,
  }),
  refresh: (options = {}) => refreshAccessSession(options),
  logout: async (options = {}) => {
    try {
      return await csrfProtectedPost('/api/v1/auth/logout', options)
    } finally {
      clearAccessSession()
    }
  },
  me: (options = {}) => apiRequest('/api/v1/me', {
    auth: true,
    signal: options.signal,
  }),
  changePassword: (currentPassword, newPassword, options = {}) => apiRequest('/api/v1/me/change-password', {
    auth: true,
    method: 'POST',
    body: { currentPassword, newPassword },
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
