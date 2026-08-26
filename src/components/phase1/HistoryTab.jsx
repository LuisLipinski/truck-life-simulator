import { BarChart, LineChart } from './Charts.jsx'
import { formatMoney } from '../../config/games.js'
import { useGame } from '../GameContext.jsx'
import { careerEventDescription, careerEventLabel } from '../../lib/careerEvents.js'
import { WEEKDAY_OPTIONS, weekdayLabel } from '../../lib/tripWeek.js'

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function formatEffectiveDay(value) {
  const directLabel = weekdayLabel(value)
  if (directLabel) return directLabel

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    const date = new Date(`${value}T00:00:00Z`)
    if (!Number.isNaN(date.getTime())) {
      const mondayIndex = (date.getUTCDay() + 6) % 7
      return WEEKDAY_OPTIONS[mondayIndex]?.label || '—'
    }
  }

  return '—'
}

export default function HistoryTab({ career, state }) {
  const game = useGame()
  const monthlyPayroll = game.payrollPeriod === 'monthly'
  const money = (value) => formatMoney(value, game)
  const history = Array.isArray(state.history) ? state.history : []
  const closedWeeks = Array.isArray(state.closedWeeks) ? state.closedWeeks : []
  const incidents = Array.isArray(state.incidents) ? state.incidents : []
  const careerEvents = Array.isArray(career?.events) ? career.events : []
  const periodLabel = (period) => monthlyPayroll && (period.periodType === 'month' || period.month)
    ? `Mês ${period.month}`
    : `Semana ${period.week || '—'}${monthlyPayroll ? ' (legado)' : ''}`

  const balanceData = history
    .filter((item) => Number.isFinite(Number(item.balance)))
    .slice(-12)
    .map((item, index) => ({
      label: `Mov. ${index + 1}`,
      value: Number(item.balance),
    }))

  const depositData = [...closedWeeks]
    .slice(-8)
    .map((period) => ({
      label: periodLabel(period),
      value: Number(period.net ?? period.deposit ?? period.netPay ?? 0),
    }))

  return (
    <>
      <section className="history-summary-grid" data-tour="history-summary">
        <article className="panel history-summary"><span className="metric-label line-label-with-tip">Movimentações <Tip text="Entradas e saídas que alteraram o saldo da carreira, como salários, despesas, ajustes e qualificações." /></span><strong>{history.length}</strong><span>Entradas e saídas registradas</span></article>
        <article className="panel history-summary"><span className="metric-label line-label-with-tip">{monthlyPayroll ? 'Meses fechados' : 'Semanas fechadas'} <Tip text={monthlyPayroll ? 'Cada holerite reúne as semanas operacionais encerradas e cria um registro mensal permanente.' : 'Cada holerite gerado congela uma semana e cria um registro permanente aqui.'} /></span><strong>{closedWeeks.length}</strong><span>Holerites concluídos</span></article>
        <article className="panel history-summary"><span className="metric-label line-label-with-tip">Ocorrências <Tip text="Total de infrações, acidentes e outras cobranças registradas durante a carreira." /></span><strong>{incidents.length}</strong><span>Infrações e acidentes cadastrados</span></article>
        <article className="panel history-summary"><span className="metric-label line-label-with-tip">Eventos de carreira <Tip text="Correções de perfil, trocas de empresa e mudanças de base com valores anteriores e novos." /></span><strong>{careerEvents.length}</strong><span>Alterações estruturais preservadas</span></article>
      </section>

      <section className="career-charts-grid history-charts-grid" aria-label="Gráficos financeiros do histórico da carreira">
        <LineChart
          title="Evolução do saldo"
          description="Últimas movimentações com saldo registrado. Ajuda a enxergar se a conta pessoal está crescendo ou diminuindo ao longo da carreira."
          data={balanceData}
          formatValue={money}
          emptyText="Registre pelo menos duas movimentações financeiras para ver a evolução do saldo."
        />
        <BarChart
          title={`Depósitos por ${monthlyPayroll ? 'mês' : 'semana'}`}
          description={`Compara o valor efetivamente depositado nos últimos ${monthlyPayroll ? 'meses' : 'semanas'} fechados.`}
          data={depositData}
          formatValue={money}
          emptyText={`Feche um holerite para começar a comparar os depósitos ${monthlyPayroll ? 'mensais' : 'semanais'}.`}
        />
      </section>

      <section className="panel history-panel" data-tour="history-records">
        <div className="section-heading compact-heading"><span className="eyebrow">Financeiro</span><h2 className="line-label-with-tip">Movimentações de saldo <Tip text="Use esta tabela para conferir por que o saldo aumentou ou diminuiu ao longo da carreira." /></h2><p>Mais recentes primeiro.</p></div>
        {history.length === 0 ? <div className="empty-inline">Nenhuma movimentação registrada.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Descrição</th><th>Valor</th><th>Saldo</th></tr></thead><tbody>
            {history.map((item, index) => <tr key={`${item.desc || item.description || 'history'}-${index}`}><td>{item.desc || item.description || '—'}</td><td className={Number(item.amount ?? item.value ?? 0) < 0 ? 'negative' : 'positive'}>{money(item.amount ?? item.value ?? 0)}</td><td>{money(item.balance)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="panel history-panel" data-tour="career-events">
        <div className="section-heading compact-heading"><span className="eyebrow">Linha do tempo</span><h2>Eventos da carreira</h2><p>Perfil, empregadora e base sem calendário: quando houver referência temporal, usamos apenas o dia da semana.</p></div>
        {careerEvents.length === 0 ? <div className="empty-inline">Nenhuma alteração estrutural registrada.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Dia efetivo</th><th>Evento</th><th>Alteração</th></tr></thead><tbody>
            {[...careerEvents].reverse().map((event, index) => <tr key={event.id || `${event.type}-${index}`}><td>{formatEffectiveDay(event.effectiveDate)}</td><td><strong>{careerEventLabel(event.type)}</strong></td><td>{careerEventDescription(event)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="panel history-panel">
        <div className="section-heading compact-heading"><span className="eyebrow">Holerites</span><h2 className="line-label-with-tip">{monthlyPayroll ? 'Meses fechados' : 'Semanas fechadas'} <Tip text={`Mostra o resumo financeiro de cada ${monthlyPayroll ? 'mês' : 'semana'} já encerrado. Esses registros não devem ser alterados depois do fechamento.`} /></h2><p>Resumo dos períodos já concluídos.</p></div>
        {closedWeeks.length === 0 ? <div className="empty-inline">Nenhum holerite fechado ainda.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Período</th>{monthlyPayroll && <th>Semanas</th>}<th>Bruto</th><th>{game.perDiemLabel}</th><th>Ocorrências</th><th>Depósito</th></tr></thead><tbody>
            {[...closedWeeks].reverse().map((period, index) => <tr key={`${period.month || period.week || index}-${index}`}><td>{periodLabel(period)}</td>{monthlyPayroll && <td>{Array.isArray(period.weeks) ? period.weeks.join(', ') : period.week || '—'}</td>}<td>{money(period.gross ?? period.totalGross ?? 0)}</td><td>{money(period.perDiem ?? period.perDiemAmount ?? 0)}</td><td>{money(period.incidentDeduction ?? period.incidentDeductions ?? 0)}</td><td><strong>{money(period.net ?? period.deposit ?? period.netPay ?? 0)}</strong></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </>
  )
}
