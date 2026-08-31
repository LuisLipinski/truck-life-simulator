import { useEffect, useMemo, useState } from 'react'
import { getCareer, setActiveCareer, updateCareer } from '../lib/storage.js'
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
  tripBreakMinutes,
  tripDistance,
  tripOdometerDistance,
  tripVehicleLabel,
  totalMiles,
} from '../lib/phase1.js'
import { formatTripWeekMoment } from '../lib/tripWeek.js'
import { ApiProblemError } from '../lib/authApi.js'
import { tripApi } from '../lib/tripApi.js'
import { markServerCareerTripsUnavailable, setServerCareerTrips, serverTripToPhase1Trip } from '../lib/careerServerState.js'
import {
  CAREER_EVENT_TYPES,
  careerBaseSnapshot,
  createCareerEvent,
  preserveHistoricalCareerContext,
} from '../lib/careerEvents.js'
import { useGame } from './GameContext.jsx'
import { useConfirm } from './ConfirmProvider.jsx'
import { useTutorial } from './GuidedTutorial.jsx'
import { useToast } from './ToastProvider.jsx'
import FinancesTab from './phase1/FinancesTab.jsx'
import PayslipTab from './phase1/PayslipTab.jsx'
import ServerPayslipTab from './phase1/ServerPayslipTab.jsx'
import IncidentsTab from './phase1/IncidentsTab.jsx'
import QualificationsTab from './phase1/QualificationsTab.jsx'
import RulesTab from './phase1/RulesTab.jsx'
import ModsTab from './phase1/ModsTab.jsx'
import HistoryTab from './phase1/HistoryTab.jsx'
import AcademyGuideTab from './phase1/AcademyGuideTab.jsx'
import MileageChart from './phase1/MileageChart.jsx'
import CareerManagementPanel from './phase1/CareerManagementPanel.jsx'
import TripForm from './phase1/TripForm.jsx'

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

function tripSourceLabel(source) {
  return ({ MANUAL: 'Manual', TELEMETRY: 'Telemetria', IMPORT: 'Importação' })[source] || 'Manual'
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

function ServerCutoverGuard({ title, phase, detail }) {
  return (
    <section className="panel">
      <div className="section-heading compact-heading">
        <span className="eyebrow">Proteção de integridade • {phase}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      <div className="notice-box" role="status">
        <strong>Nenhuma gravação local será feita nesta carreira migrada</strong>
        <span>O módulo volta a aceitar alterações quando sua fatia server-side estiver conectada. Isso evita mostrar “salvo” no navegador para algo que o backend não recebeu.</span>
      </div>
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

function HeaderSummary({ state, career }) {
  const game = useGame()
  const effectiveLevel = career?.serverBacked ? Number(career.currentLevel || state.currentLevel || 1) : Number(state.currentLevel || 1)
  const effectiveWeek = career?.serverBacked ? Number(career.currentOperationalWeek || state.currentWeek || 1) : Number(state.currentWeek || 1)
  const effectiveMonth = career?.serverBacked ? Number(career.currentPayrollMonth || state.currentPayrollMonth || 1) : Number(state.currentPayrollMonth || 1)
  const effectiveBalance = career?.serverBacked && career.currentBalance != null ? Number(career.currentBalance) : Number(state.balance || 0)
  const effectiveState = { ...state, currentLevel: effectiveLevel, careerLevel: effectiveLevel, currentWeek: effectiveWeek }
  const distance = totalMiles(effectiveState)
  const weekDistance = currentWeekMiles(effectiveState)
  const promotion = getPromotionStatus(effectiveState, game)
  const progressText = effectiveLevel >= 3
    ? formatDistance(distance, game)
    : `${formatNumber(distance, game)} / ${formatDistance(promotion.goal, game)}`

  return (
    <div className="phase1-header-summary" aria-label="Resumo da carreira" data-tour="career-summary">
      <div><span>Saldo</span><strong>{formatMoney(effectiveBalance, game)}</strong></div>
      <div><span>Nível atual</span><strong>Nível {effectiveLevel}</strong></div>
      <div><span>Progressão</span><strong>{progressText}</strong></div>
      <div><span>{game.payrollPeriod === 'monthly' ? 'Período atual' : 'Semana atual'}</span><strong>{game.payrollPeriod === 'monthly' ? `Mês ${effectiveMonth} • ` : ''}Semana {effectiveWeek} • {formatDistance(weekDistance, game)}</strong></div>
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

function OverviewTab({ career, state, setActiveTab, onUpdateProfile, onChangeEmployer, onChangeBase }) {
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
          <strong>{career.serverBacked ? 'Protegido na migração' : formatMoney(monthly, game)}</strong>
          <span>{career.serverBacked ? 'Novas alterações financeiras aguardam a P4.6.5 server-side.' : 'Padrão + personalizadas mensais.'}</span>
        </button>
        <button className="panel status-card" onClick={() => setActiveTab('payslip')}>
          <span className="metric-label">Resumo {game.payrollPeriod === 'monthly' ? 'mensal' : 'semanal'}</span>
          <strong>{career.serverBacked ? 'Fonte de verdade: servidor' : game.payrollPeriod === 'monthly' ? `${completedPayrollWeeks} / ${game.minWeeksPerPayroll} semanas encerradas` : weekTrips.length ? 'Pronto para conferir' : 'Semana em andamento'}</strong>
          <span>{career.serverBacked ? 'Abra o holerite para consultar períodos persistidos e executar o fechamento no backend.' : game.payrollPeriod === 'monthly' ? 'Encerre as semanas operacionais e gere um único holerite ao fim do mês.' : `Abra o holerite para visualizar bruto, impostos, ${game.perDiemLabel.toLowerCase()} e ocorrências.`}</span>
        </button>
      </section>

      <section className="panel profile-panel" data-tour="career-profile">
        <div><span className="metric-label">Motorista</span><strong>{career.driverName}</strong></div>
        <div><span className="metric-label">Base</span><strong>{career.city || '—'}</strong></div>
        <div><span className="metric-label">Empresa</span><strong>{career.company || '—'}</strong></div>
        {game.id === 'ets2' && <div><span className="metric-label">País-sede</span><strong>{game.countryFlag} {game.countryName}</strong></div>}
        {game.id === 'ats' && <div><span className="metric-label">Estado-sede</span><strong>{game.stateName} ({game.stateCode})</strong></div>}
        <div><span className="metric-label">Mercado da cidade</span><strong>{game.cityMarketLabel}</strong></div>
        <div><span className="metric-label">Moeda da carreira</span><strong>{game.currency} {game.currency !== game.baseCurrency ? `• base fiscal ${game.baseCurrency}` : '• moeda fiscal local'}</strong></div>
      </section>

      <CareerManagementPanel
        career={career}
        onUpdateProfile={onUpdateProfile}
        onChangeEmployer={onChangeEmployer}
        onChangeBase={onChangeBase}
      />

      <section className="panel legacy-bridge" data-tour="career-backup">
        <div>
          <span className="eyebrow">Backup da carreira</span>
          <h2>Exportar somente esta carreira</h2>
          <p>{career.serverBacked ? 'Durante o cutover, esta exportação continua sendo o backup local legado. Viagens e fechamentos criados somente no servidor não devem ser tratados como parte desse CSV até a etapa final de compatibilidade/backup.' : 'O arquivo tabular inclui esta carreira em uma única linha e preserva perfil, sede fiscal, moeda, viagens, histórico, gastos, ocorrências, holerites e reserva. A importação e a exportação de várias carreiras ficam na tela de Carreiras.'}</p>
        </div>
        <button className="button success compact" type="button" onClick={() => exportCareerCSV(career, state, game.id)}>Exportar carreira CSV</button>
      </section>
    </>
  )
}

function TripsTab({ career, state, onAddTrip, onSaveTripDraft, onSaveDefaultTruck, onDeleteTrip }) {
  const game = useGame()
  const weekTrips = currentWeekTrips(state)
  const allMiles = totalMiles(state)
  const weekMiles = currentWeekMiles(state)
  const pay = mileagePaySummary(weekTrips, game)
  const perDiem = perDiemDaysForTrips(weekTrips)

  return (
    <>
      {career.serverBacked && <section className="notice-box" role="status"><strong>Viagens conectadas ao servidor</strong><span>O histórico abaixo vem da sua carreira server-side. Novas viagens e exclusões da semana aberta são gravadas somente no backend; o backup local anterior não recebe esses writes. O resumo de remuneração nesta aba é apenas informativo; o holerite final é calculado pelo servidor.</span></section>}
      <section className="phase1-status-grid progress-summary-grid" data-tour="trip-summary">
        <MetricCard label={`${game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} da semana`} value={formatDistance(weekMiles, game)} detail={`Semana ${state.currentWeek}`} />
        <MetricCard label={`${game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} na carreira`} value={formatDistance(allMiles, game)} detail={`Nível ${state.currentLevel}`} />
        <MetricCard label={`Bruto por ${game.distanceUnit}`} value={state.currentLevel <= 1 ? `Salário ${game.payrollPeriodLabel}` : formatMoney(pay.gross, game)} detail={state.currentLevel <= 1 ? `Nível 1 não é pago por ${game.distanceUnit}` : `Antes de impostos e ${game.perDiemLabel.toLowerCase()}`} />
        <MetricCard label={`${game.perDiemLabel} potencial`} value={state.currentLevel <= 1 ? 'Não se aplica' : `${perDiem.days} dia(s)`} detail={state.currentLevel <= 1 ? 'Disponível a partir do Nível 2' : `${formatMoney(perDiem.days * game.perDiemRate, game)} a ${formatMoney(game.perDiemRate, game)}/dia`} />
      </section>

      <MileageChart trips={state.trips} />

      <div className="phase1-two-panel">
        <TripForm career={career} state={state} onAdd={onAddTrip} onSaveDraft={onSaveTripDraft} onSaveDefaultTruck={onSaveDefaultTruck} />
        <section className="panel pay-breakdown-panel">
          <span className="eyebrow">Resumo semanal</span>
          <h2>Pagamento por categoria</h2>
          {state.currentLevel <= 1 ? <p className="muted-copy">No Nível 1, os {game.distanceName} contam para progressão, mas o salário base continua em {formatMoney(game.level1Gross, game)} por {game.payrollPeriodLabel === 'mensal' ? 'mês' : 'semana'}.</p> : (
            <div className="breakdown-list">
              {Object.entries(pay.totals).filter(([, value]) => value > 0).map(([category, value]) => <div key={category}><span>{game.payLabels[category]}</span><strong>{formatDistance(value, game)} × {formatMoney(game.payRates[category], game)} = {formatMoney(value * game.payRates[category], game)}</strong></div>)}
              <div className="breakdown-total"><span>Total bruto por {game.distanceUnit}</span><strong>{formatMoney(pay.gross, game)}</strong></div>
            </div>
          )}
          <div className="notice-box"><strong>{game.perDiemLabel}</strong><span>{state.currentLevel <= 1 ? 'Não se aplica ao motorista local do Nível 1.' : perDiem.days ? `${perDiem.days} dia(s) qualificável(is) nesta semana.` : 'Nenhuma viagem com pernoite qualificável nesta semana.'}</span></div>
        </section>
      </div>

      <section className="panel trips-panel" data-tour="trip-history">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico de viagens</span><h2>Trechos registrados</h2><p>Mostrando todas as viagens da carreira, com a semana de cada trecho.</p></div>
        {state.trips.length === 0 ? <div className="empty-inline">Nenhuma viagem registrada.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Semana</th><th>Saída</th><th>Chegada</th><th>Rota</th><th>Caminhão / odômetro</th><th>Tipo</th><th>Categoria</th><th>{game.distanceName}</th>{game.id === 'ets2' && <th>Pausa</th>}<th></th></tr></thead><tbody>{[...state.trips].reverse().map((trip) => {
            const recordedOdometerDistance = tripOdometerDistance(trip)
            const departureMoment = formatTripWeekMoment(trip.departureDay, trip.departureTime) || formatDateTime(trip.departureAt)
            const arrivalMoment = formatTripWeekMoment(trip.arrivalDay, trip.arrivalTime) || formatDateTime(trip.arrivalAt)
            return <tr key={trip.id}><td>{trip.week || 1}</td><td>{departureMoment}</td><td>{arrivalMoment}</td><td><strong>{trip.origin || '—'} → {trip.destination || '—'}</strong><small>{trip.cargo ? `Carga: ${trip.cargo}` : trip.type === 'Deadhead' ? 'Viagem vazia' : ''}</small>{trip.employer && <small>Empregador: {trip.employer}</small>}{trip.baseSnapshot?.city && <small>Base: {trip.baseSnapshot.city}</small>}</td><td><strong>{tripVehicleLabel(trip) || 'Não informado'}</strong>{recordedOdometerDistance == null ? <small>Odômetro não informado</small> : <small>{formatNumber(trip.odometerStart, game)} → {formatNumber(trip.odometerEnd, game)} {game.distanceUnit} · percorrido: {formatDistance(recordedOdometerDistance, game)}</small>}<small>Origem: {tripSourceLabel(trip.source)}</small></td><td>{trip.type === 'Deadhead' ? game.tripTypes.deadhead : game.tripTypes.loaded}</td><td>{game.payLabels[trip.type === 'Deadhead' ? 'deadhead' : (trip.payCategory || 'normal')]}</td><td>{formatDistance(tripDistance(trip), game)}</td>{game.id === 'ets2' && <td>{tripBreakMinutes(trip, game)} min</td>}<td><button className="table-delete" onClick={() => onDeleteTrip(trip)}>Excluir</button></td></tr>
          } )}</tbody></table></div>
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
  if (career.serverBacked && career.serverTripsStatus !== 'ready') {
    const failed = career.serverTripsStatus === 'error'
    return <main className="page-shell"><div className="empty-state"><h2>{failed ? 'Não foi possível carregar as viagens do servidor' : 'Carregando viagens da carreira'}</h2><p>{failed ? 'Para proteger sua carreira, os dados locais antigos não serão usados como substitutos das viagens server-side. Recarregue a aplicação para tentar novamente.' : 'Aguarde a sincronização da carreira server-side antes de continuar o gameplay.'}</p>{failed && <button className="button primary compact" onClick={() => window.location.reload()}>Tentar novamente</button>}</div></main>
  }

  function commit(nextState) {
    const normalized = { ...nextState, currentLevel: Number(nextState.currentLevel || nextState.careerLevel || 1), careerLevel: Number(nextState.currentLevel || nextState.careerLevel || 1) }
    setState(normalized)
    savePhase1State(career.id, normalized, game.id)
  }

  function saveTripDraft(draft) {
    commit({ ...state, tripDraft: draft })
    toast.success('Rascunho da viagem salvo. Você pode fechar a aplicação e continuar depois.')
  }

  function saveDefaultTruck({ truckMake, truckModel }) {
    updateCareer(career.id, {
      defaultTruckMake: String(truckMake || '').trim(),
      defaultTruckModel: String(truckModel || '').trim(),
    }, game.id)
  }

  function handleMilestone(beforeDistance, afterDistance) {
    const milestones = promotionMilestones(game)
    if (state.currentLevel === 1 && beforeDistance < game.promotionGoals[0] && afterDistance >= game.promotionGoals[0]) {
      setPromotionMilestone(milestones[2])
    } else if (state.currentLevel === 2 && beforeDistance < game.promotionGoals[1] && afterDistance >= game.promotionGoals[1]) {
      setPromotionMilestone(milestones[3])
    }
  }

  async function refreshServerTrips() {
    const trips = await tripApi.list(game.id, career.serverCareerId)
    setServerCareerTrips(game.id, career.id, trips)
    const refreshed = loadPhase1State(career.id, game.id)
    setState(refreshed)
    return refreshed
  }

  async function addTrip(trip) {
    const beforeDistance = totalMiles(state)
    const addedDistance = tripDistance(trip)

    if (!career.serverBacked) {
      const afterDistance = beforeDistance + addedDistance
      const contextualTrip = {
        ...trip,
        employer: career.company || '',
        baseSnapshot: careerBaseSnapshot(career),
      }
      commit({ ...state, tripDraft: null, trips: [...state.trips, contextualTrip] })
      toast.success(`Viagem registrada: ${formatDistance(addedDistance, game)} adicionados à carreira.`)
      handleMilestone(beforeDistance, afterDistance)
      return true
    }

    try {
      const created = await tripApi.create(game.id, career.serverCareerId, trip)
      try {
        const refreshed = await refreshServerTrips()
        const withoutDraft = { ...refreshed, tripDraft: null }
        setState(withoutDraft)
        savePhase1State(career.id, withoutDraft, game.id)
        const afterDistance = totalMiles(refreshed)
        toast.success(`Viagem registrada no servidor: ${formatDistance(tripDistance(serverTripToPhase1Trip(created, game.id)), game)} adicionados à carreira.`)
        handleMilestone(beforeDistance, afterDistance)
      } catch {
        markServerCareerTripsUnavailable(game.id, career.id)
        const createdTrip = serverTripToPhase1Trip(created, game.id)
        const visibleState = { ...state, tripDraft: null, trips: [...state.trips, createdTrip] }
        setState(visibleState)
        savePhase1State(career.id, visibleState, game.id)
        toast.info('A viagem foi salva no servidor, mas a lista não pôde ser recarregada agora. Recarregue a aplicação antes de continuar.')
      }
      return true
    } catch (error) {
      toast.error(error?.message || 'Não foi possível registrar a viagem no servidor.', { title: 'Viagem não registrada' })
      return false
    }
  }

  function updateProfile({ driverName, bio, effectiveDate }) {
    const changes = {
      driverName: { previous: career.driverName || '', next: driverName },
      bio: { previous: career.bio || career.biography || '', next: bio },
    }
    const event = createCareerEvent({ type: CAREER_EVENT_TYPES.PROFILE_UPDATED, effectiveDate, changes })
    updateCareer(career.id, {
      driverName,
      bio,
      biography: undefined,
      events: [...(career.events || []), event],
    }, game.id)
    toast.success('Perfil atualizado e registrado no histórico da carreira.')
  }

  function changeEmployer({ company, effectiveDate }) {
    const historicalState = preserveHistoricalCareerContext(state, career)
    commit(historicalState)
    const event = createCareerEvent({
      type: CAREER_EVENT_TYPES.EMPLOYER_CHANGED,
      effectiveDate,
      changes: { company: { previous: career.company || '', next: company } },
    })
    updateCareer(career.id, { company, events: [...(career.events || []), event] }, game.id)
    toast.success(`Empresa alterada para ${company}. Os registros anteriores foram preservados.`)
  }

  function changeBase({ city, effectiveDate, profile }) {
    const previousBase = careerBaseSnapshot(career)
    const nextCareerFields = {
      city,
      countryCode: game.id === 'ets2' ? profile.countryCode : '',
      countryName: game.id === 'ets2' ? profile.countryName : '',
      stateCode: game.id === 'ats' ? profile.stateCode : '',
      stateName: game.id === 'ats' ? profile.stateName : '',
      currency: profile.currency,
      baseCurrency: profile.baseCurrency,
      exchangeRate: profile.exchangeRate,
      exchangeRateAsOf: profile.exchangeRateAsOf,
      cityMarketVersion: profile.cityMarketVersion,
      cityMarketLabel: profile.cityMarketLabel,
      cityCostFactor: profile.cityCostFactor,
      citySalaryFactor: profile.citySalaryFactor,
    }
    const historicalState = preserveHistoricalCareerContext(state, career)
    commit({ ...historicalState, expenses: { ...profile.expenses } })
    const event = createCareerEvent({
      type: CAREER_EVENT_TYPES.BASE_CHANGED,
      effectiveDate,
      changes: { base: { previous: previousBase, next: careerBaseSnapshot({ ...career, ...nextCareerFields }) } },
    })
    updateCareer(career.id, { ...nextCareerFields, events: [...(career.events || []), event] }, game.id)
    toast.success(`Base alterada para ${city}. As novas regras financeiras passam a valer nos próximos cálculos.`)
  }

  async function deleteTrip(trip) {
    if (!career.serverBacked) {
      const weekClosed = isTripWeekLocked(state, trip.week, game)
      if (weekClosed) {
        toast.error('Esta viagem pertence a uma semana já fechada e não pode ser excluída.')
        return
      }
    } else if (Number(trip.week || 1) !== Number(career.currentOperationalWeek || state.currentWeek || 1)) {
      toast.error('Esta viagem pertence a uma semana operacional já encerrada e não pode ser excluída.')
      return
    }

    const confirmed = await confirm({
      title: 'Excluir viagem?',
      message: `O trecho ${trip.origin || 'Origem não informada'} → ${trip.destination || 'Destino não informado'} será removido do registro da carreira.`,
      confirmLabel: 'Excluir viagem',
      tone: 'danger',
    })
    if (!confirmed) return

    if (!career.serverBacked) {
      commit({ ...state, trips: state.trips.filter((item) => Number(item.id) !== Number(trip.id)) })
      toast.success('Viagem excluída com sucesso.')
      return
    }

    try {
      await tripApi.delete(game.id, career.serverCareerId, trip.serverTripId || trip.id)
    } catch (error) {
      if (error instanceof ApiProblemError && error.code === 'TRIP_WEEK_LOCKED') {
        toast.error('A semana dessa viagem foi encerrada no servidor e não permite mais exclusão.')
        try { await refreshServerTrips() } catch { /* mantém a mensagem principal */ }
        return
      }
      toast.error(error?.message || 'Não foi possível excluir a viagem no servidor.', { title: 'Exclusão não concluída' })
      return
    }

    try {
      await refreshServerTrips()
      toast.success('Viagem excluída do servidor com sucesso.')
    } catch {
      markServerCareerTripsUnavailable(game.id, career.id)
      setState((current) => ({
        ...current,
        trips: current.trips.filter((item) => String(item.serverTripId || item.id) !== String(trip.serverTripId || trip.id)),
      }))
      toast.info('A viagem foi excluída no servidor, mas a lista não pôde ser recarregada agora. Sincronize novamente antes de continuar.')
    }
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
              <span className="eyebrow">Fase 1 • {game.shortName} • {game.levelRoles[(career.serverBacked ? Number(career.currentLevel || state.currentLevel || 1) : state.currentLevel) - 1]}</span>
              <h1>{career.driverName}</h1>
              <p>{career.city} • {career.company}</p>
            </div>
            <HeaderSummary state={state} career={career} />
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
        {activeTab === 'overview' && <OverviewTab career={career} state={state} setActiveTab={setActiveTab} onUpdateProfile={updateProfile} onChangeEmployer={changeEmployer} onChangeBase={changeBase} />}
        {activeTab === 'finances' && (career.serverBacked
          ? <ServerCutoverGuard title="Saldo e despesas temporariamente protegidos" phase="P4.6.5" detail="O saldo exibido no cabeçalho já vem do perfil server-side, mas despesas, reserva, ledger e demais movimentações financeiras ainda serão conectados em uma fatia própria. Até lá, esta carreira migrada não aceitará novas gravações financeiras apenas no navegador." />
          : <FinancesTab state={state} commit={commit} />)}
        {activeTab === 'payslip' && (career.serverBacked
          ? <ServerPayslipTab career={career} />
          : <PayslipTab career={career} state={state} commit={commit} />)}
        {activeTab === 'progress' && <TripsTab career={career} state={state} onAddTrip={addTrip} onSaveTripDraft={saveTripDraft} onSaveDefaultTruck={saveDefaultTruck} onDeleteTrip={deleteTrip} />}
        {activeTab === 'incidents' && (career.serverBacked
          ? <ServerCutoverGuard title="Ocorrências temporariamente protegidas" phase="P4.6.4" detail="As ocorrências já existentes no backend continuam participando dos cálculos server-side. Novas multas ou acidentes ficarão bloqueados até a tela usar a API de ocorrências, evitando que um desconto exista somente no navegador e seja ignorado pelo holerite." />
          : <IncidentsTab state={state} commit={commit} />)}
        {activeTab === 'qualifications' && (career.serverBacked
          ? <ServerCutoverGuard title="Promoções e qualificações temporariamente protegidas" phase="P4.6.4" detail="O nível e as qualificações persistidos no backend continuam sendo a referência para os cálculos. Novas promoções, HazMat/ADR e conclusões da Academy serão reativadas quando esta aba estiver conectada ao servidor." />
          : <QualificationsTab state={state} commit={commit} />)}
        {activeTab === 'academy' && <AcademyGuideTab onOpenQualifications={() => goToTab('qualifications')} />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'mods' && <ModsTab />}
        {activeTab === 'history' && <HistoryTab career={career} state={state} />}
      </main>
    </div>
  )
}