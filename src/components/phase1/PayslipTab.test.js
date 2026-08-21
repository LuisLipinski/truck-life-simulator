// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PayslipTab from './PayslipTab.jsx'
import { ConfirmProvider } from '../ConfirmProvider.jsx'
import { GameProvider } from '../GameContext.jsx'
import { ToastProvider } from '../ToastProvider.jsx'
import { monthlyEmergencyReserveYield, weeklyEmergencyReserveYield } from '../../lib/phase1.js'

let root
let container

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

function baseState(overrides = {}) {
  return {
    balance: 500,
    emergencyReserve: 1000,
    autoReserveContribution: { enabled: false, amount: 0 },
    currentLevel: 1,
    careerLevel: 1,
    currentWeek: 1,
    currentPayrollMonth: 1,
    payPeriodStartWeek: 1,
    closedOperationalWeeks: [],
    trips: [],
    incidents: [],
    closedWeeks: [],
    history: [],
    ...overrides,
  }
}

function renderPayslip(state, commit = vi.fn(), gameOptions = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(ConfirmProvider, null,
          React.createElement(GameProvider, { gameId: gameOptions.gameId || 'ats', countryCode: gameOptions.countryCode || null }, React.createElement(PayslipTab, { state, commit })),
        ),
      ),
    )
  })
  return { commit }
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('PayslipTab Level 1 route overrun', () => {
  it('keeps hours automatic while allowing the hourly rate to be edited', () => {
    const state = baseState({
      trips: [
        { week: 1, departureAt: '2026-08-20T07:00:00', arrivalAt: '2026-08-20T17:00:00', miles: 200 },
      ],
    })
    renderPayslip(state)

    expect(container.textContent).toContain('2h')
    expect(container.textContent).toContain('$42.50')

    const rateLabel = [...container.querySelectorAll('label')].find((label) => label.textContent.includes('Valor por hora de Route Overrun'))
    const rateInput = rateLabel.nextElementSibling
    setInputValue(rateInput, '30')

    expect(container.textContent).toContain('$60.00')
    expect(container.textContent).toContain('$30.00/h')
  })
})

describe('PayslipTab reserve automation', () => {
  it('transfers the configured amount after salary deposit without adding it to payslip lines', async () => {
    const state = baseState()
    const { commit } = renderPayslip(state)

    const checkbox = container.querySelector('.payslip-reserve-auto input[type="checkbox"]')
    act(() => checkbox.click())
    const amountInput = container.querySelector('.payslip-reserve-amount input')
    setInputValue(amountInput, '100')

    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Gerar holerite e depositar')
    await act(async () => generate.click())

    expect(commit).not.toHaveBeenCalled()
    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog.textContent).toContain('Fechar a Semana 1?')
    await act(async () => {
      dialog.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    expect(commit).toHaveBeenCalledTimes(1)
    const nextState = commit.mock.calls[0][0]
    const closedWeek = nextState.closedWeeks[0]
    const interest = weeklyEmergencyReserveYield(1000)

    expect(nextState.currentWeek).toBe(2)
    expect(nextState.autoReserveContribution).toEqual({ enabled: true, amount: 100 })
    expect(nextState.emergencyReserve).toBeCloseTo(1100 + interest, 10)
    expect(nextState.balance).toBeCloseTo(state.balance + closedWeek.deposit - 100, 10)
    expect(nextState.history.some((entry) => entry.desc === 'Aporte automático à reserva — Semana 1')).toBe(true)
    expect(nextState.history.some((entry) => entry.desc === 'Rendimento da reserva — Semana 1')).toBe(true)

    const payslipPreview = container.querySelector('.payslip-preview-card')
    expect(payslipPreview.textContent).not.toContain('Aporte automático')
    expect(payslipPreview.textContent).not.toContain('Rendimento da reserva')
  })

  it('blocks an automatic contribution larger than the weekly deposit and shows an error toast', () => {
    const { commit } = renderPayslip(baseState())
    const checkbox = container.querySelector('.payslip-reserve-auto input[type="checkbox"]')
    act(() => checkbox.click())
    setInputValue(container.querySelector('.payslip-reserve-amount input'), '10000')

    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Gerar holerite e depositar')
    act(() => generate.click())

    expect(commit).not.toHaveBeenCalled()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    const alert = document.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert.textContent).toContain('aporte automático não pode ser maior')
  })
})

describe('PayslipTab ETS2 monthly payroll', () => {
  it('closes an operational week without depositing salary', async () => {
    const state = baseState({ trips: [{ id: 1, week: 1, distance: 180, type: 'Loaded', payCategory: 'normal' }] })
    const { commit } = renderPayslip(state, vi.fn(), { gameId: 'ets2', countryCode: 'DE' })

    const closeWeek = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Encerrar Semana 1')
    await act(async () => closeWeek.click())
    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog.textContent).toContain('Encerrar a Semana 1?')
    expect(dialog.textContent).toContain('Nenhum salário será depositado agora')

    await act(async () => {
      dialog.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit.mock.calls[0][0]).toMatchObject({
      balance: state.balance,
      currentWeek: 2,
      closedOperationalWeeks: [1],
      closedWeeks: [],
    })
  })

  it('generates one national payslip after four closed weeks and starts the next month', async () => {
    const state = baseState({
      currentWeek: 5,
      currentPayrollMonth: 1,
      payPeriodStartWeek: 1,
      closedOperationalWeeks: [1, 2, 3, 4],
      trips: [{ id: 1, week: 2, distance: 250, type: 'Loaded', payCategory: 'normal' }],
      incidents: [
        { id: 1, week: 2, amount: 100, remaining: 100, chargeMethod: 'payslip', status: 'Pendente' },
        { id: 2, week: 5, amount: 100, remaining: 100, chargeMethod: 'payslip', status: 'Pendente' },
      ],
    })
    const { commit } = renderPayslip(state, vi.fn(), { gameId: 'ets2', countryCode: 'DE' })

    expect(container.textContent).toContain('Folha de Alemanha em EUR')
    expect(container.textContent).toContain('Imposto de renda (estimado)')
    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Gerar holerite mensal e depositar')
    expect(generate.disabled).toBe(false)
    await act(async () => generate.click())
    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog.textContent).toContain('Gerar o holerite do Mês 1?')
    expect(dialog.textContent).toContain('semanas 1, 2, 3, 4')

    await act(async () => {
      dialog.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    const nextState = commit.mock.calls[0][0]
    expect(nextState.currentWeek).toBe(5)
    expect(nextState.currentPayrollMonth).toBe(2)
    expect(nextState.payPeriodStartWeek).toBe(5)
    expect(nextState.closedWeeks[0]).toMatchObject({
      periodType: 'month',
      month: 1,
      weeks: [1, 2, 3, 4],
      countryCode: 'DE',
      currency: 'EUR',
      incidentDeduction: 100,
    })
    expect(nextState.incidents[0].remaining).toBe(0)
    expect(nextState.incidents[1].remaining).toBe(100)
    expect(nextState.balance).toBeCloseTo(state.balance + nextState.closedWeeks[0].deposit)
    expect(nextState.emergencyReserve).toBeCloseTo(state.emergencyReserve + monthlyEmergencyReserveYield(state.emergencyReserve))
    expect(nextState.history.some((entry) => entry.desc.startsWith('Mês 1 fechado'))).toBe(true)
  })
})
