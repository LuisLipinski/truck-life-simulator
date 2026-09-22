// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameProvider } from '../GameContext.jsx'

const mocks = vi.hoisted(() => ({
  entitlements: null,
}))

vi.mock('../premium/EntitlementProvider.jsx', () => ({
  useEntitlements: () => mocks.entitlements,
}))

import HistoryTab from './HistoryTab.jsx'
import { PREMIUM_LOCK_TEXT } from '../premium/PremiumGate.jsx'

let root
let container

const career = {
  events: [{
    id: 'event-1',
    type: 'EMPLOYER_CHANGED',
    effectiveDate: 'monday',
    changes: { company: { previous: 'Old', next: 'New' } },
  }],
}

const state = {
  history: [
    { desc: 'Primeiro', amount: 100, balance: 1000 },
    { desc: 'Segundo', amount: 50, balance: 1050 },
  ],
  closedWeeks: [{ week: 1, gross: 900, perDiem: 80, incidentDeduction: 0, net: 850 }],
  incidents: [],
}

function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <GameProvider gameId="ats" stateCode="CA" currencyCode="USD" city="Los Angeles, CA">
        <HistoryTab career={career} state={state} />
      </GameProvider>,
    )
  })
}

beforeEach(() => {
  mocks.entitlements = {
    status: 'ready',
    premium: false,
    hasFeature: () => false,
  }
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('HistoryTab premium access', () => {
  it('keeps the essential summary Free and locks charts plus full history with the standard copy', () => {
    render()

    expect(container.querySelector('.history-summary-grid')?.textContent).toContain('Movimentações')
    expect(container.querySelectorAll('.premium-gate-locked')).toHaveLength(3)
    expect([...container.querySelectorAll('.premium-gate-locked')].every((item) => item.textContent.includes(PREMIUM_LOCK_TEXT))).toBe(true)
    expect(container.querySelector('table')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('shows charts and full history when the Premium entitlements are enabled', () => {
    mocks.entitlements = {
      status: 'ready',
      premium: true,
      hasFeature: () => true,
    }
    render()

    expect(container.querySelector('.premium-gate-locked')).toBeNull()
    expect(container.querySelectorAll('table').length).toBeGreaterThanOrEqual(3)
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(1)
    expect(container.textContent).toContain('Primeiro')
    expect(container.textContent).toContain('Eventos da carreira')
  })
})
