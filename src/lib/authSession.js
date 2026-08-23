let currentSession = null

export function setAccessSession(response) {
  if (!response?.accessToken) {
    currentSession = null
    return null
  }
  const expiresIn = Math.max(0, Number(response.expiresIn || 0))
  currentSession = {
    accessToken: response.accessToken,
    tokenType: response.tokenType || 'Bearer',
    expiresAt: Date.now() + (expiresIn * 1000),
  }
  return currentSession
}

export function getAccessSession() {
  if (!currentSession) return null
  if (currentSession.expiresAt <= Date.now()) {
    currentSession = null
    return null
  }
  return currentSession
}

export function clearAccessSession() {
  currentSession = null
}
