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

function LoadingDockAnimation() {
  return (
    <div className="backend-loading-stage" aria-hidden="true">
      <svg className="backend-loading-scene" viewBox="0 0 460 190" focusable="false">
        <defs>
          <linearGradient id="dockWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#243247" />
            <stop offset="1" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="trailerSide" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#475569" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="forkliftBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="460" height="190" rx="20" fill="url(#dockWall)" />
        <rect x="0" y="144" width="460" height="46" fill="#0b1220" />
        <path d="M0 145h460" stroke="#475569" strokeWidth="2" opacity="0.55" />
        <path d="M18 170h90M176 170h90M334 170h90" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" opacity="0.28" />

        <g className="backend-dock">
          <rect x="14" y="18" width="46" height="126" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <rect x="25" y="31" width="24" height="82" rx="2" fill="#020617" />
          <rect x="19" y="118" width="36" height="9" rx="3" fill="#334155" />
          <circle cx="37" cy="25" r="4" fill="#4ade80" className="backend-dock-light" />
        </g>

        <g className="backend-parked-truck">
          <rect x="47" y="47" width="172" height="86" rx="5" fill="url(#trailerSide)" stroke="#64748b" strokeWidth="2" />
          <rect x="54" y="55" width="154" height="67" rx="2" fill="#0f172a" />
          <rect x="60" y="61" width="142" height="55" rx="2" fill="#111827" stroke="#334155" />
          <path d="M75 111V69M101 111V69M127 111V69M153 111V69" stroke="#1e293b" strokeWidth="2" />
          <rect x="50" y="126" width="174" height="10" rx="4" fill="#020617" />
          <circle cx="91" cy="140" r="15" fill="#020617" stroke="#475569" strokeWidth="3" />
          <circle cx="178" cy="140" r="15" fill="#020617" stroke="#475569" strokeWidth="3" />
          <circle cx="91" cy="140" r="6" fill="#64748b" />
          <circle cx="178" cy="140" r="6" fill="#64748b" />
          <path d="M219 83h44l25 22v29h-69z" fill="#0369a1" stroke="#64748b" strokeWidth="2" />
          <path d="M235 89h24l17 15h-41z" fill="#bae6fd" opacity="0.78" />
          <rect x="278" y="119" width="8" height="7" rx="2" fill="#fde68a" className="backend-loading-headlight" />
          <circle cx="247" cy="140" r="15" fill="#020617" stroke="#475569" strokeWidth="3" />
          <circle cx="247" cy="140" r="6" fill="#64748b" />
        </g>

        <g className="backend-forklift-trip">
          <g className="backend-forklift-crate">
            <rect x="314" y="98" width="37" height="34" rx="2" fill="#b77936" stroke="#f3c77c" strokeWidth="2" />
            <path d="M314 112h37M332.5 98v34M317 101l31 28M348 101l-31 28" stroke="#7c4a1f" strokeWidth="1.5" opacity="0.75" />
          </g>

          <g className="backend-forklift">
            <path d="M350 91h7v47h-7z" fill="#475569" />
            <path d="M349 128h-42v5h42z" fill="#64748b" />
            <path d="M349 117h-31v5h31z" fill="#64748b" />
            <path d="M360 106h48l15 19v16h-63z" fill="url(#forkliftBody)" stroke="#92400e" strokeWidth="2" />
            <path d="M370 81h35v33h-35z" fill="none" stroke="#94a3b8" strokeWidth="4" />
            <path d="M374 86h26" stroke="#64748b" strokeWidth="3" />
            <circle cx="374" cy="143" r="14" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="411" cy="143" r="12" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="374" cy="143" r="5" fill="#64748b" />
            <circle cx="411" cy="143" r="5" fill="#64748b" />
            <circle cx="393" cy="99" r="7" fill="#0f172a" />
            <path d="M390 106l-9 13h21l-7-13z" fill="#1e293b" />
            <rect x="414" y="112" width="7" height="7" rx="2" fill="#fef3c7" className="backend-forklift-light" />
          </g>
        </g>

        <g className="backend-loaded-crate">
          <rect x="69" y="79" width="37" height="34" rx="2" fill="#b77936" stroke="#f3c77c" strokeWidth="2" />
          <path d="M69 93h37M87.5 79v34M72 82l31 28M103 82l-31 28" stroke="#7c4a1f" strokeWidth="1.5" opacity="0.75" />
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
        <LoadingDockAnimation />
        <span className="eyebrow">Preparando a viagem</span>
        <h2>Carregando, aguarde…</h2>
        <p key={messageIndex} className="backend-loading-message">{LOADING_MESSAGES[messageIndex]}</p>
      </div>
    </div>
  )
}

export { LOADING_MESSAGES, MESSAGE_INTERVAL_MS, SHOW_DELAY_MS }
