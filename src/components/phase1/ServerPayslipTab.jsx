import { useEffect, useMemo, useState } from 'react'
import { careerApi } from '../../lib/careerApi.js'
import { setServerCareerSnapshot } from '../../lib/careerServerState.js'
import { financeApi } from '../../lib/financeApi.js'
import { payrollApi } from '../../lib/payrollApi.js'
import { CAREER_UPDATED_EVENT } from '../../lib/storage.js'
import { useConfirm } from '../ConfirmProvider.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

function money(value, currency) {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 })
      .format(Number.isFinite(amount) ? amount : 0)
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

function hours(minutes) {
  const total = Math.max(0, Number(minutes || 0))
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

function parseMoney(value) {
  const text = String(value ?? '').trim()
  if (!text || !/^\d+(?:[.,]\d{1,2})?$/.test(text)) return NaN
  const number = Number(text.replace(',', '.'))
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : NaN
}

function inputMoney(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : ''
}

function payslipPeriodLabel(payslip, game) {
  return game.id === 'ets2'
    ? `Mês ${payslip.payrollMonth || '—'}`
    : `Semana ${payslip.operationalWeek || payslip.endOperationalWeek || '—'}`
}

function samePayslipPeriod(payslip, gameId, expectedWeek, expectedMonth) {
  return String(gameId).toLowerCase() === 'ets2'
    ? Number(payslip?.payrollMonth) === Number(expectedMonth)
    : Number(payslip?.operationalWeek ?? payslip?.endOperationalWeek) === Number(expectedWeek)
}

function operationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `op-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function LineLabel({ children, tip }) {
  return <span className="line-label-with-tip"><span>{children}</span>{tip && <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={tip}>i</button>}</span>
}

export default function ServerPayslipTab({ career }) {
  const game = useGame()
  const confirm = useConfirm()
  const toast = useToast()
  const [periods, setPeriods] = useState([])
  const [payslips, setPayslips] = useState([])
  const [selectedPayslipId, setSelectedPayslipId] = useState(null)
  const [settings, setSettings] = useState(null)
  const [preview, setPreview] = useState(null)
  const [finance, setFinance] = useState(null)
  const [form, setForm] = useState(null)
  const [reserveEnabled, setReserveEnabled] = useState(false)
  const [reserveAmount, setReserveAmount] = useState('0.00')
  const [dirty, setDirty] = useState(false)
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
    () => payslips.find((item) => String(item.id) === String(selectedPayslipId)) || payslips[0] || null,
    [payslips, selectedPayslipId],
  )
  const canCloseEts2Week = game.id === 'ets2' && currentMonthPeriods.length < game.maxWeeksPerPayroll
  const canGenerate = game.id === 'ats'
    ? true
    : currentMonthPeriods.length >= game.minWeeksPerPayroll && currentMonthPeriods.length <= game.maxWeeksPerPayroll
  const currency = preview?.displayCurrency || settings?.displayCurrency || career.currency || 'USD'

  function applyLoadedSettings(nextSettings, nextFinance) {
    setSettings(nextSettings)
    setForm({
      level1Gross: inputMoney(nextSettings.level1Gross),
      routeOverrunRate: inputMoney(nextSettings.routeOverrunRate),
      benefits: inputMoney(nextSettings.benefits),
      perDiemRate: inputMoney(nextSettings.perDiemRate),
    })
    setFinance(nextFinance)
    setReserveEnabled(Boolean(nextFinance?.emergencyReserve?.autoContributionEnabled))
    setReserveAmount(inputMoney(nextFinance?.emergencyReserve?.autoContributionAmount || 0))
    setDirty(false)
  }

  function notifyCareerUpdated() {
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, {
      detail: { careerId: career.id, gameId: game.id, source: 'server-payroll' },
    }))
  }

  async function refreshCareer() {
    const response = await careerApi.get(game.id, career.serverCareerId)
    setServerCareerSnapshot(game.id, career.id, response)
    notifyCareerUpdated()
    return response
  }

  async function loadAll({ quiet = false } = {}) {
    if (!quiet) setLoading(true)
    setLoadError(null)
    try {
      const [nextPeriods, nextPayslips, nextSettings, nextPreview, nextFinance] = await Promise.all([
        payrollApi.listPeriods(game.id, career.serverCareerId),
        payrollApi.listPayslips(game.id, career.serverCareerId),
        payrollApi.getSettings(game.id, career.serverCareerId),
        payrollApi.preview(game.id, career.serverCareerId),
        financeApi.get(game.id, career.serverCareerId),
      ])
      setPeriods(Array.isArray(nextPeriods) ? nextPeriods : [])
      setPayslips(Array.isArray(nextPayslips) ? nextPayslips : [])
      setSelectedPayslipId((current) => current || nextPayslips?.[0]?.id || null)
      setPreview(nextPreview)
      applyLoadedSettings(nextSettings, nextFinance)
      setNeedsResync(false)
      return { periods: nextPeriods || [], payslips: nextPayslips || [], settings: nextSettings, preview: nextPreview, finance: nextFinance }
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
    Promise.all([
      payrollApi.listPeriods(game.id, career.serverCareerId),
      payrollApi.listPayslips(game.id, career.serverCareerId),
      payrollApi.getSettings(game.id, career.serverCareerId),
      payrollApi.preview(game.id, career.serverCareerId),
      financeApi.get(game.id, career.serverCareerId),
    ]).then(([nextPeriods, nextPayslips, nextSettings, nextPreview, nextFinance]) => {
      if (cancelled) return
      setPeriods(Array.isArray(nextPeriods) ? nextPeriods : [])
      setPayslips(Array.isArray(nextPayslips) ? nextPayslips : [])
      setSelectedPayslipId(nextPayslips?.[0]?.id || null)
      setPreview(nextPreview)
      applyLoadedSettings(nextSettings, nextFinance)
      setNeedsResync(false)
    }).catch((error) => { if (!cancelled) setLoadError(error) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [career.serverCareerId, game.id])

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setDirty(true)
  }

  async function savePreferences() {
    if (!form || mutation || needsResync || !settings?.editable) return
    const values = {
      level1Gross: parseMoney(form.level1Gross),
      routeOverrunRate: parseMoney(form.routeOverrunRate),
      benefits: parseMoney(form.benefits),
      perDiemRate: parseMoney(form.perDiemRate),
    }
    if (Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) {
      toast.error('Revise os valores do holerite. Use números positivos com no máximo duas casas decimais.')
      return
    }
    const reserve = parseMoney(reserveAmount)
    if (reserveEnabled && (!Number.isFinite(reserve) || reserve <= 0)) {
      toast.error('Informe um valor maior que zero para o aporte automático à reserva.')
      return
    }

    setMutation('settings')
    try {
      await payrollApi.updateSettings(game.id, career.serverCareerId, {
        expectedOperationalWeek: currentWeek,
        expectedPayrollMonth: game.id === 'ets2' ? currentMonth : null,
        ...values,
      })
      await financeApi.configureAutoReserve(game.id, career.serverCareerId, {
        expectedOperationalWeek: currentWeek,
        expectedPayrollMonth: game.id === 'ets2' ? currentMonth : null,
        enabled: reserveEnabled,
        amount: reserveEnabled ? reserve : 0,
      })
      const [nextSettings, nextPreview, nextFinance] = await Promise.all([
        payrollApi.getSettings(game.id, career.serverCareerId),
        payrollApi.preview(game.id, career.serverCareerId),
        financeApi.get(game.id, career.serverCareerId),
      ])
      setPreview(nextPreview)
      applyLoadedSettings(nextSettings, nextFinance)
      toast.success('Ajustes do holerite salvos no servidor e prévia recalculada.', { title: 'Prévia atualizada' })
    } catch (error) {
      try {
        const [nextSettings, nextPreview, nextFinance] = await Promise.all([
          payrollApi.getSettings(game.id, career.serverCareerId),
          payrollApi.preview(game.id, career.serverCareerId),
          financeApi.get(game.id, career.serverCareerId),
        ])
        setPreview(nextPreview)
        applyLoadedSettings(nextSettings, nextFinance)
      } catch {
        setNeedsResync(true)
      }
      toast.error(error?.message || 'Os ajustes do holerite não puderam ser confirmados no servidor.', {
        title: 'Ajustes não confirmados',
      })
    } finally {
      setMutation(null)
    }
  }

  async function refreshAfterMutation() {
    let failed = false
    try { await refreshCareer() } catch { failed = true }
    try { await loadAll({ quiet: true }) } catch { failed = true }
    setNeedsResync(failed)
    return !failed
  }

  async function reconcileClosedWeek(expectedWeek) {
    try {
      const nextPeriods = await payrollApi.listPeriods(game.id, career.serverCareerId)
      setPeriods(Array.isArray(nextPeriods) ? nextPeriods : [])
      return nextPeriods?.find((period) => Number(period.operationalWeek) === Number(expectedWeek)) || null
    } catch { return null }
  }

  async function reconcilePayslip(expectedWeek, expectedMonth) {
    try {
      const nextPayslips = await payrollApi.listPayslips(game.id, career.serverCareerId)
      const safe = Array.isArray(nextPayslips) ? nextPayslips : []
      setPayslips(safe)
      const match = safe.find((item) => samePayslipPeriod(item, game.id, expectedWeek, expectedMonth)) || null
      if (match) setSelectedPayslipId(match.id)
      return match
    } catch { return null }
  }

  async function closeOperationalWeek() {
    if (mutation || needsResync || dirty || game.id !== 'ets2') return
    if (!canCloseEts2Week) return toast.error(`O Mês ${currentMonth} já possui ${game.maxWeeksPerPayroll} semanas. Gere o holerite antes de continuar.`)
    const expectedWeek = currentWeek
    const confirmed = await confirm({
      title: `Encerrar a Semana ${expectedWeek}?`,
      message: `O servidor congelará a Semana ${expectedWeek}, incluindo as preferências de folha já salvas, e avançará para a Semana ${expectedWeek + 1}. Nenhum salário será depositado agora.`,
      confirmLabel: 'Encerrar semana no servidor', tone: 'success',
    })
    if (!confirmed) return
    setMutation('close')
    try {
      await payrollApi.closeOperationalWeek(game.id, career.serverCareerId, expectedWeek)
      const refreshed = await refreshAfterMutation()
      toast.success(refreshed ? `Semana ${expectedWeek} encerrada e confirmada pelo servidor.` : `Semana ${expectedWeek} foi encerrada, mas a tela precisa ser ressincronizada.`, { title: 'Semana operacional concluída' })
    } catch (error) {
      const match = await reconcileClosedWeek(expectedWeek)
      if (match) {
        await refreshAfterMutation()
        toast.success(`O fechamento da Semana ${expectedWeek} foi encontrado no servidor e reconciliado.`)
      } else {
        setNeedsResync(true)
        toast.error(`${error?.message || 'Não foi possível confirmar o fechamento.'} Nenhuma nova operação será enviada até ressincronizar.`, { title: 'Semana não confirmada' })
      }
    } finally { setMutation(null) }
  }

  async function generatePayslip() {
    if (mutation || needsResync || dirty) return
    if (!canGenerate || preview?.ready === false) return toast.error(`O período ainda não está pronto para gerar o holerite no servidor.`)
    const expectedWeek = currentWeek
    const expectedMonth = currentMonth
    const confirmed = await confirm({
      title: game.id === 'ets2' ? `Gerar o holerite do Mês ${expectedMonth}?` : `Fechar a Semana ${expectedWeek}?`,
      message: `A prévia exibida foi calculada no backend. Ao confirmar, o servidor recalculará com os mesmos dados persistidos, aplicará ocorrências e reserva e gravará o resultado definitivo em uma única transação.`,
      confirmLabel: 'Gerar holerite no servidor', tone: 'success',
    })
    if (!confirmed) return
    setMutation('generate')
    try {
      const created = await payrollApi.generatePayslip(game.id, career.serverCareerId, {
        expectedOperationalWeek: expectedWeek,
        expectedPayrollMonth: expectedMonth,
      })
      setSelectedPayslipId(created.id)
      const refreshed = await refreshAfterMutation()
      toast.success(refreshed
        ? `${payslipPeriodLabel(created, game)} confirmado pelo servidor. Crédito no saldo: ${money(created.balanceCreditAmount, created.displayCurrency)}.`
        : `${payslipPeriodLabel(created, game)} foi confirmado, mas a tela precisa ser ressincronizada.`, { title: 'Holerite gerado' })
    } catch (error) {
      const match = await reconcilePayslip(expectedWeek, expectedMonth)
      if (match) {
        await refreshAfterMutation()
        toast.success(`${payslipPeriodLabel(match, game)} já existe no servidor e foi reconciliado. Nenhum segundo holerite foi criado.`, { title: 'Holerite confirmado' })
      } else {
        setNeedsResync(true)
        toast.error(`${error?.message || 'Não foi possível confirmar o holerite.'} Nenhum depósito será assumido nesta tela até ressincronizar.`, { title: 'Holerite não confirmado' })
      }
    } finally { setMutation(null) }
  }

  async function retrySync() {
    if (mutation) return
    setMutation('sync')
    try {
      await Promise.all([loadAll({ quiet: true }), refreshCareer()])
      setNeedsResync(false)
      toast.success('Folha e finanças sincronizadas novamente com o servidor.')
    } catch (error) {
      setNeedsResync(true)
      toast.error(error?.message || 'Não foi possível sincronizar a folha agora.')
    } finally { setMutation(null) }
  }

  if (loading) return <section className="panel"><div className="empty-inline">Carregando prévia, preferências e histórico do servidor…</div></section>
  if (loadError && !settings) return <section className="panel"><div className="section-heading compact-heading"><span className="eyebrow">Folha server-side</span><h2>Não foi possível carregar a folha</h2><p>O histórico local não será usado como substituto.</p></div><button className="button primary compact" type="button" onClick={retrySync}>Tentar sincronizar novamente</button></section>

  return (
    <div className="payslip-layout">
      <section className="panel payslip-form-card" data-tour="payslip-form">
        <div className="section-heading compact-heading">
          <span className="eyebrow">Folha server-side</span>
          <h2>{game.id === 'ets2' ? `Mês operacional ${currentMonth}` : `Semana operacional ${currentWeek}`}</h2>
          <p>Você pode ajustar os mesmos parâmetros da carreira antes do fechamento. Eles são persistidos no servidor; impostos, distâncias, horas, ocorrências e depósito continuam calculados pelo backend.</p>
        </div>

        {needsResync && <div className="notice-box" role="alert"><strong>Sincronização necessária</strong><span>Nenhuma nova mutação será enviada até confirmar o estado atual do servidor.</span><button className="button secondary compact" type="button" onClick={retrySync}>Sincronizar</button></div>}
        {game.id === 'ets2' && !settings.editable && <div className="notice-box"><strong>Preferências congeladas neste mês</strong><span>Como o mês operacional já possui semana fechada, os parâmetros usados nos snapshots não podem ser alterados retroativamente. Eles voltam a ser editáveis no próximo mês.</span></div>}

        <div className="two-columns">
          <div>
            <label>Salário base Nível 1</label>
            <input type="text" inputMode="decimal" disabled={!settings.editable || mutation} value={form.level1Gross} onChange={(event) => setField('level1Gross', event.target.value)} />
            <small>Padrão server-side atual: {money(settings.defaultLevel1Gross, currency)}</small>
          </div>
          <div>
            <label>Valor por hora de {game.overtimeLabel}</label>
            <input type="text" inputMode="decimal" disabled={!settings.editable || mutation} value={form.routeOverrunRate} onChange={(event) => setField('routeOverrunRate', event.target.value)} />
            <small>Padrão server-side atual: {money(settings.defaultRouteOverrunRate, currency)}/h</small>
          </div>
          <div>
            <label>{game.payrollPeriod === 'monthly' ? 'Outros descontos mensais' : 'Benefícios / contribuições semanais'}</label>
            <input type="text" inputMode="decimal" disabled={!settings.editable || mutation} value={form.benefits} onChange={(event) => setField('benefits', event.target.value)} />
            <small>Padrão server-side atual: {money(settings.defaultBenefits, currency)}</small>
          </div>
          <div>
            <label>{game.perDiemLabel} por dia elegível</label>
            <input type="text" inputMode="decimal" disabled={!settings.editable || mutation} value={form.perDiemRate} onChange={(event) => setField('perDiemRate', event.target.value)} />
            <small>Padrão server-side atual: {money(settings.defaultPerDiemRate, currency)}</small>
          </div>
        </div>

        <div className="payslip-reserve-auto">
          <label className="check-field"><input type="checkbox" disabled={mutation} checked={reserveEnabled} onChange={(event) => { setReserveEnabled(event.target.checked); setDirty(true) }} /> Adicionar automaticamente à reserva ao fechar {game.payrollPeriod === 'monthly' ? 'o mês' : 'a semana'}</label>
          {reserveEnabled && <div className="payslip-reserve-amount"><label>Valor do aporte automático</label><input type="text" inputMode="decimal" disabled={mutation} value={reserveAmount} onChange={(event) => { setReserveAmount(event.target.value); setDirty(true) }} /></div>}
        </div>

        <button className="button secondary full-button" type="button" disabled={!dirty || mutation || needsResync || !settings.editable} onClick={savePreferences}>{mutation === 'settings' ? 'Salvando e recalculando…' : 'Salvar ajustes e atualizar prévia'}</button>
        {dirty && <small className="payroll-blocked-note">Salve os ajustes para o backend recalcular a prévia antes de gerar o holerite.</small>}

        {game.id === 'ets2' && <div className="payroll-period-card" data-tour="payroll-period"><div><span>Semanas encerradas no Mês {currentMonth}</span><strong>{currentMonthPeriods.length} / {game.minWeeksPerPayroll} mínimas</strong><small>{currentMonthPeriods.length ? `Semanas incluídas: ${currentMonthPeriods.map((item) => item.operationalWeek).join(', ')}` : 'Nenhuma semana encerrada ainda.'}</small></div><button className="button secondary compact" type="button" disabled={!canCloseEts2Week || mutation || needsResync || dirty} onClick={closeOperationalWeek}>{mutation === 'close' ? 'Encerrando…' : `Encerrar Semana ${currentWeek}`}</button></div>}

        <button className="button success full-button" type="button" disabled={!canGenerate || preview?.ready === false || mutation || needsResync || dirty} onClick={generatePayslip}>{mutation === 'generate' ? 'Gerando no servidor…' : game.id === 'ets2' ? `Gerar holerite do Mês ${currentMonth} no servidor` : `Gerar holerite da Semana ${currentWeek} no servidor`}</button>
      </section>

      <section className="panel payslip-preview-card" data-tour="payslip-preview">
        <div className="section-heading compact-heading"><span className="eyebrow">Prévia calculada no servidor</span><h2>Holerite</h2><p>Esta prévia não é um cálculo do navegador. Ela é recalculada pela API usando as viagens e configurações persistidas.</p></div>
        {preview && <>
          <section className="phase1-status-grid finance-summary-grid">
            <article className="phase1-metric"><span className="metric-label">Bruto</span><strong className="metric-value">{money(preview.grossAmount, currency)}</strong></article>
            <article className="phase1-metric"><span className="metric-label">Impostos</span><strong className="metric-value">-{money(preview.taxAmount, currency)}</strong></article>
            <article className="phase1-metric"><span className="metric-label">Salário líquido</span><strong className="metric-value">{money(preview.netSalaryAmount, currency)}</strong></article>
            <article className="phase1-metric"><span className="metric-label">Depósito previsto</span><strong className="metric-value">{money(preview.depositAmount, currency)}</strong></article>
          </section>
          <div className="payslip-lines">
            {(preview.lines || []).map((line, index) => <div key={`${line.code}-${index}`}><LineLabel>{line.label}</LineLabel><strong>{line.type === 'DEDUCTION' ? '-' : '+'}{money(line.amount, currency)}{line.quantity != null ? ` · ${line.quantity}${line.rate != null ? ` × ${money(line.rate, currency)}` : ''}` : ''}</strong></div>)}
            {Number(preview.incidentDeductionAmount || 0) > 0 && <div><LineLabel>Infrações/acidentes pendentes</LineLabel><strong>-{money(preview.incidentDeductionAmount, currency)}</strong></div>}
            <div><LineLabel>{game.perDiemLabel}</LineLabel><strong>+{money(preview.perDiemAmount, currency)}</strong></div>
            <div className="deposit-line"><LineLabel>Depósito previsto antes do aporte automático</LineLabel><strong>{money(preview.depositAmount, currency)}</strong></div>
          </div>
          <div className="readout-box"><span>Dados operacionais usados na prévia</span><strong>{distance(preview.totalDistance, game)} · {hours(preview.workedMinutes)} trabalhadas</strong><small>Tempo corrido {hours(preview.elapsedMinutes)} · pausas {hours(preview.breakMinutes)} · {game.overtimeLabel} {hours(preview.overrunMinutes)}.</small></div>
          {reserveEnabled && <div className="notice-box"><strong>Aporte automático configurado: {money(reserveAmount, currency)}</strong><span>O valor será aplicado server-side depois do cálculo do pagamento, respeitando saldo/depósito e as regras da reserva.</span></div>}
        </>}
      </section>

      <section className="panel closed-weeks-card" data-tour="closed-weeks">
        <div className="section-heading compact-heading"><span className="eyebrow">Histórico server-side</span><h2>Holerites persistidos</h2><p>Registros fechados são exibidos exatamente como foram persistidos; não são recalculados com as preferências atuais.</p></div>
        {payslips.length === 0 ? <div className="empty-inline">Nenhum holerite persistido ainda.</div> : <div className="responsive-table compact-table"><table><thead><tr><th>Período</th><th>Semanas</th><th>Bruto</th><th>Impostos</th><th>{game.perDiemLabel}</th><th>Ocorrências</th><th>Depósito</th><th>Saldo creditado</th><th>Gerado em</th></tr></thead><tbody>{payslips.map((item) => <tr key={item.id} className={String(item.id) === String(selectedPayslip?.id) ? 'selected-row' : ''} onClick={() => setSelectedPayslipId(item.id)}><td><strong>{payslipPeriodLabel(item, game)}</strong></td><td>{item.startOperationalWeek === item.endOperationalWeek ? item.startOperationalWeek : `${item.startOperationalWeek}–${item.endOperationalWeek}`}</td><td>{money(item.grossAmount, item.displayCurrency)}</td><td>{money(item.taxAmount, item.displayCurrency)}</td><td>{money(item.perDiemAmount, item.displayCurrency)}</td><td>{money(item.incidentDeductionAmount, item.displayCurrency)}</td><td>{money(item.depositAmount, item.displayCurrency)}</td><td>{money(item.balanceCreditAmount, item.displayCurrency)}</td><td>{auditTime(item.generatedAt)}</td></tr>)}</tbody></table></div>}
      </section>

      {selectedPayslip && <section className="panel payslip-preview-card"><div className="section-heading compact-heading"><span className="eyebrow">Último resultado persistido</span><h2>{payslipPeriodLabel(selectedPayslip, game)}</h2><p>Snapshot imutável do fechamento server-side.</p></div><div className="payslip-lines">{(selectedPayslip.lines || []).map((line) => <div key={line.id || `${line.order}-${line.code}`}><LineLabel>{line.label}</LineLabel><strong>{line.type === 'DEDUCTION' ? '-' : '+'}{money(line.amount, selectedPayslip.displayCurrency)}</strong></div>)}<div className="deposit-line"><LineLabel>Saldo efetivamente creditado</LineLabel><strong>{money(selectedPayslip.balanceCreditAmount, selectedPayslip.displayCurrency)}</strong></div></div></section>}
    </div>
  )
}
