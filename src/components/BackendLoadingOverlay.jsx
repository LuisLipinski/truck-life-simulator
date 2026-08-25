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
  'Aguardando a liberação da carga…',
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

function LoadingAnimation() {
  return (
    <div className="backend-loading-stage" aria-hidden="true">
      <img
        className="backend-loading-gif"
        src={`${import.meta.env.BASE_URL}loading/truck-loading.gif`}
        alt=""
        draggable="false"
      />
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
        <LoadingAnimation />
        <span className="eyebrow">Preparando a viagem</span>
        <h2>Carregando, aguarde…</h2>
        <p key={messageIndex} className="backend-loading-message">{LOADING_MESSAGES[messageIndex]}</p>
      </div>
    </div>
  )
}

export { LOADING_MESSAGES, MESSAGE_INTERVAL_MS, SHOW_DELAY_MS }
