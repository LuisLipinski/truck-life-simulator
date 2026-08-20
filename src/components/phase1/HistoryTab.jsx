import { BarChart, LineChart } from './Charts.jsx'

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

export default function HistoryTab({ state }) {
  const history = Array.isArray(state.history) ? state.history : []
  const closedWeeks = Array.isArray(state.closedWeeks) ? state.closedWeeks : []
  const incidents = Array.isArray(state.incidents) ? state.incidents : []

  const balanceData = history
    .filter((item) => Number.isFinite(Number(item.balance)))
    .slice(-12)
    .map((item, index) => ({
      label: item.date || `Mov. ${index + 1}`,
      value: Number(item.balance),
    }))

  const weeklyDepositData = [...closedWeeks]
    .slice(-8)
    .map((week) => ({
      label: `Semana ${week.week || '—'}`,
      value: Number(week.net ?? week.deposit ?? week.netPay ?? 0),
    }))

  return (
    <>
      <section className="history-summary-grid">
        <article className="panel history-summary"><span className="metric-label line-label-with-tip">Movimentações <Tip text="Entradas e saídas que alteraram o saldo da carreira, como salários, despesas, ajustes e qualificações." /></span><strong>{history.length}</strong><span>Entradas e saídas registradas</span></article>
        <article className="panel history-summary"><span className="metric-label line-label-with-tip">Semanas fechadas <Tip text="Cada holerite gerado congela uma semana e cria um registro permanente aqui." /></span><strong>{closedWeeks.length}</strong><span>Holerites concluídos</span></article>
        <article className="panel history-summary"><span className="metric-label line-label-with-tip">Ocorrências <Tip text="Total de infrações, acidentes e outras cobranças registradas durante a carreira." /></span><strong>{incidents.length}</strong><span>Infrações e acidentes cadastrados</span></article>
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
          title="Depósitos por semana"
          description="Compara o valor efetivamente depositado nas últimas semanas fechadas."
          data={weeklyDepositData}
          formatValue={money}
          emptyText="Feche um holerite para começar a comparar os depósitos semanais."
        />
      </section>

      <section className="panel history-panel">
        <div className="section-heading compact-heading"><span className="eyebrow">Financeiro</span><h2 className="line-label-with-tip">Movimentações de saldo <Tip text="Use esta tabela para conferir por que o saldo aumentou ou diminuiu ao longo da carreira." /></h2><p>Mais recentes primeiro.</p></div>
        {history.length === 0 ? <div className="empty-inline">Nenhuma movimentação registrada.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Saldo</th></tr></thead><tbody>
            {history.map((item, index) => <tr key={`${item.date || 'history'}-${index}`}><td>{item.date || '—'}</td><td>{item.desc || item.description || '—'}</td><td className={Number(item.amount ?? item.value ?? 0) < 0 ? 'negative' : 'positive'}>{money(item.amount ?? item.value ?? 0)}</td><td>{money(item.balance)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="panel history-panel">
        <div className="section-heading compact-heading"><span className="eyebrow">Holerites</span><h2 className="line-label-with-tip">Semanas fechadas <Tip text="Mostra o resumo financeiro de cada semana já encerrada. Esses registros não devem ser alterados depois do fechamento." /></h2><p>Resumo das semanas já concluídas.</p></div>
        {closedWeeks.length === 0 ? <div className="empty-inline">Nenhuma semana fechada ainda.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Semana</th><th>Bruto</th><th>Per diem</th><th>Ocorrências</th><th>Depósito</th></tr></thead><tbody>
            {[...closedWeeks].reverse().map((week, index) => <tr key={`${week.week || index}-${index}`}><td>Semana {week.week || '—'}</td><td>{money(week.gross ?? week.totalGross ?? 0)}</td><td>{money(week.perDiem ?? week.perDiemAmount ?? 0)}</td><td>{money(week.incidentDeduction ?? week.incidentDeductions ?? 0)}</td><td><strong>{money(week.net ?? week.deposit ?? week.netPay ?? 0)}</strong></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </>
  )
}
