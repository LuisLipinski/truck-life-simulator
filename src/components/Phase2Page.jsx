import { useEffect, useState } from 'react'
import { vehicleApi } from '../lib/vehicleApi.js'
import { useGame } from './GameContext.jsx'

function money(value, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(Number(value || 0))
  } catch {
    return `${currency || ''} ${Number(value || 0).toFixed(2)}`.trim()
  }
}

export default function Phase2Page({ career, onBack }) {
  const game = useGame()
  const [vehicles, setVehicles] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!career?.serverBacked || !career?.serverCareerId) {
      setStatus('error')
      setError(new Error('A Fase 2 exige uma carreira conectada ao servidor.'))
      return undefined
    }

    const controller = new AbortController()
    setStatus('loading')
    setError(null)

    vehicleApi.list(game.id, career.serverCareerId, { signal: controller.signal })
      .then((items) => {
        setVehicles(Array.isArray(items) ? items : [])
        setStatus('ready')
      })
      .catch((nextError) => {
        if (nextError?.name === 'AbortError') return
        setError(nextError)
        setStatus('error')
      })

    return () => controller.abort()
  }, [career?.serverBacked, career?.serverCareerId, game.id])

  const activeVehicle = vehicles.find((item) => item.status === 'ACTIVE') || vehicles[0] || null
  const unlocked = Number(career?.currentPhase || 1) >= 2 && Boolean(activeVehicle)

  if (!unlocked && status !== 'loading') {
    return (
      <main className="page-shell form-shell">
        <button className="back-link" type="button" onClick={onBack}>← Voltar para fases</button>
        <div className="empty-state">
          <h2>Fase 2 ainda bloqueada</h2>
          <p>Adquira o primeiro caminhão próprio, à vista ou financiado, para desbloquear esta etapa.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page-shell wide-shell">
      <button className="back-link" type="button" onClick={onBack}>← Voltar para fases</button>

      <section className="page-heading centered">
        <span className="eyebrow">Fase 2 • {game.shortName}</span>
        <h1>Caminhão próprio</h1>
        <p>A aquisição do primeiro caminhão encerrou a etapa de motorista empregado e liberou a evolução para operação como agregado.</p>
      </section>

      {status === 'loading' && (
        <section className="panel"><p>Carregando o caminhão da carreira…</p></section>
      )}

      {status === 'error' && (
        <section className="panel server-cutover-guard" role="alert">
          <h2>Não foi possível carregar o caminhão</h2>
          <p>{error?.message || 'Tente novamente.'}</p>
        </section>
      )}

      {status === 'ready' && activeVehicle && (
        <>
          <section className="phase1-status-grid finance-summary-grid">
            <article className="panel phase1-metric">
              <span className="metric-label">Caminhão</span>
              <strong className="metric-value">{activeVehicle.make} {activeVehicle.model}</strong>
              <span className="metric-detail">{activeVehicle.modelYear || 'Ano não informado'}</span>
            </article>
            <article className="panel phase1-metric">
              <span className="metric-label">Aquisição</span>
              <strong className="metric-value">{activeVehicle.acquisitionType === 'FINANCED' ? 'Financiado' : 'À vista'}</strong>
              <span className="metric-detail">
                {activeVehicle.vehicleCondition === 'USED' ? 'Usado' : activeVehicle.vehicleCondition === 'NEW' ? 'Novo' : 'Condição não informada'}
                {' · '}
                {game.id === 'ets2' ? activeVehicle.purchaseCountryCode : activeVehicle.purchaseStateCode}
              </span>
            </article>
            <article className="panel phase1-metric">
              <span className="metric-label">Odômetro inicial</span>
              <strong className="metric-value">{Number(activeVehicle.initialOdometer || 0).toLocaleString('pt-BR')}</strong>
              <span className="metric-detail">{game.distanceUnit}</span>
            </article>
            <article className="panel phase1-metric">
              <span className="metric-label">Entrada na Fase 2</span>
              <strong className="metric-value">Semana {activeVehicle.acquiredOperationalWeek}</strong>
              <span className="metric-detail">
                {game.id === 'ets2' && activeVehicle.acquiredPayrollMonth
                  ? `Mês operacional ${activeVehicle.acquiredPayrollMonth}`
                  : 'Progressão operacional'}
              </span>
            </article>
          </section>

          <section className="panel finance-card">
            <div className="section-heading compact-heading">
              <span className="eyebrow">Fase 2 desbloqueada</span>
              <h2>Seu primeiro caminhão agora é um ativo da carreira</h2>
              <p>O Truck Life registra propriedade, forma de aquisição e vínculo com o financiamento quando houver. A quilometragem oficial da carreira continua independente do odômetro bruto do caminhão.</p>
            </div>
            {activeVehicle.financingContractId && (
              <div className="notice-box">
                <strong>Financiamento vinculado</strong>
                <span>As parcelas continuam sendo administradas em Empréstimos e Financiamentos e estão associadas a este caminhão.</span>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-heading compact-heading">
              <span className="eyebrow">Próximas evoluções da Fase 2</span>
              <h2>Operação como agregado</h2>
              <p>Mercado de contratos, combustível, manutenção, seguro e rentabilidade ainda permanecem no Discovery e serão implementados em fatias próprias. O desbloqueio da fase não inventa esses sistemas antes de suas regras estarem fechadas.</p>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
