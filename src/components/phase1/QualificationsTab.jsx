import { useState } from 'react'
import { getPromotionStatus, totalMiles } from '../../lib/phase1.js'
import { formatDistance, formatMoney } from '../../config/games.js'
import { useGame } from '../GameContext.jsx'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useToast } from '../ToastProvider.jsx'

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function historyEntry(description, amount, balance) {
  return { date: new Date().toLocaleString('pt-BR'), desc: description, amount, balance }
}

export default function QualificationsTab({ state, commit }) {
  const game = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const distance = totalMiles(state)
  const promotion = getPromotionStatus(state, game.id)
  const [level2Confirmed, setLevel2Confirmed] = useState(false)
  const [level3Confirmed, setLevel3Confirmed] = useState(false)
  const qualified = Boolean(state.dangerousGoodsQualified ?? state.hazmatQualified)
  const [level2Goal, level3Goal] = game.promotionGoals
  const [level2Cost, level3Cost] = game.promotionCosts
  const [level2Module, level3Module] = game.promotionModules
  const qualification = game.dangerousQualification

  async function promoteLevel2() {
    if (state.currentLevel !== 1 || distance < level2Goal || !level2Confirmed) return
    if (Number(state.balance || 0) < level2Cost) {
      toast.error(`Saldo insuficiente para pagar ${formatMoney(level2Cost, game)} da avaliação do Nível 2.`)
      return
    }
    const confirmed = await confirm({
      title: 'Liberar o Nível 2?',
      message: `${formatMoney(level2Cost, game)} serão descontados do saldo pela avaliação da Academy e o Nível 2 será liberado.`,
      confirmLabel: 'Pagar e liberar', tone: 'success',
    })
    if (!confirmed) return
    const balance = Number(state.balance || 0) - level2Cost
    commit({ ...state, balance, currentLevel: 2, careerLevel: 2, academy: { ...(state.academy || {}), level2: true }, history: [historyEntry(`Promoção para Nível 2 — ${level2Module}`, -level2Cost, balance), ...(state.history || [])] })
    toast.success(`Promoção concluída. Bem-vindo ao Nível 2 — ${game.levelRoles[1]}!`, { title: 'Nível 2 liberado' })
  }

  async function qualifyDangerousGoods() {
    if (state.currentLevel < 2 || qualified) return
    if (Number(state.balance || 0) < qualification.cost) {
      toast.error(`Saldo insuficiente para pagar ${formatMoney(qualification.cost, game)} da qualificação ${qualification.name}.`)
      return
    }
    const confirmed = await confirm({
      title: `Obter qualificação ${qualification.name}?`,
      message: `${formatMoney(qualification.cost, game)} serão descontados do saldo. ${qualification.description}`,
      confirmLabel: 'Pagar e qualificar', tone: 'success',
    })
    if (!confirmed) return
    const balance = Number(state.balance || 0) - qualification.cost
    commit({ ...state, balance, hazmatQualified: true, dangerousGoodsQualified: true, history: [historyEntry(`Qualificação ${qualification.name}`, -qualification.cost, balance), ...(state.history || [])] })
    toast.success(`${qualification.name} ativado. As categorias compatíveis já estão disponíveis.`, { title: `${qualification.name} liberado` })
  }

  async function promoteLevel3() {
    if (state.currentLevel !== 2 || distance < level3Goal || !level3Confirmed) return
    if (Number(state.balance || 0) < level3Cost) {
      toast.error(`Saldo insuficiente para pagar ${formatMoney(level3Cost, game)} do ${level3Module}.`)
      return
    }
    const confirmed = await confirm({
      title: 'Liberar o Nível 3?',
      message: `${formatMoney(level3Cost, game)} serão descontados do saldo pelo ${level3Module} e o Nível 3 será liberado.`,
      confirmLabel: 'Pagar e liberar', tone: 'success',
    })
    if (!confirmed) return
    const balance = Number(state.balance || 0) - level3Cost
    commit({ ...state, balance, currentLevel: 3, careerLevel: 3, academy: { ...(state.academy || {}), level2: true, level3: true }, history: [historyEntry(`Promoção para Nível 3 — ${level3Module}`, -level3Cost, balance), ...(state.history || [])] })
    toast.success(`Promoção concluída. Nível 3 — ${game.levelRoles[2]} liberado!`, { title: 'Nível 3 liberado' })
  }

  const level2Ready = state.currentLevel === 1 && distance >= level2Goal
  const level3Ready = state.currentLevel === 2 && distance >= level3Goal

  return (
    <>
      <section className="phase1-status-grid qualification-summary">
        <article className="panel status-card static-card"><span className="metric-label line-label-with-tip">Nível atual <Tip text="Determina as operações, categorias de pagamento e qualificações disponíveis." /></span><strong>Nível {state.currentLevel}</strong><span>{game.levelRoles[state.currentLevel - 1]}</span></article>
        <article className="panel status-card static-card"><span className="metric-label line-label-with-tip">{game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} da carreira <Tip text={`Viagens com carga e reposicionamentos contam para as metas em ${game.distanceName}.`} /></span><strong>{formatDistance(distance, game)}</strong><span>{state.currentLevel >= 3 ? 'Nível máximo da Fase 1 alcançado.' : promotion.remaining ? `${formatDistance(promotion.remaining, game)} para a próxima promoção.` : `Meta de ${game.distanceName} concluída.`}</span></article>
      </section>

      <section className="qualification-grid" data-tour="qualifications">
        <article className={`panel qualification-card ${state.currentLevel >= 2 ? 'completed' : level2Ready ? 'ready' : ''}`}>
          <span className="eyebrow">Nível 1 → Nível 2</span><h2 className="line-label-with-tip">{level2Module} <Tip text={`Exige ${formatDistance(level2Goal, game, true)}, treinamento no Driving Academy de ${game.shortName} e ${formatMoney(level2Cost, game)}.`} /></h2><p>Exige {formatDistance(level2Goal, game, true)}, conclusão do {level2Module} e pagamento de {formatMoney(level2Cost, game)}.</p>
          <div className="qualification-meta"><span>Meta</span><strong>{formatDistance(level2Goal, game)}</strong><span>Custo</span><strong>{formatMoney(level2Cost, game)}</strong></div>
          {state.currentLevel >= 2 ? <div className="qualification-done">✓ Nível 2 concluído</div> : <><label className={`academy-check ${!level2Ready ? 'disabled-check' : ''}`}><input type="checkbox" disabled={!level2Ready} checked={level2Confirmed} onChange={(e) => setLevel2Confirmed(e.target.checked)} /> Concluí o {level2Module} / Driving Academy</label><button className="button primary" disabled={!level2Ready || !level2Confirmed} onClick={promoteLevel2}>{!level2Ready ? `${formatDistance(Math.max(0, level2Goal - distance), game)} restantes` : level2Confirmed ? `Pagar ${formatMoney(level2Cost, game)} e liberar Nível 2` : 'Confirme o Academy acima'}</button></>}
        </article>

        <article className={`panel qualification-card ${qualified ? 'completed' : state.currentLevel >= 2 ? 'ready' : ''}`}>
          <span className="eyebrow">Qualificação opcional</span><h2 className="line-label-with-tip">{qualification.name} <Tip text={`${qualification.description} Disponível a partir do Nível 2.`} /></h2><p>{qualification.description} A tarifa passa a {formatMoney(game.payRates.hazmat, game)}/{game.distanceUnit}; no Nível 3, {qualification.name} + {game.payLabels.doubles} paga {formatMoney(game.payRates.hazmat_doubles, game)}/{game.distanceUnit}.</p>
          <div className="qualification-meta"><span>Disponível</span><strong>Nível 2+</strong><span>Custo</span><strong>{formatMoney(qualification.cost, game)}</strong></div>
          {qualified ? <div className="qualification-done">✓ {qualification.activeText}</div> : <button className="button success" disabled={state.currentLevel < 2} onClick={qualifyDangerousGoods}>{state.currentLevel < 2 ? 'Disponível no Nível 2' : `Obter qualificação ${qualification.name}`}</button>}
        </article>

        <article className={`panel qualification-card ${state.currentLevel >= 3 ? 'completed' : level3Ready ? 'ready' : ''}`}>
          <span className="eyebrow">Nível 2 → Nível 3</span><h2 className="line-label-with-tip">{level3Module} <Tip text={`Exige ${formatDistance(level3Goal, game, true)}, confirmação do módulo e ${formatMoney(level3Cost, game)}.`} /></h2><p>Exige {formatDistance(level3Goal, game, true)}, conclusão do {level3Module} e pagamento de {formatMoney(level3Cost, game)}.</p>
          <div className="qualification-meta"><span>Meta</span><strong>{formatDistance(level3Goal, game)}</strong><span>Custo</span><strong>{formatMoney(level3Cost, game)}</strong></div>
          {state.currentLevel >= 3 ? <div className="qualification-done">✓ Nível 3 concluído</div> : <><label className={`academy-check ${!level3Ready ? 'disabled-check' : ''}`}><input type="checkbox" disabled={!level3Ready} checked={level3Confirmed} onChange={(e) => setLevel3Confirmed(e.target.checked)} /> Concluí o {level3Module}</label><button className="button primary" disabled={!level3Ready || !level3Confirmed} onClick={promoteLevel3}>{state.currentLevel < 2 ? 'Primeiro conclua o Nível 2' : !level3Ready ? `${formatDistance(Math.max(0, level3Goal - distance), game)} restantes` : level3Confirmed ? `Pagar ${formatMoney(level3Cost, game)} e liberar Nível 3` : 'Confirme o treinamento acima'}</button></>}
        </article>
      </section>

      <section className="panel qualification-footer"><div><span className="metric-label line-label-with-tip">Saldo disponível <Tip text="Taxas fictícias de treinamento e qualificação saem do saldo pessoal da carreira." /></span><strong>{formatMoney(state.balance, game)}</strong></div><p>Os custos são parâmetros editáveis da simulação, não taxas oficiais do jogo ou de um país.</p></section>
    </>
  )
}
