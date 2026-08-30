// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveCareers } from '../../lib/storage.js'
import SessionNavigation from './SessionNavigation.jsx'

const { authState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: true,
    user: { id: 'user-session', displayName: 'Road Driver' },
    logout: vi.fn(async () => {}),
  },
}))

vi.mock('./AuthProvider.jsx', () => ({
  useAuth: () => authState,
}))

let container
let root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  window.location.hash = '#/'
  saveCareers([{
    id: 'ats-local-session',
    gameId: 'ats',
    driverName: 'Road Driver',
    city: 'Phoenix, AZ',
    company: 'Session Freight',
    stateCode: 'AZ',
    currency: 'USD',
    exchangeRate: 1,
    exchangeRateAsOf: '2026-08-01',
  }], 'ats')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<SessionNavigation />))
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  localStorage.clear()
  window.location.hash = '#/'
  root = null
  container = null
})

describe('SessionNavigation career migration notice', () => {
  it('detects pending local careers immediately for an authenticated account', () => {
    const link = container.querySelector('.session-migration-link')
    expect(link).not.toBeNull()
    expect(link.textContent).toContain('Migrar 1 carreira')
    expect(link.getAttribute('href')).toBe('#/account')
  })
})
