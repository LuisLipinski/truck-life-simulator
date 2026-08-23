export function isTransientBackendError(error) {
  const status = Number(error?.status || 0)
  return error?.code === 'API_UNAVAILABLE' || status === 0 || [502, 503, 504].includes(status)
}

export function backendRetryDelayMs(attempt) {
  const normalizedAttempt = Math.max(1, Number(attempt || 1))
  return Math.min(normalizedAttempt * 1000, 5000)
}

function waitFor(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function retryTransientBackend(operation, options = {}) {
  const isActive = options.isActive || (() => true)
  const wait = options.wait || waitFor
  let attempt = 0

  while (isActive()) {
    try {
      return await operation()
    } catch (error) {
      if (!isActive() || !isTransientBackendError(error)) throw error
      attempt += 1
      await wait(backendRetryDelayMs(attempt))
    }
  }

  const cancelled = new Error('Backend retry cancelled')
  cancelled.code = 'BACKEND_RETRY_CANCELLED'
  throw cancelled
}
