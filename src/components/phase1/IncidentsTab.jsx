import { useMemo, useState } from 'react'
import { pendingIncidentTotal } from '../../lib/phase1.js'

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function IncidentsTab({ state, commit }) {
  const [type, setType] = useState('Infração')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('')
  const [routeMode, setRouteMode] = useState('manual')
  const [manualRoute, setManualRoute] = useState('')
  const [description, setDescription] = useState('')
  const [chargeMethod, setChargeMethod] = useState('balance')

  const pending = pendingIncidentTotal(state)
  const trips = useMemo(() => [...(state.trips || [])].reverse(), [state.trips])

  function resolveRoute() {
    if (routeMode === 'manual') return manualRoute.trim() || 'Rota informada manualmente'
    const id = Number(String(routeMode).replace('trip:', ''))
    const trip = (state.trips || []).find((item) => Number(item.id) === id)
    return trip ? `${trip.origin} → ${trip.destination} • Semana ${trip.week || 1}` : 'Rota não encontrada'
  }

  function submit(event) {
    event.preventDefault()
    const value = Math.max(0, Number(amount) || 0)
    if (!description.trim() || value <= 0) {
      window.alert('Informe a descrição da ocorrência e um valor maior que zero.')
      return
    }

    const route = resolveRoute()
    const incident = {
      id: Date.now(),
      type,
      amount: value,
      date,
      time,
      route,
      description: description.trim(),
      chargeMethod,
      status: chargeMethod === 'balance' ? 'Pago pelo saldo' : 'Pendente no holerite',
      remaining: chargeMethod === 'payslip' ? value : 0,
      createdAt: new Date().toLocaleString('pt-BR'),
    }

    let nextBalance = Number(state.balance || 0)
    const nextHistory = [...(state.history || [])]
    if (chargeMethod === 'balance') {
      nextBalance -= value
      nextHistory.push({
        date: new Date().toLocaleString('pt-BR'),
        type,
        desc: `${incident.description} — ${route}`,
        value: -value,
        amount: -value,
        balance: nextBalance,
      })
    }

    commit({
      ...state,
      balance: nextBalance,
      incidents: [...(state.incidents || []), incident],
      history: nextHistory,
    })
    setAmount('')
    setDescription('')
    setManualRoute('')
    setRouteMode('manual')
  }

  function removeIncident(incident) {
    if (incident.chargeMethod === 'balance') {
      window.alert('Uma ocorrência já descontada diretamente do saldo não pode ser excluída para evitar divergência financeira.')
      return
    }
    if (Number(incident.remaining || 0) < Number(incident.amount || 0)) {
      window.alert('Esta ocorrência já teve parte descontada em holerite e não pode ser excluída.')
      return
    }
    if (!window.confirm('Excluir esta ocorrência pendente?')) return
    commit({ ...state, incidents: (state.incidents || []).filter((item) => Number(item.id) !== Number(incident.id)) })
  }

  return (
    <>
      <section className="phase1-status-grid incident-summary-grid">
        <article className="panel phase1-metric"><span className="metric-label">Pendências</span><strong className="metric-value">{money(pending)}</strong><span className="metric-detail">Para próximos holerites</span></article>
        <article className="panel phase1-metric"><span className="metric-label">Ocorrências</span><strong className="metric-value">{(state.incidents || []).length}</strong><span className="metric-detail">Total registrado</span></article>
      </section>

      <section className="panel incident-form-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Registro financeiro</span>
          <h2>Nova infração ou acidente</h2>
          <p>Escolha desconto imediato no saldo ou cobrança no próximo holerite.</p>
        </div>
        <form onSubmit={submit}>
          <div className="two-columns">
            <div><label>Tipo</label><select value={type} onChange={(event) => setType(event.target.value)}><option>Infração</option><option>Acidente</option><option>Pedágio / cobrança</option><option>Outra ocorrência</option></select></div>
            <div><label>Valor</label><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          </div>
          <div className="two-columns">
            <div><label>Data</label><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            <div><label>Hora</label><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div>
          </div>
          <label>Rota relacionada</label>
          <select value={routeMode} onChange={(event) => setRouteMode(event.target.value)}>
            <option value="manual">Outra / informar manualmente</option>
            {trips.map((trip) => <option key={trip.id} value={`trip:${trip.id}`}>Semana {trip.week || 1} — {trip.origin} → {trip.destination}</option>)}
          </select>
          {routeMode === 'manual' && <><label>Rota</label><input value={manualRoute} onChange={(event) => setManualRoute(event.target.value)} placeholder="Ex.: I-5, Los Angeles → Bakersfield" /></>}
          <label>Descrição</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o que aconteceu" />
          <label>Método de cobrança</label>
          <select value={chargeMethod} onChange={(event) => setChargeMethod(event.target.value)}>
            <option value="balance">Descontar do saldo agora</option>
            <option value="payslip">Descontar no próximo holerite</option>
          </select>
          <button className="button danger full-button" type="submit">Registrar ocorrência</button>
        </form>
      </section>

      <section className="panel incidents-list-card">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico</span><h2>Infrações e acidentes</h2></div>
        {(state.incidents || []).length === 0 ? <div className="empty-inline">Nenhuma ocorrência registrada.</div> : (
          <div className="responsive-table">
            <table>
              <thead><tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Rota</th><th>Descrição</th><th>Valor</th><th>Cobrança</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {[...state.incidents].reverse().map((incident) => (
                  <tr key={incident.id}>
                    <td>{incident.date || '—'}</td><td>{incident.time || '—'}</td><td>{incident.type || '—'}</td><td>{incident.route || '—'}</td><td>{incident.description || '—'}</td><td>{money(incident.amount)}</td><td>{incident.chargeMethod === 'payslip' ? 'Próximo holerite' : 'Saldo imediato'}</td><td>{Number(incident.remaining || 0) > 0 ? `Pendente ${money(incident.remaining)}` : incident.status || 'Pago'}</td><td><button className="table-delete" type="button" onClick={() => removeIncident(incident)}>Excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
