import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getGame } from '../config/games.js'

export const TUTORIAL_STORAGE_KEY = 'ats_guided_tour_v1'

export const TUTORIAL_STEPS = [
  {
    id: 'career-phases', route: '/phases', target: 'career-phases',
    title: 'As fases da sua carreira',
    text: 'A carreira foi criada. Aqui você escolhe a etapa profissional do motorista. A Fase 1 está disponível agora; as próximas fases serão liberadas futuramente.',
  },
  {
    id: 'phase-one', route: '/phases', target: 'phase-one',
    title: 'Fase 1 — Motorista Empregado',
    text: 'Você começa como Company Driver, sem caminhão próprio. O tutorial abrirá esta fase automaticamente e não modificará nenhum dado da carreira.',
  },
  {
    id: 'career-summary', route: '/phase1', tab: 'overview', target: 'career-summary',
    title: 'Resumo sempre à vista',
    text: 'No topo ficam saldo, nível atual, progresso em milhas e semana em andamento. Esses números se atualizam conforme você usa a aplicação.',
  },
  {
    id: 'main-navigation', route: '/phase1', tab: 'overview', target: 'main-navigation',
    title: 'Navegação principal',
    text: 'Use estas abas para alternar entre a visão geral, o Diário de Bordo, as finanças, as regras da simulação e os mods sugeridos.',
  },
  {
    id: 'overview-shortcuts', route: '/phase1', tab: 'overview', target: 'overview-shortcuts',
    title: 'Atalhos da visão geral',
    text: 'Estes cartões mostram o total mensal e a situação da semana. Você também pode clicar neles para abrir diretamente Despesas ou Holerite.',
  },
  {
    id: 'career-profile', route: '/phase1', tab: 'overview', target: 'career-profile',
    title: 'Sede fiscal, cidade e moeda',
    text: 'O estado-sede define impostos e a referência financeira. A cidade-base ajusta aluguel, despesas e salários dos três níveis; a moeda define como os valores aparecem. O destino das viagens não muda sua folha.',
  },
  {
    id: 'career-management', route: '/phase1', tab: 'overview', target: 'career-management',
    title: 'Perfil, empresa e base',
    text: 'Corrija o nome ou a biografia e registre trocas de empresa ou de base com data efetiva. Cada mudança preserva os valores anteriores e só altera os próximos registros e cálculos.',
  },
  {
    id: 'career-backup', route: '/phase1', tab: 'overview', target: 'career-backup',
    title: 'Backup da carreira',
    text: 'Exporte um CSV para guardar sede fiscal, perfil municipal, moeda, viagens, finanças, ocorrências e semanas fechadas. A importação do arquivo fica na lista de carreiras.',
  },
  {
    id: 'journal-navigation', route: '/phase1', tab: 'progress', target: 'journal-navigation',
    title: 'Diário de Bordo',
    text: 'O Diário reúne Registro de Viagens, Infrações e Acidentes, Qualificações e o guia da Driving Academy. O tutorial percorrerá cada área.',
  },
  {
    id: 'trip-form', route: '/phase1', tab: 'progress', target: 'trip-form',
    title: 'Registrar uma viagem',
    text: 'Informe saída, chegada, cidades, empresas, carga, tipo e milhas. Marca, modelo e odômetros são opcionais e preparam a viagem para futura telemetria; a distância digitada continua oficial. Loaded e Deadhead entram na progressão e os horários alimentam Route Overrun e per diem.',
  },
  {
    id: 'trip-summary', route: '/phase1', tab: 'progress', target: 'trip-summary',
    title: 'Milhas e pagamento da semana',
    text: 'Aqui você acompanha milhas semanais e totais, estimativa por categoria e dias que podem gerar per diem. No Nível 1 o pagamento permanece semanal.',
  },
  {
    id: 'trip-history', route: '/phase1', tab: 'progress', target: 'trip-history',
    title: 'Histórico de trechos',
    text: 'Todas as viagens ficam listadas com sua semana. Trechos da semana atual podem ser excluídos; semanas fechadas pelo holerite ficam protegidas.',
  },
  {
    id: 'incident-form', route: '/phase1', tab: 'incidents', target: 'incident-form',
    title: 'Infrações e acidentes',
    text: 'Registre multas, danos ou outras cobranças e vincule uma rota. O valor pode sair do saldo agora ou ficar pendente para o próximo holerite.',
  },
  {
    id: 'incident-history', route: '/phase1', tab: 'incidents', target: 'incident-history',
    title: 'Controle das ocorrências',
    text: 'Esta lista mostra o que foi pago e o que ainda está pendente. Uma cobrança parcialmente processada fica protegida para evitar divergências.',
  },
  {
    id: 'qualifications', route: '/phase1', tab: 'qualifications', target: 'qualifications',
    title: 'Níveis e qualificações',
    text: 'Acompanhe as metas de 10.000 e 50.000 milhas, confirme treinamentos e pague as taxas de promoção. HazMat libera cargas e tarifas específicas.',
  },
  {
    id: 'academy', route: '/phase1', tab: 'academy', target: 'academy',
    title: 'Driving Academy',
    text: 'Este guia mostra quais módulos concluir dentro do ATS para liberar os Níveis 2 e 3 e como confirmar o treinamento depois na aplicação.',
  },
  {
    id: 'finance-navigation', route: '/phase1', tab: 'finances', target: 'finance-navigation',
    title: 'Área financeira',
    text: 'As finanças estão divididas em Saldo e Despesas, Holerite e Histórico. Elas representam a economia pessoal do motorista, separada do dinheiro exibido pelo ATS.',
  },
  {
    id: 'finance-summary', route: '/phase1', tab: 'finances', target: 'finance-summary',
    title: 'Visão financeira',
    text: 'Confira saldo disponível, reserva de emergência, patrimônio total e despesas mensais. O patrimônio soma o saldo e o valor reservado.',
  },
  {
    id: 'balance-tools', route: '/phase1', tab: 'finances', target: 'balance-tools',
    title: 'Ajuste de saldo',
    text: 'Use o ajuste manual somente para corrigir ou sincronizar a simulação. A diferença fica registrada como movimentação no Histórico.',
  },
  {
    id: 'reserve-tools', route: '/phase1', tab: 'finances', target: 'reserve-tools',
    title: 'Reserva de emergência',
    text: 'Faça aportes manuais ou resgates com motivo. A reserva fica separada do saldo e recebe rendimento semanal quando o holerite é fechado.',
  },
  {
    id: 'monthly-expenses', route: '/phase1', tab: 'finances', target: 'monthly-expenses',
    title: 'Despesas mensais',
    text: 'Edite os custos de vida padrão. Aplicar as despesas desconta somente esses gastos do saldo e não movimenta a reserva de emergência.',
  },
  {
    id: 'custom-expenses', route: '/phase1', tab: 'finances', target: 'custom-expenses',
    title: 'Gastos personalizados',
    text: 'Cadastre custos extras e escolha quais entram no total mensal. O botão final aplica de uma vez as despesas padrão e as personalizadas marcadas.',
  },
  {
    id: 'payslip-form', route: '/phase1', tab: 'payslip', target: 'payslip-form',
    title: 'Fechamento do holerite',
    text: 'Revise salário ou milhas, impostos, benefícios, per diem e ocorrências. Você também pode configurar um aporte automático para a reserva após o depósito.',
  },
  {
    id: 'payslip-preview', route: '/phase1', tab: 'payslip', target: 'payslip-preview',
    title: 'Prévia do pagamento',
    text: 'A prévia detalha cada entrada e desconto antes da confirmação. O depósito total é o valor que será creditado no saldo da carreira.',
  },
  {
    id: 'closed-weeks', route: '/phase1', tab: 'payslip', target: 'closed-weeks',
    title: 'Semanas fechadas',
    text: 'Ao gerar o holerite, a semana é congelada e a próxima começa. Os fechamentos anteriores permanecem disponíveis para conferência.',
  },
  {
    id: 'history-summary', route: '/phase1', tab: 'history', target: 'history-summary',
    title: 'Histórico completo',
    text: 'Os indicadores e gráficos resumem movimentações, semanas e ocorrências para mostrar como a carreira evolui ao longo do tempo.',
  },
  {
    id: 'history-records', route: '/phase1', tab: 'history', target: 'history-records',
    title: 'Movimentações financeiras',
    text: 'Salários, despesas, ajustes, aportes e qualificações aparecem aqui com valor e saldo resultante. Os registros mais recentes ficam primeiro.',
  },
  {
    id: 'career-events', route: '/phase1', tab: 'history', target: 'career-events',
    title: 'Linha do tempo da carreira',
    text: 'Correções de perfil, trocas de empresa e mudanças de base aparecem com data efetiva e os valores anterior e novo, sem reescrever viagens ou holerites fechados.',
  },
  {
    id: 'rules', route: '/phase1', tab: 'rules', target: 'rules',
    title: 'Regras da simulação',
    text: 'Consulte como funcionam os três níveis, rotas, retorno à base, economia própria, fluxo semanal e outras regras do roleplay realista.',
  },
  {
    id: 'mods', route: '/phase1', tab: 'mods', target: 'mods',
    title: 'Mods sugeridos',
    text: 'Esta área reúne mods opcionais de imersão e uma ordem recomendada. Evite mods de economia, pois os pagamentos são calculados pela aplicação.',
  },
  {
    id: 'finished', route: '/phase1', tab: 'overview', target: 'main-navigation',
    title: 'Tutorial concluído',
    text: 'Pronto! Você conheceu todas as áreas da aplicação. Comece registrando suas viagens e use as abas sempre que precisar consultar ou atualizar a carreira.',
  },
]

export function tutorialStepsForGame(gameId = 'ats') {
  if (gameId === 'ats') return TUTORIAL_STEPS
  const overrides = {
    'career-summary': 'No topo ficam saldo, nível atual, progresso em quilômetros, mês do holerite e semana operacional. Esses números se atualizam conforme você usa a aplicação.',
    'overview-shortcuts': 'Estes cartões mostram as despesas mensais e a situação do mês. Você também pode clicar neles para abrir diretamente Despesas ou Holerite.',
    'career-profile': 'O país-sede define impostos, contribuições e a referência financeira. A cidade-base representa a região e ajusta aluguel, despesas e salários dos três níveis. A moeda escolhida controla a exibição e o destino das viagens não muda a folha.',
    'career-backup': 'Exporte um CSV para guardar país-sede, cidade e perfil municipal, moeda, cotação registrada, viagens, finanças, ocorrências, semanas operacionais e holerites mensais. A importação fica na lista de carreiras.',
    'trip-form': 'Informe saída, chegada, cidades, empresas, carga, tipo, quilômetros e a pausa não trabalhada dentro da viagem. Marca, modelo e odômetros são opcionais e preparam a viagem para futura telemetria sem substituir a distância oficial. Se a pausa ficar vazia, a aplicação sugere o mínimo pelos blocos europeus de 4h30; esse tempo será descontado antes de calcular horas extras.',
    'trip-summary': 'Aqui você acompanha quilômetros da semana operacional e da carreira, estimativa por categoria e diárias. No Nível 1, o salário permanece mensal.',
    'trip-history': 'Todas as viagens ficam listadas por semana operacional. Ao encerrar uma semana no Holerite, seus trechos ficam congelados e não podem mais ser excluídos.',
    'reserve-tools': 'Faça aportes manuais ou resgates com motivo. A reserva fica separada do saldo e recebe rendimento mensal quando o holerite é fechado.',
    'payslip-form': 'No ETS2, encerre de quatro a cinco semanas operacionais antes de gerar o holerite mensal. No Nível 1, confira tempo corrido, pausas descontadas, horas líquidas e saldo extra; revise também retenções do país-sede, diárias, ocorrências e eventual aporte à reserva.',
    'closed-weeks': 'O holerite reúne as semanas encerradas e fecha o mês. O depósito e as retenções nacionais ficam registrados para conferência, e a semana atual continua aberta para o próximo período.',
    'history-summary': 'Os indicadores e gráficos resumem movimentações, holerites mensais e ocorrências para mostrar como a carreira evolui ao longo do tempo.',
    rules: 'Consulte como funcionam os três níveis, rotas, país-sede, economia própria, fechamento mensal e as regras operacionais europeias do roleplay.',
  }
  return TUTORIAL_STEPS.flatMap((step) => {
    const transformed = {
      ...step,
      title: (step.id === 'career-profile' ? 'Sede fiscal, cidade e moeda' : step.title)
        .replaceAll('Milhas', 'Quilômetros')
        .replaceAll('HazMat', 'ADR')
        .replaceAll('Semanas fechadas', 'Meses fechados'),
      text: overrides[step.id] || step.text
        .replaceAll('American Truck Simulator', 'Euro Truck Simulator 2')
        .replaceAll('ATS', 'ETS2')
        .replaceAll('10.000 e 50.000 milhas', '16.000 e 80.000 quilômetros')
        .replaceAll('milhas', 'quilômetros')
        .replaceAll('Loaded e Deadhead', 'Com carga e reposicionamento vazio')
        .replaceAll('HazMat', 'ADR')
        .replaceAll('Company Driver', 'motorista empregado')
        .replaceAll('OTR', 'internacional')
        .replaceAll('Route Overrun', 'hora extra de rota')
        .replaceAll('per diem', 'diária internacional'),
    }
    if (step.id !== 'payslip-form') return [transformed]
    return [transformed, {
      id: 'payroll-period', route: '/phase1', tab: 'payslip', target: 'payroll-period',
      title: 'Semanas operacionais do mês',
      text: 'Encerrar uma semana congela suas viagens e abre a próxima, sem depositar salário. Após quatro semanas, o holerite mensal é liberado; a quinta semana é opcional e encerra o limite do período.',
    }]
  })
}

const TutorialContext = createContext(null)

function readStoredTour() {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(TUTORIAL_STORAGE_KEY) || 'null')
    const gameId = stored?.gameId || 'ats'
    if (!stored?.careerId || !Number.isInteger(stored.index) || stored.index < 0 || stored.index >= tutorialStepsForGame(gameId).length) return null
    return { ...stored, gameId }
  } catch {
    return null
  }
}

function storeTour(tour) {
  try {
    if (tour) window.sessionStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tour))
    else window.sessionStorage.removeItem(TUTORIAL_STORAGE_KEY)
  } catch {
    // O tour continua funcionando na memória quando o armazenamento da sessão está indisponível.
  }
}

function stepHash(step, careerId, gameId = 'ats') {
  const game = getGame(gameId)
  const route = step.route === '/phase1' ? game.routes.phase1 : game.routes.phases
  return `#${route}?career=${encodeURIComponent(careerId)}`
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum)
}

function TutorialOverlay({ step, index, totalSteps, onBack, onNext, onExit }) {
  const [spotlight, setSpotlight] = useState(null)
  const [popoverPosition, setPopoverPosition] = useState(null)
  const targetRef = useRef(null)
  const popoverRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    previousFocus.current = document.activeElement
    return () => {
      const element = previousFocus.current
      if (element instanceof HTMLElement && element.isConnected) element.focus()
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let didScroll = false

    function updatePosition() {
      const target = targetRef.current
      if (!target?.isConnected) return
      const rect = target.getBoundingClientRect()
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768
      const edge = 10
      const padding = 7
      const left = clamp(rect.left - padding, edge, Math.max(edge, viewportWidth - edge - 24))
      const top = clamp(rect.top - padding, edge, Math.max(edge, viewportHeight - edge - 24))
      const right = clamp(rect.right + padding, left + 24, viewportWidth - edge)
      const bottom = clamp(rect.bottom + padding, top + 24, viewportHeight - edge)
      const nextSpotlight = { left, top, width: right - left, height: bottom - top }
      setSpotlight(nextSpotlight)

      const popoverWidth = Math.min(390, viewportWidth - 24)
      const popoverHeight = Math.min(popoverRef.current?.getBoundingClientRect().height || 270, viewportHeight - 24)
      const below = bottom + 14
      const above = top - popoverHeight - 14
      let popoverTop
      if (below + popoverHeight <= viewportHeight - 12) popoverTop = below
      else if (above >= 12) popoverTop = above
      else popoverTop = top > viewportHeight / 2 ? 12 : Math.max(12, viewportHeight - popoverHeight - 12)
      const centeredLeft = left + (nextSpotlight.width - popoverWidth) / 2
      setPopoverPosition({ top: popoverTop, left: clamp(centeredLeft, 12, Math.max(12, viewportWidth - popoverWidth - 12)), width: popoverWidth })
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame?.(frame)
      frame = window.requestAnimationFrame ? window.requestAnimationFrame(updatePosition) : window.setTimeout(updatePosition, 0)
    }

    function findTarget() {
      const target = document.querySelector(`[data-tour="${step.target}"]`)
      if (!target) return
      targetRef.current = target
      if (!didScroll) {
        didScroll = true
        try {
          target.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'auto' })
        } catch {
          target.scrollIntoView?.()
        }
      }
      scheduleUpdate()
    }

    setSpotlight(null)
    setPopoverPosition(null)
    targetRef.current = null
    const observer = new MutationObserver(findTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)
    findTarget()

    return () => {
      window.cancelAnimationFrame?.(frame)
      window.clearTimeout(frame)
      observer.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [step.id, step.target])

  useEffect(() => {
    popoverRef.current?.focus()
    const frame = window.requestAnimationFrame ? window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    }) : 0
    return () => window.cancelAnimationFrame?.(frame)
  }, [step.id])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onExit()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(popoverRef.current?.querySelectorAll('button:not([disabled])') || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onExit])

  const isLast = index === totalSteps - 1
  const progress = ((index + 1) / totalSteps) * 100

  return (
    <div className={`guided-tutorial-layer${spotlight ? '' : ' locating'}`}>
      <div className="guided-tutorial-blocker" aria-hidden="true" onMouseDown={(event) => event.preventDefault()} />
      {spotlight && <div className="guided-tutorial-spotlight" style={spotlight} aria-hidden="true" />}
      <section
        className={`guided-tutorial-popover${popoverPosition ? '' : ' centered'}`}
        style={popoverPosition || undefined}
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tutorial-title"
        aria-describedby="guided-tutorial-description"
        tabIndex="-1"
      >
        <div className="guided-tutorial-meta">
          <span className="eyebrow">Tour guiado</span>
          <strong>Etapa {index + 1} de {totalSteps}</strong>
        </div>
        <div className="guided-tutorial-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        <h2 id="guided-tutorial-title">{step.title}</h2>
        <p id="guided-tutorial-description">{step.text}</p>
        <div className="guided-tutorial-actions">
          <button className="guided-tutorial-exit" type="button" onClick={onExit}>Sair do tutorial</button>
          <div>
            {index > 0 && <button className="button secondary" type="button" onClick={onBack}>Voltar</button>}
            <button className="button primary" type="button" onClick={onNext}>{isLast ? 'Concluir tutorial' : 'Próximo'}</button>
          </div>
        </div>
      </section>
    </div>
  )
}

export function TutorialProvider({ children }) {
  const [tour, setTour] = useState(readStoredTour)
  const steps = useMemo(() => tutorialStepsForGame(tour?.gameId || 'ats'), [tour?.gameId])
  const activeStep = tour ? steps[tour.index] : null

  const startTutorial = useCallback((careerId, gameId = 'ats') => {
    const nextTour = gameId === 'ats'
      ? { careerId: String(careerId), index: 0 }
      : { careerId: String(careerId), gameId, index: 0 }
    storeTour(nextTour)
    setTour(nextTour)
    window.location.hash = stepHash(tutorialStepsForGame(gameId)[0], nextTour.careerId, gameId)
  }, [])

  const exitTutorial = useCallback(() => {
    storeTour(null)
    setTour(null)
  }, [])

  const changeStep = useCallback((direction) => {
    setTour((current) => {
      if (!current) return null
      const nextIndex = current.index + direction
      const currentSteps = tutorialStepsForGame(current.gameId || 'ats')
      if (nextIndex >= currentSteps.length) {
        storeTour(null)
        return null
      }
      const nextTour = { ...current, index: clamp(nextIndex, 0, currentSteps.length - 1) }
      storeTour(nextTour)
      return nextTour
    })
  }, [])

  useEffect(() => {
    if (!tour || !activeStep) return undefined
    const expectedHash = stepHash(activeStep, tour.careerId, tour.gameId)
    const keepTutorialRoute = () => {
      if (window.location.hash !== expectedHash) window.location.hash = expectedHash
    }
    keepTutorialRoute()
    window.addEventListener('hashchange', keepTutorialRoute)
    return () => window.removeEventListener('hashchange', keepTutorialRoute)
  }, [activeStep, tour])

  const value = useMemo(() => ({
    activeStep,
    isTutorialActive: Boolean(tour),
    startTutorial,
    exitTutorial,
  }), [activeStep, exitTutorial, startTutorial, tour])

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {tour && activeStep && (
        <TutorialOverlay
          step={activeStep}
          index={tour.index}
          totalSteps={steps.length}
          onBack={() => changeStep(-1)}
          onNext={() => changeStep(1)}
          onExit={exitTutorial}
        />
      )}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (!context) throw new Error('useTutorial precisa estar dentro de TutorialProvider')
  return context
}
