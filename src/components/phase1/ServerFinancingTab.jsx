import { useEffect, useMemo, useRef, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { financingApi } from '../../lib/financingApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

const PRODUCT_LABEL = {
  PERSONAL_LOAN: 'Empréstimo pessoal',
  VEHICLE_FINANCING: 'Financiamento de veículo',
}

const STATUS_LABEL = {
  ACTIVE: 'Ativo',
  DELINQUENT: 'Em atraso',
  DEFAULTED: 'Inadimplente',
  PAID_OFF: 'Quitado',
}

const FREQUENCY_LABEL = {
  WEEKLY: 'semanal',
  BIWEEKLY: 'a cada 2 semanas',
  MONTHLY: 'mensal',
}

const INSTALLMENT_STATUS = {
  SCHEDULED: 'Agendada',
  PARTIALLY_PAID: 'Parcialmente paga',
  PAID: 'Paga',
  OVERDUE: 'Vencida',
  SUPERSEDED: 'Substituída',
}

function operationId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function parseAmount(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null
  const number = Number(text.replace(',', '.'))
  if (!Number.isFinite(number) || number <= 0) return null
  return number.toFixed(2)
}

function money(value, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0))
  } catch {
    return `${currency || ''} ${Number(value || 0).toFixed(2)}`.trim()
  }
}

function percentage(value) {
  if (value == null || value === '') return '—'
  return `${(Number(value) * 100).toFixed(2).replace('.', ',')}%`
}

function installmentOutstanding(installment) {
  return Math.max(0, Number(installment?.scheduledAmount || 0) - Number(installment?.paidAmount || 0))
}

function currentSchedule(contract) {
  const version = Number(contract?.currentScheduleVersion || 1)
  return (contract?.installments || [])
    .filter((item) => Number(item.scheduleVersion) === version && item.status !== 'SUPERSEDED')
    .sort((a, b) => Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0))
}

function isDue(installment, context, gameId) {
  if (gameId === 'ets2') {
    return installment.duePayrollMonth != null && Number(installment.duePayrollMonth) <= Number(context.currentPayrollMonth || 1)
  }
  return installment.dueOperationalWeek != null && Number(installment.dueOperationalWeek) <= Number(context.currentOperationalWeek || 1)
}

function dueAmount(contract, context, gameId) {
  return currentSchedule(contract)
    .filter((item) => ['SCHEDULED', 'PARTIALLY_PAID', 'OVERDUE'].includes(item.status) && isDue(item, context, gameId))
    .reduce((total, item) => total + installmentOutstanding(item), 0)
}

function nextInstallment(contract) {
  return currentSchedule(contract).find((item) => ['SCHEDULED', 'PARTIALLY_PAID', 'OVERDUE'].includes(item.status)) || null
}

function dueLabel(installment, gameId) {
  if (!installment) return 'Sem parcelas pendentes'
  return gameId === 'ets2'
    ? `Mês operacional ${installment.duePayrollMonth}`
    : `Semana operacional ${installment.dueOperationalWeek}`
}

function jurisdictionLabel(offer, gameId) {
  if (gameId === 'ats') return `${offer.jurisdictionCity || 'Sede'} · ${offer.jurisdictionStateCode || 'EUA'}`
  return `${offer.jurisdictionCity || 'Sede'} · ${offer.jurisdictionCountryCode || 'ETS2'}`
}

export default function ServerFinancingTab({ career }) {
  const game = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const operationIds = useRef({})

  const [careerContext, setCareerContext] = useState(() => ({
    currentOperationalWeek: Number(career.currentOperationalWeek || 1),
    currentPayrollMonth: career.currentPayrollMonth == null ? null : Number(career.currentPayrollMonth),
    balance: Number(career.currentBalance ?? career.balance ?? 0),
    displayCurrency: career.displayCurrency || career.currency || (game.id === 'ets2' ? 'EUR' : 'USD'),
  }))
  const [productType, setProductType] = useState('PERSONAL_LOAN')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [offers, setOffers] = useState([])
  const [contracts, setContracts] = useState([])
  const [extraPrincipal, setExtraPrincipal] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [contractsError, setContractsError] = useState(null)
  const [mutation, setMutation] = useState(null)

  const currency = offers[0]?.displayCurrency || contracts[0]?.displayCurrency || careerContext.displayCurrency
  const activeContracts = useMemo(() => contracts.filter((item) => item.status !== 'PAID_OFF'), [contracts])
  const closedContracts = useMemo(() => contracts.filter((item) => item.status === 'PAID_OFF'), [contracts])

  function contextPayload() {
    return {
      expectedOperationalWeek: Number(careerContext.currentOperationalWeek || 1),
      ...(game.id === 'ets2' ? { expectedPayrollMonth: Number(careerContext.currentPayrollMonth || 1) } : {}),
      expectedBalance: Number(careerContext.balance || 0).toFixed(2),
    }
  }

  function idFor(key) {
    operationIds.current[key] ||= operationId()
    return operationIds.current[key]
  }

  function confirmOperation(key) {
    delete operationIds.current[key]
  }

  function notifyCareerUpdated() {
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
      detail: { careerId: career.id, gameId: game.id, source: 'server-financing' },
    }))
  }

  async function refreshCareer() {
    const next = await careerApi.get(game.id, career.serverCareerId)
    setServerCareerSnapshot(game.id, career.id, next)
    setCareerContext({
      currentOperationalWeek: Number(next.currentOperationalWeek || 1),
      currentPayrollMonth: next.currentPayrollMonth == null ? null : Number(next.currentPayrollMonth),
      balance: Number(next.balance || 0),
      displayCurrency: next.displayCurrency || currency,
    })
    notifyCareerUpdated()
    return next
  }

  async function loadContracts({ quiet = false } = {}) {
    if (!quiet) setLoadingContracts(true)
    setContractsError(null)
    try {
      const next = await financingApi.listContracts(game.id, career.serverCareerId)
      setContracts(Array.isArray(next) ? next : [])
      return next
    } catch (error) {
      setContractsError(error)
      throw error
    } finally {
      if (!quiet) setLoadingContracts(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoadingContracts(true)
    financingApi.listContracts(game.id, career.serverCareerId)
      .then((next) => { if (active) setContracts(Array.isArray(next) ? next : []) })
      .catch((error) => { if (active) setContractsError(error) })
      .finally(() => { if (active) setLoadingContracts(false) })
    return () => { active = false }
  }, [career.serverCareerId, game.id])

  async function searchOffers(event) {
    event.preventDefault()
    const amount = parseAmount(requestedAmount)
    if (!amount) {
      toast.error('Informe um valor válido maior que zero, com no máximo duas casas decimais.')
      return
    }
    setLoadingOffers(true)
    try {
      const next = await financingApi.offers(game.id, career.serverCareerId, productType, amount)
      setOffers(Array.isArray(next) ? next : [])
      if (!next?.length) toast.info('Nenhuma oferta foi disponibilizada para esse valor e jurisdição.')
    } catch (error) {
      setOffers([])
      toast.error(error?.message || 'Não foi possível calcular as ofertas para esta jurisdição.')
    } finally {
      setLoadingOffers(false)
    }
  }

  async function createContract(offer) {
    const accepted = await confirm({
      title: `Contratar ${PRODUCT_LABEL[offer.productType]?.toLowerCase() || 'crédito'}?`,
      message: `${money(offer.requestedAmount, offer.displayCurrency)} em ${offer.termPeriods} parcelas ${FREQUENCY_LABEL[offer.paymentFrequency] || ''}. Taxa anual: ${percentage(offer.annualInterestRate)}. Custo total previsto: ${money(offer.expectedTotalCost, offer.displayCurrency)}.`,
      confirmLabel: 'Contratar',
      tone: 'warning',
    })
    if (!accepted) return

    const key = `create:${offer.policyVersion}:${offer.productType}:${offer.termPeriods}:${offer.requestedAmount}`
    setMutation(key)
    try {
      await financingApi.createContract(game.id, career.serverCareerId, {
        operationId: idFor(key),
        productType: offer.productType,
        requestedAmount: Number(offer.requestedAmount).toFixed(2),
        termPeriods: Number(offer.termPeriods),
        ...contextPayload(),
      })
      confirmOperation(key)
      setOffers([])
      setRequestedAmount('')
      await Promise.all([loadContracts({ quiet: true }), refreshCareer()])
      toast.success('Contrato financeiro criado no servidor.')
    } catch (error) {
      toast.error(error?.message || 'Não foi possível contratar esta oferta.')
    } finally {
      setMutation(null)
    }
  }

  async function applyPayment(contract, paymentType, rawAmount = null) {
    const key = `payment:${contract.id}:${paymentType}`
    const amount = rawAmount == null ? null : parseAmount(rawAmount)
    if (rawAmount != null && !amount) {
      toast.error('Informe um valor válido para o pagamento.')
      return
    }

    const regularDue = dueAmount(contract, careerContext, game.id)
    if (paymentType === 'REGULAR' && regularDue <= 0) {
      toast.info('Não há parcela vencida ou exigível neste período operacional.')
      return
    }

    const label = paymentType === 'PAYOFF'
      ? 'Quitar contrato'
      : paymentType === 'EXTRA_PRINCIPAL'
        ? 'Amortizar principal'
        : 'Pagar parcela'

    const message = paymentType === 'PAYOFF'
      ? `O backend calculará o valor exato para liquidar o saldo devedor de ${money(contract.remainingPrincipal, contract.displayCurrency)}, preservando apenas juros/encargos já vencidos.`
      : paymentType === 'EXTRA_PRINCIPAL'
        ? `${money(amount, contract.displayCurrency)} serão aplicados diretamente no principal e o cronograma futuro será recalculado pelo servidor.`
        : `${money(regularDue, contract.displayCurrency)} serão usados para quitar as parcelas exigíveis neste período.`

    const accepted = await confirm({ title: `${label}?`, message, confirmLabel: label, tone: 'warning' })
    if (!accepted) return

    setMutation(key)
    try {
      const body = {
        operationId: idFor(key),
        paymentType,
        ...contextPayload(),
        ...(paymentType === 'REGULAR' ? { amount: regularDue.toFixed(2) } : {}),
        ...(paymentType === 'EXTRA_PRINCIPAL' ? { amount } : {}),
      }
      await financingApi.pay(game.id, career.serverCareerId, contract.id, body)
      confirmOperation(key)
      if (paymentType === 'EXTRA_PRINCIPAL') {
        setExtraPrincipal((current) => ({ ...current, [contract.id]: '' }))
      }
      await Promise.all([loadContracts({ quiet: true }), refreshCareer()])
      toast.success(paymentType === 'PAYOFF' ? 'Contrato quitado no servidor.' : 'Pagamento registrado no servidor.')
    } catch (error) {
      toast.error(error?.message || 'O pagamento não pôde ser concluído.')
    } finally {
      setMutation(null)
    }
  }

  function renderOffer(offer) {
    const busy = Boolean(mutation)
    return (
      <article className="panel finance-card" key={`${offer.productType}-${offer.termPeriods}`}>
        <div className="section-heading compact-heading">
          <span className="eyebrow">{PRODUCT_LABEL[offer.productType]}</span>
          <h2>{offer.termPeriods} parcelas · {FREQUENCY_LABEL[offer.paymentFrequency] || offer.paymentFrequency}</h2>
          <p>{jurisdictionLabel(offer, game.id)}</p>
        </div>
        <div className="breakdown-list">
          <div><span>Valor solicitado</span><strong>{money(offer.requestedAmount, offer.displayCurrency)}</strong></div>
          <div><span>Entrada</span><strong>{money(offer.downPayment, offer.displayCurrency)}{Number(offer.downPaymentRate || 0) > 0 ? ` · ${percentage(offer.downPaymentRate)}` : ''}</strong></div>
          <div><span>Principal financiado</span><strong>{money(offer.principal, offer.displayCurrency)}</strong></div>
          <div><span>Taxa anual</span><strong>{percentage(offer.annualInterestRate)}</strong></div>
          {offer.legalAprCap != null && <div><span>Teto local pesquisado</span><strong>{percentage(offer.legalAprCap)}</strong></div>}
          <div><span>Parcela inicial</span><strong>{money(offer.installmentAmount, offer.displayCurrency)}</strong></div>
          <div className="breakdown-total"><span>Custo total previsto</span><strong>{money(offer.expectedTotalCost, offer.displayCurrency)}</strong></div>
        </div>
        <div className="notice-box">
          <strong>Regra da jurisdição</strong>
          <span>{offer.jurisdictionRuleSummary}</span>
          <span>{offer.prepaymentRuleSummary}</span>
          <span>{offer.latePaymentRuleSummary}</span>
        </div>
        <div className="finance-source-links">
          <a href={offer.policySource} target="_blank" rel="noreferrer">Fonte da taxa de mercado</a>
          {offer.jurisdictionRuleSource && <a href={offer.jurisdictionRuleSource} target="_blank" rel="noreferrer">Fonte da regra local</a>}
        </div>
        <button className="button primary full-button" disabled={busy} onClick={() => createContract(offer)}>Contratar esta oferta</button>
      </article>
    )
  }

  function renderContract(contract) {
    const schedule = currentSchedule(contract)
    const next = nextInstallment(contract)
    const due = dueAmount(contract, careerContext, game.id)
    const extra = extraPrincipal[contract.id] || ''
    const isClosed = contract.status === 'PAID_OFF' || contract.status === 'DEFAULTED'
    const busy = Boolean(mutation)

    return (
      <article className="panel finance-card" key={contract.id}>
        <div className="section-heading compact-heading">
          <span className="eyebrow">{PRODUCT_LABEL[contract.productType] || contract.productType} · {STATUS_LABEL[contract.status] || contract.status}</span>
          <h2>{money(contract.remainingPrincipal, contract.displayCurrency)} de principal restante</h2>
          <p>{contract.jurisdictionCity} · taxa congelada em {percentage(contract.annualInterestRate)}</p>
        </div>
        <div className="breakdown-list">
          <div><span>Valor contratado</span><strong>{money(contract.requestedAmount, contract.displayCurrency)}</strong></div>
          <div><span>Entrada</span><strong>{money(contract.downPayment, contract.displayCurrency)}</strong></div>
          <div><span>Parcelas</span><strong>{contract.termPeriods} · {FREQUENCY_LABEL[contract.paymentFrequency] || contract.paymentFrequency}</strong></div>
          <div><span>Próxima parcela</span><strong>{next ? `${money(installmentOutstanding(next), contract.displayCurrency)} · ${dueLabel(next, game.id)}` : 'Nenhuma'}</strong></div>
          <div><span>Exigível agora</span><strong>{money(due, contract.displayCurrency)}</strong></div>
          <div><span>Custo total previsto na origem</span><strong>{money(contract.expectedTotalCost, contract.displayCurrency)}</strong></div>
        </div>

        {!isClosed && <>
          <div className="notice-box">
            <strong>Pagamento automático</strong>
            <span>Quando houver saldo, o backend tenta cobrar parcelas exigíveis no fechamento financeiro correspondente. Você também pode pagar manualmente abaixo.</span>
          </div>
          <div className="finance-contract-actions">
            <button className="button secondary" disabled={busy || due <= 0} onClick={() => applyPayment(contract, 'REGULAR')}>Pagar parcela exigível</button>
            <div className="reserve-inline-action">
              <input
                value={extra}
                onChange={(event) => setExtraPrincipal((current) => ({ ...current, [contract.id]: event.target.value }))}
                inputMode="decimal"
                placeholder="Amortização extra"
                disabled={busy}
              />
              <button className="button secondary" disabled={busy} onClick={() => applyPayment(contract, 'EXTRA_PRINCIPAL', extra)}>Amortizar principal</button>
            </div>
            <button className="button primary" disabled={busy} onClick={() => applyPayment(contract, 'PAYOFF')}>Quitar contrato</button>
          </div>
        </>}

        <button className="button secondary compact" type="button" onClick={() => setExpanded(expanded === contract.id ? null : contract.id)}>
          {expanded === contract.id ? 'Ocultar cronograma' : 'Ver cronograma e pagamentos'}
        </button>

        {expanded === contract.id && <div className="financing-contract-details">
          <div className="responsive-table compact-table">
            <table>
              <thead><tr><th>Parcela</th><th>Vencimento</th><th>Principal</th><th>Juros</th><th>Total</th><th>Pago</th><th>Status</th></tr></thead>
              <tbody>{schedule.map((item) => <tr key={item.id}>
                <td>{item.installmentNumber}</td>
                <td>{dueLabel(item, game.id)}</td>
                <td>{money(item.principalAmount, contract.displayCurrency)}</td>
                <td>{money(item.interestAmount, contract.displayCurrency)}</td>
                <td>{money(item.scheduledAmount, contract.displayCurrency)}</td>
                <td>{money(item.paidAmount, contract.displayCurrency)}</td>
                <td>{INSTALLMENT_STATUS[item.status] || item.status}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {contract.payments?.length > 0 && <div className="responsive-table compact-table">
            <table>
              <thead><tr><th>Pagamento</th><th>Valor</th><th>Principal</th><th>Juros</th><th>Período</th></tr></thead>
              <tbody>{contract.payments.map((payment) => <tr key={payment.id}>
                <td>{payment.paymentType}</td>
                <td>{money(payment.amount, contract.displayCurrency)}</td>
                <td>{money(payment.principalAmount, contract.displayCurrency)}</td>
                <td>{money(payment.interestAmount, contract.displayCurrency)}</td>
                <td>{game.id === 'ets2' ? `Mês ${payment.payrollMonth}` : `Semana ${payment.operationalWeek}`}</td>
              </tr>)}</tbody>
            </table>
          </div>}
        </div>}
      </article>
    )
  }

  if (loadingContracts) {
    return <section className="panel finance-card"><p>Carregando empréstimos e financiamentos do servidor…</p></section>
  }

  return <>
    <section className="phase1-status-grid finance-summary-grid">
      <article className="panel phase1-metric"><span className="metric-label">Saldo disponível</span><strong className="metric-value">{money(careerContext.balance, currency)}</strong><span className="metric-detail">Saldo server-side da carreira</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Contratos ativos</span><strong className="metric-value">{activeContracts.length}</strong><span className="metric-detail">Inclui contratos em atraso/default</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Dívida principal</span><strong className="metric-value">{money(activeContracts.reduce((sum, item) => sum + Number(item.remainingPrincipal || 0), 0), currency)}</strong><span className="metric-detail">Principal ainda não amortizado</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Período atual</span><strong className="metric-value">{game.id === 'ets2' ? `Mês ${careerContext.currentPayrollMonth || 1}` : `Semana ${careerContext.currentOperationalWeek || 1}`}</strong><span className="metric-detail">Referência operacional, sem data fictícia</span></article>
    </section>

    <section className="panel finance-card">
      <div className="section-heading compact-heading">
        <span className="eyebrow">Nova contratação</span>
        <h2>Consultar ofertas da sua jurisdição</h2>
        <p>Taxas, limites e regras são resolvidos pelo backend usando a sede atual da carreira. O navegador não escolhe juros nem parcela.</p>
      </div>
      <form className="inline-form-grid" onSubmit={searchOffers}>
        <div>
          <label>Produto</label>
          <select value={productType} onChange={(event) => { setProductType(event.target.value); setOffers([]) }}>
            <option value="PERSONAL_LOAN">Empréstimo pessoal</option>
            <option value="VEHICLE_FINANCING">Financiamento de veículo</option>
          </select>
        </div>
        <div>
          <label>Valor desejado</label>
          <input value={requestedAmount} onChange={(event) => setRequestedAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
        </div>
        <button className="button primary" disabled={loadingOffers || Boolean(mutation)}>{loadingOffers ? 'Calculando…' : 'Consultar ofertas'}</button>
      </form>
      {productType === 'VEHICLE_FINANCING' && <div className="notice-box"><strong>Sobre o veículo</strong><span>Esta etapa registra entrada, dívida e pagamentos. A aquisição/posse de caminhão continua separada porque o backend ainda não possui um cadastro de ativos do jogador.</span></div>}
    </section>

    {offers.length > 0 && <section className="financing-offers">
      <div className="section-heading compact-heading"><span className="eyebrow">Ofertas calculadas</span><h2>Escolha o prazo</h2><p>A política exibida será congelada no contrato se você contratar.</p></div>
      <div className="phase1-two-panel">{offers.map(renderOffer)}</div>
    </section>}

    <section>
      <div className="section-heading compact-heading"><span className="eyebrow">Contratos</span><h2>Empréstimos e financiamentos</h2><p>Contratos antigos mantêm as taxas e regras da época da contratação.</p></div>
      {contractsError && <section className="panel server-cutover-guard"><h2>Não foi possível carregar os contratos</h2><p>{contractsError.message || 'Tente novamente.'}</p><button className="button secondary" onClick={() => loadContracts()}>Tentar novamente</button></section>}
      {!contractsError && contracts.length === 0 && <div className="empty-inline">Nenhum empréstimo ou financiamento contratado nesta carreira.</div>}
      {!contractsError && activeContracts.map(renderContract)}
      {!contractsError && closedContracts.length > 0 && <>
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico</span><h2>Contratos quitados</h2></div>
        {closedContracts.map(renderContract)}
      </>}
    </section>
  </>
}
