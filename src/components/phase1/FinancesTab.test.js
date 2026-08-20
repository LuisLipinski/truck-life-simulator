// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FinancesTab from './FinancesTab.jsx'
import { ToastProvider } from '../ToastProvider.jsx'

let root
let container

afterEach(() => {
  if (root) {
    act(() => root.unmount())
  }
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

function renderFinance(state, commit = vi.fn()) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(FinancesTab, { state, commit }),
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

function baseState(overrides = {}) {
  return {
    balance: 1000,
    emergencyReserve: 0,
    expenses: { rent: 0, emergency: 0 },
    customExpenses: [],
    history: [],
    ...overrides,
  }
}

describe('FinancesTab reserve integration', () => {
  it('allows withdrawing the exact displayed reserve balance despite floating point noise', () => {
    const { commit } = renderFinance(baseState({
      balance: -1127.08,
      emergencyReserve: 1602.6299999999999,
    }))

    const amount = container.querySelector('input[placeholder="Valor"]')
    const reason = container.querySelector('input[placeholder="Motivo do resgate"]')
    setInputValue(amount, '1602.63')
    setInputValue(reason, 'teste')

    const button = [...container.querySelectorAll('button')].find((item) => item.textContent.trim() === 'Usar reserva')
    act(() => button.click())

    expect(commit).toHaveBeenCalledTimes(1)
    const nextState = commit.mock.calls[0][0]
    expect(nextState.emergencyReserve).toBe(0)
    expect(nextState.balance).toBe(475.55)
    expect(nextState.history.at(-1)).toMatchObject({
      type: 'Reserva',
      desc: 'Resgate da reserva — teste',
      value: 1602.63,
      reserve: 0,
    })
    expect(document.body.textContent).toContain('$1,602.63 transferidos da reserva para o saldo disponível.')
  })

  it('shows a standardized error toast when withdrawal exceeds the reserve', () => {
    const { commit } = renderFinance(baseState({ emergencyReserve: 100 }))
    setInputValue(container.querySelector('input[placeholder="Valor"]'), '100.01')
    setInputValue(container.querySelector('input[placeholder="Motivo do resgate"]'), 'teste')

    const button = [...container.querySelectorAll('button')].find((item) => item.textContent.trim() === 'Usar reserva')
    act(() => button.click())

    expect(commit).not.toHaveBeenCalled()
    const alert = document.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert.textContent).toContain('Não foi possível concluir')
    expect(alert.textContent).toContain('maior que a reserva disponível')
  })

  it('moves an added reserve amount without changing total personal assets', () => {
    const { commit } = renderFinance(baseState({ balance: 500, emergencyReserve: 200 }))
    const addInput = container.querySelector('.reserve-inline-action input[placeholder="0.00"]')
    setInputValue(addInput, '125.55')
    const addButton = [...container.querySelectorAll('button')].find((item) => item.textContent.trim() === 'Adicionar')
    act(() => addButton.click())

    const nextState = commit.mock.calls[0][0]
    expect(nextState.balance).toBe(374.45)
    expect(nextState.emergencyReserve).toBe(325.55)
    expect(nextState.balance + nextState.emergencyReserve).toBe(700)
  })
})
