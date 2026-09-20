import { useEffect, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { progressionApi } from '../../lib/progressionApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { formatDistance, formatMoney } from '../../config/games.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

export default function ServerQualificationsTab({ career }) {
  const game = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const [progression, setProgression] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mutation, setMutation] = useState(false)
  const [level2Confirmed, setLevel2Confirmed] = useState(false)
  const [level3Confirmed, setLevel3Confirmed] = useState(false)

  function notifyCareerUpdated() {
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
      detail: { careerId: career.id, gameId: game.id, source: 'server-progression' },
    }))
  }

  async function refreshCareer() {
    const next = await careerApi.get(game.id, career.serverCareerId)
    setServerCareerSnapshot(game.id, career.id, next)
    notifyCareerUpdated()
  }

  async function load({ quiet = false } = {}) {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const next = await progressionApi.get(game.id, career.serverCareerId)
      setProgression(next)
      return next
    } catch (nextError) {
      setError(nextError)
      throw nextError
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    progressionApi.get(game.id, career.serverCareerId)
      .then((next) => { if (active) setProgression(next) })
      .catch((nextError) => { if (active) setError(nextError) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [career.serverCareerId, game.id])

  async function refreshAfterMutation(next, success) {
    setProgression(next)
    try {
      await refreshCareer()
    } catch {
      toast.warning('A alteração foi salva no servidor, mas o cabeçalho será atualizado na próxima recarga.')
    }
    toast.success(success)
  }

  async function promote(option, confirmed, resetConfirmed) {
    if (!option?.ready || !confirmed || mutation || !progression) return
    const fee = Number(option.feeAmount || 0)
    if (Number(progression.balance || 0) < fee) {
      toast.error(`Saldo insuficiente para pagar ${formatMoney(fee, game)} da avaliação da Academy.`)
      return
    }
    const accepted = await confirm({
      title: `Liberar o Nível ${option.targetLevel}?`,
      message: `${formatMoney(fee, game)} serão descontados do saldo pelo ${option.moduleName} e o Nível ${option.targetLevel} será liberado.`,
      confirmLabel: 'Pagar e liberar',
      tone: 'success',
    })
    if (!accepted) return

    setMutation(true)
    try {
      const next = await progressionApi.promote(game.id, career.serverCareerId, {
        expectedOperationalWeek: Number(career.currentOperationalWeek || 1),
        expectedCurrentLevel: Number(progression.currentLevel || 1),
        targetLevel: Number(option.targetLevel),
        academyCompleted: true,
      })
      resetConfirmed(false)
      await refreshAfterMutation(next, `Promoção concluída. Nível ${option.targetLevel} liberado!`)
    } catch (nextError) {
      toast.error(nextError?.message || 'Não foi possível concluir a promoção no servidor.')
      try { await load({ quiet: true }) } catch { /* preserva a mensagem principal */ }
    } finally {
      setMutation(false)
    }
  }

  async function qualifyDangerousGoods() {
    const option = progression?.dangerousQualification
    if (!option?.ready || mutation) return
    const fee = Number(option.feeAmount || 0)
    if (Number(progression.balance || 0) < fee) {
      toast.error(`Saldo insuficiente para pagar ${formatMoney(fee, game)} da qualificação ${option.name}.`)
      return
    }
    const accepted = await confirm({
      title: `Obter qualificação ${option.name}?`,
      message: `${formatMoney(fee, game)} serão descontados do saldo. ${game.dangerousQualification.description}`,
      confirmLabel: 'Pagar e qualificar',
      tone: 'success',
    })
    if (!accepted) return

    setMutation(true)
    try {
      const next = await progressionApi.acquireDangerousGoods(game.id, career.serverCareerId, {
        expectedOperationalWeek: Number(career.currentOperationalWeek || 1),
        expectedCurrentLevel: Number(progression.currentLevel || 1),
      })
      await refreshAfterMutation(next, `${option.name} ativado. As categorias compatíveis já estão disponíveis.`)
    } catch (nextError) {
      toast.error(nextError?.message || 'Não foi possível obter a qualificação no servidor.')
      try { await load({ quiet: true }) } catch { /* preserva a mensagem principal */ }
    } finally {
      setMutation(false)
    }
  }

  if (loading) return <section className="panel"><div className="empty-inline">Carregando qualificações do servidor…</div></section>
  if (error && !progression) {
    return <section className="panel"><div className="section-heading compact-heading"><span className="eyebrow">Servidor</span><h2>Não foi possível carregar as qualificações</h2><p>{error.message || 'Tente novamente.'}</p></div><button className="button primary" type="button" onClick={() => load().catch(() => {})}>Tentar novamente</button></section>
  }

  const currentLevel = Number(progression?.currentLevel || 1)
  const distance = Number(progression?.totalDistance || 0)
  const level2 = progression?.promotions?.find((item) => Number(item.targetLevel) === 2)
  const level3 = progression?.promotions?.find((item) => Number(item.targetLevel) === 3)
  const dangerous = progression?.dangerousQualification
  const qualified = Boolean(progression?.dangerousGoodsQualified || dangerous?.acquired)

  const card = (option, confirmed, setConfirmed) => {
    if (!option) return null
    const completed = Boolean(option.completed)
    const ready = Boolean(option.ready)
    return (
      <article className={`panel qualification-card ${completed ? 'completed' : ready ? 'ready' : ''}`}>
        <span className="eyebrow">Nível {Number(option.targetLevel) - 1} → Nível {option.targetLevel}</span>
        <h2 className="line-label-with-tip">{option.moduleName} <Tip text={`Exige ${formatDistance(option.requiredDistance, game, true)}, confirmação do Driving Academy e ${formatMoney(option.feeAmount, game)}.`} /></h2>
        <p>Exige {formatDistance(option.requiredDistance, game, true)}, conclusão do {option.moduleName} e pagamento de {formatMoney(option.feeAmount, game)}.</p>
        <div className="qualification-meta"><span>Meta</span><strong>{formatDistance(option.requiredDistance, game)}</strong><span>Custo</span><strong>{formatMoney(option.feeAmount, game)}</strong></div>
        {completed
          ? <div className="qualification-done">✓ Nível {option.targetLevel} concluído</div>
          : <>
              <label className={`academy-check ${!ready ? 'disabled-check' : ''}`}><input type="checkbox" disabled={!ready || mutation} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Concluí o {option.moduleName} / Driving Academy</label>
              <button className="button primary" disabled={!ready || !confirmed || mutation} onClick={() => promote(option, confirmed, setConfirmed)}>
                {currentLevel < Number(option.targetLevel) - 1
                  ? `Primeiro conclua o Nível ${Number(option.targetLevel) - 1}`
                  : !ready
                    ? `${formatDistance(option.remainingDistance, game)} restantes`
                    : confirmed ? `Pagar ${formatMoney(option.feeAmount, game)} e liberar Nível ${option.targetLevel}` : 'Confirme o Academy acima'}
              </button>
            </>}
      </article>
    )
  }

  return (
    <>
      <section className="phase1-status-grid qualification-summary">
        <article className="panel status-card static-card"><span className="metric-label line-label-with-tip">Nível atual <Tip text="O nível e os requisitos desta tela são lidos do backend e usados pelos cálculos server-side." /></span><strong>Nível {currentLevel}</strong><span>{game.levelRoles[currentLevel - 1]}</span></article>
        <article className="panel status-card static-card"><span className="metric-label line-label-with-tip">{game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} da carreira <Tip text={`A distância oficial das viagens persistidas no servidor conta para as metas em ${game.distanceName}.`} /></span><strong>{formatDistance(distance, game)}</strong><span>{currentLevel >= 3 ? 'Nível máximo da Fase 1 alcançado.' : 'Acompanhe abaixo quanto falta para a próxima promoção.'}</span></article>
      </section>

      <section className="qualification-grid" data-tour="qualifications">
        {card(level2, level2Confirmed, setLevel2Confirmed)}

        {dangerous && <article className={`panel qualification-card ${qualified ? 'completed' : dangerous.ready ? 'ready' : ''}`}>
          <span className="eyebrow">Qualificação opcional</span>
          <h2 className="line-label-with-tip">{dangerous.name} <Tip text={`${game.dangerousQualification.description} Disponível a partir do Nível ${dangerous.minimumLevel}.`} /></h2>
          <p>{game.dangerousQualification.description} A tarifa passa a {formatMoney(game.payRates.hazmat, game)}/{game.distanceUnit}; no Nível 3, {dangerous.name} + {game.payLabels.doubles} paga {formatMoney(game.payRates.hazmat_doubles, game)}/{game.distanceUnit}.</p>
          <div className="qualification-meta"><span>Disponível</span><strong>Nível {dangerous.minimumLevel}+</strong><span>Custo</span><strong>{formatMoney(dangerous.feeAmount, game)}</strong></div>
          {qualified
            ? <div className="qualification-done">✓ {dangerous.name} ativo</div>
            : <button className="button success" disabled={!dangerous.ready || mutation} onClick={qualifyDangerousGoods}>{dangerous.ready ? `Obter qualificação ${dangerous.name}` : `Disponível no Nível ${dangerous.minimumLevel}`}</button>}
        </article>}

        {card(level3, level3Confirmed, setLevel3Confirmed)}
      </section>

      <section className="panel qualification-footer"><div><span className="metric-label line-label-with-tip">Saldo disponível <Tip text="As taxas são debitadas e registradas no ledger pelo backend no momento da promoção ou qualificação." /></span><strong>{formatMoney(progression?.balance || 0, game)}</strong></div><p>Metas, custos e qualificações concluídas são preservados server-side; histórico fechado não é recalculado com parâmetros atuais.</p></section>
    </>
  )
}
