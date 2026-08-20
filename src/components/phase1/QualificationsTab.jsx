import { useState } from 'react'
import { getPromotionStatus, totalMiles } from '../../lib/phase1.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useToast } from '../ToastProvider.jsx'

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function Tip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

function historyEntry(description, amount, balance) {
  return { date: new Date().toLocaleString('pt-BR'), desc: description, amount, balance }
}

export default function QualificationsTab({ state, commit }) {
  const toast = useToast()
  const confirm = useConfirm()
  const miles = totalMiles(state)
  const promotion = getPromotionStatus(state)
  const [academy2Confirmed, setAcademy2Confirmed] = useState(false)
  const [academy3Confirmed, setAcademy3Confirmed] = useState(false)

  async function promoteLevel2() {
    if (state.currentLevel !== 1 || miles < 10000 || !academy2Confirmed) return
    if (Number(state.balance || 0) < 300) {
      toast.error('Saldo insuficiente para pagar os US$ 300 da avaliação/Academy do Nível 2.')
      return
    }
    const confirmed = await confirm({
      title: 'Liberar o Nível 2?',
      message: 'US$ 300,00 serão descontados do saldo pela avaliação da Academy e o Nível 2 será liberado.',
      confirmLabel: 'Pagar e liberar',
      tone: 'success',
    })
    if (!confirmed) return
    const balance = Number(state.balance || 0) - 300
    commit({ ...state, balance, currentLevel: 2, careerLevel: 2, academy: { ...(state.academy || {}), level2: true }, history: [historyEntry('Promoção para Nível 2 — Academy / avaliação', -300, balance), ...(state.history || [])] })
    toast.success('Promoção concluída. Bem-vindo ao Nível 2 — Company Driver / OTR!', { title: 'Nível 2 liberado' })
  }

  async function qualifyHazmat() {
    if (state.currentLevel < 2 || state.hazmatQualified) return
    if (Number(state.balance || 0) < 144.25) {
      toast.error('Saldo insuficiente para pagar US$ 144,25 da qualificação HazMat.')
      return
    }
    const confirmed = await confirm({
      title: 'Obter qualificação HazMat?',
      message: 'US$ 144,25 serão descontados do saldo. As cargas HazMat e suas tarifas serão liberadas imediatamente.',
      confirmLabel: 'Pagar e qualificar',
      tone: 'success',
    })
    if (!confirmed) return
    const balance = Number(state.balance || 0) - 144.25
    commit({ ...state, balance, hazmatQualified: true, history: [historyEntry('Qualificação HazMat', -144.25, balance), ...(state.history || [])] })
    toast.success('Qualificação HazMat ativada. As categorias compatíveis já estão disponíveis.', { title: 'HazMat liberado' })
  }

  async function promoteLevel3() {
    if (state.currentLevel !== 2 || miles < 50000 || !academy3Confirmed) return
    if (Number(state.balance || 0) < 59) {
      toast.error('Saldo insuficiente para pagar os US$ 59 do Double Trailer Handling.')
      return
    }
    const confirmed = await confirm({
      title: 'Liberar o Nível 3?',
      message: 'US$ 59,00 serão descontados do saldo pelo Double Trailer Handling e o Nível 3 será liberado.',
      confirmLabel: 'Pagar e liberar',
      tone: 'success',
    })
    if (!confirmed) return
    const balance = Number(state.balance || 0) - 59
    commit({ ...state, balance, currentLevel: 3, careerLevel: 3, academy: { ...(state.academy || {}), level2: true, level3: true }, history: [historyEntry('Promoção para Nível 3 — Double Trailer Handling', -59, balance), ...(state.history || [])] })
    toast.success('Promoção concluída. Nível 3 — Experienced Driver / Doubles liberado!', { title: 'Nível 3 liberado' })
  }

  const level2Ready = state.currentLevel === 1 && miles >= 10000
  const level3Ready = state.currentLevel === 2 && miles >= 50000

  return (
    <>
      <section className="phase1-status-grid qualification-summary">
        <article className="panel status-card static-card"><span className="metric-label line-label-with-tip">Nível atual <Tip text="Determina quais tipos de operação, categorias de pagamento e qualificações estão disponíveis." /></span><strong>Nível {state.currentLevel}</strong><span>{state.currentLevel === 1 ? 'Trainee / Local Driver' : state.currentLevel === 2 ? 'Company Driver / OTR' : 'Experienced Driver / Doubles'}</span></article>
        <article className="panel status-card static-card"><span className="metric-label line-label-with-tip">Milhas da carreira <Tip text="Loaded e Deadhead contam para as metas de promoção. O total é acumulado durante toda a carreira." /></span><strong>{miles.toLocaleString('en-US')} mi</strong><span>{state.currentLevel >= 3 ? 'Nível máximo da Fase 1 alcançado.' : promotion.remaining ? `${promotion.remaining.toLocaleString('en-US')} mi para a próxima promoção.` : 'Meta de milhas concluída.'}</span></article>
      </section>

      <section className="qualification-grid" data-tour="qualifications">
        <article className={`panel qualification-card ${state.currentLevel >= 2 ? 'completed' : level2Ready ? 'ready' : ''}`}>
          <span className="eyebrow">Nível 1 → Nível 2</span><h2 className="line-label-with-tip">Truck Driving Proficiency <Tip text="Promoção para OTR. Exige 10.000 milhas totais, confirmação do treinamento no ATS Driving Academy e pagamento pessoal de US$ 300." /></h2><p>Exige 10.000 milhas totais, conclusão do Truck Driving Proficiency no Driving Academy e pagamento de US$ 300.</p>
          <div className="qualification-meta"><span>Meta</span><strong>10.000 mi</strong><span>Custo</span><strong>US$ 300,00</strong></div>
          {state.currentLevel >= 2 ? <div className="qualification-done">✓ Nível 2 concluído</div> : <><label className={`academy-check ${!level2Ready ? 'disabled-check' : ''}`}><input type="checkbox" disabled={!level2Ready} checked={academy2Confirmed} onChange={(e) => setAcademy2Confirmed(e.target.checked)} /> Concluí o Truck Driving Proficiency / Driving Academy</label><button className="button primary" disabled={!level2Ready || !academy2Confirmed} onClick={promoteLevel2}>{!level2Ready ? `${Math.max(0, 10000 - miles).toLocaleString('en-US')} mi restantes` : academy2Confirmed ? 'Pagar US$ 300 e liberar Nível 2' : 'Confirme o Academy acima'}</button></>}
        </article>

        <article className={`panel qualification-card ${state.hazmatQualified ? 'completed' : state.currentLevel >= 2 ? 'ready' : ''}`}>
          <span className="eyebrow">Qualificação opcional</span><h2 className="line-label-with-tip">HazMat <Tip text="Qualificação opcional a partir do Nível 2. Libera cargas perigosas e uma tarifa maior por milha quando a viagem for HazMat." /></h2><p>Disponível a partir do Nível 2. Libera cargas HazMat e US$ 0,63/mi; no Nível 3 também permite HazMat + Doubles a US$ 0,67/mi.</p>
          <div className="qualification-meta"><span>Disponível</span><strong>Nível 2+</strong><span>Custo</span><strong>US$ 144,25</strong></div>
          {state.hazmatQualified ? <div className="qualification-done">✓ HazMat ativo</div> : <button className="button success" disabled={state.currentLevel < 2} onClick={qualifyHazmat}>{state.currentLevel < 2 ? 'Disponível no Nível 2' : 'Obter qualificação HazMat'}</button>}
        </article>

        <article className={`panel qualification-card ${state.currentLevel >= 3 ? 'completed' : level3Ready ? 'ready' : ''}`}>
          <span className="eyebrow">Nível 2 → Nível 3</span><h2 className="line-label-with-tip">Double Trailer Handling <Tip text="Promoção final da Fase 1. Exige 50.000 milhas totais, confirmação do módulo Double Trailer Handling no Driving Academy e pagamento pessoal de US$ 59." /></h2><p>Exige 50.000 milhas totais, conclusão do Double Trailer Handling no Driving Academy e pagamento de US$ 59.</p>
          <div className="qualification-meta"><span>Meta</span><strong>50.000 mi</strong><span>Custo</span><strong>US$ 59,00</strong></div>
          {state.currentLevel >= 3 ? <div className="qualification-done">✓ Nível 3 concluído</div> : <><label className={`academy-check ${!level3Ready ? 'disabled-check' : ''}`}><input type="checkbox" disabled={!level3Ready} checked={academy3Confirmed} onChange={(e) => setAcademy3Confirmed(e.target.checked)} /> Concluí o Double Trailer Handling</label><button className="button primary" disabled={!level3Ready || !academy3Confirmed} onClick={promoteLevel3}>{state.currentLevel < 2 ? 'Primeiro conclua o Nível 2' : !level3Ready ? `${Math.max(0, 50000 - miles).toLocaleString('en-US')} mi restantes` : academy3Confirmed ? 'Pagar US$ 59 e liberar Nível 3' : 'Confirme o treinamento acima'}</button></>}
        </article>
      </section>

      <section className="panel qualification-footer"><div><span className="metric-label line-label-with-tip">Saldo disponível <Tip text="As taxas de treinamento e qualificação são pagas com o dinheiro pessoal da carreira." /></span><strong>{money(state.balance)}</strong></div><p>Os custos de promoção e qualificação são despesas pessoais da carreira e entram automaticamente no Histórico.</p></section>
    </>
  )
}
