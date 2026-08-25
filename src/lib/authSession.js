let currentSession = null
const listeners = new Set()

function notifySessionChanged() {
  for (const listener of listeners) listener(currentSession)
}

export function setAccessSession(response) {
  if (!response?.accessToken) {
    currentSession = null
    notifySessionChanged()
    return null
  }
  const expiresIn = Math.max(0, Number(response.expiresIn || 0))
  currentSession = {
    accessToken: response.accessToken,
    tokenType: response.tokenType || 'Bearer',
    expiresAt: Date.now() + (expiresIn * 1000),
  }
  notifySessionChanged()
  return currentSession
}

export function getAccessSession() {
  if (!currentSession) return null
  if (currentSession.expiresAt <= Date.now()) {
    currentSession = null
    notifySessionChanged()
    return null
  }
  return currentSession
}

export function clearAccessSession() {
  const hadSession = currentSession !== null
  currentSession = null
  if (hadSession) notifySessionChanged()
}

export function subscribeAccessSession(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
