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
      <svg className="backend-loading-scene" viewBox="0 0 520 220" focusable="false">
        <defs>
          <linearGradient id="yardSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#223047" />
            <stop offset="1" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="trailerBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#64748b" />
            <stop offset="1" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="cabBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="forkliftBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#ca8a04" />
          </linearGradient>
        </defs>

        <rect width="520" height="220" rx="20" fill="url(#yardSky)" />
        <rect y="169" width="520" height="51" fill="#0b1220" />
        <path d="M0 170h520" stroke="#475569" strokeWidth="2" opacity="0.55" />
        <path d="M16 195h72M128 195h72M240 195h72M352 195h72M464 195h36" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" opacity="0.15" />

        <g className="backend-yard-details" opacity="0.45">
          <rect x="24" y="30" width="7" height="139" fill="#334155" />
          <circle cx="27.5" cy="39" r="5" fill="#fde68a" className="backend-loading-headlight" />
          <rect x="489" y="35" width="7" height="134" fill="#334155" />
          <circle cx="492.5" cy="44" r="5" fill="#fde68a" className="backend-loading-headlight" />
        </g>

        <g className="backend-semitrailer">
          <g className="backend-trailer-body">
            <rect x="208" y="52" width="202" height="94" rx="5" fill="url(#trailerBody)" stroke="#94a3b8" strokeWidth="2" />
            <rect x="217" y="61" width="184" height="70" rx="2" fill="#475569" opacity="0.72" />
            <path d="M236 62v68M267 62v68M298 62v68M329 62v68M360 62v68M391 62v68" stroke="#64748b" strokeWidth="1.6" opacity="0.7" />
            <path d="M218 121h182" stroke="#f8fafc" strokeWidth="2" opacity="0.5" />
            <path d="M218 125h182" stroke="#ef4444" strokeWidth="2" opacity="0.48" />

            <rect x="197" y="57" width="22" height="83" rx="3" fill="#020617" stroke="#94a3b8" strokeWidth="2" />
            <rect x="202" y="64" width="12" height="68" rx="1" fill="#0f172a" />
            <path d="M208 64v68M202 98h12" stroke="#334155" strokeWidth="1.5" />
            <rect x="193" y="138" width="30" height="7" rx="2" fill="#111827" />
            <rect x="196" y="146" width="8" height="12" rx="1" fill="#1f2937" />
            <rect x="211" y="146" width="8" height="12" rx="1" fill="#1f2937" />

            <rect x="225" y="143" width="183" height="9" rx="4" fill="#111827" />
            <rect x="247" y="149" width="7" height="22" rx="2" fill="#64748b" />
            <rect x="242" y="168" width="17" height="4" rx="2" fill="#475569" />

            <circle cx="321" cy="161" r="16" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="357" cy="161" r="16" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="321" cy="161" r="6" fill="#64748b" />
            <circle cx="357" cy="161" r="6" fill="#64748b" />
            <rect x="306" y="172" width="66" height="4" rx="2" fill="#111827" />
          </g>

          <g className="backend-tractor">
            <rect x="407" y="145" width="93" height="9" rx="4" fill="#111827" />
            <path d="M411 142h26l10 5h-36z" fill="#020617" />
            <ellipse cx="424" cy="141" rx="15" ry="5" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
            <rect x="421" y="72" width="27" height="67" rx="5" fill="#075985" stroke="#64748b" strokeWidth="2" />
            <path d="M444 79h38l24 24v38h-62z" fill="url(#cabBody)" stroke="#94a3b8" strokeWidth="2" />
            <path d="M452 87h25l19 18h-44z" fill="#bae6fd" opacity="0.82" />
            <path d="M448 110h53" stroke="#0369a1" strokeWidth="2" />
            <rect x="500" y="127" width="6" height="8" rx="2" fill="#fde68a" className="backend-loading-headlight" />
            <rect x="427" y="60" width="6" height="26" rx="3" fill="#475569" />
            <path d="M430 59h10" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            <circle cx="451" cy="161" r="16" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="490" cy="161" r="16" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="451" cy="161" r="6" fill="#64748b" />
            <circle cx="490" cy="161" r="6" fill="#64748b" />
          </g>
        </g>

        <g className="backend-forklift-trip">
          <g className="backend-forklift-crate">
            <rect x="90" y="119" width="35" height="32" rx="2" fill="#a16207" stroke="#f1c27d" strokeWidth="2" />
            <path d="M90 132h35M107.5 119v32M93 122l29 26M122 122l-29 26" stroke="#713f12" strokeWidth="1.5" opacity="0.8" />
          </g>

          <g className="backend-forklift">
            <path d="M82 98h7v64h-7z" fill="#475569" />
            <path d="M86 148h39v5H86z" fill="#64748b" />
            <path d="M86 139h34v5H86z" fill="#64748b" />
            <path d="M18 120h50l17 22v20H18z" fill="url(#forkliftBody)" stroke="#854d0e" strokeWidth="2" />
            <path d="M29 91h37v37H29z" fill="none" stroke="#94a3b8" strokeWidth="4" />
            <path d="M34 98h27" stroke="#64748b" strokeWidth="3" />
            <path d="M28 115h40" stroke="#64748b" strokeWidth="3" />
            <circle cx="35" cy="164" r="14" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="72" cy="164" r="12" fill="#020617" stroke="#475569" strokeWidth="3" />
            <circle cx="35" cy="164" r="5" fill="#64748b" />
            <circle cx="72" cy="164" r="5" fill="#64748b" />
            <circle cx="50" cy="108" r="7" fill="#0f172a" />
            <path d="M47 115l-8 13h20l-6-13z" fill="#1e293b" />
            <rect x="74" y="126" width="7" height="7" rx="2" fill="#fef3c7" className="backend-forklift-light" />
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
        <LoadingDockAnimation />
        <span className="eyebrow">Preparando a viagem</span>
        <h2>Carregando, aguarde…</h2>
        <p key={messageIndex} className="backend-loading-message">{LOADING_MESSAGES[messageIndex]}</p>
      </div>
    </div>
  )
}

export { LOADING_MESSAGES, MESSAGE_INTERVAL_MS, SHOW_DELAY_MS }
