const levels = [
  {
    level: 'Nível 1',
    title: 'Trainee / Local Driver',
    bullets: [
      'Salário bruto fixo de US$ 850 por semana.',
      'Day cab e operação local/regional; normalmente retorna à base no mesmo dia.',
      'Jornada de referência: segunda a sexta, 07:00–15:30, com 30 min de refeição.',
      'Route Overrun Pay: US$ 21,25/h quando a rota ultrapassa o horário normal.',
      'Loaded e Deadhead contam para progressão; não há per diem.',
      'Sem HazMat ou Doubles.',
      'Promoção ao Nível 2 após 10.000 mi + Truck Driving Proficiency + US$ 300.',
    ],
  },
  {
    level: 'Nível 2',
    title: 'Company Driver / OTR',
    bullets: [
      'Sleeper cab, viagens interestaduais e multi-day.',
      'Loaded normal: US$ 0,60/mi; Deadhead: US$ 0,50/mi.',
      'Per diem de US$ 80/dia qualificável, calculado por viagens com pernoite.',
      'Roleplay de HOS: até ~11 h dirigindo, janela de ~14 h e descanso de 10 h.',
      'HazMat opcional por US$ 144,25; HazMat loaded paga US$ 0,63/mi.',
      'Promoção ao Nível 3 após 50.000 mi totais + Double Trailer Handling + US$ 59.',
    ],
  },
  {
    level: 'Nível 3',
    title: 'Experienced Driver / Doubles',
    bullets: [
      'Mantém o vínculo como empregado da transportadora.',
      'Loaded normal: US$ 0,60/mi; HazMat: US$ 0,63/mi se qualificado.',
      'Doubles: US$ 0,64/mi; HazMat + Doubles: US$ 0,67/mi.',
      'Deadhead permanece US$ 0,50/mi em qualquer categoria.',
      'Doubles e trabalhos avançados ficam liberados.',
    ],
  },
]

export default function RulesTab() {
  return (
    <>
      <section className="panel rules-intro">
        <span className="eyebrow">Fase 1 — Company Driver</span>
        <h2>Regras operacionais da carreira</h2>
        <p>Você trabalha como empregado e não possui caminhão próprio. Diesel, manutenção, pneus, seguro comercial, licenciamento, reparos e pedágios autorizados são custos da empresa.</p>
        <div className="notice-box"><strong>Economia do ATS</strong><span>O valor da carga mostrado pelo jogo é ignorado. A economia pessoal é controlada pelo Truck Life Simulator.</span></div>
      </section>

      <section className="rules-grid">
        {levels.map((item) => (
          <article className="panel rule-card" key={item.level}>
            <span className="eyebrow">{item.level}</span>
            <h2>{item.title}</h2>
            <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          </article>
        ))}
      </section>

      <section className="panel rule-card">
        <span className="eyebrow">Fluxo semanal</span>
        <h2>Ordem recomendada</h2>
        <ol className="workflow-list">
          <li>Jogue a rota no ATS e registre todos os trechos em Progresso.</li>
          <li>Registre infrações ou acidentes antes de fechar a semana.</li>
          <li>Confira milhas, categorias e per diem no Holerite.</li>
          <li>Gere o holerite; isso fecha a semana e inicia a próxima.</li>
          <li>Aplique as despesas mensais apenas quando chegar o vencimento na simulação.</li>
          <li>Faça promoções e qualificações quando as metas forem liberadas.</li>
        </ol>
      </section>

      <section className="rules-grid compact-rules">
        <article className="panel rule-card"><span className="eyebrow">Nível 1</span><h2>Origem e retorno</h2><p>Novas cargas são retiradas em filial da empregadora. Se houver carga de retorno em uma filial de destino, use-a; caso contrário, retorne vazio ou faça deadhead regional até uma filial próxima.</p></article>
        <article className="panel rule-card"><span className="eyebrow">ATS Skills</span><h2>Progressão sugerida</h2><p>Nível 1 prioriza Fuel Economy e, se desejar, High-Value. Nível 2 adiciona Long Distance, Fragile, Just-in-Time e HazMat após qualificação. Nível 3 libera a progressão avançada.</p></article>
        <article className="panel rule-card"><span className="eyebrow">Ocorrências</span><h2>Multas e acidentes</h2><p>Custos podem sair imediatamente do saldo ou ficar pendentes para holerite. Se o holerite não comportar o valor, o restante continua pendente para a semana seguinte.</p></article>
        <article className="panel rule-card"><span className="eyebrow">Semanas fechadas</span><h2>Dados congelados</h2><p>Depois de gerar o holerite, a semana é considerada fechada. Viagens dessa semana não devem mais ser alteradas ou excluídas.</p></article>
      </section>
    </>
  )
}
