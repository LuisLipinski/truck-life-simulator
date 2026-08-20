import { useMemo, useState } from 'react'
import { EXPENSE_LABELS, monthlyExpenseTotal } from '../../lib/phase1.js'

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function now() {
  return new Date().toLocaleString('pt-BR')
}

export default function FinancesTab({ state, commit }) {
  const [manualBalance, setManualBalance] = useState(state.balance)
  const [customName, setCustomName] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [customMonthly, setCustomMonthly] = useState(true)

  const baseMonthly = useMemo(
    () => Object.values(state.expenses || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [state.expenses],
  )
  const customMonthlyTotal = useMemo(
    () => (state.customExpenses || []).filter((item) => item.monthly).reduce((sum, item) => sum + Number(item.value || 0), 0),
    [state.customExpenses],
  )
  const totalMonthly = monthlyExpenseTotal(state)

  function updateExpense(key, value) {
    commit({ ...state, expenses: { ...state.expenses, [key]: Math.max(0, Number(value) || 0) } })
  }

  function applyManualBalance() {
    const nextBalance = Number(manualBalance)
    if (!Number.isFinite(nextBalance)) {
      window.alert('Informe um saldo válido.')
      return
    }
    const difference = nextBalance - Number(state.balance || 0)
    commit({
      ...state,
      balance: nextBalance,
      history: [
        ...(state.history || []),
        { date: now(), type: 'Ajuste', desc: 'Ajuste manual de saldo', value: difference, amount: difference, balance: nextBalance },
      ],
    })
  }

  function addCustomExpense(event) {
    event.preventDefault()
    const value = Number(customValue)
    if (!customName.trim() || !Number.isFinite(value) || value < 0) {
      window.alert('Informe nome e valor válido para o gasto.')
      return
    }
    commit({
      ...state,
      customExpenses: [
        ...(state.customExpenses || []),
        { id: `exp_${Date.now()}`, name: customName.trim(), value, monthly: customMonthly },
      ],
    })
    setCustomName('')
    setCustomValue('')
    setCustomMonthly(true)
  }

  function toggleCustom(id, monthly) {
    commit({
      ...state,
      customExpenses: (state.customExpenses || []).map((item) => item.id === id ? { ...item, monthly } : item),
    })
  }

  function deleteCustom(id) {
    commit({ ...state, customExpenses: (state.customExpenses || []).filter((item) => item.id !== id) })
  }

  function applyMonthlyExpenses() {
    if (!window.confirm(`Aplicar ${money(totalMonthly)} de despesas mensais agora? Esse valor será descontado do saldo.`)) return
    const nextBalance = Number(state.balance || 0) - totalMonthly
    commit({
      ...state,
      balance: nextBalance,
      history: [
        ...(state.history || []),
        { date: now(), type: 'Despesa', desc: 'Despesas mensais aplicadas', value: -totalMonthly, amount: -totalMonthly, balance: nextBalance },
      ],
    })
    setManualBalance(nextBalance)
  }

  return (
    <>
      <section className="phase1-status-grid finance-summary-grid">
        <article className="panel phase1-metric"><span className="metric-label">Saldo atual</span><strong className="metric-value">{money(state.balance)}</strong><span className="metric-detail">Conta pessoal da carreira</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Despesas padrão</span><strong className="metric-value">{money(baseMonthly)}</strong><span className="metric-detail">Por mês</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Personalizadas mensais</span><strong className="metric-value">{money(customMonthlyTotal)}</strong><span className="metric-detail">Por mês</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Total mensal</span><strong className="metric-value">{money(totalMonthly)}</strong><span className="metric-detail">Estimativa atual</span></article>
      </section>

      <div className="phase1-two-panel finance-layout">
        <section className="panel finance-card">
          <div className="section-heading compact-heading">
            <span className="eyebrow">Conta pessoal</span>
            <h2>Saldo</h2>
            <p>Use ajuste manual apenas para corrigir ou sincronizar a simulação.</p>
          </div>
          <label>Saldo atual</label>
          <input type="number" step="0.01" value={manualBalance} onChange={(event) => setManualBalance(event.target.value)} />
          <button className="button secondary full-button" type="button" onClick={applyManualBalance}>Atualizar saldo</button>
        </section>

        <section className="panel finance-card expenses-card">
          <div className="section-heading compact-heading">
            <span className="eyebrow">Vida pessoal</span>
            <h2>Despesas mensais</h2>
            <p>Edite os valores que representam o custo de vida atual do motorista.</p>
          </div>
          <div className="expense-fields-grid">
            {Object.entries(state.expenses || {}).map(([key, value]) => (
              <div key={key} className="expense-field">
                <label>{EXPENSE_LABELS[key] || key}</label>
                <input type="number" min="0" step="0.01" value={value} onChange={(event) => updateExpense(key, event.target.value)} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel custom-expenses-panel">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Gastos personalizados</span>
          <h2>Outras despesas</h2>
          <p>Cadastre gastos extras e escolha se entram ou não no desconto mensal automático.</p>
        </div>
        <form className="inline-form-grid" onSubmit={addCustomExpense}>
          <div><label>Nome do gasto</label><input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Ex.: Academia, lavanderia" /></div>
          <div><label>Valor</label><input type="number" min="0" step="0.01" value={customValue} onChange={(event) => setCustomValue(event.target.value)} placeholder="0.00" /></div>
          <label className="check-field"><input type="checkbox" checked={customMonthly} onChange={(event) => setCustomMonthly(event.target.checked)} /> Incluir no desconto mensal</label>
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
          <div><span className="metric-label">Total a descontar</span><strong>{money(totalMonthly)}</strong></div>
          <button className="button danger" type="button" onClick={applyMonthlyExpenses}>Aplicar despesas mensais</button>
        </div>
      </section>
    </>
  )
}
