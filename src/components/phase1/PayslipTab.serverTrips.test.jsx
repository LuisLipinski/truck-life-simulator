// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PayslipTab from './PayslipTab.jsx'
import { ConfirmProvider } from '../ConfirmProvider.jsx'
import { GameProvider } from '../GameContext.jsx'
import { ToastProvider } from '../ToastProvider.jsx'

let root
let container

function state(overrides = {}) {
  return {
    balance: 500,
    emergencyReserve: 0,
    autoReserveContribution: { enabled: false, amount: 0 },
    currentLevel: 1,
    careerLevel: 1,
    currentWeek: 3,
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

function render(gameId, currentState, commit = vi.fn()) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <ToastProvider>
        <ConfirmProvider>
          <GameProvider gameId={gameId} stateCode={gameId === 'ats' ? 'CA' : null} countryCode={gameId === 'ets2' ? 'DE' : null} city={gameId === 'ats' ? 'Los Angeles, CA' : 'Berlin, Germany'}>
            <PayslipTab
              career={{ company: 'Server Logistics', driverName: 'Server Driver' }}
              state={currentState}
              commit={commit}
              serverTripsActive
            />
          </GameProvider>
        </ConfirmProvider>
      </ToastProvider>,
    )
  })
  return commit
}

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('PayslipTab server trip cutover protection', () => {
  it('blocks ATS payslip generation so the server operational week cannot advance only in localStorage', () => {
    const commit = render('ats', state())

    expect(container.textContent).toContain('Fechamento temporariamente protegido')
    expect(container.textContent).toContain('Disponível na P4.6.3')
    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Disponível na P4.6.3'))
    expect(generate.disabled).toBe(true)
    expect(commit).not.toHaveBeenCalled()
  })

  it('blocks ETS2 operational-week closure while trips are already server-side', () => {
    const commit = render('ets2', state({ currentWeek: 2 }))

    const protectedButtons = [...container.querySelectorAll('button')].filter((button) => button.textContent.includes('Disponível na P4.6.3'))
    expect(protectedButtons.length).toBeGreaterThanOrEqual(2)
    expect(protectedButtons.every((button) => button.disabled)).toBe(true)
    expect(container.textContent).toContain('Nenhum fechamento será executado localmente enquanto as viagens já estão server-side.')
    expect(commit).not.toHaveBeenCalled()
  })
})
