import { useEffect, useRef, useState } from 'react'
import { careerApi } from '../lib/careerApi.js'
import { setServerCareerSnapshot } from '../lib/careerServerState.js'
import { phase2Api } from '../lib/phase2Api.js'
import { CAREER_UPDATED_EVENT } from '../lib/storage.js'
import { vehicleApi } from '../lib/vehicleApi.js'
import { useGame } from './GameContext.jsx'
import { useToast } from './ToastProvider.jsx'

const DAY_OPTIONS = [
  ['MONDAY', 'Segunda-feira'],
  ['TUESDAY', 'Terça-feira'],
  ['WEDNESDAY', 'Quarta-feira'],
  ['THURSDAY', 'Quinta-feira'],
  ['FRIDAY', 'Sexta-feira'],
  ['SATURDAY', 'Sábado'],
  ['SUNDAY', 'Domingo'],
]

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

function operationId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function jurisdictionName(game, countryCode, stateCode) {
  const code = game.id === 'ets2' ? countryCode : stateCode
  const options = game.id === 'ets2' ? (game.countryOptions || []) : (game.stateOptions || [])
  return options.find((item) => item.code === code)?.name || code || 'Não informada'
}

export default function Phase2Page({ career, onBack }) {
  const game = useGame()
  const toast = useToast()
  const transitionOperation = useRef(null)
  const [vehicles, setVehicles] = useState([])
  const [transition, setTransition] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [affiliation, setAffiliation] = useState('CURRENT_COMPANY')
  const [carrierName, setCarrierName] = useState('')
  const [carrierLocation, setCarrierLocation] = useState('')
  const [effectiveDay, setEffectiveDay] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [transitionError, setTransitionError] = useState(null)

  useEffect(() => {
    if (!career?.serverBacked || !career?.serverCareerId) {
      setStatus('error')
      setError(new Error('A Fase 2 exige uma carreira conectada ao servidor.'))
      return undefined
    }

    const controller = new AbortController()
    let active = true
    setStatus('loading')
    setError(null)

    ;(async () => {
      try {
        const vehicleItems = await vehicleApi.list(game.id, career.serverCareerId, { signal: controller.signal })
        if (!active) return
        const nextVehicles = Array.isArray(vehicleItems) ? vehicleItems : []
        setVehicles(nextVehicles)

        const activeVehicle = nextVehicles.find((item) => item.status === 'ACTIVE') || nextVehicles[0] || null
        const unlocked = Number(career?.currentPhase || 1) >= 2 && Boolean(activeVehicle)
        if (!unlocked) {
          setTransition(null)
          setStatus('ready')
          return
        }

        const nextTransition = await phase2Api.transition(game.id, career.serverCareerId, { signal: controller.signal })
        if (!active) return
        setTransition(nextTransition)
        setStatus('ready')
      } catch (nextError) {
        if (!active || nextError?.name === 'AbortError') return
        setError(nextError)
        setStatus('error')
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [career?.serverBacked, career?.serverCareerId, career?.currentPhase, game.id])

  useEffect(() => {
    if (transition?.status !== 'PENDING') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [transition?.status])

  const activeVehicle = vehicles.find((item) => item.status === 'ACTIVE') || vehicles[0] || null
  const unlocked = Number(career?.currentPhase || 1) >= 2 && Boolean(activeVehicle)
  const locationOptions = game.id === 'ets2' ? (game.countryOptions || []) : (game.stateOptions || [])
  const carrier = transition?.carrierContract || null

  async function completeTransition(event) {
    event.preventDefault()
    setTransitionError(null)

    if (!effectiveDay) {
      setTransitionError('Selecione o dia da semana em que a mudança passa a valer.')
      return
    }
    if (affiliation === 'OTHER_COMPANY' && !carrierName.trim()) {
      setTransitionError('Informe o nome da nova transportadora.')
      return
    }
    if (affiliation === 'OTHER_COMPANY' && !carrierLocation) {
      setTransitionError(`Selecione o ${game.id === 'ets2' ? 'país' : 'estado'} da nova transportadora.`)
      return
    }

    transitionOperation.current ||= operationId()
    setSubmitting(true)
    try {
      const next = await phase2Api.completeTransition(game.id, career.serverCareerId, {
        operationId: transitionOperation.current,
        affiliation,
        ...(affiliation === 'OTHER_COMPANY' ? { carrierName: carrierName.trim() } : {}),
        ...(affiliation === 'OTHER_COMPANY' && game.id === 'ets2'
          ? { carrierCountryCode: carrierLocation }
          : {}),
        ...(affiliation === 'OTHER_COMPANY' && game.id === 'ats'
          ? { carrierStateCode: carrierLocation }
          : {}),
        effectiveDay,
        expectedBalance: Number(transition.currentBalance || 0).toFixed(2),
      })

      transitionOperation.current = null
      setTransition(next)
      const refreshed = await careerApi.get(game.id, career.serverCareerId)
      setServerCareerSnapshot(game.id, career.id, refreshed)
      window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
        detail: { careerId: career.id, gameId: game.id, source: 'phase2-transition' },
      }))
      toast.success('Transição para a Fase 2 concluída.', { title: 'Agora você é agregado' })
    } catch (nextError) {
      setTransitionError(nextError?.message || 'Não foi possível concluir a transição para a Fase 2.')
    } finally {
      setSubmitting(false)
    }
  }

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
        <p>A aquisição do primeiro caminhão encerra a etapa de motorista empregado e inicia sua operação como agregado.</p>
      </section>

      {status === 'loading' && (
        <section className="panel"><p>Preparando sua transição para a Fase 2…</p></section>
      )}

      {status === 'error' && (
        <section className="panel server-cutover-guard" role="alert">
          <h2>Não foi possível preparar a Fase 2</h2>
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

          {carrier && (
            <section className="panel finance-card">
              <div className="section-heading compact-heading">
                <span className="eyebrow">Contrato de agregado</span>
                <h2>{carrier.carrierName}</h2>
                <p>
                  Jurisdição do contrato: {jurisdictionName(game, carrier.jurisdictionCountryCode, carrier.jurisdictionStateCode)}.
                  {' '}Essa jurisdição fica associada à política de remuneração dos fretes da Fase 2.
                </p>
              </div>
              <div className="breakdown-list">
                <div><span>Vínculo</span><strong>{carrier.affiliationOrigin === 'CURRENT_COMPANY' ? 'Mesma transportadora' : 'Nova transportadora'}</strong></div>
                <div><span>Início</span><strong>Semana {carrier.startedOperationalWeek} · {DAY_OPTIONS.find(([code]) => code === carrier.startedEffectiveDay)?.[1] || carrier.startedEffectiveDay}</strong></div>
                <div><span>Regra de remuneração</span><strong>{carrier.compensationRuleKey}</strong></div>
                <div><span>Status da política</span><strong>Jurisdição definida</strong></div>
              </div>
              <div className="notice-box">
                <strong>Valor por frete</strong>
                <span>A jurisdição já está congelada no contrato. A tarifa comercial por milha/km ou percentual do frete será calculada pela política de contratos da Fase 2, sem tratar uma tarifa comercial como se fosse valor legal obrigatório.</span>
              </div>
            </section>
          )}

          <section className="panel finance-card">
            <div className="section-heading compact-heading">
              <span className="eyebrow">Seu caminhão</span>
              <h2>{activeVehicle.make} {activeVehicle.model}</h2>
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
              <p>O primeiro vínculo agregado já fica registrado. Mercado de propostas, combustível, manutenção, seguro e cálculo efetivo da receita por viagem continuam em fatias próprias do Discovery.</p>
            </div>
          </section>
        </>
      )}

      {status === 'ready' && transition?.status === 'PENDING' && (
        <div className="react-confirm-backdrop phase2-transition-backdrop">
          <section
            className="react-confirm-modal react-confirm-success phase2-transition-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="phase2-transition-title"
          >
            <div className="phase2-transition-heading">
              <div className="react-confirm-icon" aria-hidden="true">2</div>
              <div className="react-confirm-copy">
                <span className="eyebrow">Nova etapa da carreira</span>
                <h2 id="phase2-transition-title">Você chegou à Fase 2</h2>
                <p>Seu primeiro caminhão próprio foi adquirido. Antes de continuar, precisamos encerrar seu vínculo como funcionário e definir com qual transportadora você trabalhará como agregado.</p>
              </div>
            </div>

            <div className="phase2-transition-settlement">
              <div className="section-heading compact-heading">
                <span className="eyebrow">Encerramento da Fase 1</span>
                <h3>Rescisão com {transition.previousCompanyName}</h3>
              </div>
              <div className="breakdown-list">
                <div>
                  <span>Jurisdição do vínculo</span>
                  <strong>{jurisdictionName(game, transition.terminationCountryCode, transition.terminationStateCode)}</strong>
                </div>
                <div>
                  <span>Acerto legal da transição</span>
                  <strong>{money(transition.statutorySettlementAmount, transition.displayCurrency)}</strong>
                </div>
                <div>
                  <span>Semana operacional</span>
                  <strong>{transition.terminationOperationalWeek}</strong>
                </div>
              </div>
              <div className="notice-box">
                <strong>Regra aplicada</strong>
                <span>{transition.policySummary}</span>
                <span>Holerites e salários normais permanecem separados deste acerto para não serem pagos duas vezes.</span>
                {transition.policySource && (
                  <a href={transition.policySource} target="_blank" rel="noreferrer">Ver fonte da regra</a>
                )}
              </div>
            </div>

            <form className="phase2-transition-form" onSubmit={completeTransition}>
              <div className="section-heading compact-heading">
                <span className="eyebrow">Seu primeiro vínculo como agregado</span>
                <h3>Escolha a transportadora</h3>
              </div>

              <div className="inline-form-grid">
                <div>
                  <label>Como deseja continuar?</label>
                  <select
                    value={affiliation}
                    onChange={(event) => {
                      setAffiliation(event.target.value)
                      setCarrierName('')
                      setCarrierLocation('')
                      setTransitionError(null)
                    }}
                    disabled={submitting}
                  >
                    <option value="CURRENT_COMPANY">Continuar agregado à empresa atual</option>
                    <option value="OTHER_COMPANY">Ficar agregado a outra empresa</option>
                  </select>
                </div>

                {affiliation === 'CURRENT_COMPANY' ? (
                  <div>
                    <label>Transportadora</label>
                    <input value={transition.previousCompanyName} readOnly aria-readonly="true" />
                    <small>
                      Jurisdição: {jurisdictionName(
                        game,
                        game.id === 'ets2' ? career.countryCode : 'US',
                        game.id === 'ats' ? career.stateCode : null,
                      )}
                    </small>
                  </div>
                ) : (
                  <>
                    <div>
                      <label>Nome da nova transportadora</label>
                      <input
                        value={carrierName}
                        onChange={(event) => setCarrierName(event.target.value)}
                        maxLength={160}
                        placeholder={game.companyPlaceholder || 'Nome da transportadora'}
                        disabled={submitting}
                        required
                      />
                    </div>
                    <div>
                      <label>{game.id === 'ets2' ? 'País da transportadora' : 'Estado da transportadora'}</label>
                      <select
                        value={carrierLocation}
                        onChange={(event) => setCarrierLocation(event.target.value)}
                        disabled={submitting}
                        required
                      >
                        <option value="">Selecione o {game.id === 'ets2' ? 'país' : 'estado'}</option>
                        {locationOptions.map((location) => (
                          <option value={location.code} key={location.code}>
                            {game.id === 'ets2' && location.flag ? `${location.flag} ` : ''}{location.name}
                          </option>
                        ))}
                      </select>
                      <small>Essa jurisdição será usada como referência do contrato e da futura regra de pagamento por frete.</small>
                    </div>
                  </>
                )}

                <div>
                  <label>Dia efetivo da transição</label>
                  <select
                    value={effectiveDay}
                    onChange={(event) => setEffectiveDay(event.target.value)}
                    disabled={submitting}
                    required
                  >
                    <option value="">Selecione o dia</option>
                    {DAY_OPTIONS.map(([code, label]) => (
                      <option value={code} key={code}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {transitionError && <div className="inline-error" role="alert">{transitionError}</div>}

              <div className="react-confirm-actions phase2-transition-actions">
                <button className="button success react-confirm-confirm" type="submit" disabled={submitting}>
                  {submitting ? 'Concluindo transição…' : 'Continuar para a Fase 2'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
