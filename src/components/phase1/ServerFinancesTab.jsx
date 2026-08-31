import { useEffect, useMemo, useState } from 'react'
import { formatMoney } from '../../config/games.js'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { financeApi } from '../../lib/financeApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

const EXPENSE_TIPS = {
  RENT: 'Aluguel mensal da moradia do motorista.',
  GROCERIES: 'Orçamento mensal para mercado e alimentação em casa.',
  PHONE: 'Plano de celular e linha telefônica usados pelo motorista.',
  INTERNET: 'Internet residencial mensal da simulação.',
  TRANSIT: 'Transporte pessoal fora do caminhão da empresa.',
}

function parseMoney(value) {
  const text = String(value ?? '').trim()
  if (!text || !/^-?\d+(?:[.,]\d{1,2})?$/.test(text)) return NaN
  return Math.round(Number(text.replace(',', '.')) * 100) / 100
}

function moneyInput(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : ''
}

function operationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`
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
  const money = (value) => formatMoney(value, game)
  const [finance, setFinance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [manualBalance, setManualBalance] = useState('')
  const [customName, setCustomName] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [customIncluded, setCustomIncluded] = useState(true)
  const [reserveDeposit, setReserveDeposit] = useState('')
  const [reserveUseAmount, setReserveUseAmount] = useState('')
  const [reserveUseReason, setReserveUseReason] = useState('')

  const context = (source = finance) => ({
    expectedOperationalWeek: Number(source?.currentOperationalWeek || career.currentOperationalWeek || 1),
    expectedPayrollMonth: game.id === 'ets2' ? Number(source?.currentPayrollMonth || career.currentPayrollMonth || 1) : null,
  })

  async function refreshCareer() {
    try {
      const server = await careerApi.get(game.id, career.serverCareerId)
      setServerCareerSnapshot(game.id, career.id, server)
      window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
        detail: { careerId: career.id, gameId: game.id, source: 'server-finance' },
      }))
    } catch {
      // A mutação financeira já pode estar confirmada; o perfil será atualizado no próximo sync.
    }
  }

  async function load() {
    const response = await financeApi.get(game.id, career.serverCareerId)
    setFinance(response)
    setManualBalance(moneyInput(response.balance))
    return response
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    financeApi.get(game.id, career.serverCareerId)
      .then((response) => {
        if (cancelled) return
        setFinance(response)
        setManualBalance(moneyInput(response.balance))
      })
      .catch((error) => {
        if (!cancelled) toast.error(error?.message || 'Não foi possível carregar os dados financeiros do servidor.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [career.serverCareerId, game.id])

  const reserve = finance?.emergencyReserve
  const totalAssets = Number(finance?.balance || 0) + Number(reserve?.balance || 0)
  const expenses = finance?.expenses || []
  const standardExpenses = expenses.filter((item) => item.type === 'STANDARD')
  const customExpenses = expenses.filter((item) => item.type === 'CUSTOM')
  const includedTotal = useMemo(() => Number(finance?.monthlyExpenseTotal || 0), [finance?.monthlyExpenseTotal])

  async function runMutation(action, confirmed, successText, afterSuccess) {
    if (saving) return false
    setSaving(true)
    const before = finance
    try {
      const response = await action(before)
      setFinance(response)
      setManualBalance(moneyInput(response.balance))
      await refreshCareer()
      afterSuccess?.(response)
      toast.success(successText)
      return true
    } catch (error) {
      try {
        const current = await financeApi.get(game.id, career.serverCareerId)
        setFinance(current)
        setManualBalance(moneyInput(current.balance))
        if (confirmed?.(current, before)) {
          await refreshCareer()
          afterSuccess?.(current)
          toast.info(`${successText} A confirmação veio da ressincronização do servidor.`)
          return true
        }
      } catch {
        // Mantém a falha principal abaixo.
      }
      toast.error(error?.message || 'A alteração financeira não pôde ser confirmada no servidor.', {
        title: 'Alteração não concluída',
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  async function applyManualBalance() {
    const nextBalance = parseMoney(manualBalance)
    if (!Number.isFinite(nextBalance)) {
      toast.error('Informe um saldo válido, com no máximo duas casas decimais.')
      return
    }
    const previous = Number(finance.balance)
    if (nextBalance === previous) {
      toast.info('O saldo informado já é o saldo atual.')
      return
    }
    const payload = {
      operationId: operationId(),
      ...context(),
      expectedBalance: previous,
      newBalance: nextBalance,
      note: 'Ajuste manual pelo simulador',
    }
    await runMutation(async () => {
      await financeApi.adjustBalance(game.id, career.serverCareerId, payload)
      return financeApi.get(game.id, career.serverCareerId)
    }, (current) => Number(current.balance) === nextBalance, `Saldo atualizado para ${money(nextBalance)}.`)
  }

  async function addToReserve() {
    const amount = parseMoney(reserveDeposit)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor válido para adicionar à reserva.')
      return
    }
    if (amount > Number(finance.balance)) {
      toast.error('Saldo disponível insuficiente para esse aporte.')
      return
    }
    const beforeBalance = Number(finance.balance)
    const beforeReserve = Number(reserve.balance)
    const payload = { operationId: operationId(), ...context(), amount }
    await runMutation(
      () => financeApi.depositReserve(game.id, career.serverCareerId, payload),
      (current) => Number(current.balance) === Math.round((beforeBalance - amount) * 100) / 100
        && Number(current.emergencyReserve?.balance) === Math.round((beforeReserve + amount) * 100) / 100,
      `${money(amount)} adicionados à reserva.`,
      () => setReserveDeposit(''),
    )
  }

  async function useReserve(event) {
    event.preventDefault()
    const amount = parseMoney(reserveUseAmount)
    const reason = reserveUseReason.trim()
    if (!Number.isFinite(amount) || amount <= 0) return toast.error('Informe um valor válido para usar da reserva.')
    if (!reason) return toast.error('Informe o motivo do uso da reserva.')
    if (amount > Number(reserve.balance)) return toast.error(`O valor informado é maior que a reserva disponível de ${money(reserve.balance)}.`)
    const beforeBalance = Number(finance.balance)
    const beforeReserve = Number(reserve.balance)
    const payload = { operationId: operationId(), ...context(), amount, reason }
    await runMutation(
      () => financeApi.withdrawReserve(game.id, career.serverCareerId, payload),
      (current) => Number(current.balance) === Math.round((beforeBalance + amount) * 100) / 100
        && Number(current.emergencyReserve?.balance) === Math.round((beforeReserve - amount) * 100) / 100,
      `${money(amount)} transferidos da reserva para o saldo disponível.`,
      () => { setReserveUseAmount(''); setReserveUseReason('') },
    )
  }

  async function updateExpense(expense, patch) {
    const next = { ...expense, ...patch }
    const amount = parseMoney(next.amount)
    if (!Number.isFinite(amount) || amount < 0) return toast.error('Informe um valor monetário válido.')
    const payload = { ...context(), name: next.type === 'CUSTOM' ? next.name : null, amount, included: Boolean(next.included) }
    await runMutation(
      () => financeApi.updateExpense(game.id, career.serverCareerId, expense.id, payload),
      (current) => current.expenses?.some((item) => item.id === expense.id
        && Number(item.amount) === amount && Boolean(item.included) === Boolean(next.included)),
      `Despesa “${next.name}” atualizada no servidor.`,
    )
  }

  async function addCustomExpense(event) {
    event.preventDefault()
    const name = customName.trim()
    const amount = parseMoney(customValue)
    if (!name || !Number.isFinite(amount) || amount < 0) return toast.error('Informe nome e valor válido para o gasto.')
    const beforeIds = new Set(customExpenses.map((item) => item.id))
    const payload = { ...context(), name, amount, included: customIncluded }
    await runMutation(
      () => financeApi.createExpense(game.id, career.serverCareerId, payload),
      (current) => current.expenses?.some((item) => !beforeIds.has(item.id) && item.type === 'CUSTOM'
        && item.name === name && Number(item.amount) === amount && Boolean(item.included) === customIncluded),
      `Gasto “${name}” adicionado.`,
      () => { setCustomName(''); setCustomValue(''); setCustomIncluded(true) },
    )
  }

  async function deleteCustom(expense) {
    const confirmed = await confirm({
      title: 'Excluir gasto personalizado?',
      message: `O gasto “${expense.name}” será removido das despesas mensais.`,
      confirmLabel: 'Excluir gasto',
      tone: 'danger',
    })
    if (!confirmed) return
    await runMutation(
      () => financeApi.deleteExpense(game.id, career.serverCareerId, expense.id,
        context().expectedOperationalWeek, context().expectedPayrollMonth),
      (current) => !current.expenses?.some((item) => item.id === expense.id),
      `Gasto “${expense.name}” excluído.`,
    )
  }

  async function applyMonthlyExpenses() {
    const total = Number(finance.monthlyExpenseTotal || 0)
    const confirmed = await confirm({
      title: 'Aplicar despesas mensais?',
      message: `${money(total)} serão descontados do saldo pelas despesas selecionadas. A reserva não será alterada.`,
      confirmLabel: 'Aplicar despesas',
      tone: 'warning',
    })
    if (!confirmed) return
    const expectedBalance = Math.round((Number(finance.balance) - total) * 100) / 100
    const payload = { operationId: operationId(), ...context() }
    await runMutation(
      () => financeApi.applyExpenses(game.id, career.serverCareerId, payload),
      (current) => Number(current.balance) === expectedBalance,
      `${money(total)} em despesas mensais foram descontados do saldo.`,
    )
  }

  if (loading) return <section className="panel"><div className="empty-inline">Carregando saldo, despesas e reserva do servidor…</div></section>
  if (!finance) return <section className="panel"><div className="empty-inline">Os dados financeiros server-side não estão disponíveis agora.</div><button className="button secondary compact" type="button" onClick={() => load().catch(() => {})}>Tentar novamente</button></section>

  const annualRate = Number(reserve?.annualYieldRate || 0)
  return (
    <>
      <section className="notice-box" role="status"><strong>Finanças conectadas ao servidor</strong><span>Saldo, despesas e reserva abaixo são lidos e alterados no backend. O backup local não recebe essas movimentações.</span></section>
      <section className="phase1-status-grid finance-summary-grid" data-tour="finance-summary">
        <article className="panel phase1-metric"><span className="metric-label">Saldo disponível</span><strong className="metric-value">{money(finance.balance)}</strong><span className="metric-detail">Conta pessoal da carreira</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Reserva de emergência</span><strong className="metric-value">{money(reserve.balance)}</strong><span className="metric-detail">Rende {(annualRate * 100).toFixed(2)}% a.a.</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Patrimônio pessoal</span><strong className="metric-value">{money(totalAssets)}</strong><span className="metric-detail">Saldo + reserva</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Despesas mensais</span><strong className="metric-value">{money(includedTotal)}</strong><span className="metric-detail">Padrão + personalizadas incluídas</span></article>
      </section>

      <div className="phase1-two-panel finance-layout">
        <section className="panel finance-card" data-tour="balance-tools">
          <div className="section-heading compact-heading"><span className="eyebrow">Conta pessoal</span><h2>Saldo</h2><p>Use ajuste manual apenas para corrigir ou sincronizar a simulação. O ajuste fica auditado no ledger.</p></div>
          <TipLabel tip="Altera o saldo server-side e registra uma movimentação auditável.">Saldo atual</TipLabel>
          <input type="text" inputMode="decimal" value={manualBalance} disabled={saving} onChange={(event) => setManualBalance(event.target.value)} />
          <button className="button secondary full-button" type="button" disabled={saving} onClick={applyManualBalance}>{saving ? 'Salvando…' : 'Atualizar saldo'}</button>
        </section>

        <section className="panel finance-card reserve-card" data-tour="reserve-tools">
          <div className="section-heading compact-heading"><span className="eyebrow">Reserva de emergência</span><h2>{money(reserve.balance)}</h2><p>Dinheiro separado do saldo disponível. Aporte e resgate são registrados no servidor.</p></div>
          <div className="reserve-rate-note">Taxa simulada: <strong>{(annualRate * 100).toFixed(2)}% ao ano</strong>.</div>
          <TipLabel tip="Transfere dinheiro do saldo server-side para a reserva.">Adicionar à reserva</TipLabel>
          <div className="reserve-inline-action"><input type="text" inputMode="decimal" value={reserveDeposit} disabled={saving} onChange={(event) => setReserveDeposit(event.target.value)} placeholder="0.00" /><button className="button secondary" type="button" disabled={saving} onClick={addToReserve}>Adicionar</button></div>
          <form className="reserve-use-form" onSubmit={useReserve}>
            <TipLabel tip="O valor sai da reserva e volta para o saldo server-side.">Usar reserva</TipLabel>
            <div className="reserve-inline-action"><input type="text" inputMode="decimal" value={reserveUseAmount} disabled={saving} onChange={(event) => setReserveUseAmount(event.target.value)} placeholder="Valor" /><button className="button primary" type="submit" disabled={saving}>Usar reserva</button></div>
            <input value={reserveUseReason} disabled={saving} onChange={(event) => setReserveUseReason(event.target.value)} placeholder="Motivo do resgate" />
          </form>
        </section>
      </div>

      <section className="panel finance-card expenses-card monthly-expenses-card" data-tour="monthly-expenses">
        <div className="section-heading compact-heading"><span className="eyebrow">Vida pessoal</span><h2>Despesas mensais</h2><p>Os valores abaixo vêm do backend e podem ser editados como antes.</p></div>
        <div className="expense-fields-grid">
          {standardExpenses.map((expense) => (
            <div key={expense.id} className="expense-field">
              <TipLabel tip={EXPENSE_TIPS[expense.category] || 'Valor mensal desta despesa pessoal.'}>{expense.name}</TipLabel>
              <input type="text" inputMode="decimal" defaultValue={moneyInput(expense.amount)} disabled={saving} onBlur={(event) => updateExpense(expense, { amount: event.target.value })} />
              <label className="check-field"><input type="checkbox" checked={Boolean(expense.included)} disabled={saving} onChange={(event) => updateExpense(expense, { included: event.target.checked })} /> Incluir no desconto mensal</label>
            </div>
          ))}
        </div>
      </section>

      <section className="panel custom-expenses-panel" data-tour="custom-expenses">
        <div className="section-heading compact-heading"><span className="eyebrow">Gastos personalizados</span><h2>Outras despesas</h2><p>Cadastre gastos extras e escolha se entram no desconto mensal.</p></div>
        <form className="inline-form-grid" onSubmit={addCustomExpense}>
          <div><TipLabel tip="Nome livre para identificar o gasto.">Nome do gasto</TipLabel><input value={customName} disabled={saving} onChange={(event) => setCustomName(event.target.value)} placeholder="Ex.: Academia, lavanderia" /></div>
          <div><TipLabel tip="Valor mensal do gasto personalizado.">Valor</TipLabel><input type="text" inputMode="decimal" value={customValue} disabled={saving} onChange={(event) => setCustomValue(event.target.value)} placeholder="0.00" /></div>
          <label className="check-field"><input type="checkbox" checked={customIncluded} disabled={saving} onChange={(event) => setCustomIncluded(event.target.checked)} /> Incluir no desconto mensal</label>
          <button className="button secondary" type="submit" disabled={saving}>Adicionar gasto</button>
        </form>
        {customExpenses.length > 0 && <div className="responsive-table compact-table"><table><thead><tr><th>Gasto</th><th>Valor</th><th>Mensal</th><th></th></tr></thead><tbody>
          {customExpenses.map((expense) => <tr key={expense.id}><td>{expense.name}</td><td>{money(expense.amount)}</td><td><input className="table-checkbox" type="checkbox" checked={Boolean(expense.included)} disabled={saving} onChange={(event) => updateExpense(expense, { included: event.target.checked })} /></td><td><button className="table-delete" type="button" disabled={saving} onClick={() => deleteCustom(expense)}>Excluir</button></td></tr>)}
        </tbody></table></div>}
        <div className="monthly-action-row"><div><span className="metric-label">Total das despesas mensais</span><strong>{money(includedTotal)}</strong><small>Somente despesas marcadas como incluídas</small></div><button className="button danger" type="button" disabled={saving || includedTotal <= 0} onClick={applyMonthlyExpenses}>Aplicar despesas mensais</button></div>
      </section>
    </>
  )
}
