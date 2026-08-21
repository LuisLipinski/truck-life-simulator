import { useMemo, useState } from 'react'
import {
  applyPendingIncidentDeductions,
  currentWeekTrips,
  estimateTaxes,
  mileagePaySummary,
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
  return (
    <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>
      i
    </button>
  )
}

function TipLabel({ children, tip }) {
  return (
    <label className="label-with-tip">
      <span>{children}</span>
      <InfoTip text={tip} />
    </label>
  )
}

function LineLabel({ children, tip }) {
  return (
    <span className="line-label-with-tip">
      <span>{children}</span>
      <InfoTip text={tip} />
    </span>
  )
}

export default function PayslipTab({ state, commit }) {
  const game = useGame()
  const money = (value) => formatMoney(value, game)
  const toast = useToast()
  const confirm = useConfirm()
  const [level1Gross, setLevel1Gross] = useState(game.level1Gross)
  const [overrunRate, setOverrunRate] = useState(game.routeOverrunRate)
  const [benefits, setBenefits] = useState(game.weeklyBenefits)
  const [perDiemRate, setPerDiemRate] = useState(game.perDiemRate)
  const [autoReserveEnabled, setAutoReserveEnabled] = useState(Boolean(state.autoReserveContribution?.enabled))
  const [autoReserveAmount, setAutoReserveAmount] = useState(state.autoReserveContribution?.amount ?? '')
  const [preview, setPreview] = useState(null)

  const weekTrips = useMemo(() => currentWeekTrips(state), [state])
  const mileage = useMemo(() => mileagePaySummary(weekTrips, game.id), [game.id, weekTrips])
  const perDiemDays = useMemo(() => perDiemDaysForTrips(weekTrips), [weekTrips])
  const routeOverrun = useMemo(() => routeOverrunSummary(weekTrips, undefined, game.routeOverrunRate), [game.routeOverrunRate, weekTrips])
  const weekDistance = useMemo(() => weekTrips.reduce((sum, trip) => sum + tripDistance(trip), 0), [weekTrips])

  function calculate() {
    const level = Number(state.currentLevel || state.careerLevel || 1)
    let gross = 0
    let perDiem = 0
    let desc = ''
    const effectiveOverrunRate = Math.max(0, Number(overrunRate) || 0)
    const routeOverrunPay = Math.round((routeOverrun.overrunMinutes * effectiveOverrunRate / 60) * 100) / 100

    if (level === 1) {
      gross = Math.max(0, Number(level1Gross) || 0) + routeOverrunPay
      desc = `Nível 1 — salário semanal${routeOverrun.overrunMinutes ? ` + ${formatHours(routeOverrun.overrunHours)} ${game.overtimeLabel} @ ${money(effectiveOverrunRate)}/h` : ''}`
    } else {
      gross = mileage.gross
      perDiem = perDiemDays.days * Math.max(0, Number(perDiemRate) || 0)
      const parts = Object.entries(mileage.totals)
        .filter(([, distance]) => distance > 0)
        .map(([category, distance]) => `${game.payLabels[category]} ${formatDistance(distance, game)} @ ${money(game.payRates[category])}`)
      desc = `Nível ${level} — ${parts.join(' + ') || `sem ${game.distanceName}`}`
    }

    const taxes = estimateTaxes(gross, game.id)
    const taxesTotal = Object.values(taxes).reduce((sum, value) => sum + value, 0)
    const benefitValue = Math.max(0, Number(benefits) || 0)
    const netSalary = gross - taxesTotal - benefitValue
    const beforeIncidents = Math.max(0, netSalary + perDiem)
    const deductions = applyPendingIncidentDeductions(state.incidents, beforeIncidents)
    const deposit = beforeIncidents - deductions.applied
    const reserveInterest = weeklyEmergencyReserveYield(state.emergencyReserve)

    return {
      level,
      gross,
      perDiem,
      taxes,
      taxesTotal,
      benefits: benefitValue,
      netSalary,
      incidentDeduction: deductions.applied,
      incidents: deductions.incidents,
      deposit,
      reserveInterest,
      routeOverrunPay: level === 1 ? routeOverrunPay : 0,
      routeOverrunHours: level === 1 ? routeOverrun.overrunHours : 0,
      routeOverrunRate: level === 1 ? effectiveOverrunRate : 0,
      desc,
    }
  }

  async function generatePayslip() {
    const result = calculate()
    setPreview(result)

    const reserveContribution = autoReserveEnabled ? Math.max(0, Number(autoReserveAmount) || 0) : 0
    if (autoReserveEnabled && reserveContribution <= 0) {
      toast.error('Informe um valor maior que zero para o aporte automático à reserva.')
      return
    }
    if (reserveContribution > result.deposit) {
      toast.error(`O aporte automático não pode ser maior que o depósito desta semana (${money(result.deposit)}).`)
      return
    }

    const confirmed = await confirm({
      title: `Fechar a Semana ${state.currentWeek}?`,
      message: `O holerite depositará ${money(result.deposit)}${reserveContribution > 0 ? ` e enviará ${money(reserveContribution)} para a reserva` : ''}. As viagens da semana ficarão congeladas no histórico e uma nova semana será iniciada.`,
      confirmLabel: 'Gerar holerite',
      tone: 'success',
    })
    if (!confirmed) return

    const weekNumber = Number(state.currentWeek || 1)
    const balanceAfterSalary = Number(state.balance || 0) + result.deposit
    const nextBalance = balanceAfterSalary - reserveContribution
    const nextReserve = Number(state.emergencyReserve || 0) + result.reserveInterest + reserveContribution
    const closedWeek = {
      week: weekNumber,
      closedAt: new Date().toLocaleString('pt-BR'),
      [game.distanceField]: weekDistance,
      level: result.level,
      gross: result.gross,
      taxes: result.taxesTotal,
      benefits: result.benefits,
      netSalary: result.netSalary,
      perDiem: result.perDiem,
      incidentDeduction: result.incidentDeduction,
      deposit: result.deposit,
      desc: result.desc,
    }

    const historyEntries = [
      ...(state.history || []),
      {
        date: new Date().toLocaleString('pt-BR'),
        type: 'Salário',
        desc: `Semana ${weekNumber} fechada — ${result.desc}${result.incidentDeduction ? ` — ocorrências: -${money(result.incidentDeduction)}` : ''}`,
        value: result.deposit,
        amount: result.deposit,
        balance: balanceAfterSalary,
      },
    ]
    if (reserveContribution > 0) {
      historyEntries.push({
        date: new Date().toLocaleString('pt-BR'),
        type: 'Reserva',
        desc: `Aporte automático à reserva — Semana ${weekNumber}`,
        value: -reserveContribution,
        amount: -reserveContribution,
        balance: nextBalance,
        reserve: Number(state.emergencyReserve || 0) + reserveContribution,
      })
    }
    if (result.reserveInterest > 0) {
      historyEntries.push({
        date: new Date().toLocaleString('pt-BR'),
        type: 'Reserva',
        desc: `Rendimento da reserva — Semana ${weekNumber}`,
        value: result.reserveInterest,
        amount: result.reserveInterest,
        balance: nextBalance,
        reserve: nextReserve,
      })
    }

    commit({
      ...state,
      balance: nextBalance,
      emergencyReserve: nextReserve,
      autoReserveContribution: { enabled: autoReserveEnabled, amount: reserveContribution },
      currentWeek: weekNumber + 1,
      incidents: result.incidents,
      closedWeeks: [...(state.closedWeeks || []), closedWeek],
      history: historyEntries,
    })
    setPreview(result)
    toast.success(`Semana ${weekNumber} fechada. ${money(result.deposit)} creditados${reserveContribution > 0 ? ` e ${money(reserveContribution)} enviados para a reserva` : ''}.`, { title: 'Holerite gerado' })
  }

  const shown = preview || calculate()
  const displayedOverrunRate = Math.max(0, Number(overrunRate) || 0)
  const displayedOverrunPay = Math.round((routeOverrun.overrunMinutes * displayedOverrunRate / 60) * 100) / 100

  return (
    <div className="payslip-layout">
      <section className="panel payslip-form-card" data-tour="payslip-form">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Semana {state.currentWeek}</span>
          <h2>Gerar holerite</h2>
          <p>O fechamento credita o depósito, atualiza a reserva em segundo plano, congela a semana no histórico e inicia a próxima.</p>
        </div>

        <TipLabel tip={`O nível determina o cálculo. No Nível 1 há salário semanal; nos Níveis 2 e 3 o bruto vem dos ${game.distanceName} por categoria.`}>Nível atual</TipLabel>
        <input value={`Nível ${state.currentLevel}`} readOnly />

        {state.currentLevel <= 1 ? (
          <>
            <TipLabel tip={`Salário bruto base do motorista local. O padrão de ${game.shortName} é ${money(game.level1Gross)} por semana antes dos descontos.`}>Salário semanal bruto</TipLabel>
            <input type="number" min="0" step="0.01" value={level1Gross} onChange={(event) => setLevel1Gross(event.target.value)} />

            <TipLabel tip={`As horas extras são calculadas pelas viagens. O padrão da carreira é ${money(game.routeOverrunRate)}/h.`}>Valor por hora de {game.overtimeLabel}</TipLabel>
            <input type="number" min="0" step="0.01" value={overrunRate} onChange={(event) => setOverrunRate(event.target.value)} />

            <div className="readout-box">
              <span>{game.overtimeLabel} automático</span>
              <strong>{formatHours(routeOverrun.overrunHours)} • {money(displayedOverrunPay)}</strong>
              <small>O sistema soma o tempo das viagens por dia. Até 8h/dia fazem parte da jornada normal; somente o excedente recebe {money(displayedOverrunRate)}/h.</small>
            </div>

            {routeOverrun.days.length > 0 && (
              <div className="breakdown-list compact-breakdown">
                {routeOverrun.days.map((day) => (
                  <div key={day.date}>
                    <span>{day.date}</span>
                    <strong>{formatHours(day.hours)} trabalhadas{day.overrunMinutes > 0 ? ` • +${formatHours(day.overrunHours)} extra` : ' • sem extra'}</strong>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="readout-box"><span>{game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} pagos da semana</span><strong>{formatDistance(weekDistance, game)}</strong></div>
            <div className="breakdown-list compact-breakdown">
              {Object.entries(mileage.totals).filter(([, distance]) => distance > 0).map(([category, distance]) => (
                <div key={category}><span>{game.payLabels[category]}</span><strong>{formatDistance(distance, game)} × {money(game.payRates[category])}</strong></div>
              ))}
            </div>
            <div className="two-columns">
              <div>
                <TipLabel tip={`Valor diário separado do salário para viagens com pernoite. O padrão de ${game.shortName} é ${money(game.perDiemRate)} por dia.`}>{game.perDiemLabel}</TipLabel>
                <input type="number" min="0" step="0.01" value={perDiemRate} onChange={(event) => setPerDiemRate(event.target.value)} />
              </div>
              <div>
                <TipLabel tip={`Dias únicos que qualificaram para ${game.perDiemLabel.toLowerCase()} pelas datas das viagens. O mesmo dia não é contado duas vezes.`}>Dias qualificáveis</TipLabel>
                <input value={perDiemDays.days} readOnly />
              </div>
            </div>
          </>
        )}

        <TipLabel tip={`Desconto semanal pessoal da simulação. O padrão desta carreira é ${money(game.weeklyBenefits)}.`}>Benefícios / contribuições semanais</TipLabel>
        <input type="number" min="0" step="0.01" value={benefits} onChange={(event) => setBenefits(event.target.value)} />

        <div className="payslip-reserve-auto">
          <label className="check-field">
            <input type="checkbox" checked={autoReserveEnabled} onChange={(event) => setAutoReserveEnabled(event.target.checked)} />
            Adicionar automaticamente à reserva ao fechar a semana
            <InfoTip text="Depois que o holerite for depositado, o valor informado é transferido do saldo disponível para a Reserva de Emergência. Essa transferência não aparece nas linhas do holerite; fica registrada no Histórico." />
          </label>
          {autoReserveEnabled && (
            <div className="payslip-reserve-amount">
              <TipLabel tip="Valor fixo transferido automaticamente para a Reserva de Emergência em cada fechamento semanal enquanto esta opção permanecer ativa.">Valor do aporte automático</TipLabel>
              <input type="number" min="0.01" step="0.01" value={autoReserveAmount} onChange={(event) => setAutoReserveAmount(event.target.value)} placeholder="0.00" />
            </div>
          )}
        </div>

        <button className="button success full-button" type="button" onClick={generatePayslip}>Gerar holerite e depositar</button>
      </section>

      <section className="panel payslip-preview-card" data-tour="payslip-preview">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Prévia</span>
          <h2>Holerite</h2>
          <p>Estimativa de simulação; retenções reais podem variar.</p>
        </div>
        <div className="payslip-lines">
          {shown.level === 1 && <div><LineLabel tip="As horas são calculadas automaticamente pelas datas e horários das viagens.">{game.overtimeLabel}</LineLabel><strong>+{money(shown.routeOverrunPay)} ({formatHours(shown.routeOverrunHours)} × {money(shown.routeOverrunRate)}/h)</strong></div>}
          <div><LineLabel tip={`Total antes de impostos e benefícios. Nos Níveis 2/3 vem dos ${game.distanceName} pagos.`}>Salário bruto</LineLabel><strong>{money(shown.gross)}</strong></div>
          {game.taxes.map(([key, label, tip]) => <div key={key}><LineLabel tip={tip}>{label}</LineLabel><strong>-{money(shown.taxes[key])}</strong></div>)}
          <div><LineLabel tip="Valor semanal informado no campo Benefícios semanais e descontado do salário.">Benefícios</LineLabel><strong>-{money(shown.benefits)}</strong></div>
          <div className="emphasis-line"><LineLabel tip={`Salário após impostos estimados e benefícios, antes de somar ${game.perDiemLabel.toLowerCase()} e ocorrências.`}>Salário líquido</LineLabel><strong>{money(shown.netSalary)}</strong></div>
          <div><LineLabel tip="Valor não salarial calculado por dias qualificáveis com pernoite. No Nível 1 ele é zero.">{game.perDiemLabel}</LineLabel><strong>+{money(shown.perDiem)}</strong></div>
          <div><LineLabel tip="Total de multas ou acidentes que você marcou para descontar do próximo holerite e que puderam ser aplicados nesta semana.">Infrações/acidentes</LineLabel><strong>-{money(shown.incidentDeduction)}</strong></div>
          <div className="deposit-line"><LineLabel tip="Valor final do pagamento semanal. Se o aporte automático à reserva estiver ativo, a transferência acontece depois do depósito e fica somente no Histórico.">Depósito total</LineLabel><strong>{money(shown.deposit)}</strong></div>
        </div>
      </section>

      <section className="panel closed-weeks-card" data-tour="closed-weeks">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico de holerites</span><h2>Semanas fechadas</h2></div>
        {(state.closedWeeks || []).length === 0 ? <div className="empty-inline">Nenhum holerite fechado ainda.</div> : (
          <div className="responsive-table compact-table">
            <table>
              <thead><tr><th>Semana</th><th>Nível</th><th>{game.distanceName}</th><th>Bruto</th><th>{game.perDiemLabel}</th><th>Ocorrências</th><th>Depósito</th><th>Fechada em</th></tr></thead>
              <tbody>
                {[...state.closedWeeks].reverse().map((week, index) => (
                  <tr key={`${week.week}-${week.closedAt}-${index}`}>
                    <td>{week.week}</td><td>{week.level}</td><td>{formatDistance(week.distance ?? week.miles, game)}</td><td>{money(week.gross)}</td><td>{money(week.perDiem)}</td><td>{money(week.incidentDeduction)}</td><td><strong>{money(week.deposit)}</strong></td><td>{week.closedAt || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
