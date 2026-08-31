import { useEffect, useMemo, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { payrollApi } from '../../lib/payrollApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

function money(value, currency) {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    return `${currency || ''} ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`.trim()
  }
}

function distance(value, game) {
  const amount = Number(value || 0)
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0)} ${game.distanceUnit}`
}

function auditTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function payslipPeriodLabel(payslip, game) {
  if (game.id === 'ets2') return `Mês ${payslip.payrollMonth || '—'}`
  return `Semana ${payslip.operationalWeek || payslip.endOperationalWeek || '—'}`
}

function mutationErrorMessage(error, fallback) {
  return error?.message || fallback
}

function samePayslipPeriod(payslip, gameId, expectedWeek, expectedMonth) {
  if (String(gameId).toLowerCase() === 'ets2') {
    return Number(payslip?.payrollMonth) === Number(expectedMonth)
  }
  return Number(payslip?.operationalWeek ?? payslip?.endOperationalWeek) === Number(expectedWeek)
}

export default function ServerPayslipTab({ career }) {
  const game = useGame()
  const confirm = useConfirm()
  const toast = useToast()
  const [periods, setPeriods] = useState([])
  const [payslips, setPayslips] = useState([])
  const [settings, setSettings] = useState(null)
  const [settingsForm, setSettingsForm] = useState(null)
  const [preview, setPreview] = useState(null)
  const [selectedPayslipId, setSelectedPayslipId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [mutation, setMutation] = useState(null)
  const [needsResync, setNeedsResync] = useState(false)

  const currentWeek = Math.max(1, Number(career?.currentOperationalWeek || 1))
  const currentMonth = Math.max(1, Number(career?.currentPayrollMonth || 1))
  const currentMonthPeriods = useMemo(
    () => periods.filter((period) => Number(period.payrollMonth) === currentMonth),
    [currentMonth, periods],
  )
  const selectedPayslip = useMemo(
    () => payslips.find((payslip) => String(payslip.id) === String(selectedPayslipId)) || payslips[0] || null,
    [payslips, selectedPayslipId],
  )
  const canCloseEts2Week = game.id === 'ets2' && currentMonthPeriods.length < game.maxWeeksPerPayroll
  const canGenerate = game.id === 'ats'
    ? true
    : currentMonthPeriods.length >= game.minWeeksPerPayroll && currentMonthPeriods.length <= game.maxWeeksPerPayroll

  function applySettings(nextSettings) {
    setSettings(nextSettings)
    setSettingsForm(nextSettings ? {
      level1Gross: String(nextSettings.level1Gross ?? ''),
      routeOverrunRate: String(nextSettings.routeOverrunRate ?? ''),
      benefits: String(nextSettings.benefits ?? ''),
      perDiemRate: String(nextSettings.perDiemRate ?? ''),
    } : null)
  }

  function notifyCareerUpdated() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
        detail: { careerId: career.id, gameId: game.id, source: 'server-payroll' },
      }))
    }
  }

  async function refreshCareer() {
    const response = await careerApi.get(game.id, career.serverCareerId)
    setServerCareerSnapshot(game.id, career.id, response)
    notifyCareerUpdated()
    return response
  }

  async function loadPayrollData({ quiet = false } = {}) {
    if (!quiet) setLoading(true)
    setLoadError(null)
    try {
      const [nextPeriods, nextPayslips] = await Promise.all([
        payrollApi.listPeriods(game.id, career.serverCareerId),
        payrollApi.listPayslips(game.id, career.serverCareerId),
      ])
      setPeriods(Array.isArray(nextPeriods) ? nextPeriods : [])
      setPayslips(Array.isArray(nextPayslips) ? nextPayslips : [])
      setSelectedPayslipId((current) => current || nextPayslips?.[0]?.id || null)
      setNeedsResync(false)
      return { periods: nextPeriods || [], payslips: nextPayslips || [] }
    } catch (error) {
      setLoadError(error)
      throw error
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([
      payrollApi.listPeriods(game.id, career.serverCareerId),
      payrollApi.listPayslips(game.id, career.serverCareerId),
      payrollApi.getSettings(game.id, career.serverCareerId),
      payrollApi.getPreview(game.id, career.serverCareerId),
    ]).then(([nextPeriods, nextPayslips, nextSettings, nextPreview]) => {
      if (cancelled) return
      const safePeriods = Array.isArray(nextPeriods) ? nextPeriods : []
      const safePayslips = Array.isArray(nextPayslips) ? nextPayslips : []
      setPeriods(safePeriods)
      setPayslips(safePayslips)
      setSelectedPayslipId(safePayslips[0]?.id || null)
      applySettings(nextSettings)
      setPreview(nextPreview)
      setNeedsResync(false)
    }).catch((error) => {
      if (!cancelled) setLoadError(error)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [career.serverCareerId, game.id])

  async function refreshPreferencesAndPreview() {
    const [nextSettings, nextPreview] = await Promise.all([
      payrollApi.getSettings(game.id, career.serverCareerId),
      payrollApi.getPreview(game.id, career.serverCareerId),
    ])
    applySettings(nextSettings)
    setPreview(nextPreview)
  }

  async function bestEffortRefreshAfterConfirmedMutation() {
    let refreshFailed = false
    try {
      await refreshCareer()
    } catch {
      refreshFailed = true
    }
    try {
      await loadPayrollData({ quiet: true })
    } catch {
      refreshFailed = true
    }
    try {
      await refreshPreferencesAndPreview()
    } catch {
      refreshFailed = true
    }
    setNeedsResync(refreshFailed)
    return !refreshFailed
  }

  async function reconcileClosedWeek(expectedWeek) {
    try {
      const nextPeriods = await payrollApi.listPeriods(game.id, career.serverCareerId)
      const safePeriods = Array.isArray(nextPeriods) ? nextPeriods : []
      setPeriods(safePeriods)
      const match = safePeriods.find((period) => Number(period.operationalWeek) === Number(expectedWeek))
      if (!match) return null
      try { await refreshCareer() } catch { setNeedsResync(true) }
      return match
    } catch {
      return null
    }
  }

  async function reconcilePayslip(expectedWeek, expectedMonth) {
    try {
      const nextPayslips = await payrollApi.listPayslips(game.id, career.serverCareerId)
      const safePayslips = Array.isArray(nextPayslips) ? nextPayslips : []
      setPayslips(safePayslips)
      const match = safePayslips.find((payslip) => samePayslipPeriod(
        payslip,
        game.id,
        expectedWeek,
        expectedMonth,
      ))
      if (!match) return null
      setSelectedPayslipId(match.id)
      try { await refreshCareer() } catch { setNeedsResync(true) }
      return match
    } catch {
      return null
    }
  }

  async function closeOperationalWeek() {
    if (mutation || needsResync || game.id !== 'ets2') return
    if (!canCloseEts2Week) {
      toast.error(`O Mês ${currentMonth} já possui ${game.maxWeeksPerPayroll} semanas. Gere o holerite mensal antes de continuar.`)
      return
    }

    const expectedWeek = currentWeek
    const confirmed = await confirm({
      title: `Encerrar a Semana ${expectedWeek}?`,
      message: `O servidor congelará a Semana ${expectedWeek}, salvará o snapshot do contexto e avançará atomicamente para a Semana ${expectedWeek + 1}. Nenhum salário será depositado agora.`,
      confirmLabel: 'Encerrar semana no servidor',
      tone: 'success',
    })
    if (!confirmed) return

    setMutation('close')
    try {
      const created = await payrollApi.closeOperationalWeek(game.id, career.serverCareerId, expectedWeek)
      setPeriods((current) => [
        ...current.filter((period) => String(period.id) !== String(created.id)),
        created,
      ].sort((a, b) => Number(a.operationalWeek) - Number(b.operationalWeek)))
      const fullyRefreshed = await bestEffortRefreshAfterConfirmedMutation()
      toast.success(
        fullyRefreshed
          ? `Semana ${expectedWeek} encerrada e confirmada pelo servidor.`
          : `Semana ${expectedWeek} foi encerrada pelo servidor, mas a tela não conseguiu recarregar todo o estado. Sincronize antes de continuar.`,
        { title: 'Semana operacional concluída' },
      )
    } catch (error) {
      const reconciled = await reconcileClosedWeek(expectedWeek)
      if (reconciled) {
        toast.success(`O servidor já possui o fechamento da Semana ${expectedWeek}. O estado foi reconciliado sem criar duplicidade.`, {
          title: 'Fechamento confirmado',
        })
      } else {
        setNeedsResync(true)
        toast.error(
          `${mutationErrorMessage(error, 'Não foi possível encerrar a semana no servidor.')} Nenhuma alteração será assumida nesta tela até uma nova sincronização.`,
          { title: 'Semana não confirmada' },
        )
      }
    } finally {
      setMutation(null)
    }
  }

  async function generatePayslip() {
    if (mutation || needsResync) return
    if (!canGenerate) {
      toast.error(`Encerre pelo menos ${game.minWeeksPerPayroll} semanas do Mês ${currentMonth} antes de gerar o holerite.`)
      return
    }

    const expectedWeek = currentWeek
    const expectedMonth = currentMonth
    const title = game.id === 'ets2' ? `Gerar o holerite do Mês ${expectedMonth}?` : `Fechar a Semana ${expectedWeek}?`
    const message = game.id === 'ets2'
      ? `O backend calculará e persistirá o holerite do Mês ${expectedMonth} usando somente os snapshots e dados server-side das ${currentMonthPeriods.length} semanas encerradas. O navegador não enviará valores de salário, impostos ou depósito.`
      : `O backend calculará, persistirá e depositará o holerite da Semana ${expectedWeek} em uma única transação. O navegador não enviará valores de salário, impostos ou depósito.`
    const confirmed = await confirm({
      title,
      message,
      confirmLabel: 'Gerar holerite no servidor',
      tone: 'success',
    })
    if (!confirmed) return

    setMutation('generate')
    try {
      const created = await payrollApi.generatePayslip(game.id, career.serverCareerId, {
        expectedOperationalWeek: expectedWeek,
        expectedPayrollMonth: expectedMonth,
      })
      setPayslips((current) => [created, ...current.filter((payslip) => String(payslip.id) !== String(created.id))])
      setSelectedPayslipId(created.id)
      const fullyRefreshed = await bestEffortRefreshAfterConfirmedMutation()
      toast.success(
        fullyRefreshed
          ? `${payslipPeriodLabel(created, game)} confirmado pelo servidor. Crédito no saldo: ${money(created.balanceCreditAmount, created.displayCurrency)}.`
          : `${payslipPeriodLabel(created, game)} foi confirmado pelo servidor, mas a tela não conseguiu recarregar todo o estado. Sincronize antes de continuar.`,
        { title: 'Holerite gerado' },
      )
    } catch (error) {
      const reconciled = await reconcilePayslip(expectedWeek, expectedMonth)
      if (reconciled) {
        toast.success(
          `${payslipPeriodLabel(reconciled, game)} já existe no servidor e foi reconciliado. Nenhum segundo holerite foi criado.`,
          { title: 'Holerite confirmado' },
        )
      } else {
        setNeedsResync(true)
        toast.error(
          `${mutationErrorMessage(error, 'Não foi possível gerar o holerite no servidor.')} Nenhum depósito será assumido nesta tela até uma nova sincronização.`,
          { title: 'Holerite não confirmado' },
        )
      }
    } finally {
      setMutation(null)
    }
  }

  async function saveSettings(event) {
    event.preventDefault()
    if (mutation || needsResync || !settings?.editable || !settingsForm) return
    setMutation('settings')
    try {
      const updated = await payrollApi.updateSettings(game.id, career.serverCareerId, {
        expectedOperationalWeek: currentWeek,
        expectedPayrollMonth: game.id === 'ets2' ? currentMonth : null,
        level1Gross: Number(settingsForm.level1Gross),
        routeOverrunRate: Number(settingsForm.routeOverrunRate),
        benefits: Number(settingsForm.benefits),
        perDiemRate: Number(settingsForm.perDiemRate),
      })
      applySettings(updated)
      setPreview(await payrollApi.getPreview(game.id, career.serverCareerId))
      toast.success('Ajustes do próximo holerite salvos no servidor.')
    } catch (error) {
      toast.error(mutationErrorMessage(error, 'Não foi possível salvar os ajustes da folha.'), {
        title: 'Ajustes não salvos',
      })
    } finally {
      setMutation(null)
    }
  }

  async function retrySync() {
    if (mutation) return
    setMutation('sync')
    try {
      await Promise.all([loadPayrollData({ quiet: true }), refreshCareer(), refreshPreferencesAndPreview()])
      setNeedsResync(false)
      toast.success('Períodos e holerites foram sincronizados novamente com o servidor.')
    } catch (error) {
      setNeedsResync(true)
      toast.error(mutationErrorMessage(error, 'Não foi possível sincronizar a folha agora.'), {
        title: 'Sincronização não concluída',
      })
    } finally {
      setMutation(null)
    }
  }

  if (loading) {
    return <section className="panel"><div className="empty-inline">Carregando períodos e holerites do servidor…</div></section>
  }

  if (loadError && periods.length === 0 && payslips.length === 0) {
    return (
      <section className="panel">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Folha server-side</span>
          <h2>Não foi possível carregar a folha</h2>
          <p>Para proteger a carreira, o histórico local não será usado como substituto dos holerites persistidos no servidor.</p>
        </div>
        <button className="button primary compact" type="button" disabled={mutation === 'sync'} onClick={retrySync}>
          {mutation === 'sync' ? 'Sincronizando…' : 'Tentar sincronizar novamente'}
        </button>
      </section>
    )
  }

  return (
    <div className="payslip-layout">
      <section className="panel payslip-form-card" data-tour="payslip-form">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Folha server-side</span>
          <h2>{game.id === 'ets2' ? `Mês operacional ${currentMonth}` : `Semana operacional ${currentWeek}`}</h2>
          <p>Os valores críticos são calculados pelo backend a partir de viagens, snapshots, políticas e registros persistidos. O navegador envia somente a pré-condição do período esperado.</p>
        </div>

        {needsResync && (
          <div className="notice-box" role="alert">
            <strong>Confirmação pendente de sincronização</strong>
            <span>Uma resposta ficou incerta ou o recarregamento falhou. Nenhum novo fechamento será enviado até a tela confirmar o estado atual do servidor.</span>
            <button className="button secondary compact" type="button" disabled={mutation === 'sync'} onClick={retrySync}>
              {mutation === 'sync' ? 'Sincronizando…' : 'Sincronizar antes de continuar'}
            </button>
          </div>
        )}

        {game.id === 'ets2' && (
          <div className="payroll-period-card" data-tour="payroll-period">
            <div>
              <span>Semanas encerradas no Mês {currentMonth}</span>
              <strong>{currentMonthPeriods.length} / {game.minWeeksPerPayroll} mínimas</strong>
              <small>
                {currentMonthPeriods.length
                  ? `Semanas server-side: ${currentMonthPeriods.map((period) => period.operationalWeek).join(', ')}.`
                  : 'Nenhuma semana encerrada neste mês operacional.'}
                {' '}Limite: {game.maxWeeksPerPayroll}.
              </small>
            </div>
            <button className="button secondary compact" type="button" disabled={!canCloseEts2Week || Boolean(mutation) || needsResync} onClick={closeOperationalWeek}>
              {mutation === 'close' ? 'Encerrando no servidor…' : canCloseEts2Week ? `Encerrar Semana ${currentWeek}` : 'Gere o holerite para continuar'}
            </button>
          </div>
        )}

        {settingsForm && (
          <form className="server-payroll-settings" onSubmit={saveSettings}>
            <div className="section-heading compact-heading">
              <span className="eyebrow">Ajustes persistidos</span>
              <h2>Parâmetros do próximo holerite</h2>
              <p>Estes valores ficam salvos no backend e alimentam a prévia. O POST final continua enviando somente o período esperado.</p>
            </div>
            <div className="inline-form-grid">
              <label>Salário N1<input aria-label="Salário N1" type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.level1Gross} onChange={(event) => setSettingsForm((current) => ({ ...current, level1Gross: event.target.value }))} /></label>
              <label>Route Overrun / hora<input aria-label="Route Overrun por hora" type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.routeOverrunRate} onChange={(event) => setSettingsForm((current) => ({ ...current, routeOverrunRate: event.target.value }))} /></label>
              <label>Benefícios<input aria-label="Benefícios" type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.benefits} onChange={(event) => setSettingsForm((current) => ({ ...current, benefits: event.target.value }))} /></label>
              <label>{game.perDiemLabel}<input aria-label={game.perDiemLabel} type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.perDiemRate} onChange={(event) => setSettingsForm((current) => ({ ...current, perDiemRate: event.target.value }))} /></label>
            </div>
            <button className="button secondary full-button" type="submit" disabled={!settings.editable || Boolean(mutation) || needsResync}>
              {mutation === 'settings' ? 'Salvando ajustes no servidor…' : 'Salvar ajustes no servidor'}
            </button>
            {!settings.editable && <small className="payroll-blocked-note">Este período já possui fechamento e seus parâmetros estão protegidos pelo backend.</small>}
          </form>
        )}

        <div className="notice-box">
          <strong>Sem cálculo financeiro no navegador</strong>
          <span>Salário, tarifas, impostos, benefícios, per diem, Route Overrun, ocorrências, reserva e depósito não são enviados como valores autoritativos pelo browser. O resultado exibido após o fechamento é exatamente o que o backend persistiu.</span>
        </div>

        <button className="button success full-button" type="button" disabled={!canGenerate || Boolean(mutation) || needsResync} onClick={generatePayslip}>
          {mutation === 'generate'
            ? 'Aguardando confirmação do servidor…'
            : game.id === 'ets2'
              ? 'Gerar holerite mensal no servidor'
              : `Gerar holerite da Semana ${currentWeek} no servidor`}
        </button>
        {game.id === 'ets2' && !canGenerate && !needsResync && (
          <small className="payroll-blocked-note">Encerre mais {Math.max(0, game.minWeeksPerPayroll - currentMonthPeriods.length)} semana(s) no servidor para liberar o holerite mensal.</small>
        )}
      </section>

      <section className="panel payslip-preview-card" data-tour="payslip-preview">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Prévia server-side</span>
          <h2>{preview?.ready ? (game.id === 'ets2' ? `Mês ${preview.payrollMonth}` : `Semana ${preview.operationalWeek}`) : 'Próximo holerite'}</h2>
          <p>{preview?.ready ? 'Cálculo atual retornado pelo backend; o histórico fechado permanece imutável.' : 'O backend ainda não possui semanas suficientes para calcular este fechamento.'}</p>
        </div>
        {preview?.ready && (
          <div className="payslip-lines">
            <div><span>Salário bruto</span><strong>{money(preview.grossAmount, preview.displayCurrency)}</strong></div>
            <div><span>Impostos</span><strong>-{money(preview.taxAmount, preview.displayCurrency)}</strong></div>
            <div><span>Benefícios</span><strong>-{money(preview.benefitsAmount, preview.displayCurrency)}</strong></div>
            <div><span>{game.perDiemLabel}</span><strong>+{money(preview.perDiemAmount, preview.displayCurrency)}</strong></div>
            <div><span>Ocorrências</span><strong>-{money(preview.incidentDeductionAmount, preview.displayCurrency)}</strong></div>
            <div className="deposit-line"><span>Depósito previsto</span><strong>{money(preview.depositAmount, preview.displayCurrency)}</strong></div>
          </div>
        )}
      </section>

      {selectedPayslip && Array.isArray(selectedPayslip.lines) && selectedPayslip.lines.length > 0 && (
        <section className="panel closed-weeks-card">
          <div className="section-heading compact-heading"><span className="eyebrow">Composição persistida</span><h2>Linhas do holerite</h2></div>
          <div className="responsive-table compact-table"><table>
            <thead><tr><th>#</th><th>Descrição</th><th>Tipo</th><th>Quantidade</th><th>Tarifa</th><th>Valor</th></tr></thead>
            <tbody>{selectedPayslip.lines.map((line) => (
              <tr key={line.id || `${line.order}-${line.code}`}>
                <td>{line.order}</td>
                <td><strong>{line.label || line.code}</strong></td>
                <td>{line.type}</td>
                <td>{line.quantity == null ? '—' : String(line.quantity)}</td>
                <td>{line.rate == null ? '—' : money(line.rate, selectedPayslip.displayCurrency)}</td>
                <td>{money(line.amount, selectedPayslip.displayCurrency)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}

      <section className="panel closed-weeks-card" data-tour="closed-weeks">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico server-side</span><h2>{game.id === 'ets2' ? 'Meses pagos' : 'Semanas pagas'}</h2></div>
        {payslips.length === 0 ? <div className="empty-inline">Nenhum holerite persistido no servidor.</div> : (
          <div className="responsive-table compact-table"><table>
            <thead><tr><th>Período</th><th>Semanas</th><th>Nível</th><th>{game.distanceName}</th><th>Bruto</th><th>Ocorrências</th><th>Crédito no saldo</th><th>Auditoria</th><th></th></tr></thead>
            <tbody>{payslips.map((payslip) => (
              <tr key={payslip.id}>
                <td>{payslipPeriodLabel(payslip, game)}</td>
                <td>{payslip.startOperationalWeek === payslip.endOperationalWeek ? payslip.endOperationalWeek : `${payslip.startOperationalWeek}–${payslip.endOperationalWeek}`}</td>
                <td>{payslip.level}</td>
                <td>{distance(payslip.totalDistance, game)}</td>
                <td>{money(payslip.grossAmount, payslip.displayCurrency)}</td>
                <td>{money(payslip.incidentDeductionAmount, payslip.displayCurrency)}</td>
                <td><strong>{money(payslip.balanceCreditAmount, payslip.displayCurrency)}</strong></td>
                <td>{auditTime(payslip.generatedAt)}</td>
                <td><button className="button secondary compact" type="button" onClick={() => setSelectedPayslipId(payslip.id)}>Ver linhas</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  )
}
