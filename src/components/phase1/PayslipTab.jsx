import { useMemo, useState } from 'react'
import {
  applyPendingIncidentDeductions,
  currentPayrollTrips,
  currentWeekTrips,
  estimateTaxes,
  mileagePaySummary,
  monthlyEmergencyReserveYield,
  payrollWeeks,
  perDiemDaysForTrips,
  routeOverrunSummary,
  tripDistance,
  weeklyEmergencyReserveYield,
} from '../../lib/phase1.js'
import { formatDistance, formatMoney } from '../../config/games.js'
import { useGame } from '../GameContext.jsx'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useToast } from '../ToastProvider.jsx'

function formatHours(hours) {
  const totalMinutes = Math.round(Number(hours || 0) * 60)
  const wholeHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${wholeHours}h ${minutes}min` : `${wholeHours}h`
}

function InfoTip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function TipLabel({ children, tip }) {
  return <label className="label-with-tip"><span>{children}</span><InfoTip text={tip} /></label>
}

function LineLabel({ children, tip }) {
  return <span className="line-label-with-tip"><span>{children}</span><InfoTip text={tip} /></span>
}

function closedPeriodLabel(period, game) {
  if (period.periodType === 'month' || period.month) return `Mês ${period.month}`
  if (game.payrollPeriod === 'monthly') return `Semana ${period.week || '—'} (legado)`
  return `Semana ${period.week || '—'}`
}

export default function PayslipTab({ career, state, commit, serverTripsActive = false }) {
  const game = useGame()
  const money = (value) => formatMoney(value, game)
  const toast = useToast()
  const confirm = useConfirm()
  const monthlyPayroll = game.payrollPeriod === 'monthly'
  const [level1Gross, setLevel1Gross] = useState(game.level1Gross)
  const [overrunRate, setOverrunRate] = useState(game.routeOverrunRate)
  const [benefits, setBenefits] = useState(game.payrollBenefits ?? game.weeklyBenefits ?? 0)
  const [perDiemRate, setPerDiemRate] = useState(game.perDiemRate)
  const [autoReserveEnabled, setAutoReserveEnabled] = useState(Boolean(state.autoReserveContribution?.enabled))
  const [autoReserveAmount, setAutoReserveAmount] = useState(state.autoReserveContribution?.amount ?? '')
  const [preview, setPreview] = useState(null)

  const completedWeeks = useMemo(() => payrollWeeks(state, game), [game, state])
  const periodTrips = useMemo(
    () => monthlyPayroll ? currentPayrollTrips(state, game) : currentWeekTrips(state),
    [game, monthlyPayroll, state],
  )
  const mileage = useMemo(() => mileagePaySummary(periodTrips, game), [game, periodTrips])
  const perDiemDays = useMemo(() => perDiemDaysForTrips(periodTrips), [periodTrips])
  const routeOverrun = useMemo(() => routeOverrunSummary(periodTrips, undefined, game.routeOverrunRate, game), [game, periodTrips])
  const periodDistance = useMemo(() => periodTrips.reduce((sum, trip) => sum + tripDistance(trip), 0), [periodTrips])
  const payrollReady = !serverTripsActive && (!monthlyPayroll || completedWeeks.length >= game.minWeeksPerPayroll)
  const canCloseWeek = !serverTripsActive && monthlyPayroll && completedWeeks.length < game.maxWeeksPerPayroll
  const periodName = monthlyPayroll ? `Mês ${state.currentPayrollMonth || 1}` : `Semana ${state.currentWeek}`
  const periodAdjective = monthlyPayroll ? 'mensal' : 'semanal'

  function calculate() {
    const level = Number(state.currentLevel || state.careerLevel || 1)
    let gross = 0
    let perDiem = 0
    let desc = ''
    const effectiveOverrunRate = Math.max(0, Number(overrunRate) || 0)
    const routeOverrunPay = Math.round((routeOverrun.overrunMinutes * effectiveOverrunRate / 60) * 100) / 100

    if (level === 1) {
      gross = Math.max(0, Number(level1Gross) || 0) + routeOverrunPay
      desc = `Nível 1 — salário ${periodAdjective}${routeOverrun.overrunMinutes ? ` + ${formatHours(routeOverrun.overrunHours)} ${game.overtimeLabel} @ ${money(effectiveOverrunRate)}/h` : ''}`
    } else {
      gross = mileage.gross
      perDiem = perDiemDays.days * Math.max(0, Number(perDiemRate) || 0)
      const parts = Object.entries(mileage.totals)
        .filter(([, distance]) => distance > 0)
        .map(([category, distance]) => `${game.payLabels[category]} ${formatDistance(distance, game)} @ ${money(game.payRates[category])}`)
      desc = `Nível ${level} — ${parts.join(' + ') || `sem ${game.distanceName}`}`
    }

    const taxes = estimateTaxes(gross, game)
    const taxesTotal = Object.values(taxes).reduce((sum, value) => sum + value, 0)
    const benefitValue = Math.max(0, Number(benefits) || 0)
    const netSalary = gross - taxesTotal - benefitValue
    const beforeIncidents = Math.max(0, netSalary + perDiem)
    const completedWeekSet = new Set(completedWeeks)
    const periodStartWeek = Number(state.payPeriodStartWeek || 1)
    const deductions = applyPendingIncidentDeductions(state.incidents, beforeIncidents, (incident) => {
      if (!monthlyPayroll || !Number.isFinite(Number(incident.week))) return true
      const incidentWeek = Number(incident.week)
      return incidentWeek < periodStartWeek || completedWeekSet.has(incidentWeek)
    })
    const deposit = beforeIncidents - deductions.applied
    const reserveInterest = monthlyPayroll
      ? monthlyEmergencyReserveYield(state.emergencyReserve)
      : weeklyEmergencyReserveYield(state.emergencyReserve)

    return {
      level, gross, perDiem, taxes, taxesTotal, benefits: benefitValue, netSalary,
      incidentDeduction: deductions.applied, incidents: deductions.incidents, deposit, reserveInterest,
      routeOverrunPay: level === 1 ? routeOverrunPay : 0,
      routeOverrunHours: level === 1 ? routeOverrun.overrunHours : 0,
      routeOverrunRate: level === 1 ? effectiveOverrunRate : 0,
      routeElapsedMinutes: level === 1 ? routeOverrun.totalElapsedMinutes : 0,
      routeBreakMinutes: level === 1 ? routeOverrun.totalBreakMinutes : 0,
      routeWorkedMinutes: level === 1 ? routeOverrun.totalMinutes : 0,
      desc,
    }
  }

  async function closeOperationalWeek() {
    if (serverTripsActive) {
      toast.info('O fechamento operacional desta carreira será reativado na P4.6.3, já usando o backend. A semana não será avançada somente no navegador.')
      return
    }
    if (!canCloseWeek) {
      toast.error(`O ${periodName} já possui ${game.maxWeeksPerPayroll} semanas. Gere o holerite antes de continuar.`)
      return
    }
    const weekNumber = Number(state.currentWeek || 1)
    const confirmed = await confirm({
      title: `Encerrar a Semana ${weekNumber}?`,
      message: `As viagens da Semana ${weekNumber} serão congeladas e a Semana ${weekNumber + 1} será iniciada. Nenhum salário será depositado agora; o pagamento será acumulado no holerite mensal.`,
      confirmLabel: 'Encerrar semana',
      tone: 'success',
    })
    if (!confirmed) return

    const nextCompletedWeeks = [...new Set([...(state.closedOperationalWeeks || []), weekNumber])].sort((a, b) => a - b)
    commit({ ...state, currentWeek: weekNumber + 1, closedOperationalWeeks: nextCompletedWeeks })
    const weeksInPeriod = completedWeeks.length + 1
    toast.success(
      weeksInPeriod >= game.minWeeksPerPayroll
        ? `Semana ${weekNumber} encerrada. O holerite do ${periodName} já pode ser gerado.`
        : `Semana ${weekNumber} encerrada. Faltam ${game.minWeeksPerPayroll - weeksInPeriod} semana(s) para liberar o holerite mensal.`,
      { title: 'Semana operacional concluída' },
    )
  }

  async function generatePayslip() {
    if (serverTripsActive) {
      toast.info('O holerite desta carreira será reativado na P4.6.3, já usando fechamento e cálculos server-side. Nenhum período será fechado apenas no navegador.')
      return
    }
    if (!payrollReady) {
      toast.error(`Encerre pelo menos ${game.minWeeksPerPayroll} semanas antes de gerar o holerite do ${periodName}.`)
      return
    }

    const result = calculate()
    setPreview(result)
    const reserveContribution = autoReserveEnabled ? Math.max(0, Number(autoReserveAmount) || 0) : 0
    if (autoReserveEnabled && reserveContribution <= 0) {
      toast.error('Informe um valor maior que zero para o aporte automático à reserva.')
      return
    }
    if (reserveContribution > result.deposit) {
      toast.error(`O aporte automático não pode ser maior que o depósito ${monthlyPayroll ? 'deste mês' : 'desta semana'} (${money(result.deposit)}).`)
      return
    }

    const confirmed = await confirm({
      title: monthlyPayroll ? `Gerar o holerite do ${periodName}?` : `Fechar a Semana ${state.currentWeek}?`,
      message: monthlyPayroll
        ? `O holerite reunirá as semanas ${completedWeeks.join(', ')}, depositará ${money(result.deposit)}${reserveContribution > 0 ? ` e enviará ${money(reserveContribution)} para a reserva` : ''}. A Semana ${state.currentWeek} continuará aberta para o próximo mês.`
        : `O holerite depositará ${money(result.deposit)}${reserveContribution > 0 ? ` e enviará ${money(reserveContribution)} para a reserva` : ''}. As viagens da semana ficarão congeladas no histórico e uma nova semana será iniciada.`,
      confirmLabel: 'Gerar holerite',
      tone: 'success',
    })
    if (!confirmed) return

    const weekNumber = Number(state.currentWeek || 1)
    const monthNumber = Number(state.currentPayrollMonth || 1)
    const balanceAfterSalary = Number(state.balance || 0) + result.deposit
    const nextBalance = balanceAfterSalary - reserveContribution
    const nextReserve = Number(state.emergencyReserve || 0) + result.reserveInterest + reserveContribution
    const closedPeriod = {
      periodType: monthlyPayroll ? 'month' : 'week',
      week: monthlyPayroll ? completedWeeks.at(-1) : weekNumber,
      month: monthlyPayroll ? monthNumber : undefined,
      weeks: monthlyPayroll ? completedWeeks : [weekNumber],
      startWeek: monthlyPayroll ? completedWeeks[0] : weekNumber,
      endWeek: monthlyPayroll ? completedWeeks.at(-1) : weekNumber,
      closedAt: new Date().toLocaleString('pt-BR'),
      [game.distanceField]: periodDistance,
      level: result.level,
      gross: result.gross,
      taxes: result.taxesTotal,
      taxBreakdown: result.taxes,
      benefits: result.benefits,
      netSalary: result.netSalary,
      perDiem: result.perDiem,
      incidentDeduction: result.incidentDeduction,
      reserveInterest: result.reserveInterest,
      deposit: result.deposit,
      desc: result.desc,
      countryCode: game.countryCode,
      countryName: game.countryName,
      stateCode: game.stateCode,
      stateName: game.stateName,
      currency: game.currency,
      baseCurrency: game.baseCurrency || game.currency,
      exchangeRate: game.exchangeRate || 1,
      exchangeRateAsOf: game.exchangeRateAsOf || '',
      city: game.city || '',
      cityMarketLabel: game.cityMarketLabel || '',
      cityCostFactor: game.cityCostFactor || 1,
      citySalaryFactor: game.citySalaryFactor || 1,
      employer: career?.company || '',
      driverName: career?.driverName || '',
      routeElapsedMinutes: result.routeElapsedMinutes,
      routeBreakMinutes: result.routeBreakMinutes,
      routeWorkedMinutes: result.routeWorkedMinutes,
      routeOverrunHours: result.routeOverrunHours,
      routeOverrunRate: result.routeOverrunRate,
      routeOverrunPay: result.routeOverrunPay,
    }

    const historyEntries = [
      ...(state.history || []),
      {
        date: new Date().toLocaleString('pt-BR'), type: 'Salário',
        desc: `${periodName} fechado — ${result.desc}${result.incidentDeduction ? ` — ocorrências: -${money(result.incidentDeduction)}` : ''}`,
        value: result.deposit, amount: result.deposit, balance: balanceAfterSalary,
      },
    ]
    if (reserveContribution > 0) {
      historyEntries.push({
        date: new Date().toLocaleString('pt-BR'), type: 'Reserva', desc: `Aporte automático à reserva — ${periodName}`,
        value: -reserveContribution, amount: -reserveContribution, balance: nextBalance,
        reserve: Number(state.emergencyReserve || 0) + reserveContribution,
      })
    }
    if (result.reserveInterest > 0) {
      historyEntries.push({
        date: new Date().toLocaleString('pt-BR'), type: 'Reserva', desc: `Rendimento da reserva — ${periodName}`,
        value: result.reserveInterest, amount: result.reserveInterest, balance: nextBalance, reserve: nextReserve,
      })
    }

    commit({
      ...state,
      balance: nextBalance,
      emergencyReserve: nextReserve,
      autoReserveContribution: { enabled: autoReserveEnabled, amount: reserveContribution },
      currentWeek: monthlyPayroll ? weekNumber : weekNumber + 1,
      currentPayrollMonth: monthlyPayroll ? monthNumber + 1 : Number(state.currentPayrollMonth || 1),
      payPeriodStartWeek: monthlyPayroll ? weekNumber : Number(state.payPeriodStartWeek || 1),
      incidents: result.incidents,
      closedWeeks: [...(state.closedWeeks || []), closedPeriod],
      history: historyEntries,
    })
    setPreview(result)
    toast.success(
      `${periodName} fechado. ${money(result.deposit)} creditados${reserveContribution > 0 ? ` e ${money(reserveContribution)} enviados para a reserva` : ''}.`,
      { title: 'Holerite gerado' },
    )
  }

  const shown = preview || calculate()
  const displayedOverrunRate = Math.max(0, Number(overrunRate) || 0)
  const displayedOverrunPay = Math.round((routeOverrun.overrunMinutes * displayedOverrunRate / 60) * 100) / 100

  return (
    <div className="payslip-layout">
      <section className="panel payslip-form-card" data-tour="payslip-form">
        <div className="section-heading compact-heading">
          <span className="eyebrow">{periodName}{monthlyPayroll ? ` • Semana ${state.currentWeek}` : ''}</span>
          <h2>{monthlyPayroll ? 'Gerar holerite mensal' : 'Gerar holerite'}</h2>
          <p>{monthlyPayroll ? 'Encerre de quatro a cinco semanas operacionais. O salário, os quilômetros e as retenções serão calculados juntos no fechamento mensal.' : 'O fechamento credita o depósito, atualiza a reserva em segundo plano, congela a semana no histórico e inicia a próxima.'}</p>
        </div>

        {serverTripsActive && <div className="notice-box" role="status"><strong>Fechamento temporariamente protegido</strong><span>As viagens desta carreira já usam o backend. Para evitar estado híbrido, encerrar semana ou gerar holerite fica bloqueado até a P4.6.3 conectar também esses fechamentos ao servidor. A prévia abaixo continua disponível para consulta.</span></div>}

        {monthlyPayroll && (
          <div className="payroll-period-card" data-tour="payroll-period">
            <div>
              <span>Semanas encerradas no {periodName}</span>
              <strong>{completedWeeks.length} / {game.minWeeksPerPayroll} mínimas</strong>
              <small>{completedWeeks.length ? `Semanas incluídas: ${completedWeeks.join(', ')}` : 'Nenhuma semana encerrada ainda.'} O limite do mês é {game.maxWeeksPerPayroll}.</small>
            </div>
            <button className="button secondary compact" type="button" disabled={!canCloseWeek} onClick={closeOperationalWeek}>
              {serverTripsActive ? 'Disponível na P4.6.3' : canCloseWeek ? `Encerrar Semana ${state.currentWeek}` : 'Gere o holerite para continuar'}
            </button>
          </div>
        )}

        {(game.countryCode || game.stateCode) && (
          <div className="country-payroll-note">
            <strong>{game.countryFlag || '🇺🇸'} Folha de {game.countryName || `${game.stateName} (${game.stateCode})`} em {game.currency} • {game.city || 'cidade de referência'}</strong>
            <span>{game.taxAssumptions} Os salários usam o perfil municipal “{game.cityMarketLabel}”. Os cálculos usam {game.baseCurrency} como moeda fiscal{game.currency !== game.baseCurrency ? ` e são convertidos pela cotação registrada em ${game.exchangeRateAsOf}` : ''}.</span>
            <div>{[...(game.financeSources || []), ...(game.cityMarketSources || []), ...(game.currency !== game.baseCurrency ? game.exchangeRateSources || [] : [])].map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={url}>{label}</a>)}</div>
          </div>
        )}

        <TipLabel tip={`O nível determina o cálculo. No Nível 1 há salário ${periodAdjective}; nos Níveis 2 e 3 o bruto vem dos ${game.distanceName} por categoria.`}>Nível atual</TipLabel>
        <input value={`Nível ${state.currentLevel}`} readOnly />

        {state.currentLevel <= 1 ? (
          <>
            <TipLabel tip={`Salário bruto base do motorista local. O padrão desta carreira é ${money(game.level1Gross)} por período antes dos descontos.`}>Salário {periodAdjective} bruto</TipLabel>
            <input type="number" min="0" step="0.01" value={level1Gross} onChange={(event) => setLevel1Gross(event.target.value)} />

            <TipLabel tip={`As horas extras são calculadas pelas viagens do período. O padrão da carreira é ${money(game.routeOverrunRate)}/h.`}>Valor por hora de {game.overtimeLabel}</TipLabel>
            <input type="number" min="0" step="0.01" value={overrunRate} onChange={(event) => setOverrunRate(event.target.value)} />

            <div className="readout-box">
              <span>{game.overtimeLabel} automático</span>
              <strong>{formatHours(routeOverrun.overrunHours)} • {money(displayedOverrunPay)}</strong>
              <small>{game.id === 'ets2' ? 'O sistema desconta as pausas registradas dentro de cada viagem antes de comparar o tempo líquido com a jornada normal de 8h/dia. Intervalos entre viagens já não entram no total.' : `O sistema soma o tempo das viagens por dia. Até 8h/dia fazem parte da jornada normal; somente o excedente recebe ${money(displayedOverrunRate)}/h.`}</small>
            </div>

            {routeOverrun.days.length > 0 && (
              <div className="breakdown-list compact-breakdown">
                {routeOverrun.days.map((day) => (
                  <div key={day.date}><span>{day.date}</span><strong>{game.id === 'ets2' ? `${formatHours(day.elapsedHours)} corridas • -${formatHours(day.breakHours)} de pausa • ` : ''}{formatHours(day.hours)} trabalhadas{day.overrunMinutes > 0 ? ` • +${formatHours(day.overrunHours)} extra` : ' • sem extra'}</strong></div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="readout-box"><span>{game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} pagos no período</span><strong>{formatDistance(periodDistance, game)}</strong></div>
            <div className="breakdown-list compact-breakdown">
              {Object.entries(mileage.totals).filter(([, distance]) => distance > 0).map(([category, distance]) => (
                <div key={category}><span>{game.payLabels[category]}</span><strong>{formatDistance(distance, game)} × {money(game.payRates[category])}</strong></div>
              ))}
            </div>
            <div className="two-columns">
              <div><TipLabel tip={`Valor diário separado do salário para viagens com pernoite. O padrão desta carreira é ${money(game.perDiemRate)} por dia.`}>{game.perDiemLabel}</TipLabel><input type="number" min="0" step="0.01" value={perDiemRate} onChange={(event) => setPerDiemRate(event.target.value)} /></div>
              <div><TipLabel tip={`Dias únicos que qualificaram para ${game.perDiemLabel.toLowerCase()} pelas datas das viagens. O mesmo dia não é contado duas vezes.`}>Dias qualificáveis</TipLabel><input value={perDiemDays.days} readOnly /></div>
            </div>
          </>
        )}

        <TipLabel tip="Desconto pessoal adicional da simulação. Impostos e contribuições nacionais já aparecem separadamente na prévia.">{monthlyPayroll ? 'Outros descontos mensais' : 'Benefícios / contribuições semanais'}</TipLabel>
        <input type="number" min="0" step="0.01" value={benefits} onChange={(event) => setBenefits(event.target.value)} />

        <div className="payslip-reserve-auto">
          <label className="check-field">
            <input type="checkbox" checked={autoReserveEnabled} onChange={(event) => setAutoReserveEnabled(event.target.checked)} />
            Adicionar automaticamente à reserva ao fechar {monthlyPayroll ? 'o mês' : 'a semana'}
            <InfoTip text="Depois que o holerite for depositado, o valor informado é transferido do saldo disponível para a Reserva de Emergência. Essa transferência não aparece nas linhas do holerite; fica registrada no Histórico." />
          </label>
          {autoReserveEnabled && (
            <div className="payslip-reserve-amount"><TipLabel tip={`Valor fixo transferido automaticamente para a Reserva de Emergência em cada fechamento ${periodAdjective}.`}>Valor do aporte automático</TipLabel><input type="number" min="0.01" step="0.01" value={autoReserveAmount} onChange={(event) => setAutoReserveAmount(event.target.value)} placeholder="0.00" /></div>
          )}
        </div>

        <button className="button success full-button" type="button" disabled={!payrollReady} onClick={generatePayslip}>{serverTripsActive ? 'Disponível na P4.6.3' : monthlyPayroll ? 'Gerar holerite mensal e depositar' : 'Gerar holerite e depositar'}</button>
        {serverTripsActive
          ? <small className="payroll-blocked-note">Nenhum fechamento será executado localmente enquanto as viagens já estão server-side.</small>
          : monthlyPayroll && !payrollReady && <small className="payroll-blocked-note">Encerre mais {game.minWeeksPerPayroll - completedWeeks.length} semana(s) para liberar o holerite.</small>}
      </section>

      <section className="panel payslip-preview-card" data-tour="payslip-preview">
        <div className="section-heading compact-heading"><span className="eyebrow">Prévia • {periodName}</span><h2>Holerite</h2><p>Estimativa de roleplay para {game.countryName || game.stateName || game.region}; não substitui uma folha real.</p></div>
        <div className="payslip-lines">
          {shown.level === 1 && game.id === 'ets2' && <div><LineLabel tip="Tempo não trabalhado informado nas viagens, descontado antes do cálculo de horas extras. Intervalos entre viagens já ficam naturalmente fora do tempo registrado.">Pausas descontadas</LineLabel><strong>-{formatHours(Number(shown.routeBreakMinutes || 0) / 60)}</strong></div>}
          {shown.level === 1 && <div><LineLabel tip="O saldo usa o tempo entre saída e chegada, desconta as pausas não trabalhadas e compara o resultado com 8 horas líquidas por dia.">Saldo de {game.overtimeLabel.toLowerCase()}</LineLabel><strong>+{money(shown.routeOverrunPay)} ({formatHours(shown.routeOverrunHours)} × {money(shown.routeOverrunRate)}/h)</strong></div>}
          <div><LineLabel tip={`Total antes de impostos e outros descontos. Nos Níveis 2/3 vem dos ${game.distanceName} pagos.`}>Salário bruto</LineLabel><strong>{money(shown.gross)}</strong></div>
          {game.taxes.map(([key, label, tip]) => <div key={key}><LineLabel tip={tip}>{label}</LineLabel><strong>-{money(shown.taxes[key])}</strong></div>)}
          <div><LineLabel tip={`Valor adicional informado no campo de descontos ${periodAdjective}s.`}>Outros descontos</LineLabel><strong>-{money(shown.benefits)}</strong></div>
          <div className="emphasis-line"><LineLabel tip={`Salário após impostos estimados e outros descontos, antes de somar ${game.perDiemLabel.toLowerCase()} e ocorrências.`}>Salário líquido</LineLabel><strong>{money(shown.netSalary)}</strong></div>
          <div><LineLabel tip="Valor não salarial calculado por dias qualificáveis com pernoite. No Nível 1 ele é zero.">{game.perDiemLabel}</LineLabel><strong>+{money(shown.perDiem)}</strong></div>
          <div><LineLabel tip="Total de multas ou acidentes marcados para o próximo holerite e aplicados neste período.">Infrações/acidentes</LineLabel><strong>-{money(shown.incidentDeduction)}</strong></div>
          <div className="deposit-line"><LineLabel tip={`Valor final do pagamento ${periodAdjective}. Se o aporte automático estiver ativo, a transferência para a reserva acontece depois do depósito.`}>Depósito total</LineLabel><strong>{money(shown.deposit)}</strong></div>
        </div>
      </section>

      <section className="panel closed-weeks-card" data-tour="closed-weeks">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico de holerites</span><h2>{monthlyPayroll ? 'Meses fechados' : 'Semanas fechadas'}</h2></div>
        {(state.closedWeeks || []).length === 0 ? <div className="empty-inline">Nenhum holerite fechado ainda.</div> : (
          <div className="responsive-table compact-table"><table>
            <thead><tr><th>Período</th><th>Semanas</th><th>Nível</th><th>{game.distanceName}</th><th>Horas extras</th><th>Bruto</th><th>{game.perDiemLabel}</th><th>Ocorrências</th><th>Depósito</th><th>Fechado em</th></tr></thead>
            <tbody>{[...state.closedWeeks].reverse().map((period, index) => (
              <tr key={`${period.month || period.week}-${period.closedAt}-${index}`}><td>{closedPeriodLabel(period, game)}</td><td>{Array.isArray(period.weeks) ? period.weeks.join(', ') : period.week || '—'}</td><td>{period.level}</td><td>{formatDistance(period.distance ?? period.miles, game)}</td><td>{period.level === 1 ? `${formatHours(period.routeOverrunHours)} • ${money(period.routeOverrunPay)}` : '—'}</td><td>{money(period.gross)}</td><td>{money(period.perDiem)}</td><td>{money(period.incidentDeduction)}</td><td><strong>{money(period.deposit)}</strong></td><td>{period.closedAt || '—'}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  )
}
