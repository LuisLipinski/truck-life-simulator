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

function Wheel({ cx, cy, r = 15 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#070b12" stroke="#475569" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r * 0.48} fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#334155" />
      <path d={`M${cx - r * 0.36} ${cy}h${r * 0.72}M${cx} ${cy - r * 0.36}v${r * 0.72}`} stroke="#64748b" strokeWidth="1.4" />
    </g>
  )
}

function LoadingDockAnimation() {
  return (
    <div className="backend-loading-stage" aria-hidden="true">
      <svg className="backend-loading-scene" viewBox="0 0 560 220" focusable="false">
        <defs>
          <linearGradient id="yardSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#26364b" />
            <stop offset="1" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="trailerPanel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8fafc" />
            <stop offset="0.58" stopColor="#dbe4ee" />
            <stop offset="1" stopColor="#b8c4d1" />
          </linearGradient>
          <linearGradient id="truckPaint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#dc2626" />
            <stop offset="0.55" stopColor="#b91c1c" />
            <stop offset="1" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="truckPaintDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#991b1b" />
            <stop offset="1" stopColor="#450a0a" />
          </linearGradient>
          <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#64748b" />
            <stop offset="0.5" stopColor="#f8fafc" />
            <stop offset="1" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="forkliftBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#facc15" />
            <stop offset="1" stopColor="#ca8a04" />
          </linearGradient>
          <filter id="vehicleShadow" x="-20%" y="-30%" width="150%" height="170%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#020617" floodOpacity="0.45" />
          </filter>
        </defs>

        <rect width="560" height="220" rx="20" fill="url(#yardSky)" />
        <rect y="170" width="560" height="50" fill="#0a101b" />
        <path d="M0 171h560" stroke="#64748b" strokeWidth="2" opacity="0.45" />
        <path d="M18 196h72M132 196h72M246 196h72M360 196h72M474 196h64" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" opacity="0.13" />

        <g opacity="0.4">
          <rect x="24" y="31" width="7" height="139" fill="#475569" />
          <circle cx="27.5" cy="40" r="5" fill="#fde68a" className="backend-loading-headlight" />
          <rect x="529" y="35" width="7" height="135" fill="#475569" />
          <circle cx="532.5" cy="44" r="5" fill="#fde68a" className="backend-loading-headlight" />
        </g>

        <g filter="url(#vehicleShadow)">
          <g className="backend-trailer-body">
            <rect x="205" y="48" width="204" height="96" rx="4" fill="url(#trailerPanel)" stroke="#94a3b8" strokeWidth="2" />
            <rect x="212" y="55" width="190" height="78" rx="2" fill="#eef2f7" stroke="#cbd5e1" />
            <path d="M239 56v76M270 56v76M301 56v76M332 56v76M363 56v76M394 56v76" stroke="#c5cfda" strokeWidth="1.25" />
            <rect x="213" y="119" width="188" height="5" rx="1" fill="#f8fafc" />
            <rect x="213" y="125" width="188" height="4" rx="1" fill="#dc2626" opacity="0.8" />
            <rect x="205" y="137" width="204" height="9" rx="2" fill="#334155" />

            <rect x="194" y="53" width="22" height="87" rx="3" fill="#060b14" stroke="#94a3b8" strokeWidth="2" />
            <rect x="199" y="60" width="12" height="72" rx="1" fill="#0f172a" />
            <path d="M205 60v72M199 96h12" stroke="#334155" strokeWidth="1.5" />
            <rect x="191" y="140" width="29" height="7" rx="2" fill="#111827" />
            <rect x="194" y="147" width="8" height="11" rx="1" fill="#334155" />
            <rect x="209" y="147" width="8" height="11" rx="1" fill="#334155" />

            <rect x="230" y="145" width="177" height="8" rx="3" fill="#1f2937" />
            <rect x="250" y="151" width="7" height="21" rx="2" fill="#64748b" />
            <rect x="245" y="170" width="18" height="4" rx="2" fill="#475569" />
            <Wheel cx="326" cy="162" r="16" />
            <Wheel cx="362" cy="162" r="16" />
            <rect x="310" y="174" width="69" height="4" rx="2" fill="#111827" />
          </g>

          <g className="backend-tractor">
            <rect x="397" y="146" width="153" height="9" rx="4" fill="#172033" />
            <rect x="401" y="153" width="120" height="5" rx="2" fill="#475569" />

            <ellipse cx="415" cy="143" rx="18" ry="5" fill="#0a0f18" stroke="#94a3b8" strokeWidth="2" />
            <path d="M404 140l11-5 12 5" stroke="#64748b" strokeWidth="2" fill="none" />
            <rect x="414" y="113" width="10" height="25" rx="2" fill="#475569" />

            <rect x="425" y="72" width="39" height="70" rx="7" fill="url(#truckPaintDark)" stroke="#991b1b" strokeWidth="2" />
            <path d="M433 79h23v30h-23z" fill="#1e293b" stroke="#475569" />
            <rect x="436" y="83" width="17" height="21" rx="2" fill="#b9d9e9" opacity="0.78" />
            <rect x="431" y="113" width="27" height="20" rx="3" fill="#7f1d1d" />
            <circle cx="444" cy="123" r="2" fill="#f8fafc" opacity="0.7" />

            <path d="M460 81h37l20 25v38h-57z" fill="url(#truckPaint)" stroke="#991b1b" strokeWidth="2" />
            <path d="M468 88h24l16 20h-40z" fill="#bfe3f4" stroke="#64748b" strokeWidth="1.5" opacity="0.92" />
            <path d="M468 113h39" stroke="#7f1d1d" strokeWidth="2" />
            <rect x="467" y="118" width="27" height="16" rx="2" fill="#991b1b" opacity="0.8" />
            <circle cx="492" cy="121" r="2" fill="#f8fafc" opacity="0.75" />

            <path d="M509 111h30l14 10v24h-44z" fill="url(#truckPaint)" stroke="#991b1b" strokeWidth="2" />
            <path d="M510 116h32l8 6h-40z" fill="#7f1d1d" opacity="0.7" />
            <rect x="517" y="124" width="29" height="4" rx="2" fill="url(#chrome)" />
            <path d="M519 133h24M519 137h24" stroke="#450a0a" strokeWidth="2" />
            <rect x="547" y="131" width="6" height="8" rx="2" fill="#fde68a" className="backend-loading-headlight" />
            <rect x="548" y="142" width="8" height="6" rx="2" fill="url(#chrome)" />

            <rect x="433" y="136" width="68" height="10" rx="4" fill="#111827" />
            <rect x="445" y="144" width="47" height="9" rx="4" fill="url(#chrome)" />
            <rect x="449" y="147" width="39" height="4" rx="2" fill="#64748b" />

            <rect x="431" y="55" width="5" height="30" rx="2" fill="url(#chrome)" />
            <path d="M433.5 54h9" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
            <rect x="458" y="54" width="5" height="28" rx="2" fill="url(#chrome)" />
            <path d="M460.5 53h9" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />

            <path d="M465 91l-11-8M499 92l12-8" stroke="#94a3b8" strokeWidth="2" />
            <rect x="449" y="79" width="7" height="4" rx="2" fill="#111827" />
            <rect x="509" y="80" width="7" height="4" rx="2" fill="#111827" />

            <Wheel cx="424" cy="163" r="16" />
            <Wheel cx="457" cy="163" r="16" />
            <Wheel cx="526" cy="163" r="17" />
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
            <Wheel cx="35" cy="164" r="14" />
            <Wheel cx="72" cy="164" r="12" />
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
