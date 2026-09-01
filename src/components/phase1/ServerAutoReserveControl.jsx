import { useEffect, useState } from 'react'
import { financeApi } from '../../lib/financeApi.js'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

function InfoTip({ text }) {
  return <button className="react-info-tip" type="button" aria-label="Mais informações" data-tip={text}>i</button>
}

export default function ServerAutoReserveControl({ career, disabled = false, onDirtyChange = () => {} }) {
  const game = useGame()
  const toast = useToast()
  const [finance, setFinance] = useState(null)
  const [form, setForm] = useState({ enabled: false, amount: '' })
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const currentWeek = Math.max(1, Number(career?.currentOperationalWeek || 1))
  const currentMonth = Math.max(1, Number(career?.currentPayrollMonth || 1))

  function apply(nextFinance) {
    const reserve = nextFinance?.emergencyReserve || {}
    setFinance(nextFinance)
    setForm({
      enabled: Boolean(reserve.autoContributionEnabled),
      amount: String(reserve.autoContributionAmount ?? 0),
    })
    setDirty(false)
    onDirtyChange(false)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    financeApi.get(game.id, career.serverCareerId)
      .then((response) => { if (!cancelled) apply(response) })
      .catch((loadError) => { if (!cancelled) setError(loadError) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [career.serverCareerId, game.id])

  function update(next) {
    setForm((current) => ({ ...current, ...next }))
    setDirty(true)
    onDirtyChange(true)
  }

  async function save() {
    if (!dirty || saving || disabled) return
    const amount = Math.max(0, Number(form.amount) || 0)
    if (form.enabled && amount <= 0) {
      toast.error('Informe um valor maior que zero para o aporte automático à reserva.')
      return
    }

    setSaving(true)
    try {
      const response = await financeApi.configureAutoReserve(game.id, career.serverCareerId, {
        expectedOperationalWeek: currentWeek,
        expectedPayrollMonth: game.id === 'ets2' ? currentMonth : null,
        enabled: form.enabled,
        amount,
      })
      apply(response)
      toast.success('Contribuição automática da reserva salva no servidor.')
    } catch (saveError) {
      toast.error(saveError?.message || 'Não foi possível salvar a configuração da reserva.', {
        title: 'Reserva não atualizada',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="payslip-reserve-auto server-reserve-loading"><small>Carregando configuração da reserva do servidor…</small></div>
  if (error && !finance) return <div className="notice-box compact-notice"><strong>Reserva indisponível</strong><span>A configuração automática não pôde ser carregada do servidor. O holerite não usará uma configuração local como substituto.</span></div>

  return (
    <div className="payslip-reserve-auto server-reserve-control">
      <label className="check-field">
        <input
          type="checkbox"
          checked={form.enabled}
          disabled={disabled || saving}
          onChange={(event) => update({ enabled: event.target.checked })}
        />
        Adicionar automaticamente à reserva ao fechar {game.id === 'ets2' ? 'o mês' : 'a semana'}
        <InfoTip text="Esta configuração é salva no backend. Depois do holerite, o servidor transfere o valor configurado do depósito para a Reserva de Emergência." />
      </label>

      {form.enabled && (
        <div className="payslip-reserve-amount">
          <label>Valor do aporte automático</label>
          <input
            aria-label="Valor do aporte automático"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            disabled={disabled || saving}
            onChange={(event) => update({ amount: event.target.value })}
          />
        </div>
      )}

      {dirty && (
        <button className="button secondary full-button server-reserve-save" type="button" disabled={disabled || saving} onClick={save}>
          {saving ? 'Salvando reserva no servidor…' : 'Salvar configuração da reserva'}
        </button>
      )}
    </div>
  )
}
