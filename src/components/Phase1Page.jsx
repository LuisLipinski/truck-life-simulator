import { useEffect, useMemo, useState } from 'react'
import { getCareer, setActiveCareer } from '../lib/storage.js'
import { exportCareerCSV } from '../lib/csv.js'
import { formatDistance, formatMoney, formatNumber } from '../config/games.js'
import {
  currentWeekMiles,
  currentWeekTrips,
  getPromotionStatus,
  isTripWeekLocked,
  loadPhase1State,
  mileagePaySummary,
  monthlyExpenseTotal,
  payrollWeeks,
  perDiemDaysForTrips,
  savePhase1State,
  tripDistance,
  totalMiles,
  validPayCategories,
} from '../lib/phase1.js'
import CityAutocomplete from './CityAutocomplete.jsx'
import { useGame } from './GameContext.jsx'
import { useConfirm } from './ConfirmProvider.jsx'
import { useTutorial } from './GuidedTutorial.jsx'
import { useToast } from './ToastProvider.jsx'
import FinancesTab from './phase1/FinancesTab.jsx'
import PayslipTab from './phase1/PayslipTab.jsx'
import IncidentsTab from './phase1/IncidentsTab.jsx'
import QualificationsTab from './phase1/QualificationsTab.jsx'
import RulesTab from './phase1/RulesTab.jsx'
import ModsTab from './phase1/ModsTab.jsx'
import HistoryTab from './phase1/HistoryTab.jsx'
import AcademyGuideTab from './phase1/AcademyGuideTab.jsx'
import MileageChart from './phase1/MileageChart.jsx'

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
    description: 'Acompanhe os requisitos de promoção, treinamentos da Driving Academy e qualificações opcionais como HazMat.',
    tip: 'As promoções exigem a quilometragem mínima e a confirmação do treinamento antes do pagamento da taxa correspondente.',
  },
  academy: {
    label: 'Driving Academy',
    description: 'Entenda o módulo de treinamento do ATS, qual etapa da Academy corresponde a cada promoção e como acessar os cenários dentro do jogo.',
    tip: 'Use este guia quando atingir 10.000 ou 50.000 milhas e precisar concluir o treinamento exigido para a próxima promoção.',
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

function gameText(text, game) {
  if (game.id === 'ats') return text
  return text
    .replaceAll('American Truck Simulator', 'Euro Truck Simulator 2')
    .replaceAll('ATS', 'ETS2')
    .replaceAll('10.000 ou 50.000 milhas', '16.000 ou 80.000 quilômetros')
    .replaceAll('milhas', 'quilômetros')
    .replaceAll('HazMat', 'ADR')
    .replaceAll('Loaded e Deadhead', 'Com carga e reposicionamento vazio')
    .replaceAll('per diem', 'diária internacional')
    .replaceAll('OTR', 'internacional')
    .replaceAll('pagamento semanal', 'pagamento mensal')
    .replaceAll('semanas fechadas', 'meses fechados')
    .replaceAll('semana é fechada, o depósito entra no saldo e uma nova semana começa', 'mês é fechado, o depósito entra no saldo e um novo período começa')
    .replaceAll('semanas já fechadas', 'semanas operacionais já encerradas')
}

function promotionMilestones(game) {
  return {
    2: { level: 2, distance: game.promotionGoals[0], module: game.promotionModules[0], subtitle: game.promotionSubtitles[0], image: game.image },
    3: { level: 3, distance: game.promotionGoals[1], module: game.promotionModules[1], subtitle: game.promotionSubtitles[1], image: game.image },
  }
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
  const game = useGame()
  const help = TAB_HELP[tabId] || TAB_HELP.overview
  return (
    <section className="react-tab-intro" aria-label={`Descrição: ${help.label}`} data-tour="tab-intro">
      <div className="react-tab-intro-heading">
        <span className="eyebrow">Para que serve</span>
        <InfoTip text={gameText(help.tip, game)} />
      </div>
      <strong>{help.label}</strong>
      <p>{gameText(help.description, game)}</p>
    </section>
  )
}

function PromotionMilestoneModal({ milestone, onClose, onPromotion, onGuide }) {
  const game = useGame()
  if (!milestone) return null
  return (
    <div className="promotion-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="promotion-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title">
        <div className="promotion-modal-media" style={{ backgroundImage: `linear-gradient(115deg,rgba(2,6,23,.92) 10%,rgba(2,6,23,.48) 60%,rgba(2,6,23,.12)),url(${milestone.image})` }}>
          <button className="promotion-modal-close" type="button" aria-label="Fechar" onClick={onClose}>×</button>
          <div className="promotion-confetti" aria-hidden="true"><span>◆</span><span>◆</span><span>◆</span><span>◆</span><span>◆</span></div>
          <div className="promotion-modal-copy">
            <span className="promotion-kicker">Marco alcançado</span>
            <h2 id="promotion-modal-title">Parabéns! Você alcançou os {game.distanceName} necessários para o Nível {milestone.level}.</h2>
            <p>{milestone.subtitle}</p>
            <div className="promotion-academy-callout">
              <span>Faça agora no Driving Academy</span>
              <strong>{milestone.module}</strong>
              <small>Meta atingida: {formatDistance(milestone.distance, game, true)}.</small>
            </div>
            <div className="promotion-modal-actions">
              <button className="button primary" type="button" onClick={onPromotion}>Ir para a promoção</button>
              <button className="button secondary" type="button" onClick={onGuide}>Entender o Driving Academy</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function HeaderSummary({ state }) {
  const game = useGame()
  const distance = totalMiles(state)
  const weekDistance = currentWeekMiles(state)
  const promotion = getPromotionStatus(state, game)
  const progressText = state.currentLevel >= 3
    ? formatDistance(distance, game)
    : `${formatNumber(distance, game)} / ${formatDistance(promotion.goal, game)}`

  return (
    <div className="phase1-header-summary" aria-label="Resumo da carreira" data-tour="career-summary">
      <div><span>Saldo</span><strong>{formatMoney(state.balance, game)}</strong></div>
      <div><span>Nível atual</span><strong>Nível {state.currentLevel}</strong></div>
      <div><span>Progressão</span><strong>{progressText}</strong></div>
      <div><span>{game.payrollPeriod === 'monthly' ? 'Período atual' : 'Semana atual'}</span><strong>{game.payrollPeriod === 'monthly' ? `Mês ${state.currentPayrollMonth || 1} • ` : ''}Semana {state.currentWeek} • {formatDistance(weekDistance, game)}</strong></div>
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
  const game = useGame()
  const weekTrips = currentWeekTrips(state)
  const promotion = getPromotionStatus(state, game)
  const monthly = monthlyExpenseTotal(state)
  const completedPayrollWeeks = game.payrollPeriod === 'monthly' ? payrollWeeks(state, game).length : 0

  return (
    <>
      {promotion.ready && (
        <button className="promotion-banner" onClick={() => setActiveTab('qualifications')}>
          <span className="eyebrow warning-text">Promoção disponível</span>
          <strong>{promotion.title}</strong>
          <span>{promotion.requirement}. Abra Qualificações para concluir.</span>
        </button>
      )}

      <section className="phase1-status-grid" data-tour="overview-shortcuts">
        <button className="panel status-card" onClick={() => setActiveTab('finances')}>
          <span className="metric-label">Despesas mensais</span>
          <strong>{formatMoney(monthly, game)}</strong>
          <span>Padrão + personalizadas mensais.</span>
        </button>
        <button className="panel status-card" onClick={() => setActiveTab('payslip')}>
          <span className="metric-label">Resumo {game.payrollPeriod === 'monthly' ? 'mensal' : 'semanal'}</span>
          <strong>{game.payrollPeriod === 'monthly' ? `${completedPayrollWeeks} / ${game.minWeeksPerPayroll} semanas encerradas` : weekTrips.length ? 'Pronto para conferir' : 'Semana em andamento'}</strong>
          <span>{game.payrollPeriod === 'monthly' ? 'Encerre as semanas operacionais e gere um único holerite ao fim do mês.' : `Abra o holerite para visualizar bruto, impostos, ${game.perDiemLabel.toLowerCase()} e ocorrências.`}</span>
        </button>
      </section>

      <section className="panel profile-panel" data-tour="career-profile">
        <div><span className="metric-label">Motorista</span><strong>{career.driverName}</strong></div>
        <div><span className="metric-label">Base</span><strong>{career.city || '—'}</strong></div>
        <div><span className="metric-label">Empresa</span><strong>{career.company || '—'}</strong></div>
        {game.id === 'ets2' && <div><span className="metric-label">País-sede</span><strong>{game.countryFlag} {game.countryName}</strong></div>}
        {game.id === 'ats' && <div><span className="metric-label">Estado-sede</span><strong>{game.stateName} ({game.stateCode})</strong></div>}
        <div><span className="metric-label">Moeda da carreira</span><strong>{game.currency} {game.currency !== game.baseCurrency ? `• base fiscal ${game.baseCurrency}` : '• moeda fiscal local'}</strong></div>
      </section>

      <section className="panel legacy-bridge" data-tour="career-backup">
        <div>
          <span className="eyebrow">Backup da carreira</span>
          <h2>Exportação CSV já está em React</h2>
          <p>O backup inclui perfil, sede fiscal, moeda e cotação registrada, estado da aplicação, viagens, histórico, gastos personalizados, ocorrências e holerites fechados. A importação fica na tela de Carreiras.</p>
        </div>
        <button className="button success compact" type="button" onClick={() => exportCareerCSV(career, state, game.id)}>Exportar carreira CSV</button>
      </section>
    </>
  )
}

function TripForm({ state, onAdd }) {
  const game = useGame()
  const toast = useToast()
  const [departureAt, setDepartureAt] = useState('')
  const [arrivalAt, setArrivalAt] = useState('')
  const [origin, setOrigin] = useState('')
  const [originCompany, setOriginCompany] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationCompany, setDestinationCompany] = useState('')
  const [cargo, setCargo] = useState('')
  const [type, setType] = useState('Loaded')
  const [payCategory, setPayCategory] = useState('normal')
  const [distance, setDistance] = useState('')

  const categories = validPayCategories(state, game.id)
  const effectiveCategory = type === 'Deadhead' ? 'deadhead' : (categories.includes(payCategory) ? payCategory : 'normal')

  function submit(event) {
    event.preventDefault()
    const distanceValue = Number(distance)
    const start = new Date(departureAt)
    const end = new Date(arrivalAt)
    if (!departureAt || !arrivalAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error('Informe saída e chegada válidas. A chegada precisa ser posterior à saída.')
      return
    }
    if (!origin.trim() || !destination.trim()) {
      toast.error('Informe cidade de origem e destino.')
      return
    }
    if (!Number.isFinite(distanceValue) || distanceValue <= 0) {
      toast.error(`Informe uma distância válida em ${game.distanceName}.`)
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
      [game.distanceField]: distanceValue,
      createdAt: new Date().toISOString(),
    })

    setOrigin('')
    setOriginCompany('')
    setDestination('')
    setDestinationCompany('')
    setCargo('')
    setDistance('')
  }

  return (
    <form className="panel trip-form" data-tour="trip-form" onSubmit={submit}>
      <div className="section-heading compact-heading"><span className="eyebrow">Semana {state.currentWeek}</span><h2>Registrar viagem</h2><p>As viagens usam o mesmo formato dos backups existentes.</p></div>
      <div className="two-columns">
        <div><label>Data e horário de saída</label><input type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} required /></div>
        <div><label>Data e horário de chegada</label><input type="datetime-local" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} required /></div>
      </div>
      <div className="two-columns">
        <CityAutocomplete value={origin} onChange={setOrigin} label="Cidade de origem" required />
        <div><label>Filial / empresa de origem</label><input value={originCompany} onChange={(e) => setOriginCompany(e.target.value)} placeholder={`Ex.: ${game.companyPlaceholder}`} /></div>
      </div>
      <div className="two-columns">
        <CityAutocomplete value={destination} onChange={setDestination} label="Cidade de destino" required />
        <div><label>Empresa de destino</label><input value={destinationCompany} onChange={(e) => setDestinationCompany(e.target.value)} placeholder="Cliente ou filial" /></div>
      </div>
      <div className="two-columns">
        <div><label>Tipo</label><select value={type} onChange={(e) => setType(e.target.value)}><option value="Loaded">{game.tripTypes.loaded}</option><option value="Deadhead">{game.tripTypes.deadhead}</option></select></div>
        <div><label>Categoria de pagamento</label><select value={effectiveCategory} disabled={type === 'Deadhead' || state.currentLevel <= 1} onChange={(e) => setPayCategory(e.target.value)}>{(type === 'Deadhead' ? ['deadhead'] : categories).map((category) => <option value={category} key={category}>{game.payLabels[category]} — {formatMoney(game.payRates[category], game)}/{game.distanceUnit}</option>)}</select></div>
      </div>
      <div className="two-columns">
        <div><label>Carga</label><input value={cargo} disabled={type === 'Deadhead'} onChange={(e) => setCargo(e.target.value)} placeholder={type === 'Deadhead' ? 'Viagem vazia' : 'Ex.: alimentos, equipamentos'} /></div>
        <div><label>{game.distanceName[0].toUpperCase() + game.distanceName.slice(1)}</label><input type="number" min="1" step="1" value={distance} onChange={(e) => setDistance(e.target.value)} required /></div>
      </div>
      <button className="button primary submit-button" type="submit">Registrar viagem</button>
    </form>
  )
}

function TripsTab({ state, onAddTrip, onDeleteTrip }) {
  const game = useGame()
  const weekTrips = currentWeekTrips(state)
  const allMiles = totalMiles(state)
  const weekMiles = currentWeekMiles(state)
  const pay = mileagePaySummary(weekTrips, game)
  const perDiem = perDiemDaysForTrips(weekTrips)

  return (
    <>
      <section className="phase1-status-grid progress-summary-grid" data-tour="trip-summary">
        <MetricCard label={`${game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} da semana`} value={formatDistance(weekMiles, game)} detail={`Semana ${state.currentWeek}`} />
        <MetricCard label={`${game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} na carreira`} value={formatDistance(allMiles, game)} detail={`Nível ${state.currentLevel}`} />
        <MetricCard label={`Bruto por ${game.distanceUnit}`} value={state.currentLevel <= 1 ? `Salário ${game.payrollPeriodLabel}` : formatMoney(pay.gross, game)} detail={state.currentLevel <= 1 ? `Nível 1 não é pago por ${game.distanceUnit}` : `Antes de impostos e ${game.perDiemLabel.toLowerCase()}`} />
        <MetricCard label={`${game.perDiemLabel} potencial`} value={state.currentLevel <= 1 ? 'Não se aplica' : `${perDiem.days} dia(s)`} detail={state.currentLevel <= 1 ? 'Disponível a partir do Nível 2' : `${formatMoney(perDiem.days * game.perDiemRate, game)} a ${formatMoney(game.perDiemRate, game)}/dia`} />
      </section>

      <MileageChart trips={state.trips} />

      <div className="phase1-two-panel">
        <TripForm state={state} onAdd={onAddTrip} />
        <section className="panel pay-breakdown-panel">
          <span className="eyebrow">Resumo semanal</span>
          <h2>Pagamento por categoria</h2>
          {state.currentLevel <= 1 ? <p className="muted-copy">No Nível 1, os {game.distanceName} contam para progressão, mas o salário base continua em {formatMoney(game.level1Gross, game)} por {game.payrollPeriodLabel === 'mensal' ? 'mês' : 'semana'}.</p> : (
            <div className="breakdown-list">
              {Object.entries(pay.totals).filter(([, value]) => value > 0).map(([category, value]) => <div key={category}><span>{game.payLabels[category]}</span><strong>{formatDistance(value, game)} × {formatMoney(game.payRates[category], game)} = {formatMoney(value * game.payRates[category], game)}</strong></div>)}
              <div className="breakdown-total"><span>Total bruto por {game.distanceUnit}</span><strong>{formatMoney(pay.gross, game)}</strong></div>
            </div>
          )}
          <div className="notice-box"><strong>{game.perDiemLabel}</strong><span>{state.currentLevel <= 1 ? 'Não se aplica ao motorista local do Nível 1.' : perDiem.days ? `${perDiem.days} dia(s) qualificável(is): ${perDiem.dates.join(', ')}` : 'Nenhuma viagem com pernoite qualificável nesta semana.'}</span></div>
        </section>
      </div>

      <section className="panel trips-panel" data-tour="trip-history">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico de viagens</span><h2>Trechos registrados</h2><p>Mostrando todas as viagens da carreira, com a semana de cada trecho.</p></div>
        {state.trips.length === 0 ? <div className="empty-inline">Nenhuma viagem registrada.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Semana</th><th>Saída</th><th>Chegada</th><th>Rota</th><th>Tipo</th><th>Categoria</th><th>{game.distanceName}</th><th></th></tr></thead><tbody>{[...state.trips].reverse().map((trip) => (
            <tr key={trip.id}><td>{trip.week || 1}</td><td>{formatDateTime(trip.departureAt)}</td><td>{formatDateTime(trip.arrivalAt)}</td><td><strong>{trip.origin || '—'} → {trip.destination || '—'}</strong><small>{trip.cargo ? `Carga: ${trip.cargo}` : trip.type === 'Deadhead' ? 'Viagem vazia' : ''}</small></td><td>{trip.type === 'Deadhead' ? game.tripTypes.deadhead : game.tripTypes.loaded}</td><td>{game.payLabels[trip.type === 'Deadhead' ? 'deadhead' : (trip.payCategory || 'normal')]}</td><td>{formatDistance(tripDistance(trip), game)}</td><td><button className="table-delete" onClick={() => onDeleteTrip(trip)}>Excluir</button></td></tr>
          ))}</tbody></table></div>
        )}
      </section>
    </>
  )
}

export default function Phase1Page({ careerId, onBack }) {
  const game = useGame()
  const confirm = useConfirm()
  const { activeStep } = useTutorial()
  const toast = useToast()
  const career = getCareer(careerId, game.id)
  const [state, setState] = useState(() => loadPhase1State(careerId, game.id))
  const [activeTab, setActiveTab] = useState('overview')
  const [promotionMilestone, setPromotionMilestone] = useState(null)

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
    ['academy', 'Driving Academy'],
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

  function goToTab(id) {
    setPromotionMilestone(null)
    setActiveTab(id)
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  useEffect(() => {
    if (career?.id) setActiveCareer(career.id, game.id)
  }, [career?.id, game.id])

  useEffect(() => {
    if (activeStep?.route === '/phase1' && activeStep.tab) setActiveTab(activeStep.tab)
  }, [activeStep?.id, activeStep?.route, activeStep?.tab])

  if (!career) return <main className="page-shell"><div className="empty-state"><h2>Carreira não encontrada</h2><button className="button primary compact" onClick={onBack}>Voltar</button></div></main>

  function commit(nextState) {
    const normalized = { ...nextState, currentLevel: Number(nextState.currentLevel || nextState.careerLevel || 1), careerLevel: Number(nextState.currentLevel || nextState.careerLevel || 1) }
    setState(normalized)
    savePhase1State(career.id, normalized, game.id)
  }

  function addTrip(trip) {
    const beforeDistance = totalMiles(state)
    const addedDistance = tripDistance(trip)
    const afterDistance = beforeDistance + addedDistance
    commit({ ...state, trips: [...state.trips, trip] })
    toast.success(`Viagem registrada: ${formatDistance(addedDistance, game)} adicionados à carreira.`)

    const milestones = promotionMilestones(game)
    if (state.currentLevel === 1 && beforeDistance < game.promotionGoals[0] && afterDistance >= game.promotionGoals[0]) {
      setPromotionMilestone(milestones[2])
    } else if (state.currentLevel === 2 && beforeDistance < game.promotionGoals[1] && afterDistance >= game.promotionGoals[1]) {
      setPromotionMilestone(milestones[3])
    }
  }

  async function deleteTrip(trip) {
    const weekClosed = isTripWeekLocked(state, trip.week, game)
    if (weekClosed) {
      toast.error('Esta viagem pertence a uma semana já fechada e não pode ser excluída.')
      return
    }
    const confirmed = await confirm({
      title: 'Excluir viagem?',
      message: `O trecho ${trip.origin || 'Origem não informada'} → ${trip.destination || 'Destino não informado'} será removido do registro da carreira.`,
      confirmLabel: 'Excluir viagem',
      tone: 'danger',
    })
    if (!confirmed) return
    commit({ ...state, trips: state.trips.filter((item) => Number(item.id) !== Number(trip.id)) })
    toast.success('Viagem excluída com sucesso.')
  }

  return (
    <div className="phase1-app">
      <PromotionMilestoneModal
        milestone={promotionMilestone}
        onClose={() => setPromotionMilestone(null)}
        onPromotion={() => goToTab('qualifications')}
        onGuide={() => goToTab('academy')}
      />
      <header className="phase1-header">
        <div className="phase1-header-inner">
          <button className="back-button" onClick={onBack}>← Voltar</button>
          <div className="phase1-header-main">
            <div className="phase1-driver-block">
              <span className="eyebrow">Fase 1 • {game.shortName} • {game.levelRoles[state.currentLevel - 1]}</span>
              <h1>{career.driverName}</h1>
              <p>{career.city} • {career.company}</p>
            </div>
            <HeaderSummary state={state} />
          </div>
        </div>
      </header>
      <nav className="phase1-tabs-wrap" aria-label="Seções da Fase 1" data-tour="main-navigation"><div className="phase1-tabs">
        {mainTabs.map(([id, label]) => <button key={id} className={activeMainTab === id ? 'active' : ''} onClick={() => openMainTab(id)}>{label}</button>)}
      </div></nav>
      <main className="phase1-content">
        {activeSubtabs.length > 0 && (
          <nav className="phase1-subtabs" data-tour={activeMainTab === 'journal' ? 'journal-navigation' : 'finance-navigation'} aria-label={activeMainTab === 'journal' ? 'Seções do Diário de Bordo' : 'Seções Financeiras'}>
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
        {activeTab === 'academy' && <AcademyGuideTab onOpenQualifications={() => goToTab('qualifications')} />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'mods' && <ModsTab />}
        {activeTab === 'history' && <HistoryTab state={state} />}
      </main>
    </div>
  )
}
