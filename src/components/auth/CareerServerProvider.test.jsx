// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { markCareerImported } from '../../lib/careerMigration.js'
import { clearServerCareerState, getServerCareerOverlay } from '../../lib/careerServerState.js'

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, user: { id: 'user-1' } },
  get: vi.fn(),
  events: vi.fn(),
}))

vi.mock('./AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}))

vi.mock('../../lib/careerApi.js', () => ({
  careerApi: {
    get: mocks.get,
    events: mocks.events,
  },
}))

import CareerServerProvider from './CareerServerProvider.jsx'

let root
let container

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
  clearServerCareerState()
  mocks.auth = { isAuthenticated: true, user: { id: 'user-1' } }
  mocks.get.mockReset()
  mocks.events.mockReset()
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  localStorage.clear()
  clearServerCareerState()
  vi.restoreAllMocks()
})

describe('CareerServerProvider', () => {
  it('hydrates a completed import association from the authenticated backend career and events', async () => {
    markCareerImported(
      'user-1',
      { gameId: 'ats', sourceCareerId: 'local-1' },
      { operationId: 'op-1', careerId: 'server-1', summary: {} },
    )
    mocks.get.mockResolvedValue({
      id: 'server-1',
      driverName: 'Server Driver',
      companyName: 'Server Logistics',
      biography: '',
      currentLevel: 2,
      balance: 1000,
      baseCurrency: 'USD',
      displayCurrency: 'USD',
      exchangeRate: 1,
      stateCode: 'CA',
      baseCity: 'Los Angeles, CA',
      currentOperationalWeek: 2,
      version: 3,
    })
    mocks.events.mockResolvedValue([{ id: 'event-1', type: 'PROFILE_UPDATED', operationalWeek: 2 }])

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<CareerServerProvider><span>ready</span></CareerServerProvider>)
    })
    await flush()

    expect(mocks.get).toHaveBeenCalledWith('ats', 'server-1')
    expect(mocks.events).toHaveBeenCalledWith('ats', 'server-1')
    expect(getServerCareerOverlay({ id: 'local-1', driverName: 'Local Backup', events: [] }, 'ats')).toMatchObject({
      driverName: 'Server Driver',
      serverCareerId: 'server-1',
      serverVersion: 3,
      serverSyncStatus: 'ready',
    })
  })

  it('clears server career state when the session becomes anonymous', async () => {
    markCareerImported(
      'user-1',
      { gameId: 'ats', sourceCareerId: 'local-1' },
      { operationId: 'op-1', careerId: 'server-1', summary: {} },
    )
    mocks.get.mockResolvedValue({ id: 'server-1', driverName: 'Server Driver', version: 1 })
    mocks.events.mockResolvedValue([])

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<CareerServerProvider><span>ready</span></CareerServerProvider>)
    })
    await flush()

    mocks.auth = { isAuthenticated: false, user: null }
    await act(async () => {
      root.render(<CareerServerProvider><span>anonymous</span></CareerServerProvider>)
    })
    await flush()

    expect(getServerCareerOverlay({ id: 'local-1', driverName: 'Local Backup' }, 'ats')).toEqual({
      id: 'local-1',
      driverName: 'Local Backup',
    })
  })
})
