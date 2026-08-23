let activeRequests = 0
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener(activeRequests))
}

export function beginBackendActivity() {
  activeRequests += 1
  emit()
  let ended = false

  return function endBackendActivity() {
    if (ended) return
    ended = true
    activeRequests = Math.max(0, activeRequests - 1)
    emit()
  }
}

export function subscribeBackendActivity(listener) {
  listeners.add(listener)
  listener(activeRequests)
  return () => listeners.delete(listener)
}

export function getBackendActivityCount() {
  return activeRequests
}
