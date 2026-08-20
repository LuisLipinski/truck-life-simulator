function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function HistoryTab({ state }) {
  const history = Array.isArray(state.history) ? state.history : []
  const closedWeeks = Array.isArray(state.closedWeeks) ? state.closedWeeks : []
  const incidents = Array.isArray(state.incidents) ? state.incidents : []

  return (
    <>
      <section className="history-summary-grid">
        <article className="panel history-summary"><span className="metric-label">Movimentações</span><strong>{history.length}</strong><span>Entradas e saídas registradas</span></article>
        <article className="panel history-summary"><span className="metric-label">Semanas fechadas</span><strong>{closedWeeks.length}</strong><span>Holerites concluídos</span></article>
        <article className="panel history-summary"><span className="metric-label">Ocorrências</span><strong>{incidents.length}</strong><span>Infrações e acidentes cadastrados</span></article>
      </section>

      <section className="panel history-panel">
        <div className="section-heading compact-heading"><span className="eyebrow">Financeiro</span><h2>Movimentações de saldo</h2><p>Mais recentes primeiro.</p></div>
        {history.length === 0 ? <div className="empty-inline">Nenhuma movimentação registrada.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Saldo</th></tr></thead><tbody>
            {history.map((item, index) => <tr key={`${item.date || 'history'}-${index}`}><td>{item.date || '—'}</td><td>{item.desc || item.description || '—'}</td><td className={Number(item.amount ?? item.value ?? 0) < 0 ? 'negative' : 'positive'}>{money(item.amount ?? item.value ?? 0)}</td><td>{money(item.balance)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="panel history-panel">
        <div className="section-heading compact-heading"><span className="eyebrow">Holerites</span><h2>Semanas fechadas</h2><p>Resumo das semanas já concluídas.</p></div>
        {closedWeeks.length === 0 ? <div className="empty-inline">Nenhuma semana fechada ainda.</div> : (
          <div className="responsive-table"><table><thead><tr><th>Semana</th><th>Bruto</th><th>Per diem</th><th>Ocorrências</th><th>Depósito</th></tr></thead><tbody>
            {[...closedWeeks].reverse().map((week, index) => <tr key={`${week.week || index}-${index}`}><td>Semana {week.week || '—'}</td><td>{money(week.gross ?? week.totalGross ?? 0)}</td><td>{money(week.perDiem ?? week.perDiemAmount ?? 0)}</td><td>{money(week.incidentDeduction ?? week.incidentDeductions ?? 0)}</td><td><strong>{money(week.net ?? week.deposit ?? week.netPay ?? 0)}</strong></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </>
  )
}
