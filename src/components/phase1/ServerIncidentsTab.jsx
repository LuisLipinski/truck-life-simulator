import { useEffect, useMemo, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { incidentApi } from '../../lib/incidentApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { formatMoney } from '../../config/games.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

const TYPES = [
  ['INFRACTION', 'Infração'],
  ['ACCIDENT', 'Acidente'],
  ['TOLL_CHARGE', 'Pedágio / cobrança'],
  ['OTHER', 'Outra ocorrência'],
]

const TYPE_LABEL = Object.fromEntries(TYPES)

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function Label({ children, tip }) {
  return <label className="label-with-tip"><span>{children}</span><Tip text={tip} /></label>
}

function statusText(incident, money) {
  const remaining = Number(incident?.remainingAmount || 0)
  switch (incident?.status) {
    case 'CANCELLED': return 'Cancelada'
    case 'PAID_BALANCE': return 'Pago pelo saldo'
    case 'DEDUCTED_PAYSLIP': return 'Descontado em holerite'
    case 'PARTIALLY_DEDUCTED': return `Pendente ${money(remaining)}`
    case 'PENDING_PAYSLIP': return `Pendente ${money(remaining)}`
    default: return remaining > 0 ? `Pendente ${money(remaining)}` : 'Pago'
  }
}

export default function ServerIncidentsTab({ career, state }) {
  const game = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const money = (value) => formatMoney(value, game)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mutation, setMutation] = useState(false)
  const [type, setType] = useState('INFRACTION')
  const [amount, setAmount] = useState('')
  const [routeMode, setRouteMode] = useState('manual')
  const [manualRoute, setManualRoute] = useState('')
  const [description, setDescription] = useState('')
  const [chargeMethod, setChargeMethod] = useState('BALANCE')

  const trips = useMemo(() => [...(state?.trips || [])].reverse(), [state?.trips])
  const pending = useMemo(() => incidents.reduce((total, incident) => (
    incident.status === 'CANCELLED' ? total : total + Number(incident.remainingAmount || 0)
  ), 0), [incidents])

  function notifyCareerUpdated() {
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
      detail: { careerId: career.id, gameId: game.id, source: 'server-incidents' },
    }))
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
      const next = await incidentApi.list(game.id, career.serverCareerId)
      setIncidents(Array.isArray(next) ? next : [])
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
    incidentApi.list(game.id, career.serverCareerId)
      .then((next) => { if (active) setIncidents(Array.isArray(next) ? next : []) })
      .catch((nextError) => { if (active) setError(nextError) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [career.serverCareerId, game.id])

  async function submit(event) {
    event.preventDefault()
    if (mutation) return
    const value = Number(String(amount).replace(',', '.'))
    if (!description.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error('Informe a descrição da ocorrência e um valor maior que zero.')
      return
    }

    const selectedTripId = routeMode.startsWith('trip:') ? routeMode.slice(5) : null
    setMutation(true)
    try {
      const created = await incidentApi.create(game.id, career.serverCareerId, {
        expectedOperationalWeek: Number(career.currentOperationalWeek || state?.currentWeek || 1),
        type,
        amount: value.toFixed(2),
        relatedTripId: selectedTripId,
        route: selectedTripId ? null : (manualRoute.trim() || null),
        description: description.trim(),
        chargeMethod,
      })
      setIncidents((current) => [created, ...current.filter((item) => item.id !== created.id)])
      setAmount('')
      setDescription('')
      setManualRoute('')
      setRouteMode('manual')
      try {
        await refreshCareer()
      } catch {
        toast.warning('A ocorrência foi salva no servidor, mas o saldo do cabeçalho será atualizado na próxima recarga.')
      }
      toast.success(chargeMethod === 'BALANCE'
        ? `Ocorrência registrada e ${money(value)} descontados do saldo.`
        : `Ocorrência registrada. ${money(value)} ficará pendente para o holerite.`)
    } catch (nextError) {
      toast.error(nextError?.message || 'Não foi possível registrar a ocorrência no servidor.')
      try { await load({ quiet: true }) } catch { /* preserva a mensagem principal */ }
    } finally {
      setMutation(false)
    }
  }

  async function cancelIncident(incident) {
    if (mutation) return
    const remaining = Number(incident.remainingAmount || 0)
    const original = Number(incident.amount || 0)
    if (incident.chargeMethod !== 'PAYSLIP' || incident.status !== 'PENDING_PAYSLIP' || remaining < original) {
      toast.error('Somente uma ocorrência ainda intacta e pendente para holerite pode ser excluída.')
      return
    }
    const accepted = await confirm({
      title: 'Excluir ocorrência pendente?',
      message: `“${incident.description || TYPE_LABEL[incident.type] || 'Ocorrência'}” (${money(incident.amount)}) será cancelada e não entrará no próximo holerite.`,
      confirmLabel: 'Excluir ocorrência',
      tone: 'danger',
    })
    if (!accepted) return

    setMutation(true)
    try {
      await incidentApi.cancel(game.id, career.serverCareerId, incident.id)
      await load({ quiet: true })
      toast.success('Ocorrência pendente cancelada com sucesso.')
    } catch (nextError) {
      toast.error(nextError?.message || 'Não foi possível cancelar a ocorrência no servidor.')
      try { await load({ quiet: true }) } catch { /* preserva a mensagem principal */ }
    } finally {
      setMutation(false)
    }
  }

  if (loading) return <section className="panel"><div className="empty-inline">Carregando infrações e acidentes do servidor…</div></section>
  if (error && incidents.length === 0) {
    return <section className="panel"><div className="section-heading compact-heading"><span className="eyebrow">Servidor</span><h2>Não foi possível carregar as ocorrências</h2><p>{error.message || 'Tente novamente.'}</p></div><button className="button primary" type="button" onClick={() => load().catch(() => {})}>Tentar novamente</button></section>
  }

  return (
    <>
      <section className="phase1-status-grid incident-summary-grid">
        <article className="panel phase1-metric"><span className="metric-label line-label-with-tip">Pendências <Tip text="Soma dos valores server-side que ainda serão descontados dos próximos holerites." /></span><strong className="metric-value">{money(pending)}</strong><span className="metric-detail">Para próximos holerites</span></article>
        <article className="panel phase1-metric"><span className="metric-label line-label-with-tip">Ocorrências <Tip text="Quantidade total de infrações, acidentes e outras cobranças persistidas nesta carreira." /></span><strong className="metric-value">{incidents.length}</strong><span className="metric-detail">Total registrado</span></article>
      </section>

      <section className="panel incident-form-card" data-tour="incident-form">
        <div className="section-heading compact-heading"><span className="eyebrow">Registro financeiro</span><h2>Nova infração ou acidente</h2><p>Escolha desconto imediato no saldo ou cobrança no próximo holerite.</p></div>
        <form onSubmit={submit}>
          <div className="two-columns">
            <div><Label tip="Classifica a ocorrência para facilitar o histórico. Não altera as regras de promoção.">Tipo</Label><select value={type} onChange={(event) => setType(event.target.value)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div><Label tip="Valor financeiro da multa, dano ou cobrança que será abatido do saldo ou holerite.">Valor</Label><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          </div>
          <Label tip="Você pode vincular a ocorrência a uma viagem já persistida no servidor ou informar a rota manualmente.">Rota relacionada</Label>
          <select value={routeMode} onChange={(event) => setRouteMode(event.target.value)}>
            <option value="manual">Outra / informar manualmente</option>
            {trips.map((trip) => {
              const id = String(trip.serverTripId || trip.id)
              return <option key={id} value={`trip:${id}`}>Semana {trip.week || 1} — {trip.origin} → {trip.destination}</option>
            })}
          </select>
          {routeMode === 'manual' && <><Label tip="Informe rodovia, cidades ou uma referência suficiente para lembrar onde ocorreu.">Rota</Label><input value={manualRoute} onChange={(event) => setManualRoute(event.target.value)} placeholder={game.id === 'ats' ? 'Ex.: I-5, Los Angeles → Bakersfield' : 'Ex.: A2, Berlin → Hannover'} /></>}
          <Label tip="Registre resumidamente o que aconteceu para manter o histórico da carreira compreensível.">Descrição</Label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o que aconteceu" />
          <Label tip={`Saldo agora desconta imediatamente. Próximo holerite deixa a cobrança pendente e o backend aplica o desconto no fechamento ${game.payrollPeriodLabel}.`}>Método de cobrança</Label>
          <select value={chargeMethod} onChange={(event) => setChargeMethod(event.target.value)}>
            <option value="BALANCE">Descontar do saldo agora</option>
            <option value="PAYSLIP">Descontar no próximo holerite</option>
          </select>
          <button className="button danger full-button" type="submit" disabled={mutation}>{mutation ? 'Salvando…' : 'Registrar ocorrência'}</button>
        </form>
      </section>

      <section className="panel incidents-list-card" data-tour="incident-history">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico</span><h2>Infrações e acidentes</h2></div>
        {incidents.length === 0 ? <div className="empty-inline">Nenhuma ocorrência registrada.</div> : <div className="responsive-table"><table><thead><tr><th>Semana</th><th>Tipo</th><th>Rota</th><th>Descrição</th><th>Valor</th><th>Cobrança</th><th>Status</th><th></th></tr></thead><tbody>{incidents.map((incident) => {
          const cancellable = incident.chargeMethod === 'PAYSLIP' && incident.status === 'PENDING_PAYSLIP' && Number(incident.remainingAmount || 0) >= Number(incident.amount || 0)
          return <tr key={incident.id}><td>{incident.operationalWeek || '—'}</td><td>{TYPE_LABEL[incident.type] || incident.type || '—'}</td><td>{incident.route || '—'}</td><td>{incident.description || '—'}</td><td>{money(incident.amount)}</td><td>{incident.chargeMethod === 'PAYSLIP' ? 'Próximo holerite' : 'Saldo imediato'}</td><td>{statusText(incident, money)}</td><td>{cancellable && <button className="table-delete" type="button" disabled={mutation} onClick={() => cancelIncident(incident)}>Excluir</button>}</td></tr>
        })}</tbody></table></div>}
      </section>
    </>
  )
}
