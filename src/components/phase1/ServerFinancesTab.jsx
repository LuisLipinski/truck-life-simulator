import { useEffect, useMemo, useRef, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { financeApi } from '../../lib/financeApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

const LABELS = {
  rent: 'Aluguel', electricity: 'Eletricidade', water: 'Água / lixo', internet: 'Internet', phone: 'Celular',
  groceries: 'Mercado', eatingOut: 'Alimentação fora', health: 'Saúde / parcela pessoal',
  publicTransport: 'Ônibus / metrô', household: 'Higiene / casa', leisure: 'Lazer',
}

function operationId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
}

function amount(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null
  const number = Number(text.replace(',', '.'))
  return Number.isFinite(number) ? number.toFixed(2) : null
}

function money(value, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0))
  } catch {
    return `${currency || ''} ${Number(value || 0).toFixed(2)}`.trim()
  }
}

function InfoTip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function TipLabel({ children, tip }) {
  return <label className="label-with-tip"><span>{children}</span><InfoTip text={tip} /></label>
}

export default function ServerFinancesTab({ career }) {
  const game = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const [finance, setFinance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mutation, setMutation] = useState(null)
  const [manualBalance, setManualBalance] = useState('')
  const [reserveDeposit, setReserveDeposit] = useState('')
  const [reserveUseAmount, setReserveUseAmount] = useState('')
  const [reserveUseReason, setReserveUseReason] = useState('')
  const [customName, setCustomName] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [customIncluded, setCustomIncluded] = useState(true)
  const operationIds = useRef({})

  const standard = useMemo(() => finance?.expenses?.filter((item) => item.type === 'STANDARD') || [], [finance])
  const custom = useMemo(() => finance?.expenses?.filter((item) => item.type === 'CUSTOM') || [], [finance])
  const reserve = Number(finance?.emergencyReserve?.balance || 0)
  const balance = Number(finance?.balance || 0)
  const currency = finance?.displayCurrency || career.displayCurrency || 'USD'
  const annualRate = Number(finance?.emergencyReserve?.annualYieldRate || 0.0325)
  const periodRate = annualRate / (game.payrollPeriod === 'monthly' ? 12 : 52)

  function context(source = finance) {
    return {
      expectedOperationalWeek: Number(source?.currentOperationalWeek || career.currentOperationalWeek || 1),
      ...(game.id === 'ets2' ? { expectedPayrollMonth: Number(source?.currentPayrollMonth || career.currentPayrollMonth || 1) } : {}),
    }
  }

  function operationPayload(key, extras = {}) {
    operationIds.current[key] ||= operationId()
    return { operationId: operationIds.current[key], ...context(), ...extras }
  }

  function confirmOperation(key) {
    delete operationIds.current[key]
  }

  function notifyCareerUpdated() {
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, { detail: { careerId: career.id, gameId: game.id, source: 'server-finances' } }))
  }

  async function refreshCareer() {
    const next = await careerApi.get(game.id, career.serverCareerId)
    setServerCareerSnapshot(game.id, career.id, next)
    notifyCareerUpdated()
  }

  async function load({ quiet = false } = {}) {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const next = await financeApi.get(game.id, career.serverCareerId)
      setFinance(next)
      setManualBalance(Number(next.balance || 0).toFixed(2))
      return next
    } catch (nextError) {
      setError(nextError)
      throw nextError
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    financeApi.get(game.id, career.serverCareerId).then((next) => {
      if (!active) return
      setFinance(next)
      setManualBalance(Number(next.balance || 0).toFixed(2))
    }).catch((nextError) => { if (active) setError(nextError) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [career.serverCareerId, game.id])

  async function run(key, action, success) {
    if (mutation) return
    setMutation(key)
    try {
      const next = await action()
      if (next?.expenses) {
        setFinance(next)
        setManualBalance(Number(next.balance || 0).toFixed(2))
      } else {
        await load({ quiet: true })
      }
      try { await refreshCareer() } catch { toast.warning('A operação foi salva no servidor, mas o cabeçalho será atualizado na próxima recarga.') }
      toast.success(success)
      return true
    } catch (nextError) {
      toast.error(nextError?.message || 'A operação financeira não foi concluída no servidor.')
      return false
    } finally {
      setMutation(null)
    }
  }

  async function updateExpense(item, raw, included = item.included) {
    const value = amount(raw)
    if (value == null) return toast.error('Informe um valor válido com no máximo duas casas decimais.')
    await run(`expense-${item.id}`, () => financeApi.updateExpense(game.id, career.serverCareerId, item.id, {
      ...context(), name: item.type === 'CUSTOM' ? item.name : null, amount: value, included,
    }), 'Despesa atualizada no servidor.')
  }

  async function adjustBalance() {
    const value = amount(manualBalance)
    if (value == null) return toast.error('Informe um saldo válido com no máximo duas casas decimais.')
    if (Number(value) === balance) return toast.error('Informe um saldo diferente do atual.')
    const saved = await run('balance', () => financeApi.adjustBalance(game.id, career.serverCareerId, operationPayload('balance', {
      expectedBalance: Number(balance).toFixed(2), newBalance: value,
      note: 'Correção manual pela tela Saldo e Despesas',
    })), 'Saldo atualizado e registrado no ledger.')
    if (saved) confirmOperation('balance')
  }

  async function deposit() {
    const value = amount(reserveDeposit)
    if (value == null || Number(value) <= 0) return toast.error('Informe um valor válido para o aporte.')
    if (await run('deposit', () => financeApi.depositReserve(game.id, career.serverCareerId, operationPayload('deposit', { amount: value })), 'Aporte registrado no servidor.')) { confirmOperation('deposit'); setReserveDeposit('') }
  }

  async function withdraw(event) {
    event.preventDefault()
    const value = amount(reserveUseAmount)
    const reason = reserveUseReason.trim()
    if (value == null || Number(value) <= 0) return toast.error('Informe um valor válido para o resgate.')
    if (!reason) return toast.error('Informe o motivo do uso da reserva.')
    if (await run('withdraw', () => financeApi.withdrawReserve(game.id, career.serverCareerId, operationPayload('withdraw', { amount: value, reason })), 'Resgate registrado no servidor.')) { confirmOperation('withdraw'); setReserveUseAmount(''); setReserveUseReason('') }
  }

  async function addCustom(event) {
    event.preventDefault()
    const value = amount(customValue)
    if (!customName.trim() || value == null) return toast.error('Informe nome e valor válido para o gasto.')
    if (await run('custom', () => financeApi.createExpense(game.id, career.serverCareerId, { ...context(), name: customName.trim(), amount: value, included: customIncluded }), 'Gasto personalizado salvo no servidor.')) { setCustomName(''); setCustomValue(''); setCustomIncluded(true) }
  }

  async function removeCustom(item) {
    const accepted = await confirm({ title: `Excluir “${item.name}”?`, message: 'O gasto personalizado será removido do servidor.', confirmLabel: 'Excluir gasto', tone: 'warning' })
    if (!accepted) return
    await run(`delete-${item.id}`, () => financeApi.deleteExpense(game.id, career.serverCareerId, item.id, context()), 'Gasto excluído do servidor.')
  }

  async function applyMonthly() {
    const accepted = await confirm({ title: 'Aplicar despesas mensais?', message: `${money(finance.monthlyExpenseTotal, currency)} serão descontados do saldo. A reserva não será alterada.`, confirmLabel: 'Aplicar despesas', tone: 'warning' })
    if (!accepted) return
    if (await run('apply', () => financeApi.applyExpenses(game.id, career.serverCareerId, operationPayload('apply')), 'Despesas mensais aplicadas e registradas no ledger.')) confirmOperation('apply')
  }

  if (loading) return <section className="panel finance-card"><p>Carregando saldo e despesas do servidor…</p></section>
  if (error || !finance) return <section className="panel finance-card server-cutover-guard"><h2>Não foi possível carregar as finanças</h2><p>{error?.message || 'Tente novamente.'}</p><button className="button secondary" onClick={() => load()}>Tentar novamente</button></section>

  return <>
    <section className="phase1-status-grid finance-summary-grid" data-tour="finance-summary">
      <article className="panel phase1-metric"><span className="metric-label">Saldo disponível</span><strong className="metric-value">{money(balance, currency)}</strong><span className="metric-detail">Conta pessoal da carreira</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Reserva de emergência</span><strong className="metric-value">{money(reserve, currency)}</strong><span className="metric-detail">Rende {(annualRate * 100).toFixed(2)}% a.a.</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Patrimônio pessoal</span><strong className="metric-value">{money(balance + reserve, currency)}</strong><span className="metric-detail">Saldo + reserva</span></article>
      <article className="panel phase1-metric"><span className="metric-label">Despesas mensais</span><strong className="metric-value">{money(finance.monthlyExpenseTotal, currency)}</strong><span className="metric-detail">Padrão + personalizadas incluídas</span></article>
    </section>

    <div className="phase1-two-panel finance-layout">
      <section className="panel finance-card" data-tour="balance-tools">
        <div className="section-heading compact-heading"><span className="eyebrow">Conta pessoal</span><h2>Saldo</h2><p>Use ajuste manual apenas para corrigir ou sincronizar a simulação.</p></div>
        <TipLabel tip="Altera o saldo server-side e cria uma movimentação auditável no ledger.">Saldo atual</TipLabel>
        <input type="text" inputMode="decimal" value={manualBalance} onChange={(event) => setManualBalance(event.target.value)} />
        <button className="button secondary full-button" disabled={Boolean(mutation)} onClick={adjustBalance}>Atualizar saldo</button>
      </section>
      <section className="panel finance-card reserve-card" data-tour="reserve-tools">
        <div className="section-heading compact-heading"><span className="eyebrow">Reserva de emergência</span><h2>{money(reserve, currency)}</h2><p>Dinheiro separado do saldo disponível. O rendimento é creditado {game.payrollPeriod === 'monthly' ? 'mensalmente' : 'semanalmente'} quando o holerite é fechado.</p></div>
        <div className="reserve-rate-note">Taxa simulada: <strong>{(annualRate * 100).toFixed(2)}% ao ano</strong> ≈ <strong>{(periodRate * 100).toFixed(4)}% por {game.payrollPeriod === 'monthly' ? 'mês' : 'semana'}</strong>.</div>
        <TipLabel tip="Transfere dinheiro do saldo para a reserva no servidor.">Adicionar à reserva</TipLabel>
        <div className="reserve-inline-action"><input value={reserveDeposit} onChange={(event) => setReserveDeposit(event.target.value)} inputMode="decimal" placeholder="0.00" /><button className="button secondary" disabled={Boolean(mutation)} onClick={deposit}>Adicionar</button></div>
        <form className="reserve-use-form" onSubmit={withdraw}><TipLabel tip="Transfere dinheiro da reserva de volta para o saldo e registra o motivo.">Usar reserva</TipLabel><div className="reserve-inline-action"><input value={reserveUseAmount} onChange={(event) => setReserveUseAmount(event.target.value)} inputMode="decimal" placeholder="Valor" /><button className="button primary" disabled={Boolean(mutation)}>Usar reserva</button></div><input value={reserveUseReason} onChange={(event) => setReserveUseReason(event.target.value)} placeholder="Motivo do resgate" /></form>
      </section>
    </div>

    <section className="panel finance-card expenses-card monthly-expenses-card" data-tour="monthly-expenses">
      <div className="section-heading compact-heading"><span className="eyebrow">Vida pessoal</span><h2>Despesas mensais</h2><p>Edite os valores do custo de vida. Cada alteração é salva diretamente no backend.</p></div>
      <div className="expense-fields-grid">{standard.map((item) => <div className="expense-field" key={item.id}><TipLabel tip="Valor mensal retornado e persistido pelo servidor.">{LABELS[item.category] || item.name || item.category}</TipLabel><input key={`${item.id}-${item.amount}`} defaultValue={Number(item.amount).toFixed(2)} inputMode="decimal" disabled={Boolean(mutation)} onBlur={(event) => updateExpense(item, event.target.value)} /></div>)}</div>
    </section>

    <section className="panel custom-expenses-panel" data-tour="custom-expenses">
      <div className="section-heading compact-heading"><span className="eyebrow">Gastos personalizados</span><h2>Outras despesas</h2><p>Cadastre gastos extras e escolha se entram no desconto mensal automático.</p></div>
      <form className="inline-form-grid" onSubmit={addCustom}>
        <div><TipLabel tip="Nome livre do gasto personalizado.">Nome do gasto</TipLabel><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Ex.: Academia, lavanderia" /></div>
        <div><TipLabel tip="Valor mensal do gasto.">Valor</TipLabel><input value={customValue} onChange={(event) => setCustomValue(event.target.value)} inputMode="decimal" placeholder="0.00" /></div>
        <label className="check-field"><input type="checkbox" checked={customIncluded} onChange={(event) => setCustomIncluded(event.target.checked)} /> Incluir no desconto mensal <InfoTip text="Marcado: o gasto entra na aplicação das despesas mensais." /></label>
        <button className="button secondary" disabled={Boolean(mutation)}>Adicionar gasto</button>
      </form>
      {custom.length > 0 && <div className="responsive-table compact-table"><table><thead><tr><th>Gasto</th><th>Valor</th><th>Mensal</th><th></th></tr></thead><tbody>{custom.map((item) => <tr key={item.id}><td>{item.name}</td><td>{money(item.amount, currency)}</td><td><input className="table-checkbox" type="checkbox" checked={item.included} disabled={Boolean(mutation)} onChange={(event) => updateExpense(item, item.amount, event.target.checked)} /></td><td><button className="table-delete" disabled={Boolean(mutation)} onClick={() => removeCustom(item)}>Excluir</button></td></tr>)}</tbody></table></div>}
      <div className="monthly-action-row"><div><span className="metric-label">Total das despesas mensais</span><strong>{money(finance.monthlyExpenseTotal, currency)}</strong><small>Somente despesas padrão e personalizadas marcadas como mensais</small></div><button className="button danger" disabled={Boolean(mutation)} onClick={applyMonthly}>{mutation === 'apply' ? 'Aplicando…' : 'Aplicar despesas mensais'}</button></div>
    </section>
  </>
}
