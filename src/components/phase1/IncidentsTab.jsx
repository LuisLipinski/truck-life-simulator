import { useMemo, useState } from 'react'
import { pendingIncidentTotal } from '../../lib/phase1.js'
import { formatMoney } from '../../config/games.js'
import { useGame } from '../GameContext.jsx'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useToast } from '../ToastProvider.jsx'

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function Label({ children, tip }) {
  return <label className="label-with-tip"><span>{children}</span><Tip text={tip} /></label>
}

export default function IncidentsTab({ state, commit }) {
  const game = useGame()
  const money = (value) => formatMoney(value, game)
  const toast = useToast()
  const confirm = useConfirm()
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
      toast.error('Informe a descrição da ocorrência e um valor maior que zero.')
      return
    }

    const route = resolveRoute()
    const incident = {
      id: Date.now(), type, amount: value, date, time, route, description: description.trim(), chargeMethod,
      status: chargeMethod === 'balance' ? 'Pago pelo saldo' : 'Pendente no holerite',
      remaining: chargeMethod === 'payslip' ? value : 0,
      createdAt: new Date().toLocaleString('pt-BR'),
    }

    let nextBalance = Number(state.balance || 0)
    const nextHistory = [...(state.history || [])]
    if (chargeMethod === 'balance') {
      nextBalance -= value
      nextHistory.push({ date: new Date().toLocaleString('pt-BR'), type, desc: `${incident.description} — ${route}`, value: -value, amount: -value, balance: nextBalance })
    }

    commit({ ...state, balance: nextBalance, incidents: [...(state.incidents || []), incident], history: nextHistory })
    setAmount(''); setDescription(''); setManualRoute(''); setRouteMode('manual')
    toast.success(chargeMethod === 'balance' ? `Ocorrência registrada e ${money(value)} descontados do saldo.` : `Ocorrência registrada. ${money(value)} ficará pendente para o holerite.`)
  }

  async function removeIncident(incident) {
    if (incident.chargeMethod === 'balance') {
      toast.error('Uma ocorrência já descontada diretamente do saldo não pode ser excluída para evitar divergência financeira.')
      return
    }
    if (Number(incident.remaining || 0) < Number(incident.amount || 0)) {
      toast.error('Esta ocorrência já teve parte descontada em holerite e não pode ser excluída.')
      return
    }
    const confirmed = await confirm({
      title: 'Excluir ocorrência pendente?',
      message: `“${incident.description || incident.type || 'Ocorrência'}” (${money(incident.amount)}) será removida e não entrará no próximo holerite.`,
      confirmLabel: 'Excluir ocorrência',
      tone: 'danger',
    })
    if (!confirmed) return
    commit({ ...state, incidents: (state.incidents || []).filter((item) => Number(item.id) !== Number(incident.id)) })
    toast.success('Ocorrência pendente excluída com sucesso.')
  }

  return (
    <>
      <section className="phase1-status-grid incident-summary-grid">
        <article className="panel phase1-metric"><span className="metric-label line-label-with-tip">Pendências <Tip text="Soma dos valores que ainda serão descontados dos próximos holerites." /></span><strong className="metric-value">{money(pending)}</strong><span className="metric-detail">Para próximos holerites</span></article>
        <article className="panel phase1-metric"><span className="metric-label line-label-with-tip">Ocorrências <Tip text="Quantidade total de infrações, acidentes e outras cobranças registradas nesta carreira." /></span><strong className="metric-value">{(state.incidents || []).length}</strong><span className="metric-detail">Total registrado</span></article>
      </section>

      <section className="panel incident-form-card" data-tour="incident-form">
        <div className="section-heading compact-heading"><span className="eyebrow">Registro financeiro</span><h2>Nova infração ou acidente</h2><p>Escolha desconto imediato no saldo ou cobrança no próximo holerite.</p></div>
        <form onSubmit={submit}>
          <div className="two-columns">
            <div><Label tip="Classifica a ocorrência para facilitar o histórico. Não altera as regras de promoção.">Tipo</Label><select value={type} onChange={(e) => setType(e.target.value)}><option>Infração</option><option>Acidente</option><option>Pedágio / cobrança</option><option>Outra ocorrência</option></select></div>
            <div><Label tip="Valor financeiro da multa, dano ou cobrança que será abatido do saldo ou holerite.">Valor</Label><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>
          <div className="two-columns"><div><Label tip="Data em que a ocorrência aconteceu na sua simulação.">Data</Label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><Label tip="Horário aproximado da ocorrência. Pode ser deixado em branco se não souber.">Hora</Label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div></div>
          <Label tip="Você pode vincular a ocorrência a uma viagem já registrada ou informar a rota manualmente.">Rota relacionada</Label>
          <select value={routeMode} onChange={(e) => setRouteMode(e.target.value)}><option value="manual">Outra / informar manualmente</option>{trips.map((trip) => <option key={trip.id} value={`trip:${trip.id}`}>Semana {trip.week || 1} — {trip.origin} → {trip.destination}</option>)}</select>
          {routeMode === 'manual' && <><Label tip="Informe rodovia, cidades ou uma referência suficiente para lembrar onde ocorreu.">Rota</Label><input value={manualRoute} onChange={(e) => setManualRoute(e.target.value)} placeholder={game.id === 'ats' ? 'Ex.: I-5, Los Angeles → Bakersfield' : 'Ex.: A2, Berlin → Hannover'} /></>}
          <Label tip="Registre resumidamente o que aconteceu para manter o histórico da carreira compreensível.">Descrição</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o que aconteceu" />
          <Label tip="Saldo agora desconta imediatamente. Próximo holerite deixa a cobrança pendente e desconta no fechamento semanal, carregando eventual restante.">Método de cobrança</Label>
          <select value={chargeMethod} onChange={(e) => setChargeMethod(e.target.value)}><option value="balance">Descontar do saldo agora</option><option value="payslip">Descontar no próximo holerite</option></select>
          <button className="button danger full-button" type="submit">Registrar ocorrência</button>
        </form>
      </section>

      <section className="panel incidents-list-card" data-tour="incident-history">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico</span><h2>Infrações e acidentes</h2></div>
        {(state.incidents || []).length === 0 ? <div className="empty-inline">Nenhuma ocorrência registrada.</div> : <div className="responsive-table"><table><thead><tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Rota</th><th>Descrição</th><th>Valor</th><th>Cobrança</th><th>Status</th><th></th></tr></thead><tbody>{[...state.incidents].reverse().map((incident) => <tr key={incident.id}><td>{incident.date || '—'}</td><td>{incident.time || '—'}</td><td>{incident.type || '—'}</td><td>{incident.route || '—'}</td><td>{incident.description || '—'}</td><td>{money(incident.amount)}</td><td>{incident.chargeMethod === 'payslip' ? 'Próximo holerite' : 'Saldo imediato'}</td><td>{Number(incident.remaining || 0) > 0 ? `Pendente ${money(incident.remaining)}` : incident.status || 'Pago'}</td><td><button className="table-delete" type="button" onClick={() => removeIncident(incident)}>Excluir</button></td></tr>)}</tbody></table></div>}
      </section>
    </>
  )
}
