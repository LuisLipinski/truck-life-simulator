import { useMemo, useState } from 'react'
import {
  applyPendingIncidentDeductions,
  currentWeekTrips,
  estimateTaxes,
  mileagePaySummary,
  PAY_LABELS,
  PAY_RATES,
  perDiemDaysForTrips,
} from '../../lib/phase1.js'

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function PayslipTab({ state, commit }) {
  const [level1Gross, setLevel1Gross] = useState(850)
  const [overrunHours, setOverrunHours] = useState(0)
  const [overrunRate, setOverrunRate] = useState(21.25)
  const [benefits, setBenefits] = useState(36)
  const [perDiemRate, setPerDiemRate] = useState(80)
  const [preview, setPreview] = useState(null)

  const weekTrips = useMemo(() => currentWeekTrips(state), [state])
  const mileage = useMemo(() => mileagePaySummary(weekTrips), [weekTrips])
  const perDiemDays = useMemo(() => perDiemDaysForTrips(weekTrips), [weekTrips])
  const weekMiles = useMemo(() => weekTrips.reduce((sum, trip) => sum + Number(trip.miles || 0), 0), [weekTrips])

  function calculate() {
    const level = Number(state.currentLevel || state.careerLevel || 1)
    let gross = 0
    let perDiem = 0
    let desc = ''
    if (level === 1) {
      gross = Math.max(0, Number(level1Gross) || 0) + Math.max(0, Number(overrunHours) || 0) * Math.max(0, Number(overrunRate) || 0)
      desc = `Nível 1 — salário semanal${Number(overrunHours) ? ` + ${Number(overrunHours)}h overrun` : ''}`
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
      desc,
    }
  }

  function generatePayslip() {
    const result = calculate()
    setPreview(result)
    if (!window.confirm(`Gerar o holerite e fechar a Semana ${state.currentWeek}? Depois disso, as viagens dessa semana ficarão fechadas no histórico.`)) return

    const weekNumber = Number(state.currentWeek || 1)
    const nextBalance = Number(state.balance || 0) + result.deposit
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

    commit({
      ...state,
      balance: nextBalance,
      currentWeek: weekNumber + 1,
      incidents: result.incidents,
      closedWeeks: [...(state.closedWeeks || []), closedWeek],
      history: [
        ...(state.history || []),
        {
          date: new Date().toLocaleString('pt-BR'),
          type: 'Salário',
          desc: `Semana ${weekNumber} fechada — ${result.desc}${result.incidentDeduction ? ` — ocorrências: -${money(result.incidentDeduction)}` : ''}`,
          value: result.deposit,
          amount: result.deposit,
          balance: nextBalance,
        },
      ],
    })
    setPreview(result)
  }

  const shown = preview || calculate()

  return (
    <div className="payslip-layout">
      <section className="panel payslip-form-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Semana {state.currentWeek}</span>
          <h2>Gerar holerite</h2>
          <p>O fechamento credita o depósito, congela a semana no histórico e inicia a próxima.</p>
        </div>

        <label>Nível atual</label>
        <input value={`Nível ${state.currentLevel}`} readOnly />

        {state.currentLevel <= 1 ? (
          <>
            <label>Salário semanal bruto</label>
            <input type="number" min="0" step="0.01" value={level1Gross} onChange={(event) => setLevel1Gross(event.target.value)} />
            <div className="two-columns">
              <div><label>Horas de Route Overrun</label><input type="number" min="0" step="0.25" value={overrunHours} onChange={(event) => setOverrunHours(event.target.value)} /></div>
              <div><label>Valor por hora extra</label><input type="number" min="0" step="0.01" value={overrunRate} onChange={(event) => setOverrunRate(event.target.value)} /></div>
            </div>
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
              <div><label>Per diem diário</label><input type="number" min="0" step="0.01" value={perDiemRate} onChange={(event) => setPerDiemRate(event.target.value)} /></div>
              <div><label>Dias qualificáveis</label><input value={perDiemDays.days} readOnly /></div>
            </div>
          </>
        )}

        <label>Benefícios semanais</label>
        <input type="number" min="0" step="0.01" value={benefits} onChange={(event) => setBenefits(event.target.value)} />
        <button className="button success full-button" type="button" onClick={generatePayslip}>Gerar holerite e depositar</button>
      </section>

      <section className="panel payslip-preview-card">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Prévia</span>
          <h2>Holerite</h2>
          <p>Estimativa de simulação; retenções reais podem variar.</p>
        </div>
        <div className="payslip-lines">
          <div><span>Salário bruto</span><strong>{money(shown.gross)}</strong></div>
          <div><span>Federal</span><strong>-{money(shown.taxes.federal)}</strong></div>
          <div><span>Social Security</span><strong>-{money(shown.taxes.ss)}</strong></div>
          <div><span>Medicare</span><strong>-{money(shown.taxes.medicare)}</strong></div>
          <div><span>California Income Tax</span><strong>-{money(shown.taxes.ca)}</strong></div>
          <div><span>California SDI</span><strong>-{money(shown.taxes.sdi)}</strong></div>
          <div><span>Benefícios</span><strong>-{money(shown.benefits)}</strong></div>
          <div className="emphasis-line"><span>Salário líquido</span><strong>{money(shown.netSalary)}</strong></div>
          <div><span>Per diem</span><strong>+{money(shown.perDiem)}</strong></div>
          <div><span>Infrações/acidentes</span><strong>-{money(shown.incidentDeduction)}</strong></div>
          <div className="deposit-line"><span>Depósito total</span><strong>{money(shown.deposit)}</strong></div>
        </div>
      </section>

      <section className="panel closed-weeks-card">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico</span><h2>Semanas fechadas</h2></div>
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
