import { formatDistance, formatMoney } from '../../config/games.js'
import { useGame } from '../GameContext.jsx'

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function levelsFor(game) {
  const [level2Goal, level3Goal] = game.promotionGoals
  const [level2Cost, level3Cost] = game.promotionCosts
  const q = game.dangerousQualification
  if (game.id === 'ets2') {
    return [
      { level: 'Nível 1', title: game.levelRoles[0], tip: 'Rotas locais e regionais, salário semanal fixo e retorno à base como padrão.', bullets: [
        `Salário bruto fixo de ${formatMoney(game.level1Gross, game)} por semana.`,
        'Cavalo mecânico da empresa e operação local/regional; normalmente retorna à base no mesmo dia.',
        'Jornada de referência da simulação: segunda a sexta, com pausa e controle de horas.',
        `${game.overtimeLabel}: ${formatMoney(game.routeOverrunRate, game)}/h após a jornada diária de referência.`,
        `Carga e reposicionamento vazio contam para progressão; não há ${game.perDiemLabel.toLowerCase()}.`,
        `Sem ${q.name} ou Euro Combi.`,
        `Promoção após ${formatDistance(level2Goal, game)} + ${game.promotionModules[0]} + ${formatMoney(level2Cost, game)}.`,
      ] },
      { level: 'Nível 2', title: game.levelRoles[1], tip: 'Rotas internacionais, pagamento por quilômetro e diária em viagens com pernoite.', bullets: [
        'Viagens internacionais e de vários dias com cabine leito.',
        `Carga padrão: ${formatMoney(game.payRates.normal, game)}/km; reposicionamento vazio: ${formatMoney(game.payRates.deadhead, game)}/km.`,
        `${game.perDiemLabel} de ${formatMoney(game.perDiemRate, game)}/dia qualificável.`,
        'Roleplay europeu: 4h30 de condução antes da pausa, 9h diárias como referência e descanso diário.',
        `${q.name} opcional por ${formatMoney(q.cost, game)}; carga ADR paga ${formatMoney(game.payRates.hazmat, game)}/km.`,
        `Promoção após ${formatDistance(level3Goal, game)} totais + ${game.promotionModules[1]} + ${formatMoney(level3Cost, game)}.`,
      ] },
      { level: 'Nível 3', title: game.levelRoles[2], tip: 'Operação avançada com Euro Combi e combinação ADR quando qualificado.', bullets: [
        'Mantém o vínculo como empregado da transportadora.',
        `Carga padrão: ${formatMoney(game.payRates.normal, game)}/km; ADR: ${formatMoney(game.payRates.hazmat, game)}/km quando qualificado.`,
        `Euro Combi: ${formatMoney(game.payRates.doubles, game)}/km; ADR + Euro Combi: ${formatMoney(game.payRates.hazmat_doubles, game)}/km.`,
        `Reposicionamento vazio permanece ${formatMoney(game.payRates.deadhead, game)}/km.`,
        'Combinações duplas só devem ser usadas onde o mapa e as regras locais do jogo permitirem.',
      ] },
    ]
  }

  return [
    { level: 'Nível 1', title: game.levelRoles[0], tip: 'Operação local/regional com day cab, salário semanal fixo e retorno à base como padrão.', bullets: [
      `Salário bruto fixo de ${formatMoney(game.level1Gross, game)} por semana.`, 'Day cab e operação local/regional; normalmente retorna à base no mesmo dia.',
      'Jornada de referência: segunda a sexta, 07:00–15:30, com 30 min de refeição.', `${game.overtimeLabel}: ${formatMoney(game.routeOverrunRate, game)}/h quando a rota ultrapassa o horário normal.`,
      `Loaded e Deadhead contam para progressão; não há ${game.perDiemLabel.toLowerCase()}.`, `Sem ${q.name} ou Doubles.`,
      `Promoção após ${formatDistance(level2Goal, game)} + ${game.promotionModules[0]} + ${formatMoney(level2Cost, game)}.`,
    ] },
    { level: 'Nível 2', title: game.levelRoles[1], tip: 'Operação OTR com sleeper, viagens longas, pagamento por milha e per diem.', bullets: [
      'Sleeper cab, viagens interestaduais e de vários dias.', `Loaded normal: ${formatMoney(game.payRates.normal, game)}/mi; Deadhead: ${formatMoney(game.payRates.deadhead, game)}/mi.`,
      `${game.perDiemLabel} de ${formatMoney(game.perDiemRate, game)}/dia qualificável.`, 'Roleplay de HOS: até ~11 h dirigindo, janela de ~14 h e descanso de 10 h.',
      `${q.name} opcional por ${formatMoney(q.cost, game)}; HazMat loaded paga ${formatMoney(game.payRates.hazmat, game)}/mi.`,
      `Promoção após ${formatDistance(level3Goal, game)} totais + ${game.promotionModules[1]} + ${formatMoney(level3Cost, game)}.`,
    ] },
    { level: 'Nível 3', title: game.levelRoles[2], tip: 'Operação avançada com Doubles e HazMat combinado quando qualificado.', bullets: [
      'Mantém o vínculo como empregado da transportadora.', `Loaded normal: ${formatMoney(game.payRates.normal, game)}/mi; HazMat: ${formatMoney(game.payRates.hazmat, game)}/mi quando qualificado.`,
      `Doubles: ${formatMoney(game.payRates.doubles, game)}/mi; HazMat + Doubles: ${formatMoney(game.payRates.hazmat_doubles, game)}/mi.`,
      `Deadhead permanece ${formatMoney(game.payRates.deadhead, game)}/mi.`, 'Doubles e trabalhos avançados ficam liberados.',
    ] },
  ]
}

export default function RulesTab() {
  const game = useGame()
  const levels = levelsFor(game)
  return (
    <>
      <section className="panel rules-intro" data-tour="rules">
        <span className="eyebrow">Fase 1 — {game.shortName}</span>
        <h2 className="line-label-with-tip">Regras operacionais da carreira <Tip text="Estas regras mantêm salário, progressão e qualificações coerentes dentro do roleplay." /></h2>
        <p>Você trabalha como empregado e não possui caminhão próprio. Diesel, manutenção, pneus, seguro comercial, licenciamento, reparos e pedágios autorizados são custos da empresa.</p>
        <div className="notice-box"><strong className="line-label-with-tip">Economia do {game.shortName} <Tip text={`Os valores pagos pelo próprio ${game.shortName} não entram na economia pessoal do aplicativo.`} /></strong><span>O valor da carga mostrado pelo jogo é ignorado. A economia pessoal usa {game.currency} e é controlada pelo Truck Life Simulator.</span></div>
        {game.id === 'ets2' && <div className="notice-box"><strong>Regras europeias variam por país</strong><span>Impostos, habilitação, pedágios e combinações permitidas mudam conforme o país. Os valores do app são um modelo genérico de roleplay e podem ser editados.</span></div>}
      </section>

      <section className="rules-grid">
        {levels.map((item) => <article className="panel rule-card" key={item.level}><span className="eyebrow">{item.level}</span><h2 className="line-label-with-tip">{item.title} <Tip text={item.tip} /></h2><ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></article>)}
      </section>

      <section className="panel rule-card">
        <span className="eyebrow">Fluxo semanal</span><h2 className="line-label-with-tip">Ordem recomendada <Tip text="Registre viagens e ocorrências antes de fechar o holerite; depois avance para a próxima semana." /></h2>
        <ol className="workflow-list">
          <li>Jogue a rota no {game.shortName} e registre todos os trechos.</li><li>Registre infrações ou acidentes antes de fechar a semana.</li>
          <li>Confira {game.distanceName}, categorias e {game.perDiemLabel.toLowerCase()} no Holerite.</li><li>Gere o holerite para fechar a semana e iniciar a próxima.</li>
          <li>Aplique despesas mensais somente no vencimento da simulação.</li><li>Faça promoções e qualificações quando as metas forem liberadas.</li>
        </ol>
      </section>

      <section className="rules-grid compact-rules">
        <article className="panel rule-card"><span className="eyebrow">Nível 1</span><h2 className="line-label-with-tip">Origem e retorno <Tip text="Sem carga de retorno, volte vazio ou faça reposicionamento até uma filial próxima." /></h2><p>Novas cargas saem de uma filial da empregadora. Se não houver retorno, volte vazio ou faça reposicionamento regional.</p></article>
        <article className="panel rule-card"><span className="eyebrow">{game.shortName} Skills</span><h2 className="line-label-with-tip">Progressão sugerida <Tip text={`É uma recomendação de pontos no ${game.shortName}; não bloqueia o aplicativo.`} /></h2><p>Nível 1 prioriza economia de combustível. Nível 2 adiciona longa distância, frágil, urgente e {game.dangerousQualification.name} após a qualificação. Nível 3 libera progressão avançada.</p></article>
        <article className="panel rule-card"><span className="eyebrow">Reserva financeira</span><h2 className="line-label-with-tip">Reserva de emergência <Tip text="Patrimônio do motorista separado do saldo disponível." /></h2><p>Faça aportes manualmente ou pelo Holerite. A reserva rende 3,25% ao ano na simulação, proporcionalmente por semana.</p></article>
        <article className="panel rule-card"><span className="eyebrow">Ocorrências</span><h2 className="line-label-with-tip">Multas e acidentes <Tip text="Podem sair do saldo ou ser carregados para holerites futuros." /></h2><p>Se o holerite não comportar o valor, o restante continua pendente para a semana seguinte.</p></article>
        <article className="panel rule-card"><span className="eyebrow">Semanas fechadas</span><h2 className="line-label-with-tip">Dados congelados <Tip text="Protege o histórico financeiro contra alterações posteriores." /></h2><p>Depois do holerite, viagens dessa semana não podem ser alteradas ou excluídas.</p></article>
      </section>
    </>
  )
}
