import { useEffect, useState } from 'react'
import { subscribeBackendActivity } from '../lib/backendActivity.js'

const LOADING_RETRY_DELAY_MS = 55_000

export default function BackendLoadingRetryFallback({ reload = () => window.location.reload() }) {
  const [active, setActive] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => subscribeBackendActivity((count) => setActive(count > 0)), [])

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return undefined
    }

    setVisible(false)
    const timer = window.setTimeout(() => setVisible(true), LOADING_RETRY_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [active])

  if (!visible) return null

  return (
    <div className="backend-loading-retry-fallback" role="status" aria-live="polite">
      <p>Parece que o caminhão não quer pegar. Tente novamente.</p>
      <button type="button" className="primary backend-loading-retry-button" onClick={reload}>
        Tentar novamente
      </button>
    </div>
  )
}

export { LOADING_RETRY_DELAY_MS }
