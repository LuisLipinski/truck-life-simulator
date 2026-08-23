import { useEffect, useState } from 'react'
import { subscribeBackendActivity } from '../lib/backendActivity.js'

const SHOW_DELAY_MS = 700
const MESSAGE_INTERVAL_MS = 2400

const LOADING_MESSAGES = [
  'Carregando os reservatórios de ar…',
  'Aquecendo o motor para pegar a estrada…',
  'Conferindo os pneus antes da saída…',
  'Ajustando os retrovisores…',
  'Engatando a carreta…',
  'Conferindo as luzes da carreta…',
  'Organizando os documentos da viagem…',
  'Calculando a melhor rota…',
  'Conferindo o peso da carga…',
  'Fechando as portas do baú…',
  'Ajustando a quinta roda…',
  'Conferindo o nível de combustível…',
  'Preparando o diário de bordo…',
  'Aguardando a liberação da doca…',
  'Posicionando o caminhão no pátio…',
  'Revisando a rota no GPS…',
  'Prendendo a carga para a viagem…',
  'Conferindo os freios da carreta…',
  'Fazendo a inspeção pré-viagem…',
  'Ajustando o banco do motorista…',
  'Ligando os faróis para a saída…',
  'Conferindo o manifesto da carga…',
  'Preparando a cabine para a estrada…',
  'Organizando as paradas da viagem…',
  'Conferindo os eixos da carreta…',
  'Ajustando a pressão dos pneus…',
  'Preparando a saída do terminal…',
  'Esperando o sinal verde no pátio…',
  'Fazendo a última checagem da carga…',
  'Tudo quase pronto para seguir viagem…',
]

function randomMessageIndex() {
  return Math.floor(Math.random() * LOADING_MESSAGES.length)
}

function TruckAnimation() {
  return (
    <div className="backend-truck-stage" aria-hidden="true">
      <div className="backend-road">
        <div className="backend-road-line" />
      </div>
      <svg className="backend-truck-svg" viewBox="0 0 360 140" focusable="false">
        <defs>
          <linearGradient id="trailerBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#334155" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cabBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e0f2fe" />
            <stop offset="1" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>

        <g className="backend-truck-vehicle">
          <g className="backend-smoke">
            <circle cx="245" cy="35" r="5" />
            <circle cx="233" cy="27" r="7" />
            <circle cx="218" cy="20" r="9" />
          </g>

          <rect x="28" y="40" width="202" height="66" rx="8" fill="url(#trailerBody)" stroke="#64748b" strokeWidth="2" />
          <rect x="37" y="49" width="184" height="7" rx="3.5" fill="#475569" opacity="0.75" />
          <rect x="28" y="96" width="205" height="10" rx="4" fill="#0f172a" />
          <rect x="82" y="106" width="112" height="7" rx="3" fill="#64748b" opacity="0.65" />

          <rect x="244" y="42" width="7" height="42" rx="3" fill="#475569" />
          <path d="M232 56h58l31 25v25h-89z" fill="url(#cabBody)" stroke="#64748b" strokeWidth="2" />
          <path d="M257 62h29l21 18h-50z" fill="url(#glass)" stroke="#bae6fd" strokeWidth="1.5" />
          <path d="M252 85h60v16h-60z" fill="#075985" opacity="0.78" />
          <rect x="318" y="91" width="15" height="11" rx="3" fill="#0f172a" />
          <rect x="325" y="79" width="7" height="8" rx="3" fill="#fde68a" className="backend-headlight" />
          <rect x="225" y="101" width="106" height="7" rx="3.5" fill="#111827" />
          <rect x="235" y="91" width="13" height="8" rx="2" fill="#94a3b8" />

          <g className="backend-wheel backend-wheel-rear" transform="translate(82 108)">
            <circle r="19" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle r="9" fill="#64748b" />
            <path d="M0-8V8M-8 0H8M-6-6L6 6M6-6L-6 6" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g className="backend-wheel backend-wheel-mid" transform="translate(184 108)">
            <circle r="19" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle r="9" fill="#64748b" />
            <path d="M0-8V8M-8 0H8M-6-6L6 6M6-6L-6 6" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g className="backend-wheel backend-wheel-front" transform="translate(292 108)">
            <circle r="19" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle r="9" fill="#64748b" />
            <path d="M0-8V8M-8 0H8M-6-6L6 6M6-6L-6 6" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  )
}

export default function BackendLoadingOverlay() {
  const [active, setActive] = useState(false)
  const [visible, setVisible] = useState(false)
  const [messageIndex, setMessageIndex] = useState(randomMessageIndex)

  useEffect(() => subscribeBackendActivity((count) => setActive(count > 0)), [])

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return undefined
    }

    const timer = window.setTimeout(() => {
      setMessageIndex(randomMessageIndex())
      setVisible(true)
    }, SHOW_DELAY_MS)
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
    <div className="backend-loading-overlay" role="status" aria-live="polite" aria-label="Carregando">
      <div className="backend-loading-card">
        <TruckAnimation />
        <span className="eyebrow">Preparando a viagem</span>
        <h2>Carregando, aguarde…</h2>
        <p key={messageIndex} className="backend-loading-message">{LOADING_MESSAGES[messageIndex]}</p>
      </div>
    </div>
  )
}

export { LOADING_MESSAGES, MESSAGE_INTERVAL_MS, SHOW_DELAY_MS }
