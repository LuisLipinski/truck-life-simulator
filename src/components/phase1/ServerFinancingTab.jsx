import { useEffect, useMemo, useRef, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { financingApi } from '../../lib/financingApi.js'
import { vehicleApi } from '../../lib/vehicleApi.js'
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

function parseOdometer(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(text)) return null
  const number = Number(text.replace(',', '.'))
  if (!Number.isFinite(number) || number < 0) return null
  return number.toFixed(3)
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

  const [requestedAmount, setRequestedAmount] = useState('')
  const [offers, setOffers] = useState([])
  const [contracts, setContracts] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [truckOffers, setTruckOffers] = useState([])
  const [truckAcquisitionType, setTruckAcquisitionType] = useState('CASH')
  const [truckMake, setTruckMake] = useState(career.defaultTruckMake || '')
  const [truckModel, setTruckModel] = useState(career.defaultTruckModel || '')
  const [truckYear, setTruckYear] = useState('')
  const [truckOdometer, setTruckOdometer] = useState('0')
  const [truckPrice, setTruckPrice] = useState('')
  const [extraPrincipal, setExtraPrincipal] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [loadingTruckOffers, setLoadingTruckOffers] = useState(false)
  const [contractsError, setContractsError] = useState(null)
  const [vehicleError, setVehicleError] = useState(null)
  const [mutation, setMutation] = useState(null)

  const activeVehicle = useMemo(() => vehicles.find((item) => item.status === 'ACTIVE') || vehicles[0] || null, [vehicles])
  const currency = truckOffers[0]?.displayCurrency || offers[0]?.displayCurrency || contracts[0]?.displayCurrency || careerContext.displayCurrency
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

  function notifyCareerUpdated(source = 'server-financing') {
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
      detail: { careerId: career.id, gameId: game.id, source },
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

  async function loadVehicles({ quiet = false } = {}) {
    if (!quiet) setLoadingVehicles(true)
    setVehicleError(null)
    try {
      const next = await vehicleApi.list(game.id, career.serverCareerId)
      setVehicles(Array.isArray(next) ? next : [])
      return next
    } catch (error) {
      setVehicleError(error)
      throw error
    } finally {
      if (!quiet) setLoadingVehicles(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoadingContracts(true)
    setLoadingVehicles(true)

    Promise.allSettled([
      financingApi.listContracts(game.id, career.serverCareerId),
      vehicleApi.list(game.id, career.serverCareerId),
    ]).then(([contractsResult, vehiclesResult]) => {
      if (!active) return
      if (contractsResult.status === 'fulfilled') {
        setContracts(Array.isArray(contractsResult.value) ? contractsResult.value : [])
        setContractsError(null)
      } else {
        setContractsError(contractsResult.reason)
      }
      if (vehiclesResult.status === 'fulfilled') {
        setVehicles(Array.isArray(vehiclesResult.value) ? vehiclesResult.value : [])
        setVehicleError(null)
      } else {
        setVehicleError(vehiclesResult.reason)
      }
    }).finally(() => {
      if (!active) return
      setLoadingContracts(false)
      setLoadingVehicles(false)
    })

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
      const next = await financingApi.offers(game.id, career.serverCareerId, 'PERSONAL_LOAN', amount)
      setOffers(Array.isArray(next) ? next : [])
      if (!next?.length) toast.info('Nenhuma oferta foi disponibilizada para esse valor e jurisdição.')
    } catch (error) {
      setOffers([])
      toast.error(error?.message || 'Não foi possível calcular as ofertas para esta jurisdição.')
    } finally {
      setLoadingOffers(false)
    }
  }

  function truckPayload() {
    const make = truckMake.trim()
    const model = truckModel.trim()
    const price = parseAmount(truckPrice)
    const odometer = parseOdometer(truckOdometer)
    const year = String(truckYear || '').trim() ? Number(truckYear) : null

    if (!make || !model) {
      toast.error('Informe a marca e o modelo do caminhão.')
      return null
    }
    if (!price) {
      toast.error('Informe um preço de compra válido maior que zero.')
      return null
    }
    if (odometer == null) {
      toast.error('Informe um odômetro inicial válido com no máximo três casas decimais.')
      return null
    }
    if (year != null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
      toast.error('Informe um ano entre 1950 e 2100 ou deixe o campo vazio.')
      return null
    }

    return {
      make,
      model,
      modelYear: year,
      initialOdometer: odometer,
      purchasePrice: price,
    }
  }

  async function searchTruckFinancing(event) {
    event.preventDefault()
    const truck = truckPayload()
    if (!truck) return

    setLoadingTruckOffers(true)
    try {
      const next = await financingApi.offers(
        game.id,
        career.serverCareerId,
        'VEHICLE_FINANCING',
        truck.purchasePrice,
      )
      setTruckOffers(Array.isArray(next) ? next : [])
      if (!next?.length) toast.info('Nenhuma oferta de financiamento foi disponibilizada para esse caminhão.')
    } catch (error) {
      setTruckOffers([])
      toast.error(error?.message || 'Não foi possível calcular o financiamento do caminhão.')
    } finally {
      setLoadingTruckOffers(false)
    }
  }

  async function completeTruckAcquisition({ acquisitionType, financingTermPeriods = null, offer = null }) {
    const truck = truckPayload()
    if (!truck) return

    const financingText = offer
      ? ` Entrada: ${money(offer.downPayment, offer.displayCurrency)}. ${offer.termPeriods} parcelas ${FREQUENCY_LABEL[offer.paymentFrequency] || ''}. Taxa anual: ${percentage(offer.annualInterestRate)}.`
      : ''
    const accepted = await confirm({
      title: acquisitionType === 'CASH' ? 'Comprar caminhão à vista?' : 'Financiar este caminhão?',
      message: `${truck.make} ${truck.model} por ${money(truck.purchasePrice, currency)}.${financingText} Ao concluir, este caminhão será registrado como ativo da carreira e a Fase 2 será desbloqueada.`,
      confirmLabel: acquisitionType === 'CASH' ? 'Comprar caminhão' : 'Financiar caminhão',
      tone: 'warning',
    })
    if (!accepted) return

    const key = `truck:${acquisitionType}:${truck.make}:${truck.model}:${truck.purchasePrice}:${financingTermPeriods || '-'}`
    setMutation(key)
    try {
      await vehicleApi.acquire(game.id, career.serverCareerId, {
        operationId: idFor(key),
        acquisitionType,
        ...truck,
        ...(financingTermPeriods ? { financingTermPeriods: Number(financingTermPeriods) } : {}),
        ...contextPayload(),
      })
      confirmOperation(key)
      setTruckOffers([])
      await Promise.all([
        loadContracts({ quiet: true }),
        loadVehicles({ quiet: true }),
        refreshCareer(),
      ])
      notifyCareerUpdated('truck-acquired')
      toast.success('Caminhão adquirido e Fase 2 desbloqueada.', { title: 'Primeiro caminhão próprio' })
    } catch (error) {
      toast.error(error?.message || 'Não foi possível concluir a aquisição do caminhão.')
    } finally {
      setMutation(null)
    }
  }

  async function createContract(offer) {
    const accepted = await confirm({
      title: 'Contratar empréstimo pessoal?',
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
        productType: 'PERSONAL_LOAN',
        requestedAmount: Number(offer.requestedAmount).toFixed(2),
        termPeriods: Number(offer.termPeriods),
        ...contextPayload(),
      })
      confirmOperation(key)
      setOffers([])
      setRequestedAmount('')
      await Promise.all([loadContracts({ quiet: true }), refreshCareer()])
      toast.success('Empréstimo pessoal criado no servidor.')
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
        <button
          className="button primary full-button"
          disabled={busy}
          onClick={() => offer.productType === 'VEHICLE_FINANCING'
            ? completeTruckAcquisition({ acquisitionType: 'FINANCED', financingTermPeriods: offer.termPeriods, offer })
            : createContract(offer)}
        >
          {offer.productType === 'VEHICLE_FINANCING' ? 'Financiar este caminhão' : 'Contratar esta oferta'}
        </button>
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
        {contract.vehicleId && <div className="notice-box"><strong>Vinculado ao caminhão próprio</strong><span>Este contrato pertence ao caminhão adquirido pela carreira.</span></div>}
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

  if (loadingContracts || loadingVehicles) {
    return <section className="panel finance-card"><p>Carregando empréstimos, financiamentos e caminhões do servidor…</p></section>
  }

  return <>
    <section className="phase1-status-grid finance-summary-grid">
      <article className="panel phase1-metric"><span className="metric-label">Saldo disponível</span><strong className="metric-value">{money(careerContext.balance, currency)}</strong><span className="metric-detail">Saldo server-side da carreira</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Contratos ativos</span><strong className="metric-value">{activeContracts.length}</strong><span className="metric-detail">Inclui contratos em atraso/default</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Dívida principal</span><strong className="metric-value">{money(activeContracts.reduce((sum, item) => sum + Number(item.remainingPrincipal || 0), 0), currency)}</strong><span className="metric-detail">Principal ainda não amortizado</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Caminhão próprio</span><strong className="metric-value">{activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : 'Ainda não'}</strong><span className="metric-detail">{activeVehicle ? 'Fase 2 desbloqueada' : 'Aquisição libera a Fase 2'}</span></article>
    </section>

    {vehicleError && <section className="panel server-cutover-guard"><h2>Não foi possível carregar o caminhão</h2><p>{vehicleError.message || 'Tente novamente.'}</p><button className="button secondary" onClick={() => loadVehicles()}>Tentar novamente</button></section>}

    {!vehicleError && activeVehicle ? (
      <section className="panel finance-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Caminhão próprio</span>
          <h2>{activeVehicle.make} {activeVehicle.model}</h2>
          <p>Este ativo já pertence à carreira e desbloqueou a Fase 2.</p>
        </div>
        <div className="breakdown-list">
          <div><span>Ano</span><strong>{activeVehicle.modelYear || 'Não informado'}</strong></div>
          <div><span>Preço de aquisição</span><strong>{money(activeVehicle.purchasePrice, activeVehicle.displayCurrency)}</strong></div>
          <div><span>Forma de aquisição</span><strong>{activeVehicle.acquisitionType === 'FINANCED' ? 'Financiado' : 'À vista'}</strong></div>
          <div><span>Odômetro inicial</span><strong>{Number(activeVehicle.initialOdometer || 0).toLocaleString('pt-BR')} {game.distanceUnit}</strong></div>
          <div><span>Semana operacional</span><strong>{activeVehicle.acquiredOperationalWeek}</strong></div>
          {game.id === 'ets2' && <div><span>Mês operacional</span><strong>{activeVehicle.acquiredPayrollMonth}</strong></div>}
        </div>
        <a className="button primary" href={`#${game.routes.phase2}?career=${encodeURIComponent(career.id)}`}>Abrir Fase 2</a>
      </section>
    ) : !vehicleError && (
      <section className="panel finance-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Primeiro caminhão próprio</span>
          <h2>Adquirir caminhão</h2>
          <p>Cadastre o caminhão comprado no ATS/ETS2 e informe o valor pago. A aquisição concluída no Truck Life libera a Fase 2.</p>
        </div>
        <form className="inline-form-grid" onSubmit={truckAcquisitionType === 'CASH'
          ? (event) => { event.preventDefault(); completeTruckAcquisition({ acquisitionType: 'CASH' }) }
          : searchTruckFinancing}>
          <div>
            <label>Marca</label>
            <input value={truckMake} onChange={(event) => { setTruckMake(event.target.value); setTruckOffers([]) }} placeholder="Ex.: Peterbilt" required />
          </div>
          <div>
            <label>Modelo</label>
            <input value={truckModel} onChange={(event) => { setTruckModel(event.target.value); setTruckOffers([]) }} placeholder="Ex.: 579" required />
          </div>
          <div>
            <label>Ano (opcional)</label>
            <input value={truckYear} onChange={(event) => setTruckYear(event.target.value)} inputMode="numeric" placeholder="2026" />
          </div>
          <div>
            <label>Odômetro inicial ({game.distanceUnit})</label>
            <input value={truckOdometer} onChange={(event) => setTruckOdometer(event.target.value)} inputMode="decimal" placeholder="0" required />
          </div>
          <div>
            <label>Preço de compra</label>
            <input value={truckPrice} onChange={(event) => { setTruckPrice(event.target.value); setTruckOffers([]) }} inputMode="decimal" placeholder="0,00" required />
          </div>
          <div>
            <label>Forma de aquisição</label>
            <select value={truckAcquisitionType} onChange={(event) => { setTruckAcquisitionType(event.target.value); setTruckOffers([]) }}>
              <option value="CASH">À vista</option>
              <option value="FINANCED">Financiado</option>
            </select>
          </div>
          <button className="button primary" disabled={Boolean(mutation) || loadingTruckOffers}>
            {truckAcquisitionType === 'CASH'
              ? (mutation ? 'Comprando…' : 'Comprar à vista')
              : (loadingTruckOffers ? 'Calculando…' : 'Consultar financiamento')}
          </button>
        </form>
        <div className="notice-box">
          <strong>Regra de progressão</strong>
          <span>O primeiro caminhão adquirido, à vista ou financiado, torna-se um ativo server-side da carreira e desbloqueia automaticamente a Fase 2.</span>
        </div>
      </section>
    )}

    {truckOffers.length > 0 && !activeVehicle && (
      <section className="financing-offers">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Financiamento do caminhão</span>
          <h2>Escolha o prazo</h2>
          <p>Entrada, juros, parcela e custo total são calculados pelo backend conforme a jurisdição da carreira.</p>
        </div>
        <div className="phase1-two-panel">{truckOffers.map(renderOffer)}</div>
      </section>
    )}

    <section className="panel finance-card">
      <div className="section-heading compact-heading">
        <span className="eyebrow">Empréstimo pessoal</span>
        <h2>Consultar ofertas da sua jurisdição</h2>
        <p>Empréstimos pessoais continuam separados da aquisição do caminhão.</p>
      </div>
      <form className="inline-form-grid" onSubmit={searchOffers}>
        <div>
          <label>Valor desejado</label>
          <input value={requestedAmount} onChange={(event) => setRequestedAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
        </div>
        <button className="button primary" disabled={loadingOffers || Boolean(mutation)}>{loadingOffers ? 'Calculando…' : 'Consultar ofertas'}</button>
      </form>
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
