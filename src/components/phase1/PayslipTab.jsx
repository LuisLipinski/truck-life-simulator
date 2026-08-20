import { useMemo, useState } from 'react'
import {
  applyPendingIncidentDeductions,
  currentWeekTrips,
  estimateTaxes,
  mileagePaySummary,
  PAY_LABELS,
  PAY_RATES,
  perDiemDaysForTrips,
  routeOverrunSummary,
  weeklyEmergencyReserveYield,
} from '../../lib/phase1.js'
import { useToast } from '../ToastProvider.jsx'

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

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
  const toast = useToast()
  const [level1Gross, setLevel1Gross] = useState(850)
  const [benefits, setBenefits] = useState(36)
  const [perDiemRate, setPerDiemRate] = useState(80)
  const [autoReserveEnabled, setAutoReserveEnabled] = useState(Boolean(state.autoReserveContribution?.enabled))
  const [autoReserveAmount, setAutoReserveAmount] = useState(state.autoReserveContribution?.amount ?? '')
  const [preview, setPreview] = useState(null)

  const weekTrips = useMemo(() => currentWeekTrips(state), [state])
  const mileage = useMemo(() => mileagePaySummary(weekTrips), [weekTrips])
  const perDiemDays = useMemo(() => perDiemDaysForTrips(weekTrips), [weekTrips])
  const routeOverrun = useMemo(() => routeOverrunSummary(weekTrips), [weekTrips])
  const weekMiles = useMemo(() => weekTrips.reduce((sum, trip) => sum + Number(trip.miles || 0), 0), [weekTrips])

  function calculate() {
    const level = Number(state.currentLevel || state.careerLevel || 1)
    let gross = 0
    let perDiem = 0
    let desc = ''
    if (level === 1) {
      gross = Math.max(0, Number(level1Gross) || 0) + routeOverrun.pay
      desc = `Nível 1 — salário semanal${routeOverrun.overrunMinutes ? ` + ${formatHours(routeOverrun.overrunHours)} Route Overrun automático` : ''}`
    } else {
      gross = mileage.gross
      perDiem = perDiemDays.days * Math.max(0, Number(perDiemRate) || 0)
      const parts = Object.entries(mileage.totals)
        .filter(([, miles]) => miles > 0)
        .map(([category, miles]) => `${PAY_LABELS[category]} ${miles.toLocaleString('en-US')} mi @ ${money(PAY_RATES[category])}`)
      desc = `Nível ${level} — ${parts.join(' + ') || 'sem milhas'}`
    }

    const taxes = estimateTaxes(gross)
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
      routeOverrunPay: level === 1 ? routeOverrun.pay : 0,
      routeOverrunHours: level === 1 ? routeOverrun.overrunHours : 0,
      desc,
    }
  }

  function generatePayslip() {
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

    if (!window.confirm(`Gerar o holerite e fechar a Semana ${state.currentWeek}? Depois disso, as viagens dessa semana ficarão fechadas no histórico.`)) return

    const weekNumber = Number(state.currentWeek || 1)
    const balanceAfterSalary = Number(state.balance || 0) + result.deposit
    const nextBalance = balanceAfterSalary - reserveContribution
    const nextReserve = Number(state.emergencyReserve || 0) + result.reserveInterest + reserveContribution
    const closedWeek = {
      week: weekNumber,
      closedAt: new Date().toLocaleString('pt-BR'),
      miles: weekMiles,
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

  return (
    <div className="payslip-layout">
      <section className="panel payslip-form-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Semana {state.currentWeek}</span>
          <h2>Gerar holerite</h2>
          <p>O fechamento credita o depósito, atualiza a reserva em segundo plano, congela a semana no histórico e inicia a próxima.</p>
        </div>

        <TipLabel tip="O nível determina como o pagamento é calculado. No Nível 1 existe salário semanal fixo; nos Níveis 2 e 3 o bruto vem das milhas registradas por categoria.">Nível atual</TipLabel>
        <input value={`Nível ${state.currentLevel}`} readOnly />

        {state.currentLevel <= 1 ? (
          <>
            <TipLabel tip="Salário bruto base do motorista local no Nível 1. O valor padrão da carreira é US$ 850 por semana antes de impostos, benefícios e outros descontos.">Salário semanal bruto</TipLabel>
            <input type="number" min="0" step="0.01" value={level1Gross} onChange={(event) => setLevel1Gross(event.target.value)} />

            <div className="readout-box">
              <span>Route Overrun automático</span>
              <strong>{formatHours(routeOverrun.overrunHours)} • {money(routeOverrun.pay)}</strong>
              <small>O sistema soma o tempo das viagens por dia. Até 8h/dia fazem parte da jornada normal; somente o excedente recebe {money(routeOverrun.rate)}/h.</small>
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
            <div className="readout-box"><span>Milhas pagas da semana</span><strong>{weekMiles.toLocaleString('en-US')} mi</strong></div>
            <div className="breakdown-list compact-breakdown">
              {Object.entries(mileage.totals).filter(([, miles]) => miles > 0).map(([category, miles]) => (
                <div key={category}><span>{PAY_LABELS[category]}</span><strong>{miles.toLocaleString('en-US')} mi × {money(PAY_RATES[category])}</strong></div>
              ))}
            </div>
            <div className="two-columns">
              <div>
                <TipLabel tip="Valor diário separado do salário para dias OTR qualificáveis. Nesta simulação o padrão é US$ 80 por dia e não se aplica a viagens locais de ida e volta no mesmo dia.">Per diem diário</TipLabel>
                <input type="number" min="0" step="0.01" value={perDiemRate} onChange={(event) => setPerDiemRate(event.target.value)} />
              </div>
              <div>
                <TipLabel tip="Quantidade de dias únicos da semana que qualificaram para per diem com base nas datas das viagens OTR registradas. O sistema evita contar o mesmo dia duas vezes.">Dias qualificáveis</TipLabel>
                <input value={perDiemDays.days} readOnly />
              </div>
            </div>
          </>
        )}

        <TipLabel tip="Desconto semanal dos benefícios do motorista. O padrão de US$ 36 representa médico/prescrição, dental e visão na simulação.">Benefícios semanais</TipLabel>
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

      <section className="panel payslip-preview-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Prévia</span>
          <h2>Holerite</h2>
          <p>Estimativa de simulação; retenções reais podem variar.</p>
        </div>
        <div className="payslip-lines">
          {shown.level === 1 && <div><LineLabel tip="Calculado automaticamente pelas datas e horários das viagens da semana. O sistema soma o tempo por dia e paga somente o que ultrapassar 8 horas naquele dia.">Route Overrun</LineLabel><strong>+{money(shown.routeOverrunPay)} ({formatHours(shown.routeOverrunHours)})</strong></div>}
          <div><LineLabel tip="Total antes de impostos e benefícios. No Nível 1 inclui salário base e Route Overrun calculado automaticamente; nos Níveis 2/3 vem das milhas pagas.">Salário bruto</LineLabel><strong>{money(shown.gross)}</strong></div>
          <div><LineLabel tip="Retenção federal estimada pela fórmula simplificada da simulação. Não representa cálculo fiscal oficial.">Federal</LineLabel><strong>-{money(shown.taxes.federal)}</strong></div>
          <div><LineLabel tip="Contribuição estimada de Social Security calculada sobre o salário bruto da semana.">Social Security</LineLabel><strong>-{money(shown.taxes.ss)}</strong></div>
          <div><LineLabel tip="Contribuição estimada do Medicare calculada sobre o salário bruto da semana.">Medicare</LineLabel><strong>-{money(shown.taxes.medicare)}</strong></div>
          <div><LineLabel tip="Estimativa simplificada do imposto de renda estadual da Califórnia usada somente para o roleplay financeiro.">California Income Tax</LineLabel><strong>-{money(shown.taxes.ca)}</strong></div>
          <div><LineLabel tip="Estimativa de California SDI, usada na simulação como retenção estadual adicional.">California SDI</LineLabel><strong>-{money(shown.taxes.sdi)}</strong></div>
          <div><LineLabel tip="Valor semanal informado no campo Benefícios semanais e descontado do salário.">Benefícios</LineLabel><strong>-{money(shown.benefits)}</strong></div>
          <div className="emphasis-line"><LineLabel tip="Salário após impostos estimados e benefícios, antes de somar per diem e descontar ocorrências pendentes.">Salário líquido</LineLabel><strong>{money(shown.netSalary)}</strong></div>
          <div><LineLabel tip="Valor não salarial calculado pelos dias OTR qualificáveis da semana. No Nível 1 ele é zero.">Per diem</LineLabel><strong>+{money(shown.perDiem)}</strong></div>
          <div><LineLabel tip="Total de multas ou acidentes que você marcou para descontar do próximo holerite e que puderam ser aplicados nesta semana.">Infrações/acidentes</LineLabel><strong>-{money(shown.incidentDeduction)}</strong></div>
          <div className="deposit-line"><LineLabel tip="Valor final do pagamento semanal. Se o aporte automático à reserva estiver ativo, a transferência acontece depois do depósito e fica somente no Histórico.">Depósito total</LineLabel><strong>{money(shown.deposit)}</strong></div>
        </div>
      </section>

      <section className="panel closed-weeks-card">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico de holerites</span><h2>Semanas fechadas</h2></div>
        {(state.closedWeeks || []).length === 0 ? <div className="empty-inline">Nenhum holerite fechado ainda.</div> : (
          <div className="responsive-table compact-table">
            <table>
              <thead><tr><th>Semana</th><th>Nível</th><th>Milhas</th><th>Bruto</th><th>Per diem</th><th>Ocorrências</th><th>Depósito</th><th>Fechada em</th></tr></thead>
              <tbody>
                {[...state.closedWeeks].reverse().map((week, index) => (
                  <tr key={`${week.week}-${week.closedAt}-${index}`}>
                    <td>{week.week}</td><td>{week.level}</td><td>{Number(week.miles || 0).toLocaleString('en-US')}</td><td>{money(week.gross)}</td><td>{money(week.perDiem)}</td><td>{money(week.incidentDeduction)}</td><td><strong>{money(week.deposit)}</strong></td><td>{week.closedAt || '—'}</td>
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
