import { useMemo, useState } from 'react'
import {
  EMERGENCY_RESERVE_ANNUAL_YIELD,
  EXPENSE_LABELS,
  emergencyReserveContribution,
  monthlyExpenseTotal,
} from '../../lib/phase1.js'
import { useToast } from '../ToastProvider.jsx'

const EXPENSE_TIPS = {
  rent: 'Aluguel mensal da moradia do motorista. Ajuste quando houver mudança de apartamento ou de valor.',
  groceries: 'Orçamento mensal para mercado e alimentação em casa.',
  phone: 'Plano de celular e linha telefônica usados pelo motorista.',
  internet: 'Internet residencial mensal da simulação.',
  transit: 'Transporte pessoal fora do caminhão da empresa, como ônibus, metrô ou corridas ocasionais.',
  emergency: 'Este valor não é uma despesa perdida. Ao aplicar as despesas mensais, ele é transferido do saldo disponível para a Reserva de Emergência.',
}

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function now() {
  return new Date().toLocaleString('pt-BR')
}

function parseMoneyNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  const text = String(value ?? '').trim()
  if (!text || !/^-?\d+(?:[.,]\d{1,2})?$/.test(text)) return NaN
  const number = Number(text.replace(',', '.'))
  return Number.isFinite(number) ? number : NaN
}

function toCents(value) {
  const number = parseMoneyNumber(value)
  if (!Number.isFinite(number)) return NaN
  return Math.round((number + Number.EPSILON) * 100)
}

function fromCents(value) {
  return Number(value || 0) / 100
}

function moneyInput(value) {
  const cents = toCents(value)
  return Number.isFinite(cents) ? fromCents(cents).toFixed(2) : ''
}

function InfoTip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function TipLabel({ children, tip, className = '' }) {
  return <label className={`label-with-tip ${className}`.trim()}><span>{children}</span><InfoTip text={tip} /></label>
}

export default function FinancesTab({ state, commit }) {
  const toast = useToast()
  const [manualBalance, setManualBalance] = useState(() => moneyInput(state.balance))
  const [customName, setCustomName] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [customMonthly, setCustomMonthly] = useState(true)
  const [reserveDeposit, setReserveDeposit] = useState('')
  const [reserveUseAmount, setReserveUseAmount] = useState('')
  const [reserveUseReason, setReserveUseReason] = useState('')

  const reserveCents = Math.max(0, toCents(state.emergencyReserve || 0) || 0)
  const reserve = fromCents(reserveCents)
  const reserveContribution = fromCents(Math.max(0, toCents(emergencyReserveContribution(state)) || 0))
  const baseMonthly = useMemo(
    () => Object.entries(state.expenses || {}).filter(([key]) => key !== 'emergency').reduce((sum, [, value]) => sum + fromCents(Math.max(0, toCents(value) || 0)), 0),
    [state.expenses],
  )
  const customMonthlyTotal = useMemo(
    () => (state.customExpenses || []).filter((item) => item.monthly).reduce((sum, item) => sum + fromCents(Math.max(0, toCents(item.value) || 0)), 0),
    [state.customExpenses],
  )
  const totalMonthly = fromCents(toCents(monthlyExpenseTotal(state)) || 0)
  const totalAssets = fromCents((toCents(state.balance || 0) || 0) + reserveCents)

  function updateExpense(key, value) {
    const cents = toCents(value)
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error('Informe um valor monetário válido, com no máximo duas casas decimais.')
      return false
    }
    commit({ ...state, expenses: { ...state.expenses, [key]: fromCents(cents) } })
    return true
  }

  function applyManualBalance() {
    const nextBalanceCents = toCents(manualBalance)
    if (!Number.isFinite(nextBalanceCents)) {
      toast.error('Informe um saldo válido, com no máximo duas casas decimais.')
      return
    }
    const currentBalanceCents = toCents(state.balance || 0) || 0
    const nextBalance = fromCents(nextBalanceCents)
    const difference = fromCents(nextBalanceCents - currentBalanceCents)
    commit({
      ...state,
      balance: nextBalance,
      history: [
        ...(state.history || []),
        { date: now(), type: 'Ajuste', desc: 'Ajuste manual de saldo', value: difference, amount: difference, balance: nextBalance },
      ],
    })
    setManualBalance(moneyInput(nextBalance))
    toast.success(`Saldo atualizado para ${money(nextBalance)}.`)
  }

  function addToReserve() {
    const amountCents = toCents(reserveDeposit)
    const balanceCents = toCents(state.balance || 0)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error('Informe um valor válido para adicionar à reserva, com no máximo duas casas decimais.')
      return
    }
    if (!Number.isFinite(balanceCents) || amountCents > balanceCents) {
      toast.error('Saldo disponível insuficiente para esse aporte.')
      return
    }
    const amount = fromCents(amountCents)
    const nextBalance = fromCents(balanceCents - amountCents)
    const nextReserve = fromCents(reserveCents + amountCents)
    commit({
      ...state,
      balance: nextBalance,
      emergencyReserve: nextReserve,
      history: [
        ...(state.history || []),
        { date: now(), type: 'Reserva', desc: 'Aporte manual à reserva de emergência', value: -amount, amount: -amount, balance: nextBalance, reserve: nextReserve },
      ],
    })
    setManualBalance(moneyInput(nextBalance))
    setReserveDeposit('')
    toast.success(`${money(amount)} adicionados à reserva.`)
  }

  function useReserve(event) {
    event.preventDefault()
    const amountCents = toCents(reserveUseAmount)
    const reason = reserveUseReason.trim()
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error('Informe um valor válido para usar da reserva, com no máximo duas casas decimais.')
      return
    }
    if (!reason) {
      toast.error('Informe o motivo do uso da reserva.')
      return
    }
    if (amountCents > reserveCents) {
      toast.error(`O valor informado é maior que a reserva disponível de ${money(reserve)}.`)
      return
    }
    const amount = fromCents(amountCents)
    const nextReserve = fromCents(reserveCents - amountCents)
    const balanceCents = toCents(state.balance || 0) || 0
    const nextBalance = fromCents(balanceCents + amountCents)
    commit({
      ...state,
      balance: nextBalance,
      emergencyReserve: nextReserve,
      history: [
        ...(state.history || []),
        { date: now(), type: 'Reserva', desc: `Resgate da reserva — ${reason}`, value: amount, amount, balance: nextBalance, reserve: nextReserve },
      ],
    })
    setManualBalance(moneyInput(nextBalance))
    setReserveUseAmount('')
    setReserveUseReason('')
    toast.success(`${money(amount)} transferidos da reserva para o saldo disponível.`)
  }

  function addCustomExpense(event) {
    event.preventDefault()
    const valueCents = toCents(customValue)
    if (!customName.trim() || !Number.isFinite(valueCents) || valueCents < 0) {
      toast.error('Informe nome e valor válido para o gasto, com no máximo duas casas decimais.')
      return
    }
    const value = fromCents(valueCents)
    const expenseName = customName.trim()
    commit({
      ...state,
      customExpenses: [
        ...(state.customExpenses || []),
        { id: `exp_${Date.now()}`, name: expenseName, value, monthly: customMonthly },
      ],
    })
    setCustomName('')
    setCustomValue('')
    setCustomMonthly(true)
    toast.success(`Gasto “${expenseName}” adicionado.`)
  }

  function toggleCustom(id, monthly) {
    commit({
      ...state,
      customExpenses: (state.customExpenses || []).map((item) => item.id === id ? { ...item, monthly } : item),
    })
  }

  function deleteCustom(id) {
    const item = (state.customExpenses || []).find((expense) => expense.id === id)
    commit({ ...state, customExpenses: (state.customExpenses || []).filter((expense) => expense.id !== id) })
    toast.success(item ? `Gasto “${item.name}” excluído.` : 'Gasto excluído.')
  }

  function applyMonthlyExpenses() {
    const totalOutflowCents = (toCents(totalMonthly) || 0) + (toCents(reserveContribution) || 0)
    const totalOutflow = fromCents(totalOutflowCents)
    if (!window.confirm(`Aplicar ${money(totalMonthly)} de despesas mensais e transferir ${money(reserveContribution)} para a reserva? Saída total da conta: ${money(totalOutflow)}.`)) return
    const nextBalance = fromCents((toCents(state.balance || 0) || 0) - totalOutflowCents)
    const nextReserve = fromCents(reserveCents + (toCents(reserveContribution) || 0))
    commit({
      ...state,
      balance: nextBalance,
      emergencyReserve: nextReserve,
      history: [
        ...(state.history || []),
        { date: now(), type: 'Despesa', desc: 'Despesas mensais aplicadas', value: -totalMonthly, amount: -totalMonthly, balance: nextBalance },
        ...(reserveContribution > 0 ? [{ date: now(), type: 'Reserva', desc: 'Aporte mensal à reserva de emergência', value: -reserveContribution, amount: -reserveContribution, balance: nextBalance, reserve: nextReserve }] : []),
      ],
    })
    setManualBalance(moneyInput(nextBalance))
    toast.success(`Despesas mensais aplicadas. ${reserveContribution > 0 ? `${money(reserveContribution)} foram para a reserva.` : ''}`.trim())
  }

  return (
    <>
      <section className="phase1-status-grid finance-summary-grid">
        <article className="panel phase1-metric"><span className="metric-label">Saldo disponível</span><strong className="metric-value">{money(state.balance)}</strong><span className="metric-detail">Conta pessoal da carreira</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Reserva de emergência</span><strong className="metric-value">{money(reserve)}</strong><span className="metric-detail">Rende {(EMERGENCY_RESERVE_ANNUAL_YIELD * 100).toFixed(2)}% a.a.</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Patrimônio pessoal</span><strong className="metric-value">{money(totalAssets)}</strong><span className="metric-detail">Saldo + reserva</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Despesas mensais</span><strong className="metric-value">{money(totalMonthly)}</strong><span className="metric-detail">Não inclui o aporte à reserva</span></article>
      </section>

      <div className="phase1-two-panel finance-layout">
        <section className="panel finance-card">
          <div className="section-heading compact-heading">
            <span className="eyebrow">Conta pessoal</span>
            <h2>Saldo</h2>
            <p>Use ajuste manual apenas para corrigir ou sincronizar a simulação.</p>
          </div>
          <TipLabel tip="Altera diretamente o dinheiro disponível da carreira. Aceita vírgula ou ponto e salva sempre com duas casas decimais.">Saldo atual</TipLabel>
          <input type="text" inputMode="decimal" value={manualBalance} onChange={(event) => setManualBalance(event.target.value)} placeholder="0.00" />
          <button className="button secondary full-button" type="button" onClick={applyManualBalance}>Atualizar saldo</button>
        </section>

        <section className="panel finance-card reserve-card">
          <div className="section-heading compact-heading">
            <span className="eyebrow">Reserva de emergência</span>
            <h2>{money(reserve)}</h2>
            <p>Dinheiro separado do saldo disponível. O rendimento é creditado semanalmente quando o holerite é fechado.</p>
          </div>
          <div className="reserve-rate-note">Taxa simulada: <strong>{(EMERGENCY_RESERVE_ANNUAL_YIELD * 100).toFixed(2)}% ao ano</strong> ≈ <strong>{(EMERGENCY_RESERVE_ANNUAL_YIELD / 52 * 100).toFixed(4)}% por semana</strong>.</div>
          <TipLabel tip="Transfere dinheiro da conta pessoal para a reserva. Aceita vírgula ou ponto e usa no máximo duas casas decimais.">Adicionar à reserva</TipLabel>
          <div className="reserve-inline-action"><input type="text" inputMode="decimal" value={reserveDeposit} onChange={(event) => setReserveDeposit(event.target.value)} placeholder="0.00" /><button className="button secondary" type="button" onClick={addToReserve}>Adicionar</button></div>
          <form className="reserve-use-form" onSubmit={useReserve}>
            <TipLabel tip="O valor sai da reserva e volta para o saldo disponível. Aceita vírgula ou ponto e usa no máximo duas casas decimais.">Usar reserva</TipLabel>
            <div className="reserve-inline-action"><input type="text" inputMode="decimal" value={reserveUseAmount} onChange={(event) => setReserveUseAmount(event.target.value)} placeholder="Valor" /><button className="button primary" type="submit">Usar reserva</button></div>
            <input value={reserveUseReason} onChange={(event) => setReserveUseReason(event.target.value)} placeholder="Motivo do resgate" />
          </form>
        </section>
      </div>

      <section className="panel finance-card expenses-card monthly-expenses-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Vida pessoal</span>
          <h2>Despesas mensais</h2>
          <p>Edite os valores do custo de vida. Valores monetários aceitam vírgula ou ponto e são salvos com duas casas decimais.</p>
        </div>
        <div className="expense-fields-grid">
          {Object.entries(state.expenses || {}).map(([key, value]) => (
            <div key={key} className="expense-field">
              <TipLabel tip={EXPENSE_TIPS[key] || 'Valor mensal desta despesa pessoal. Ele entra no total quando você aplicar as despesas mensais.'}>{EXPENSE_LABELS[key] || key}</TipLabel>
              <input type="text" inputMode="decimal" defaultValue={moneyInput(value)} onBlur={(event) => { if (updateExpense(key, event.target.value)) event.target.value = moneyInput(event.target.value); else event.target.value = moneyInput(value) }} />
            </div>
          ))}
        </div>
        <div className="reserve-transfer-preview"><span>Despesas reais: <strong>{money(totalMonthly)}</strong></span><span>Aporte à reserva: <strong>{money(reserveContribution)}</strong></span><span>Saída total da conta: <strong>{money(totalMonthly + reserveContribution)}</strong></span></div>
      </section>

      <section className="panel custom-expenses-panel">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Gastos personalizados</span>
          <h2>Outras despesas</h2>
          <p>Cadastre gastos extras e escolha se entram ou não no desconto mensal automático.</p>
        </div>
        <form className="inline-form-grid" onSubmit={addCustomExpense}>
          <div><TipLabel tip="Nome livre para identificar um custo que não existe na lista padrão, como academia, lavanderia ou assinatura.">Nome do gasto</TipLabel><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Ex.: Academia, lavanderia" /></div>
          <div><TipLabel tip="Valor deste gasto personalizado. Aceita vírgula ou ponto e usa no máximo duas casas decimais.">Valor</TipLabel><input type="text" inputMode="decimal" value={customValue} onChange={(event) => setCustomValue(event.target.value)} placeholder="0.00" /></div>
          <label className="check-field"><input type="checkbox" checked={customMonthly} onChange={(event) => setCustomMonthly(event.target.checked)} /> Incluir no desconto mensal <InfoTip text="Marcado: esse gasto entra no botão Aplicar despesas mensais. Desmarcado: ele não será cobrado automaticamente no fechamento mensal." /></label>
          <button className="button secondary" type="submit">Adicionar gasto</button>
        </form>

        {(state.customExpenses || []).length > 0 && (
          <div className="responsive-table compact-table">
            <table>
              <thead><tr><th>Gasto</th><th>Valor</th><th>Mensal</th><th></th></tr></thead>
              <tbody>
                {state.customExpenses.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{money(item.value)}</td>
                    <td><input className="table-checkbox" type="checkbox" checked={Boolean(item.monthly)} onChange={(event) => toggleCustom(item.id, event.target.checked)} /></td>
                    <td><button className="table-delete" type="button" onClick={() => deleteCustom(item.id)}>Excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="monthly-action-row">
          <div><span className="metric-label">Saída mensal da conta</span><strong>{money(totalMonthly + reserveContribution)}</strong><small>{money(totalMonthly)} em despesas + {money(reserveContribution)} para a reserva</small></div>
          <button className="button danger" type="button" onClick={applyMonthlyExpenses}>Aplicar despesas mensais</button>
        </div>
      </section>
    </>
  )
}
