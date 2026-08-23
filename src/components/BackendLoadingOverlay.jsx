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
      <svg className="backend-loading-scene" viewBox="0 0 480 200" focusable="false">
        <defs>
          <linearGradient id="yardSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#223047" />
            <stop offset="1" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="trailerBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#475569" />
            <stop offset="1" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="cabBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="forkliftBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>

        <rect width="480" height="200" rx="20" fill="url(#yardSky)" />
        <rect y="153" width="480" height="47" fill="#0b1220" />
        <path d="M0 154h480" stroke="#475569" strokeWidth="2" opacity="0.5" />
        <path d="M10 178h72M124 178h72M238 178h72M352 178h72" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" opacity="0.18" />

        <g className="backend-yard-details" opacity="0.55">
          <rect x="18" y="24" width="8" height="129" fill="#334155" />
          <rect x="454" y="35" width="8" height="118" fill="#334155" />
          <circle cx="22" cy="35" r="5" fill="#fde68a" className="backend-loading-headlight" />
          <circle cx="458" cy="46" r="5" fill="#fde68a" className="backend-loading-headlight" />
        </g>

        <g className="backend-semitrailer">
          <rect x="151" y="43" width="210" height="91" rx="6" fill="url(#trailerBody)" stroke="#64748b" strokeWidth="2" />
          <rect x="160" y="51" width="191" height="69" rx="3" fill="#334155" opacity="0.78" />
          <path d="M174 53v65M205 53v65M236 53v65M267 53v65M298 53v65M329 53v65" stroke="#475569" strokeWidth="2" opacity="0.6" />

          <rect x="145" y="50" width="29" height="78" rx="3" fill="#020617" stroke="#94a3b8" strokeWidth="2" />
          <path d="M151 58h17v62h-17z" fill="#0f172a" />
          <path d="M151 88h17" stroke="#334155" strokeWidth="2" />
          <rect x="139" y="126" width="43" height="8" rx="3" fill="#111827" />
          <rect x="143" y="133" width="36" height="5" rx="2" fill="#64748b" opacity="0.75" />

          <rect x="202" y="127" width="159" height="10" rx="4" fill="#020617" />
          <circle cx="275" cy="144" r="15" fill="#020617" stroke="#475569" strokeWidth="3" />
          <circle cx="311" cy="144" r="15" fill="#020617" stroke="#475569" strokeWidth="3" />
          <circle cx="275" cy="144" r="6" fill="#64748b" />
          <circle cx="311" cy="144" r="6" fill="#64748b" />

          <path d="M354 80h59l32 28v30h-91z" fill="url(#cabBody)" stroke="#64748b" strokeWidth="2" />
          <path d="M374 87h34l24 20h-58z" fill="#bae6fd" opacity="0.8" />
          <rect x="434" y="122" width="9" height="8" rx="2" fill="#fde68a" className="backend-loading-headlight" />
          <rect x="347" y="131" width="98" height="8" rx="3" fill="#111827" />
          <rect x="364" y="68" width="7" height="23" rx="3" fill="#475569" />
          <circle cx="391" cy="145" r="16" fill="#020617" stroke="#475569" strokeWidth="3" />
          <circle cx="391" cy="145" r="6" fill="#64748b" />
        </g>

        <g className="backend-forklift-trip">
          <g className="backend-forklift-crate">
            <rect x="94" y="108" width="35" height="32" rx="2" fill="#b77936" stroke="#f3c77c" strokeWidth="2" />
            <path d="M94 121h35M111.5 108v32M97 111l29 26M126 111l-29 26" stroke="#7c4a1f" strokeWidth="1.5" opacity="0.75" />
          </g>

          <g className="backend-forklift">
            <path d="M91 94h7v55h-7z" fill="#475569" />
            <path d="M92 139h39v5H92z" fill="#64748b" />
            <path d="M92 127h31v5H92z" fill="#64748b" />
            <path d="M31 113h49l14 20v17H31z" fill="url(#forkliftBody)" stroke="#92400e" strokeWidth="2" />
            <path d="M42 89h34v31H42z" fill="none" stroke="#94a3b8" strokeWidth="4" />
            <path d="M47 95h24" stroke="#64748b" strokeWidth="3" />
            <circle cx="46" cy="151" r="13" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="79" cy="151" r="11" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="46" cy="151" r="5" fill="#64748b" />
            <circle cx="79" cy="151" r="5" fill="#64748b" />
            <circle cx="59" cy="106" r="7" fill="#0f172a" />
            <path d="M56 113l-8 12h19l-6-12z" fill="#1e293b" />
            <rect x="80" y="119" width="7" height="7" rx="2" fill="#fef3c7" className="backend-forklift-light" />
          </g>
        </g>

        <g className="backend-loaded-crate">
          <rect x="157" y="91" width="35" height="32" rx="2" fill="#b77936" stroke="#f3c77c" strokeWidth="2" />
          <path d="M157 104h35M174.5 91v32M160 94l29 26M189 94l-29 26" stroke="#7c4a1f" strokeWidth="1.5" opacity="0.75" />
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
