import { useEffect, useState } from 'react'
import { subscribeBackendActivity } from '../lib/backendActivity.js'

const SHOW_DELAY_MS = 700
const MESSAGE_INTERVAL_MS = 2600

const LOADING_MESSAGES = [
  'Carregando os reservatórios de ar do freio…',
  'Motor frio — deixando chegar na temperatura…',
  'Aguardando a carga ficar pronta no pátio…',
  'Conferindo pneus e luzes antes da saída…',
  'Engatando a carreta…',
  'Organizando o diário de bordo…',
  'Traçando a rota da próxima viagem…',
  'Esperando a liberação da doca…',
]

export default function BackendLoadingOverlay() {
  const [active, setActive] = useState(false)
  const [visible, setVisible] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => subscribeBackendActivity((count) => setActive(count > 0)), [])

  useEffect(() => {
    if (!active) {
      setVisible(false)
      setMessageIndex(0)
      return undefined
    }

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [active])

  useEffect(() => {
    if (!visible) return undefined
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length)
    }, MESSAGE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div className="backend-loading-overlay" role="status" aria-live="polite" aria-label="Aguardando resposta do servidor">
      <div className="backend-loading-card">
        <div className="backend-truck-stage" aria-hidden="true">
          <div className="backend-road-line" />
          <div className="backend-truck">
            <div className="backend-trailer" />
            <div className="backend-cab">
              <span className="backend-window" />
              <span className="backend-headlight" />
            </div>
            <span className="backend-wheel backend-wheel-rear" />
            <span className="backend-wheel backend-wheel-front" />
          </div>
        </div>
        <span className="eyebrow">Preparando a estrada</span>
        <h2>O servidor está respondendo</h2>
        <p key={messageIndex} className="backend-loading-message">{LOADING_MESSAGES[messageIndex]}</p>
        <small>Se o serviço estava em repouso, a primeira resposta pode levar um pouco mais de tempo.</small>
      </div>
    </div>
  )
}

export { LOADING_MESSAGES, SHOW_DELAY_MS }
