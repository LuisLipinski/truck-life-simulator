// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CareerManagementPanel from './CareerManagementPanel.jsx'
import HistoryTab from './HistoryTab.jsx'
import IncidentsTab from './IncidentsTab.jsx'
import { ConfirmProvider } from '../ConfirmProvider.jsx'
import { GameProvider } from '../GameContext.jsx'
import { ToastProvider } from '../ToastProvider.jsx'

let root
let container

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

function render(children) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <ToastProvider>
        <ConfirmProvider>
          <GameProvider gameId="ats" stateCode="CA" currencyCode="USD" city="Los Angeles, CA">
            {children}
          </GameProvider>
        </ConfirmProvider>
      </ToastProvider>,
    )
  })
  return container
}

describe('calendarless gameplay UI', () => {
  it('uses weekdays instead of calendar dates for employer and base changes', () => {
    render(
      <CareerManagementPanel
        career={{
          driverName: 'Driver',
          bio: '',
          company: 'Old Logistics',
          city: 'Los Angeles, CA',
          stateCode: 'CA',
          currency: 'USD',
        }}
        onUpdateProfile={vi.fn()}
        onChangeEmployer={vi.fn()}
        onChangeBase={vi.fn()}
      />,
    )

    const employerTab = [...container.querySelectorAll('[role="tab"]')].find((button) => button.textContent === 'Empresa')
    act(() => employerTab.click())

    expect(container.querySelector('input[type="date"]')).toBeNull()
    expect(container.textContent).toContain('Dia da semana efetivo')
    expect([...container.querySelectorAll('#career-company-day option')].map((option) => option.textContent)).toContain('Segunda-feira')

    const baseTab = [...container.querySelectorAll('[role="tab"]')].find((button) => button.textContent === 'Base')
    act(() => baseTab.click())

    expect(container.querySelector('input[type="date"]')).toBeNull()
    expect([...container.querySelectorAll('#career-base-day option')].map((option) => option.textContent)).toContain('Domingo')
  })

  it('removes date and time from incident entry and legacy incident display', () => {
    render(
      <IncidentsTab
        state={{
          balance: 1000,
          currentWeek: 2,
          trips: [],
          history: [],
          incidents: [{
            id: 1,
            week: 1,
            date: '2026-08-20',
            time: '14:30',
            type: 'Infração',
            route: 'I-5',
            description: 'Excesso de velocidade',
            amount: 100,
            chargeMethod: 'payslip',
            remaining: 100,
            status: 'Pendente no holerite',
          }],
        }}
        commit={vi.fn()}
      />,
    )

    expect(container.querySelector('input[type="date"]')).toBeNull()
    expect(container.querySelector('input[type="time"]')).toBeNull()
    const headings = [...container.querySelectorAll('th')].map((cell) => cell.textContent.trim())
    expect(headings).not.toContain('Data')
    expect(headings).not.toContain('Hora')
    expect(container.textContent).not.toContain('2026-08-20')
    expect(container.textContent).not.toContain('14:30')
  })

  it('shows legacy career event dates only as weekdays and hides financial calendar timestamps', () => {
    render(
      <HistoryTab
        career={{
          events: [{
            id: 'event-1',
            type: 'EMPLOYER_CHANGED',
            effectiveDate: '2026-08-26',
            changes: { company: { previous: 'Old', next: 'New' } },
          }],
        }}
        state={{
          history: [{ date: '26/08/2026 10:00:00', desc: 'Ajuste', amount: 10, balance: 1010 }],
          closedWeeks: [],
          incidents: [],
        }}
      />,
    )

    expect(container.textContent).toContain('Quarta-feira')
    expect(container.textContent).not.toContain('26/08/2026')
    expect([...container.querySelectorAll('th')].map((cell) => cell.textContent.trim())).not.toContain('Data')
  })
})
