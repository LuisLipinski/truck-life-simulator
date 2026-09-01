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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    return `${currency || ''} ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`.trim()
  }
}

function distance(value, game) {
  const amount = Number(value || 0)
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0)} ${game.distanceUnit}`
}

function formatHoursFromMinutes(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)))
  const hours = Math.floor(safeMinutes / 60)
  const remaining = safeMinutes % 60
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`
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

function mutationErrorMessage(error, fallback) { return error?.message || fallback }

function samePayslipPeriod(payslip, gameId, expectedWeek, expectedMonth) {
  if (String(gameId).toLowerCase() === 'ets2') return Number(payslip?.payrollMonth) === Number(expectedMonth)
  return Number(payslip?.operationalWeek ?? payslip?.endOperationalWeek) === Number(expectedWeek)
}

function InfoTip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}
function TipLabel({ children, tip }) { return <label className="label-with-tip"><span>{children}</span><InfoTip text={tip} /></label> }
function LineLabel({ children, tip }) { return <span className="line-label-with-tip"><span>{children}</span><InfoTip text={tip} /></span> }
function previewLine(preview, code) { return Array.isArray(preview?.lines) ? preview.lines.find((line) => line.code === code) : null }
function taxLines(preview) {
  if (!Array.isArray(preview?.lines)) return []
  return preview.lines.filter((line) => line.type === 'DEDUCTION' && line.code !== 'BENEFITS' && line.code !== 'INCIDENT_DEDUCTION')
}
function displayTaxLabel(line, game) {
  if (line.code === 'STATE_INCOME_TAX' && game.stateName) return `${game.stateName} Income Tax`
  if (line.code === 'STATE_PAYROLL_TAX') return String(game.stateCode || '').toUpperCase() === 'CA' ? 'California SDI' : `${game.stateName || 'State'} payroll contribution`
  return line.label || line.code
}
function periodTitle(game, week, month) { return game.id === 'ets2' ? `Mês ${month}` : `Semana ${week}` }
function introText(game) {
  return game.id === 'ets2'
    ? 'O fechamento mensal reúne as semanas operacionais encerradas, credita o depósito, atualiza a reserva e mantém o histórico no servidor.'
    : 'O fechamento credita o depósito, atualiza a reserva em segundo plano, congela a semana no histórico e inicia a próxima.'
}
function payrollLocation(preview, game) {
  const snapshot = preview?.contextSnapshot || {}
  const currency = preview?.displayCurrency || game.currency || (game.id === 'ats' ? 'USD' : 'EUR')
  if (game.id === 'ats') {
    const stateCode = snapshot.stateCode || game.stateCode || ''
    const stateName = game.stateName || stateCode || 'estado atual'
    return {
      flag: game.countryFlag || '🇺🇸',
      title: `Folha de ${stateName}${stateCode ? ` (${stateCode})` : ''} em ${currency} • ${snapshot.baseCity || game.city || 'cidade de referência'}`,
      detail: `${game.taxAssumptions || 'Impostos e contribuições são estimados conforme a política vigente da carreira.'}${snapshot.cityMarketLabel ? ` Os salários usam o perfil municipal “${snapshot.cityMarketLabel}”.` : ''} Os cálculos exibidos são retornados pelo backend.`,
    }
  }
  return {
    flag: game.countryFlag || '🇪🇺',
    title: `Folha de ${game.countryName || snapshot.countryCode || 'país atual'} em ${currency} • ${snapshot.baseCity || game.city || 'cidade de referência'}`,
    detail: `${game.taxAssumptions || 'Impostos e contribuições são estimados conforme a política vigente da carreira.'}${snapshot.cityMarketLabel ? ` Os salários usam o perfil municipal “${snapshot.cityMarketLabel}”.` : ''} Os cálculos exibidos são retornados pelo backend.`,
  }
}

export default function ServerPayslipTab({ career }) {
  const game = useGame()
  const confirm = useConfirm()
  const toast = useToast()
  const [periods, setPeriods] = useState([])
  const [payslips, setPayslips] = useState([])
  const [settings, setSettings] = useState(null)
  const [settingsForm, setSettingsForm] = useState(null)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [preview, setPreview] = useState(null)
  const [selectedPayslipId, setSelectedPayslipId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [mutation, setMutation] = useState(null)
  const [needsResync, setNeedsResync] = useState(false)

  const currentWeek = Math.max(1, Number(career?.currentOperationalWeek || 1))
  const currentMonth = Math.max(1, Number(career?.currentPayrollMonth || 1))
  const currentMonthPeriods = useMemo(() => periods.filter((period) => Number(period.payrollMonth) === currentMonth), [currentMonth, periods])
  const selectedPayslip = useMemo(() => payslips.find((payslip) => String(payslip.id) === String(selectedPayslipId)) || payslips[0] || null, [payslips, selectedPayslipId])
  const canCloseEts2Week = game.id === 'ets2' && currentMonthPeriods.length < game.maxWeeksPerPayroll
  const canGenerate = game.id === 'ats' ? true : currentMonthPeriods.length >= game.minWeeksPerPayroll && currentMonthPeriods.length <= game.maxWeeksPerPayroll
  const title = periodTitle(game, currentWeek, currentMonth)
  const currentLevel = Number(settings?.currentLevel || preview?.level || career?.currentLevel || 1)
  const currency = preview?.displayCurrency || settings?.displayCurrency || game.currency || 'USD'
  const location = payrollLocation(preview, game)
  const sourceLinks = [...(game.financeSources || []), ...(game.cityMarketSources || [])]
  const overrunLine = previewLine(preview, 'ROUTE_OVERRUN')
  const previewTaxes = taxLines(preview)
  const overrunRate = Number(overrunLine?.rate ?? settings?.routeOverrunRate ?? 0)
  const overrunPay = Number(overrunLine?.amount ?? 0)

  function applySettings(nextSettings) {
    setSettings(nextSettings)
    setSettingsForm(nextSettings ? {
      level1Gross: String(nextSettings.level1Gross ?? ''), routeOverrunRate: String(nextSettings.routeOverrunRate ?? ''),
      benefits: String(nextSettings.benefits ?? ''), perDiemRate: String(nextSettings.perDiemRate ?? ''),
    } : null)
    setSettingsDirty(false)
  }
  function updateSetting(field, value) {
    setSettingsForm((current) => ({ ...current, [field]: value }))
    setSettingsDirty(true)
  }
  function notifyCareerUpdated() {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, { detail: { careerId: career.id, gameId: game.id, source: 'server-payroll' } }))
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
      const [nextPeriods, nextPayslips] = await Promise.all([payrollApi.listPeriods(game.id, career.serverCareerId), payrollApi.listPayslips(game.id, career.serverCareerId)])
      setPeriods(Array.isArray(nextPeriods) ? nextPeriods : [])
      setPayslips(Array.isArray(nextPayslips) ? nextPayslips : [])
      setSelectedPayslipId((current) => current || nextPayslips?.[0]?.id || null)
      setNeedsResync(false)
      return { periods: nextPeriods || [], payslips: nextPayslips || [] }
    } catch (error) {
      setLoadError(error)
      throw error
    } finally { if (!quiet) setLoading(false) }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([
      payrollApi.listPeriods(game.id, career.serverCareerId), payrollApi.listPayslips(game.id, career.serverCareerId),
      payrollApi.getSettings(game.id, career.serverCareerId), payrollApi.getPreview(game.id, career.serverCareerId),
    ]).then(([nextPeriods, nextPayslips, nextSettings, nextPreview]) => {
      if (cancelled) return
      const safePeriods = Array.isArray(nextPeriods) ? nextPeriods : []
      const safePayslips = Array.isArray(nextPayslips) ? nextPayslips : []
      setPeriods(safePeriods); setPayslips(safePayslips); setSelectedPayslipId(safePayslips[0]?.id || null)
      applySettings(nextSettings); setPreview(nextPreview); setNeedsResync(false)
    }).catch((error) => { if (!cancelled) setLoadError(error) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [career.serverCareerId, game.id])

  async function refreshPreferencesAndPreview() {
    const [nextSettings, nextPreview] = await Promise.all([payrollApi.getSettings(game.id, career.serverCareerId), payrollApi.getPreview(game.id, career.serverCareerId)])
    applySettings(nextSettings); setPreview(nextPreview)
  }
  async function bestEffortRefreshAfterConfirmedMutation() {
    let refreshFailed = false
    try { await refreshCareer() } catch { refreshFailed = true }
    try { await loadPayrollData({ quiet: true }) } catch { refreshFailed = true }
    try { await refreshPreferencesAndPreview() } catch { refreshFailed = true }
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
    } catch { return null }
  }
  async function reconcilePayslip(expectedWeek, expectedMonth) {
    try {
      const nextPayslips = await payrollApi.listPayslips(game.id, career.serverCareerId)
      const safePayslips = Array.isArray(nextPayslips) ? nextPayslips : []
      setPayslips(safePayslips)
      const match = safePayslips.find((payslip) => samePayslipPeriod(payslip, game.id, expectedWeek, expectedMonth))
      if (!match) return null
      setSelectedPayslipId(match.id)
      try { await refreshCareer() } catch { setNeedsResync(true) }
      return match
    } catch { return null }
  }

  async function closeOperationalWeek() {
    if (mutation || needsResync || game.id !== 'ets2') return
    if (!canCloseEts2Week) { toast.error(`O Mês ${currentMonth} já possui ${game.maxWeeksPerPayroll} semanas. Gere o holerite mensal antes de continuar.`); return }
    const expectedWeek = currentWeek
    const confirmed = await confirm({ title: `Encerrar a Semana ${expectedWeek}?`, message: `O servidor congelará a Semana ${expectedWeek}, salvará o snapshot do contexto e avançará atomicamente para a Semana ${expectedWeek + 1}. Nenhum salário será depositado agora.`, confirmLabel: 'Encerrar semana', tone: 'success' })
    if (!confirmed) return
    setMutation('close')
    try {
      const created = await payrollApi.closeOperationalWeek(game.id, career.serverCareerId, expectedWeek)
      setPeriods((current) => [...current.filter((period) => String(period.id) !== String(created.id)), created].sort((a, b) => Number(a.operationalWeek) - Number(b.operationalWeek)))
      const fullyRefreshed = await bestEffortRefreshAfterConfirmedMutation()
      toast.success(fullyRefreshed ? `Semana ${expectedWeek} encerrada e confirmada pelo servidor.` : `Semana ${expectedWeek} foi encerrada pelo servidor, mas a tela não conseguiu recarregar todo o estado. Sincronize antes de continuar.`, { title: 'Semana operacional concluída' })
    } catch (error) {
      const reconciled = await reconcileClosedWeek(expectedWeek)
      if (reconciled) toast.success(`O servidor já possui o fechamento da Semana ${expectedWeek}. O estado foi reconciliado sem criar duplicidade.`, { title: 'Fechamento confirmado' })
      else { setNeedsResync(true); toast.error(`${mutationErrorMessage(error, 'Não foi possível encerrar a semana no servidor.')} Nenhuma alteração será assumida nesta tela até uma nova sincronização.`, { title: 'Semana não confirmada' }) }
    } finally { setMutation(null) }
  }

  async function generatePayslip() {
    if (mutation || needsResync) return
    if (!canGenerate) { toast.error(`Encerre pelo menos ${game.minWeeksPerPayroll} semanas do Mês ${currentMonth} antes de gerar o holerite.`); return }
    if (settingsDirty) { toast.info('Salve os ajustes do holerite antes de gerar o fechamento.'); return }
    const expectedWeek = currentWeek
    const expectedMonth = currentMonth
    const confirmed = await confirm({
      title: game.id === 'ets2' ? `Gerar o holerite do Mês ${expectedMonth}?` : `Fechar a Semana ${expectedWeek}?`,
      message: game.id === 'ets2' ? `O backend calculará e persistirá o holerite do Mês ${expectedMonth} usando as ${currentMonthPeriods.length} semanas encerradas.` : `O backend calculará, persistirá e depositará o holerite da Semana ${expectedWeek} em uma única transação.`,
      confirmLabel: 'Gerar holerite', tone: 'success',
    })
    if (!confirmed) return
    setMutation('generate')
    try {
      const created = await payrollApi.generatePayslip(game.id, career.serverCareerId, { expectedOperationalWeek: expectedWeek, expectedPayrollMonth: expectedMonth })
      setPayslips((current) => [created, ...current.filter((payslip) => String(payslip.id) !== String(created.id))]); setSelectedPayslipId(created.id)
      const fullyRefreshed = await bestEffortRefreshAfterConfirmedMutation()
      toast.success(fullyRefreshed ? `${payslipPeriodLabel(created, game)} confirmado pelo servidor. Crédito no saldo: ${money(created.balanceCreditAmount, created.displayCurrency)}.` : `${payslipPeriodLabel(created, game)} foi confirmado pelo servidor, mas a tela não conseguiu recarregar todo o estado. Sincronize antes de continuar.`, { title: 'Holerite gerado' })
    } catch (error) {
      const reconciled = await reconcilePayslip(expectedWeek, expectedMonth)
      if (reconciled) toast.success(`${payslipPeriodLabel(reconciled, game)} já existe no servidor e foi reconciliado. Nenhum segundo holerite foi criado.`, { title: 'Holerite confirmado' })
      else { setNeedsResync(true); toast.error(`${mutationErrorMessage(error, 'Não foi possível gerar o holerite no servidor.')} Nenhum depósito será assumido nesta tela até uma nova sincronização.`, { title: 'Holerite não confirmado' }) }
    } finally { setMutation(null) }
  }

  async function saveSettings(event) {
    event?.preventDefault()
    if (mutation || needsResync || !settings?.editable || !settingsForm || !settingsDirty) return
    setMutation('settings')
    try {
      const updated = await payrollApi.updateSettings(game.id, career.serverCareerId, {
        expectedOperationalWeek: currentWeek, expectedPayrollMonth: game.id === 'ets2' ? currentMonth : null,
        level1Gross: Number(settingsForm.level1Gross), routeOverrunRate: Number(settingsForm.routeOverrunRate),
        benefits: Number(settingsForm.benefits), perDiemRate: Number(settingsForm.perDiemRate),
      })
      applySettings(updated); setPreview(await payrollApi.getPreview(game.id, career.serverCareerId)); toast.success('Ajustes do holerite salvos no servidor.')
    } catch (error) { toast.error(mutationErrorMessage(error, 'Não foi possível salvar os ajustes da folha.'), { title: 'Ajustes não salvos' }) }
    finally { setMutation(null) }
  }
  async function retrySync() {
    if (mutation) return
    setMutation('sync')
    try { await Promise.all([loadPayrollData({ quiet: true }), refreshCareer(), refreshPreferencesAndPreview()]); setNeedsResync(false); toast.success('Períodos e holerites foram sincronizados novamente com o servidor.') }
    catch (error) { setNeedsResync(true); toast.error(mutationErrorMessage(error, 'Não foi possível sincronizar a folha agora.'), { title: 'Sincronização não concluída' }) }
    finally { setMutation(null) }
  }

  if (loading) return <section className="panel"><div className="empty-inline">Carregando períodos e holerites do servidor…</div></section>
  if (loadError && periods.length === 0 && payslips.length === 0) return (
    <section className="panel"><div className="section-heading compact-heading"><span className="eyebrow">Holerite</span><h2>Não foi possível carregar a folha</h2><p>Para proteger a carreira, o histórico local não será usado como substituto dos holerites persistidos no servidor.</p></div><button className="button primary compact" type="button" disabled={mutation === 'sync'} onClick={retrySync}>{mutation === 'sync' ? 'Sincronizando…' : 'Tentar sincronizar novamente'}</button></section>
  )

  return (
    <div className="payslip-layout server-payslip-legacy-layout">
      <section className="panel payslip-form-card" data-tour="payslip-form">
        <div className="section-heading compact-heading"><span className="eyebrow">{title}</span><h2>{game.id === 'ets2' ? 'Gerar holerite mensal' : 'Gerar holerite'}</h2><p>{introText(game)}</p></div>

        {needsResync && <div className="notice-box" role="alert"><strong>Confirmação pendente de sincronização</strong><span>Uma resposta ficou incerta ou o recarregamento falhou. Nenhum novo fechamento será enviado até a tela confirmar o estado atual do servidor.</span><button className="button secondary compact" type="button" disabled={mutation === 'sync'} onClick={retrySync}>{mutation === 'sync' ? 'Sincronizando…' : 'Sincronizar antes de continuar'}</button></div>}

        {game.id === 'ets2' && <div className="payroll-period-card" data-tour="payroll-period"><div><span>Semanas encerradas no Mês {currentMonth}</span><strong>{currentMonthPeriods.length} / {game.minWeeksPerPayroll} mínimas</strong><small>{currentMonthPeriods.length ? `Semanas incluídas: ${currentMonthPeriods.map((period) => period.operationalWeek).join(', ')}.` : 'Nenhuma semana encerrada ainda.'} O limite do mês é {game.maxWeeksPerPayroll}.</small></div><button className="button secondary compact" type="button" disabled={!canCloseEts2Week || Boolean(mutation) || needsResync} onClick={closeOperationalWeek}>{mutation === 'close' ? 'Encerrando…' : canCloseEts2Week ? `Encerrar Semana ${currentWeek}` : 'Gere o holerite para continuar'}</button></div>}

        <div className="country-payroll-note"><strong>{location.flag} {location.title}</strong><span>{location.detail}</span>{sourceLinks.length > 0 && <div>{sourceLinks.map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={url}>{label}</a>)}</div>}</div>

        {settingsForm && <form className="server-payroll-settings legacy-payroll-settings" onSubmit={saveSettings}>
          <TipLabel tip="O nível vem da carreira persistida no backend e determina a política usada no cálculo.">Nível atual</TipLabel><input value={`Nível ${currentLevel}`} readOnly />
          {currentLevel <= 1 ? <>
            <TipLabel tip="Valor base persistido no backend para o próximo fechamento.">Salário {game.id === 'ets2' ? 'mensal' : 'semanal'} bruto</TipLabel><input aria-label="Salário N1" type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.level1Gross} onChange={(event) => updateSetting('level1Gross', event.target.value)} />
            <TipLabel tip="Tarifa persistida no backend e usada no cálculo server-side do tempo excedente.">Valor por hora de {game.overtimeLabel}</TipLabel><input aria-label="Route Overrun por hora" type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.routeOverrunRate} onChange={(event) => updateSetting('routeOverrunRate', event.target.value)} />
            <div className="readout-box"><span>{game.overtimeLabel} automático</span><strong>{formatHoursFromMinutes(preview?.overrunMinutes)} • {money(overrunPay, currency)}</strong><small>O backend soma o tempo das viagens, aplica a jornada e retorna o excedente elegível a {money(overrunRate, currency)}/h.</small></div>
            {preview?.ready && <div className="breakdown-list compact-breakdown server-worked-time-breakdown"><div><span>Tempo total das viagens</span><strong>{formatHoursFromMinutes(preview.elapsedMinutes)}</strong></div>{Number(preview.breakMinutes || 0) > 0 && <div><span>Pausas descontadas</span><strong>-{formatHoursFromMinutes(preview.breakMinutes)}</strong></div>}<div><span>Tempo trabalhado</span><strong>{formatHoursFromMinutes(preview.workedMinutes)}</strong></div></div>}
          </> : <>
            <div className="readout-box"><span>{game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} pagos no período</span><strong>{distance(preview?.totalDistance, game)}</strong></div>
            <div className="breakdown-list compact-breakdown">{(preview?.lines || []).filter((line) => line.code?.startsWith('MILEAGE_')).map((line) => <div key={line.code}><span>{line.label}</span><strong>{distance(line.quantity, game)} × {money(line.rate, currency)}</strong></div>)}</div>
            <TipLabel tip="Tarifa persistida no backend para os dias elegíveis a diária.">{game.perDiemLabel}</TipLabel><input aria-label={game.perDiemLabel} type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.perDiemRate} onChange={(event) => updateSetting('perDiemRate', event.target.value)} />
          </>}
          <TipLabel tip="Desconto pessoal adicional persistido no servidor. Impostos aparecem separadamente na prévia.">{game.id === 'ets2' ? 'Outros descontos mensais' : 'Benefícios / contribuições semanais'}</TipLabel><input aria-label="Benefícios" type="number" min="0" step="0.01" disabled={!settings.editable || Boolean(mutation)} value={settingsForm.benefits} onChange={(event) => updateSetting('benefits', event.target.value)} />
          {settingsDirty && <button className="button secondary full-button server-payroll-save-button" type="submit" disabled={!settings.editable || Boolean(mutation) || needsResync}>{mutation === 'settings' ? 'Salvando ajustes no servidor…' : 'Salvar ajustes no servidor'}</button>}
          {!settings.editable && <small className="payroll-blocked-note">Este período já possui fechamento e seus parâmetros estão protegidos pelo backend.</small>}
        </form>}

        <button className="button success full-button" type="button" disabled={!canGenerate || Boolean(mutation) || needsResync || settingsDirty} onClick={generatePayslip}>{mutation === 'generate' ? 'Aguardando confirmação do servidor…' : game.id === 'ets2' ? 'Gerar holerite mensal e depositar' : 'Gerar holerite e depositar'}</button>
        {settingsDirty && <small className="payroll-blocked-note">Salve os ajustes acima para atualizar a prévia antes de gerar o holerite.</small>}
        {game.id === 'ets2' && !canGenerate && !needsResync && <small className="payroll-blocked-note">Encerre mais {Math.max(0, game.minWeeksPerPayroll - currentMonthPeriods.length)} semana(s) para liberar o holerite mensal.</small>}
      </section>

      <section className="panel payslip-preview-card" data-tour="payslip-preview">
        <div className="section-heading compact-heading"><span className="eyebrow">Prévia • {title}</span><h2>Holerite</h2><p>Estimativa de roleplay para {game.stateName || game.countryName || preview?.contextSnapshot?.stateCode || preview?.contextSnapshot?.countryCode || 'a região atual'}; não substitui uma folha real.</p></div>
        {!preview?.ready ? <div className="empty-inline">O backend ainda não possui dados suficientes para calcular este fechamento.</div> : <div className="payslip-lines">
          {currentLevel === 1 && <div><LineLabel tip="Valor calculado pelo backend a partir do tempo elegível acima da jornada normal.">Saldo de {game.overtimeLabel.toLowerCase()}</LineLabel><strong>+{money(overrunPay, currency)} ({formatHoursFromMinutes(preview.overrunMinutes)} × {money(overrunRate, currency)}/h)</strong></div>}
          <div><LineLabel tip="Total antes de impostos e outros descontos, calculado pelo backend.">Salário bruto</LineLabel><strong>{money(preview.grossAmount, currency)}</strong></div>
          {previewTaxes.length > 0 ? previewTaxes.map((line) => <div key={line.code}><LineLabel tip="Retenção calculada pelo backend conforme a política fiscal persistida.">{displayTaxLabel(line, game)}</LineLabel><strong>-{money(line.amount, currency)}</strong></div>) : Number(preview.taxAmount || 0) > 0 && <div><LineLabel tip="Total de impostos retornado pelo backend.">Impostos</LineLabel><strong>-{money(preview.taxAmount, currency)}</strong></div>}
          <div><LineLabel tip="Valor adicional configurado e persistido para o período.">Outros descontos</LineLabel><strong>-{money(preview.benefitsAmount, currency)}</strong></div>
          <div className="emphasis-line"><LineLabel tip="Salário após impostos e outros descontos, antes de per diem e ocorrências.">Salário líquido</LineLabel><strong>{money(preview.netSalaryAmount, currency)}</strong></div>
          <div><LineLabel tip="Valor não salarial calculado pelo backend para dias elegíveis.">{game.perDiemLabel}</LineLabel><strong>+{money(preview.perDiemAmount, currency)}</strong></div>
          <div><LineLabel tip="Infrações ou acidentes elegíveis para desconto neste fechamento.">Infrações/acidentes</LineLabel><strong>-{money(preview.incidentDeductionAmount, currency)}</strong></div>
          <div className="deposit-line"><LineLabel tip="Valor final calculado pelo backend antes da aplicação server-side da reserva automática.">Depósito total</LineLabel><strong>{money(preview.depositAmount, currency)}</strong></div>
        </div>}
      </section>

      <section className="panel closed-weeks-card" data-tour="closed-weeks">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico de holerites</span><h2>{game.id === 'ets2' ? 'Meses fechados' : 'Semanas fechadas'}</h2></div>
        {payslips.length === 0 ? <div className="empty-inline">Nenhum holerite fechado ainda.</div> : <div className="server-payslip-history-list">{payslips.map((payslip) => <article className={`server-payslip-history-item${String(selectedPayslip?.id) === String(payslip.id) ? ' is-selected' : ''}`} key={payslip.id}>
          <button type="button" className="server-payslip-history-summary" onClick={() => setSelectedPayslipId(payslip.id)}><span><strong>{payslipPeriodLabel(payslip, game)}</strong><small>{auditTime(payslip.generatedAt)} • Nível {payslip.level} • {distance(payslip.totalDistance, game)}</small></span><span className="server-payslip-history-credit"><small>Crédito no saldo</small><strong>{money(payslip.balanceCreditAmount, payslip.displayCurrency)}</strong></span></button>
          {String(selectedPayslip?.id) === String(payslip.id) && <div className="server-payslip-history-detail"><div className="payslip-lines"><div><span>Salário bruto</span><strong>{money(payslip.grossAmount, payslip.displayCurrency)}</strong></div><div><span>Impostos</span><strong>-{money(payslip.taxAmount, payslip.displayCurrency)}</strong></div><div><span>Outros descontos</span><strong>-{money(payslip.benefitsAmount, payslip.displayCurrency)}</strong></div><div className="emphasis-line"><span>Salário líquido</span><strong>{money(payslip.netSalaryAmount, payslip.displayCurrency)}</strong></div><div><span>{game.perDiemLabel}</span><strong>+{money(payslip.perDiemAmount, payslip.displayCurrency)}</strong></div><div><span>Infrações/acidentes</span><strong>-{money(payslip.incidentDeductionAmount, payslip.displayCurrency)}</strong></div><div className="deposit-line"><span>Depósito total</span><strong>{money(payslip.depositAmount, payslip.displayCurrency)}</strong></div></div>{Array.isArray(payslip.lines) && payslip.lines.length > 0 && <div className="server-payslip-persisted-lines"><span className="eyebrow">Composição persistida no servidor</span>{payslip.lines.map((line) => <div key={line.id || `${line.order}-${line.code}`}><span>{displayTaxLabel(line, game)}</span><strong>{line.type === 'DEDUCTION' ? '-' : '+'}{money(line.amount, payslip.displayCurrency)}</strong></div>)}</div>}</div>}
        </article>)}</div>}
      </section>
    </div>
  )
}
