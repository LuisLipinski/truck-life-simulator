import { useEffect, useMemo, useState } from 'react'
import { getCareer, setActiveCareer } from '../lib/storage.js'
import { exportCareerCSV } from '../lib/csv.js'
import {
  currentWeekMiles,
  currentWeekTrips,
  getPromotionStatus,
  loadPhase1State,
  mileagePaySummary,
  monthlyExpenseTotal,
  PAY_LABELS,
  PAY_RATES,
  perDiemDaysForTrips,
  savePhase1State,
  totalMiles,
  validPayCategories,
} from '../lib/phase1.js'
import CityAutocomplete from './CityAutocomplete.jsx'
import FinancesTab from './phase1/FinancesTab.jsx'
import PayslipTab from './phase1/PayslipTab.jsx'
import IncidentsTab from './phase1/IncidentsTab.jsx'
import QualificationsTab from './phase1/QualificationsTab.jsx'
import RulesTab from './phase1/RulesTab.jsx'
import ModsTab from './phase1/ModsTab.jsx'
import HistoryTab from './phase1/HistoryTab.jsx'

const TAB_HELP = {
  overview: {
    label: 'Visão Geral',
    description: 'Mostra um resumo da carreira: saldo disponível, nível atual, despesas mensais, progressão, semana em andamento e dados do motorista.',
    tip: 'Use esta tela como painel principal. Os cartões são atalhos para as áreas correspondentes da carreira.',
  },
  finances: {
    label: 'Saldo e Despesas',
    description: 'Aqui você controla o dinheiro pessoal da carreira, despesas mensais, gastos personalizados e ajustes de saldo.',
    tip: 'As despesas afetam o saldo pessoal da simulação. Gastos mensais podem ser aplicados quando chegar o momento de pagá-los.',
  },
  payslip: {
    label: 'Holerite',
    description: 'Calcula o pagamento semanal com salário ou milhas, impostos estimados, benefícios, per diem e descontos de ocorrências.',
    tip: 'Ao gerar o holerite, a semana é fechada, o depósito entra no saldo e uma nova semana começa.',
  },
  progress: {
    label: 'Registro de Viagens',
    description: 'Registre cada trecho realizado no ATS, com horários, origem, destino, tipo da viagem, categoria de pagamento e milhas percorridas.',
    tip: 'Viagens Loaded e Deadhead contam para a progressão. Nas semanas já fechadas pelo holerite, os trechos ficam protegidos contra exclusão.',
  },
  incidents: {
    label: 'Infrações e Acidentes',
    description: 'Registre multas, danos e outros incidentes da carreira e escolha se o valor sai do saldo ou do próximo holerite.',
    tip: 'Ocorrências são financeiras e históricas. Elas não bloqueiam promoções, mas podem gerar descontos no pagamento.',
  },
  qualifications: {
    label: 'Qualificações',
    description: 'Acompanhe os requisitos de promoção, treinamentos da ATS Academy e qualificações opcionais como HazMat.',
    tip: 'As promoções exigem a quilometragem mínima e a confirmação do treinamento antes do pagamento da taxa correspondente.',
  },
  rules: {
    label: 'Regras',
    description: 'Consulta rápida das regras da Fase 1: jornada, rotas, deadhead, per diem, pagamento e evolução dos níveis.',
    tip: 'Estas regras servem como guia de roleplay para manter a carreira consistente e mais próxima de uma operação realista.',
  },
  mods: {
    label: 'Mods sugeridos',
    description: 'Reúne sugestões de mods que combinam com a proposta da carreira sem tornar a economia do ATS obrigatória para o aplicativo.',
    tip: 'Os mods são opcionais. O simulador continua funcionando mesmo sem eles e não depende dos preços de frete do jogo.',
  },
  history: {
    label: 'Histórico',
    description: 'Mostra as movimentações financeiras e semanas fechadas para você acompanhar o que aconteceu ao longo da carreira.',
    tip: 'Use o histórico para conferir depósitos, despesas, qualificações e outros eventos que alteraram o saldo.',
  },
}

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function InfoTip({ text }) {
  return (
    <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>
      i
    </button>
  )
}

function TabIntro({ tabId }) {
  const help = TAB_HELP[tabId] || TAB_HELP.overview
  return (
    <section className="react-tab-intro" aria-label={`Descrição: ${help.label}`}>
      <div className="react-tab-intro-heading">
        <span className="eyebrow">Para que serve</span>
        <InfoTip text={help.tip} />
      </div>
      <strong>{help.label}</strong>
      <p>{help.description}</p>
    </section>
  )
}

function HeaderSummary({ state }) {
  const miles = totalMiles(state)
  const weekMiles = currentWeekMiles(state)
  const promotion = getPromotionStatus(state)
  const progressText = state.currentLevel >= 3
    ? `${miles.toLocaleString('en-US')} mi`
    : `${miles.toLocaleString('en-US')} / ${promotion.goal.toLocaleString('en-US')} mi`

  return (
    <div className="phase1-header-summary" aria-label="Resumo da carreira">
      <div><span>Saldo</span><strong>{money(state.balance)}</strong></div>
      <div><span>Nível atual</span><strong>Nível {state.currentLevel}</strong></div>
      <div><span>Progressão</span><strong>{progressText}</strong></div>
      <div><span>Semana atual</span><strong>Semana {state.currentWeek} • {weekMiles.toLocaleString('en-US')} mi</strong></div>
    </div>
  )
}

function MetricCard({ label, value, detail, onClick, children }) {
  const interactive = typeof onClick === 'function'
  const Component = interactive ? 'button' : 'article'
  return (
    <Component className={`phase1-metric panel${interactive ? ' metric-button' : ''}`} onClick={onClick}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {children}
      {detail && <span className="metric-detail">{detail}</span>}
    </Component>
  )
}

function OverviewTab({ career, state, setActiveTab }) {
  const weekTrips = currentWeekTrips(state)
  const promotion = getPromotionStatus(state)
  const monthly = monthlyExpenseTotal(state)

  return (
    <>
      {promotion.ready && (
        <button className="promotion-banner" onClick={() => setActiveTab('qualifications')}>
          <span className="eyebrow warning-text">Promoção disponível</span>
          <strong>{promotion.title}</strong>
          <span>{promotion.requirement}. Abra Qualificações para concluir.</span>
        </button>
      )}

      <section className="phase1-status-grid">
        <button className="panel status-card" onClick={() => setActiveTab('finances')}>
          <span className="metric-label">Despesas mensais</span>
          <strong>{money(monthly)}</strong>
          <span>Padrão + personalizadas mensais.</span>
        </button>
        <button className="panel status-card" onClick={() => setActiveTab('payslip')}>
          <span className="metric-label">Resumo semanal</span>
          <strong>{weekTrips.length ? 'Pronto para conferir' : 'Semana em andamento'}</strong>
          <span>Abra o holerite para visualizar bruto, impostos, per diem e ocorrências.</span>
        </button>
      </section>

      <section className="panel profile-panel">
        <div><span className="metric-label">Motorista</span><strong>{career.driverName}</strong></div>
        <div><span className="metric-label">Base</span><strong>{career.city || '—'}</strong></div>
        <div><span className="metric-label">Empresa</span><strong>{career.company || '—'}</strong></div>
      </section>

      <section className="panel legacy-bridge">
        <div>
          <span className="eyebrow">Backup da carreira</span>
          <h2>Exportação CSV já está em React</h2>
          <p>O backup inclui perfil, estado, viagens, histórico, gastos personalizados, ocorrências e semanas fechadas. A importação fica na tela de Carreiras.</p>
        </div>
        <button className="button success compact" type="button" onClick={() => exportCareerCSV(career, state)}>Exportar carreira CSV</button>
      </section>
    </>
  )
}

function TripForm({ state, onAdd }) {
  const [departureAt, setDepartureAt] = useState('')
  const [arrivalAt, setArrivalAt] = useState('')
  const [origin, setOrigin] = useState('')
  const [originCompany, setOriginCompany] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationCompany, setDestinationCompany] = useState('')
  const [cargo, setCargo] = useState('')
  const [type, setType] = useState('Loaded')
  const [payCategory, setPayCategory] = useState('normal')
  const [miles, setMiles] = useState('')

  const categories = validPayCategories(state)
  const effectiveCategory = type === 'Deadhead' ? 'deadhead' : (categories.includes(payCategory) ? payCategory : 'normal')

  function submit(event) {
    event.preventDefault()
    const distance = Number(miles)
    const start = new Date(departureAt)
    const end = new Date(arrivalAt)
    if (!departureAt || !arrivalAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      window.alert('Informe saída e chegada válidas. A chegada precisa ser posterior à saída.')
      return
    }
    if (!origin.trim() || !destination.trim()) {
      window.alert('Informe cidade de origem e destino.')
      return
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      window.alert('Informe uma quilometragem válida.')
      return
    }

    onAdd({
      id: Date.now(),
      week: state.currentWeek,
      departureAt,
      arrivalAt,
      origin: origin.trim(),
      originCompany: originCompany.trim(),
      destination: destination.trim(),
      destinationCompany: destinationCompany.trim(),
      cargo: type === 'Deadhead' ? '' : cargo.trim(),
      type,
      payCategory: effectiveCategory,
      miles: distance,
      createdAt: new Date().toISOString(),
    })

    setOrigin('')
    setOriginCompany('')
    setDestination('')
    setDestinationCompany('')
    setCargo('')
    setMiles('')
  }

  return (
    <form className="panel trip-form" onSubmit={submit}>
      <div className="section-heading compact-heading"><span className="eyebrow">Semana {state.currentWeek}</span><h2>Registrar viagem</h2><p>As viagens usam o mesmo formato dos backups existentes.</p></div>
      <div className="two-columns">
        <div><label>Data e horário de saída</label><input type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} required /></div>
        <div><label>Data e horário de chegada</label><input type="datetime-local" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} required /></div>
      </div>
      <div className="two-columns">
        <CityAutocomplete value={origin} onChange={setOrigin} label="Cidade de origem" required />
        <div><label>Filial / empresa de origem</label><input value={originCompany} onChange={(e) => setOriginCompany(e.target.value)} placeholder="Ex.: Pacific Horizon Logistics" /></div>
      </div>
      <div className="two-columns">
        <CityAutocomplete value={destination} onChange={setDestination} label="Cidade de destino" required />
        <div><label>Empresa de destino</label><input value={destinationCompany} onChange={(e) => setDestinationCompany(e.target.value)} placeholder="Cliente ou filial" /></div>
      </div>
      <div className="two-columns">
        <div><label>Tipo</label><select value={type} onChange={(e) => setType(e.target.value)}><option value="Loaded">Loaded</option><option value="Deadhead">Deadhead</option></select></div>
        <div><label>Categoria de pagamento</label><select value={effectiveCategory} disabled={type === 'Deadhead' || state.currentLevel <= 1} onChange={(e) => setPayCategory(e.target.value)}>{(type === 'Deadhead' ? ['deadhead'] : categories).map((category) => <option value={category} key={category}>{PAY_LABELS[category]} — {money(PAY_RATES[category])}/mi</option>)}</select></div>
      </div>
      <div className="two-columns">
        <div><label>Carga</label><input value={cargo} disabled={type === 'Deadhead'} onChange={(e) => setCargo(e.target.value)} placeholder={type === 'Deadhead' ? 'Viagem vazia' : 'Ex.: alimentos, equipamentos'} /></div>
        <div><label>Milhas</label><input type="number" min="1" step="1" value={miles} onChange={(e) => setMiles(e.target.value)} required /></div>
      </div>
      <button className="button primary submit-button" type="submit">Registrar viagem</button>
    </form>
  )
}

function TripsTab({ state, onAddTrip, onDeleteTrip }) {
  const weekTrips = currentWeekTrips(state)
  const allMiles = totalMiles(state)
  const weekMiles = currentWeekMiles(state)
  const pay = mileagePaySummary(weekTrips)
  const perDiem = perDiemDaysForTrips(weekTrips)

  return (
    <>
      <section className="phase1-status-grid progress-summary-grid">
        <MetricCard label="Milhas da semana" value={`${weekMiles.toLocaleString('en-US')} mi`} detail={`Semana ${state.currentWeek}`} />
        <MetricCard label="Milhas na carreira" value={`${allMiles.toLocaleString('en-US')} mi`} detail={`Nível ${state.currentLevel}`} />
        <MetricCard label="Bruto por milhas" value={state.currentLevel <= 1 ? 'Salário semanal' : money(pay.gross)} detail={state.currentLevel <= 1 ? 'Nível 1 não é pago por milha' : 'Antes de impostos e per diem'} />
        <MetricCard label="Per diem potencial" value={state.currentLevel <= 1 ? 'Não se aplica' : `${perDiem.days} dia(s)`} detail={state.currentLevel <= 1 ? 'Disponível a partir do Nível 2' : `${money(perDiem.days * 80)} a US$ 80/dia`} />
      </section>

      <div className="phase1-two-panel">
        <TripForm state={state} onAdd={onAddTrip} />
        <section className="panel pay-breakdown-panel">
          <span className="eyebrow">Resumo semanal</span>
          <h2>Pagamento por categoria</h2>
          {state.currentLevel <= 1 ? <p className="muted-copy">No Nível 1, as milhas contam para progressão, mas o salário base continua em US$ 850 por semana.</p> : (
            <div className="breakdown-list">
              {Object.entries(pay.totals).filter(([, value]) => value > 0).map(([category, value]) => <div key={category}><span>{PAY_LABELS[category]}</span><strong>{value.toLocaleString('en-US')} mi × {money(PAY_RATES[category])} = {money(value * PAY_RATES[category])}</strong></div>)}
              <div className="breakdown-total"><span>Total bruto por milhas</span><strong>{money(pay.gross)}</strong></div>
            </div>
          )}
          <div className="notice-box"><strong>Per diem</strong><span>{state.currentLevel <= 1 ? 'Não se aplica ao motorista local do Nível 1.' : perDiem.days ? `${perDiem.days} dia(s) qualificável(is): ${perDiem.dates.join(', ')}` : 'Nenhuma viagem com pernoite qualificável nesta semana.'}</span></div>
        </section>
      </div>

      <section className="panel trips-panel">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico de viagens</span><h2>Trechos registrados</h2><p>Mostrando todas as viagens da carreira, com a semana de cada trecho.</p></div>
        {state.trips.length === 0 ? <div className="empty-inline">Nenhuma viagem registrada.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Semana</th><th>Saída</th><th>Chegada</th><th>Rota</th><th>Tipo</th><th>Categoria</th><th>Milhas</th><th></th></tr></thead><tbody>{[...state.trips].reverse().map((trip) => (
            <tr key={trip.id}><td>{trip.week || 1}</td><td>{formatDateTime(trip.departureAt)}</td><td>{formatDateTime(trip.arrivalAt)}</td><td><strong>{trip.origin || '—'} → {trip.destination || '—'}</strong><small>{trip.cargo ? `Carga: ${trip.cargo}` : trip.type === 'Deadhead' ? 'Viagem vazia' : ''}</small></td><td>{trip.type || 'Loaded'}</td><td>{PAY_LABELS[trip.type === 'Deadhead' ? 'deadhead' : (trip.payCategory || 'normal')]}</td><td>{Number(trip.miles || 0).toLocaleString('en-US')}</td><td><button className="table-delete" onClick={() => onDeleteTrip(trip)}>Excluir</button></td></tr>
          ))}</tbody></table></div>
        )}
      </section>
    </>
  )
}

export default function Phase1Page({ careerId, onBack }) {
  const career = getCareer(careerId)
  const [state, setState] = useState(() => loadPhase1State(careerId))
  const [activeTab, setActiveTab] = useState('overview')

  const mainTabs = useMemo(() => [
    ['overview', 'Visão Geral'],
    ['journal', 'Diário de Bordo'],
    ['financial', 'Financeiro'],
    ['rules', 'Regras'],
    ['mods', 'Mods'],
  ], [])

  const journalTabs = useMemo(() => [
    ['progress', 'Registro de Viagens'],
    ['incidents', 'Infrações e Acidentes'],
    ['qualifications', 'Qualificações'],
  ], [])

  const financialTabs = useMemo(() => [
    ['finances', 'Saldo e Despesas'],
    ['payslip', 'Holerite'],
    ['history', 'Histórico'],
  ], [])

  const activeMainTab = journalTabs.some(([id]) => id === activeTab)
    ? 'journal'
    : financialTabs.some(([id]) => id === activeTab)
      ? 'financial'
      : activeTab

  const activeSubtabs = activeMainTab === 'journal'
    ? journalTabs
    : activeMainTab === 'financial'
      ? financialTabs
      : []

  function openMainTab(id) {
    if (id === 'journal') setActiveTab('progress')
    else if (id === 'financial') setActiveTab('finances')
    else setActiveTab(id)
  }

  useEffect(() => {
    if (career?.id) setActiveCareer(career.id)
  }, [career?.id])

  if (!career) return <main className="page-shell"><div className="empty-state"><h2>Carreira não encontrada</h2><button className="button primary compact" onClick={onBack}>Voltar</button></div></main>

  function commit(nextState) {
    const normalized = { ...nextState, currentLevel: Number(nextState.currentLevel || nextState.careerLevel || 1), careerLevel: Number(nextState.currentLevel || nextState.careerLevel || 1) }
    setState(normalized)
    savePhase1State(career.id, normalized)
  }

  function addTrip(trip) {
    commit({ ...state, trips: [...state.trips, trip] })
  }

  function deleteTrip(trip) {
    const weekClosed = (state.closedWeeks || []).some((week) => Number(week.week) === Number(trip.week || 1))
    if (weekClosed) {
      window.alert('Esta viagem pertence a uma semana já fechada e não pode ser excluída.')
      return
    }
    if (!window.confirm(`Excluir o trecho ${trip.origin || ''} → ${trip.destination || ''}?`)) return
    commit({ ...state, trips: state.trips.filter((item) => Number(item.id) !== Number(trip.id)) })
  }

  return (
    <div className="phase1-app">
      <header className="phase1-header">
        <div className="phase1-header-inner">
          <button className="back-button" onClick={onBack}>← Voltar</button>
          <div className="phase1-header-main">
            <div className="phase1-driver-block">
              <span className="eyebrow">Fase 1 • Company Driver</span>
              <h1>{career.driverName}</h1>
              <p>{career.city} • {career.company}</p>
            </div>
            <HeaderSummary state={state} />
          </div>
        </div>
      </header>
      <nav className="phase1-tabs-wrap" aria-label="Seções da Fase 1"><div className="phase1-tabs">
        {mainTabs.map(([id, label]) => <button key={id} className={activeMainTab === id ? 'active' : ''} onClick={() => openMainTab(id)}>{label}</button>)}
      </div></nav>
      <main className="phase1-content">
        {activeSubtabs.length > 0 && (
          <nav className="phase1-subtabs" aria-label={activeMainTab === 'journal' ? 'Seções do Diário de Bordo' : 'Seções Financeiras'}>
            {activeSubtabs.map(([id, label]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
          </nav>
        )}
        <TabIntro tabId={activeTab} />
        {activeTab === 'overview' && <OverviewTab career={career} state={state} setActiveTab={setActiveTab} />}
        {activeTab === 'finances' && <FinancesTab state={state} commit={commit} />}
        {activeTab === 'payslip' && <PayslipTab state={state} commit={commit} />}
        {activeTab === 'progress' && <TripsTab state={state} onAddTrip={addTrip} onDeleteTrip={deleteTrip} />}
        {activeTab === 'incidents' && <IncidentsTab state={state} commit={commit} />}
        {activeTab === 'qualifications' && <QualificationsTab state={state} commit={commit} />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'mods' && <ModsTab />}
        {activeTab === 'history' && <HistoryTab state={state} />}
      </main>
    </div>
  )
}
