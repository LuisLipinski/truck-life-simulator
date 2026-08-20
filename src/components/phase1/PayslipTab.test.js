// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PayslipTab from './PayslipTab.jsx'
import { ConfirmProvider } from '../ConfirmProvider.jsx'
import { ToastProvider } from '../ToastProvider.jsx'
import { weeklyEmergencyReserveYield } from '../../lib/phase1.js'

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
    trips: [],
    incidents: [],
    closedWeeks: [],
    history: [],
    ...overrides,
  }
}

function renderPayslip(state, commit = vi.fn()) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(ConfirmProvider, null, React.createElement(PayslipTab, { state, commit })),
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
