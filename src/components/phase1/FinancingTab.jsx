import { useEffect, useMemo, useRef, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { financingApi } from '../../lib/financingApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

const PRODUCT_LABELS = {
  PERSONAL_LOAN: 'Empréstimo pessoal',
  VEHICLE_FINANCING: 'Financiamento de veículo',
}

const STATUS_LABELS = {
  ACTIVE: 'Ativo',
  DELINQUENT: 'Em atraso',
  DEFAULTED: 'Inadimplente',
  PAID_OFF: 'Quitado',
}

const FREQUENCY_LABELS = {
  WEEKLY: 'semanal',
  BIWEEKLY: 'a cada 2 semanas',
  MONTHLY: 'mensal',
}

const INSTALLMENT_STATUS_LABELS = {
  SCHEDULED: 'Programada',
  PARTIALLY_PAID: 'Parcialmente paga',
  PAID: 'Paga',
  OVERDUE: 'Vencida',
  SUPERSEDED: 'Substituída',
}

function operationId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function money(value, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0))
  } catch {
    return `${currency || ''} ${Number(value || 0).toFixed(2)}`.trim()
  }
}

function percent(value) {
  const number = Number(value || 0) * 100
  return `${number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function amount(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null
  const number = Number(text.replace(',', '.'))
  if (!Number.isFinite(number) || number <= 0) return null
  return number.toFixed(2)
}

function dueLabel(item, game) {
  if (game.id === 'ets2') return `Mês operacional ${item.duePayrollMonth ?? '—'}`
  return `Semana operacional ${item.dueOperationalWeek ?? '—'}`
}

function isDueNow(item, game, currentWeek, currentMonth) {
  if (!['SCHEDULED', 'PARTIALLY_PAID', 'OVERDUE'].includes(item.status)) return false
  if (game.id === 'ets2') return Number(item.duePayrollMonth || Infinity) <= Number(currentMonth || 1)
  return Number(item.dueOperationalWeek || Infinity) <= Number(currentWeek || 1)
}

function outstanding(item) {
  return Math.max(0, Number(item.scheduledAmount || 0) - Number(item.paidAmount || 0))
}

function currentSchedule(contract) {
  const version = Number(contract?.currentScheduleVersion || 1)
  return (contract?.installments || []).filter((item) => Number(item.scheduleVersion || 1) === version)
}

function ExternalSource({ href, children }) {
  if (!href) return null
  return <a className="financing-source-link" href={href} target="_blank" rel="noreferrer">{children}</a>
}

function OfferCard({ offer, currency, busy, onContract }) {
  return (
    <article className="panel financing-offer-card">
      <div className="financing-offer-heading">
        <div>
          <span className="eyebrow">{PRODUCT_LABELS[offer.productType] || offer.productType}</span>
          <h3>{offer.termPeriods} {offer.paymentFrequency === 'MONTHLY' ? 'meses' : 'parcelas'}</h3>
        </div>
        <span className="financing-rate-pill">{percent(offer.annualInterestRate)} a.a.</span>
      </div>

      <div className="financing-offer-metrics">
        <div><span>Parcela</span><strong>{money(offer.installmentAmount, currency)}</strong></div>
        <div><span>Frequência</span><strong>{FREQUENCY_LABELS[offer.paymentFrequency] || offer.paymentFrequency}</strong></div>
        <div><span>Entrada</span><strong>{money(offer.downPayment, currency)}</strong></div>
        <div><span>Valor financiado</span><strong>{money(offer.principal, currency)}</strong></div>
        <div><span>Custo total</span><strong>{money(offer.expectedTotalCost, currency)}</strong></div>
        <div><span>Teto legal aplicado</span><strong>{offer.legalAprCap == null ? 'Não há teto numérico aplicado' : `${percent(offer.legalAprCap)} a.a.`}</strong></div>
      </div>

      <div className="financing-rule-box">
        <strong>Regra da jurisdição</strong>
        <p>{offer.jurisdictionRuleSummary || 'Regra local versionada pelo servidor.'}</p>
        <div className="financing-source-row">
          <ExternalSource href={offer.policySource}>Fonte da taxa de mercado</ExternalSource>
          <ExternalSource href={offer.jurisdictionRuleSource}>Fonte da regra local</ExternalSource>
        </div>
        <small>Referência: {offer.policyReferenceAsOf || '—'} · política {offer.policyVersion || '—'}</small>
      </div>

      <div className="financing-terms-note">
        <span><strong>Quitação antecipada:</strong> {offer.prepaymentRuleSummary || 'Conforme política server-side.'}</span>
        <span><strong>Atraso:</strong> {offer.latePaymentRuleSummary || 'Conforme política server-side.'}</span>
      </div>

      <button className="button primary full-button" type="button" disabled={busy} onClick={() => onContract(offer)}>
        {busy ? 'Processando…' : 'Contratar esta oferta'}
      </button>
    </article>
  )
}

function ContractDetails({ contract, game, currency, balance, busy, onRegular, onExtra, onPayoff }) {
  const [extraAmount, setExtraAmount] = useState('')
  const schedule = useMemo(() => currentSchedule(contract), [contract])
  const due = useMemo(
    () => schedule.filter((item) => isDueNow(item, game, contract.currentOperationalWeek, contract.currentPayrollMonth)),
    [schedule, game, contract.currentOperationalWeek, contract.currentPayrollMonth],
  )
  const dueAmount = due.reduce((sum, item) => sum + outstanding(item), 0)
  const open = !['PAID_OFF', 'DEFAULTED'].includes(contract.status)

  return (
    <article className="panel financing-contract-card">
      <div className="financing-contract-heading">
        <div>
          <span className="eyebrow">{PRODUCT_LABELS[contract.productType] || contract.productType}</span>
          <h3>{STATUS_LABELS[contract.status] || contract.status}</h3>
          <small>{contract.jurisdictionCity || '—'} · {contract.jurisdictionStateCode || contract.jurisdictionCountryCode || '—'}</small>
        </div>
        <div className="financing-contract-balance">
          <span>Saldo devedor</span>
          <strong>{money(contract.remainingPrincipal, currency)}</strong>
        </div>
      </div>

      <div className="financing-offer-metrics financing-contract-metrics">
        <div><span>Taxa contratada</span><strong>{percent(contract.annualInterestRate)} a.a.</strong></div>
        <div><span>Valor original</span><strong>{money(contract.principal, currency)}</strong></div>
        <div><span>Entrada</span><strong>{money(contract.downPayment, currency)}</strong></div>
        <div><span>Prazo</span><strong>{contract.termPeriods} períodos</strong></div>
        <div><span>Frequência</span><strong>{FREQUENCY_LABELS[contract.paymentFrequency] || contract.paymentFrequency}</strong></div>
        <div><span>Política</span><strong>{contract.policyVersion || '—'}</strong></div>
      </div>

      {open && (
        <div className="financing-payment-panel">
          <div className="financing-due-summary">
            <span>Vencido / devido agora</span>
            <strong>{money(dueAmount, currency)}</strong>
            <small>O fechamento operacional também tenta pagar automaticamente o que estiver devido, limitado ao saldo disponível.</small>
          </div>
          <div className="financing-payment-actions">
            <button className="button secondary" type="button" disabled={busy || dueAmount <= 0 || dueAmount > balance} onClick={() => onRegular(contract, dueAmount)}>
              Pagar valor devido
            </button>
            <div className="financing-extra-action">
              <input aria-label="Valor para amortização extra" inputMode="decimal" placeholder="Amortização extra" value={extraAmount} onChange={(event) => setExtraAmount(event.target.value)} />
              <button className="button secondary" type="button" disabled={busy || dueAmount > 0 || !amount(extraAmount)} onClick={async () => {
                const value = amount(extraAmount)
                if (value && await onExtra(contract, value)) setExtraAmount('')
              }}>Amortizar</button>
            </div>
            <button className="button danger" type="button" disabled={busy || Number(contract.remainingPrincipal || 0) <= 0} onClick={() => onPayoff(contract)}>
              Quitar dívida
            </button>
          </div>
          {dueAmount > 0 && <small className="warning-text">Enquanto existir parcela devida, o backend não permite amortização extraordinária. Primeiro regularize o valor vencido.</small>}
        </div>
      )}

      <details className="financing-schedule">
        <summary>Cronograma de parcelas ({schedule.length})</summary>
        <div className="responsive-table compact-table">
          <table>
            <thead><tr><th>#</th><th>Vencimento</th><th>Parcela</th><th>Principal</th><th>Juros</th><th>Pago</th><th>Status</th></tr></thead>
            <tbody>{schedule.map((item) => (
              <tr key={item.id}>
                <td>{item.installmentNumber}</td>
                <td>{dueLabel(item, game)}</td>
                <td>{money(item.scheduledAmount, currency)}</td>
                <td>{money(item.principalAmount, currency)}</td>
                <td>{money(item.interestAmount, currency)}</td>
                <td>{money(item.paidAmount, currency)}</td>
                <td>{INSTALLMENT_STATUS_LABELS[item.status] || item.status}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>

      {Array.isArray(contract.payments) && contract.payments.length > 0 && (
        <details className="financing-schedule">
          <summary>Pagamentos realizados ({contract.payments.length})</summary>
          <div className="responsive-table compact-table">
            <table>
              <thead><tr><th>Tipo</th><th>Período</th><th>Valor</th><th>Principal</th><th>Juros</th><th>Saldo depois</th></tr></thead>
              <tbody>{[...contract.payments].reverse().map((payment) => (
                <tr key={payment.id}>
                  <td>{({ REGULAR: 'Manual', AUTO: 'Automático', EXTRA_PRINCIPAL: 'Amortização extra', PAYOFF: 'Quitação' })[payment.paymentType] || payment.paymentType}</td>
                  <td>{game.id === 'ets2' ? `Mês ${payment.payrollMonth ?? '—'}` : `Semana ${payment.operationalWeek ?? '—'}`}</td>
                  <td>{money(payment.amount, currency)}</td>
                  <td>{money(payment.principalAmount, currency)}</td>
                  <td>{money(payment.interestAmount, currency)}</td>
                  <td>{money(payment.balanceAfter, currency)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      )}
    </article>
  )
}

export default function FinancingTab({ career }) {
  const game = useGame()
  const confirm = useConfirm()
  const toast = useToast()
  const [productType, setProductType] = useState('PERSONAL_LOAN')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [offers, setOffers] = useState([])
  const [contracts, setContracts] = useState([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [mutation, setMutation] = useState(null)
  const operationIds = useRef({})
  const currency = career.displayCurrency || career.currency || 'USD'
  const balance = Number(career.currentBalance || 0)
  const currentWeek = Number(career.currentOperationalWeek || 1)
  const currentMonth = game.id === 'ets2' ? Number(career.currentPayrollMonth || 1) : null

  function context() {
    return {
      expectedOperationalWeek: currentWeek,
      ...(game.id === 'ets2' ? { expectedPayrollMonth: currentMonth } : {}),
      expectedBalance: Number(balance).toFixed(2),
    }
  }

  function op(key) {
    operationIds.current[key] ||= operationId()
    return operationIds.current[key]
  }

  function clearOp(key) {
    delete operationIds.current[key]
  }

  async function refreshCareer() {
    const next = await careerApi.get(game.id, career.serverCareerId)
    setServerCareerSnapshot(game.id, career.id, next)
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
      detail: { careerId: career.id, gameId: game.id, source: 'server-financing' },
    }))
  }

  async function loadContracts() {
    setLoadingContracts(true)
    try {
      const next = await financingApi.listContracts(game.id, career.serverCareerId)
      setContracts(Array.isArray(next) ? next : [])
    } catch (error) {
      toast.error(error?.message || 'Não foi possível carregar os contratos de crédito.')
    } finally {
      setLoadingContracts(false)
    }
  }

  useEffect(() => {
    if (!career.serverBacked || !career.serverCareerId) {
      setLoadingContracts(false)
      return undefined
    }
    let active = true
    financingApi.listContracts(game.id, career.serverCareerId)
      .then((next) => { if (active) setContracts(Array.isArray(next) ? next : []) })
      .catch((error) => { if (active) toast.error(error?.message || 'Não foi possível carregar os contratos de crédito.') })
      .finally(() => { if (active) setLoadingContracts(false) })
    return () => { active = false }
  }, [career.serverBacked, career.serverCareerId, game.id, toast])

  async function searchOffers(event) {
    event.preventDefault()
    const value = amount(requestedAmount)
    if (!value) {
      toast.error('Informe um valor válido com no máximo duas casas decimais.')
      return
    }
    setLoadingOffers(true)
    setOffers([])
    try {
      const next = await financingApi.offers(game.id, career.serverCareerId, productType, value)
      setOffers(Array.isArray(next) ? next : [])
    } catch (error) {
      toast.error(error?.message || 'Não foi possível calcular ofertas para esta jurisdição.')
    } finally {
      setLoadingOffers(false)
    }
  }

  async function contractOffer(offer) {
    const accepted = await confirm({
      title: PRODUCT_LABELS[offer.productType],
      message: `Confirmar ${money(offer.requestedAmount, currency)} em ${offer.termPeriods} períodos, taxa de ${percent(offer.annualInterestRate)} a.a. e custo total estimado de ${money(offer.expectedTotalCost, currency)}?`,
      confirmLabel: 'Confirmar contrato',
      tone: 'warning',
    })
    if (!accepted) return

    const key = `contract:${offer.productType}:${offer.termPeriods}:${offer.requestedAmount}`
    setMutation(key)
    try {
      await financingApi.createContract(game.id, career.serverCareerId, {
        operationId: op(key),
        productType: offer.productType,
        requestedAmount: Number(offer.requestedAmount).toFixed(2),
        termPeriods: Number(offer.termPeriods),
        ...context(),
      })
      clearOp(key)
      setOffers([])
      setRequestedAmount('')
      await Promise.all([loadContracts(), refreshCareer()])
      toast.success(offer.productType === 'PERSONAL_LOAN' ? 'Empréstimo contratado e creditado no saldo.' : 'Financiamento contratado; a entrada foi debitada do saldo.')
    } catch (error) {
      toast.error(error?.message || 'Não foi possível contratar a oferta.')
    } finally {
      setMutation(null)
    }
  }

  async function makePayment(contract, paymentType, rawAmount = null) {
    const labels = {
      REGULAR: 'pagar o valor devido',
      EXTRA_PRINCIPAL: 'amortizar o saldo devedor',
      PAYOFF: 'quitar integralmente a dívida',
    }
    const accepted = await confirm({
      title: 'Confirmar pagamento',
      message: `Deseja ${labels[paymentType]}? O backend recalculará o cronograma e registrará a movimentação no ledger.`,
      confirmLabel: paymentType === 'PAYOFF' ? 'Quitar dívida' : 'Confirmar pagamento',
      tone: paymentType === 'PAYOFF' ? 'danger' : 'warning',
    })
    if (!accepted) return false

    const key = `payment:${contract.id}:${paymentType}`
    setMutation(key)
    try {
      const body = {
        operationId: op(key),
        paymentType,
        ...context(),
        ...(rawAmount != null ? { amount: rawAmount } : {}),
      }
      await financingApi.pay(game.id, career.serverCareerId, contract.id, body)
      clearOp(key)
      await Promise.all([loadContracts(), refreshCareer()])
      toast.success(paymentType === 'PAYOFF' ? 'Dívida quitada no servidor.' : 'Pagamento registrado no servidor.')
      return true
    } catch (error) {
      toast.error(error?.message || 'Não foi possível registrar o pagamento.')
      return false
    } finally {
      setMutation(null)
    }
  }

  if (!career.serverBacked || !career.serverCareerId) {
    return <section className="panel finance-card server-cutover-guard"><h2>Crédito disponível apenas para carreiras server-side</h2><p>Empréstimos e financiamentos não serão gravados no localStorage. Migre a carreira para a conta antes de usar esta área.</p></section>
  }

  return (
    <div className="financing-page">
      <section className="notice-box financing-jurisdiction-notice">
        <strong>Política de crédito da sua sede</strong>
        <span>{game.id === 'ats' ? `ATS: as ofertas consideram o estado ${career.stateCode || 'da carreira'}.` : `ETS2: as ofertas consideram o país ${career.countryCode || 'da carreira'}.`} O servidor combina referência de mercado com a regra/teto pesquisado da jurisdição e congela a política no contrato. A tela nunca envia taxa de juros como autoridade.</span>
      </section>

      <section className="panel financing-search-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Novo crédito</span>
          <h2>Simular ofertas</h2>
          <p>Escolha o produto e o valor. Taxa, prazo, entrada, parcela e regras são calculados exclusivamente pelo backend.</p>
        </div>
        <form className="financing-search-form" onSubmit={searchOffers}>
          <div>
            <label htmlFor="financing-product">Produto</label>
            <select id="financing-product" value={productType} onChange={(event) => { setProductType(event.target.value); setOffers([]) }}>
              <option value="PERSONAL_LOAN">Empréstimo pessoal</option>
              <option value="VEHICLE_FINANCING">Financiamento de veículo</option>
            </select>
          </div>
          <div>
            <label htmlFor="financing-amount">Valor desejado ({currency})</label>
            <input id="financing-amount" inputMode="decimal" value={requestedAmount} onChange={(event) => setRequestedAmount(event.target.value)} placeholder="0.00" />
          </div>
          <button className="button primary" disabled={loadingOffers || Boolean(mutation)}>
            {loadingOffers ? 'Calculando…' : 'Buscar ofertas'}
          </button>
        </form>
        {productType === 'VEHICLE_FINANCING' && <small className="financing-form-help">O backend calcula a entrada exigida. O contrato representa a dívida; o veículo continua sendo registrado normalmente nas viagens e não é criado como ativo fictício.</small>}
      </section>

      {offers.length > 0 && (
        <section className="financing-offers-section">
          <div className="section-heading compact-heading"><span className="eyebrow">Ofertas server-side</span><h2>Escolha um prazo</h2><p>As condições abaixo já incorporam a jurisdição atual da carreira.</p></div>
          <div className="financing-offer-grid">
            {offers.map((offer) => <OfferCard key={`${offer.productType}-${offer.termPeriods}`} offer={offer} currency={currency} busy={Boolean(mutation)} onContract={contractOffer} />)}
          </div>
        </section>
      )}

      <section className="financing-contracts-section">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Contratos</span>
          <h2>Empréstimos e financiamentos</h2>
          <p>Parcelas e pagamentos são históricos server-side. Mudanças futuras de política não recalculam contratos já originados.</p>
        </div>
        {loadingContracts ? <div className="panel finance-card"><p>Carregando contratos…</p></div> : contracts.length === 0 ? <div className="empty-inline">Nenhum empréstimo ou financiamento contratado.</div> : (
          <div className="financing-contract-list">
            {contracts.map((contract) => <ContractDetails
              key={contract.id}
              contract={{ ...contract, currentOperationalWeek: currentWeek, currentPayrollMonth: currentMonth }}
              game={game}
              currency={contract.displayCurrency || currency}
              balance={balance}
              busy={Boolean(mutation)}
              onRegular={(item, value) => makePayment(item, 'REGULAR', Number(value).toFixed(2))}
              onExtra={(item, value) => makePayment(item, 'EXTRA_PRINCIPAL', value)}
              onPayoff={(item) => makePayment(item, 'PAYOFF')}
            />)}
          </div>
        )}
      </section>
    </div>
  )
}
