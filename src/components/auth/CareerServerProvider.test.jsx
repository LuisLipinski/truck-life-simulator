// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { markCareerImported } from '../../lib/careerMigration.js'
import { clearServerCareerState, getServerCareerOverlay, getServerCareerTrips } from '../../lib/careerServerState.js'

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, user: { id: 'user-1' } },
  list: vi.fn(),
  get: vi.fn(),
  events: vi.fn(),
  trips: vi.fn(),
}))

vi.mock('./AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}))

vi.mock('../../lib/careerApi.js', () => ({
  careerApi: {
    list: mocks.list,
    get: mocks.get,
    events: mocks.events,
  },
}))

vi.mock('../../lib/tripApi.js', () => ({
  tripApi: {
    list: mocks.trips,
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
  mocks.list.mockReset()
  mocks.events.mockReset()
  mocks.trips.mockReset()
  mocks.events.mockResolvedValue([])
  mocks.trips.mockResolvedValue([])
  mocks.list.mockResolvedValue([])
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
  it('blocks gameplay children while a migrated career is still waiting for server hydration', async () => {
    markCareerImported(
      'user-1',
      { gameId: 'ats', sourceCareerId: 'local-1' },
      { operationId: 'op-1', careerId: 'server-1', summary: {} },
    )

    let resolveCareer
    mocks.get.mockImplementation(() => new Promise((resolve) => {
      resolveCareer = resolve
    }))

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(
        <CareerServerProvider>
          <button type="button">Enviar viagem</button>
        </CareerServerProvider>,
      )
    })
    await flush()

    expect(mocks.get).toHaveBeenCalledWith('ats', 'server-1')
    expect(container.querySelector('button')).toBeNull()
    expect(container.textContent).toContain('Sincronizando com o servidor')

    await act(async () => {
      resolveCareer({ id: 'server-1', driverName: 'Server Driver', version: 1 })
      await Promise.resolve()
      await Promise.resolve()
    })
    await flush()

    expect(container.querySelector('button')?.textContent).toBe('Enviar viagem')
  })

  it('renders local-only careers immediately when there is no completed server association', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(
        <CareerServerProvider>
          <button type="button">Carreira local</button>
        </CareerServerProvider>,
      )
    })

    expect(container.querySelector('button')?.textContent).toBe('Carreira local')
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('discovers authenticated server careers when this browser has no local migration registry', async () => {
    const serverCareer = {
      id: 'server-cross-device', game: 'ATS', driverName: 'Cross Device Driver',
      companyName: 'Cloud Logistics', baseCity: 'Dallas, TX', stateCode: 'TX',
      currentLevel: 1, balance: 1250, baseCurrency: 'USD', displayCurrency: 'USD',
      exchangeRate: 1, currentOperationalWeek: 2, version: 3,
    }
    mocks.list.mockImplementation((gameId) => Promise.resolve(gameId === 'ats' ? [serverCareer] : []))

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<CareerServerProvider><span>ready</span></CareerServerProvider>)
    })
    await flush()

    expect(mocks.list).toHaveBeenCalledWith('ats')
    expect(mocks.list).toHaveBeenCalledWith('ets2')
    expect(mocks.get).not.toHaveBeenCalled()
    expect(getServerCareerOverlay({ id: 'server-cross-device', events: [] }, 'ats')).toMatchObject({
      driverName: 'Cross Device Driver',
      serverCareerId: 'server-cross-device',
      serverSyncStatus: 'ready',
    })
    expect(mocks.trips).toHaveBeenCalledWith('ats', 'server-cross-device')
  })

  it('hydrates a completed import association from the authenticated backend career, trips and events', async () => {
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
    mocks.trips.mockResolvedValue([{
      id: 'trip-1', operationalWeek: 2, departureDay: 'MONDAY', departureTime: '08:00:00',
      arrivalDay: 'MONDAY', arrivalTime: '10:00:00', originCity: 'Los Angeles, CA',
      destinationCity: 'San Diego, CA', type: 'LOADED', paymentCategory: 'NORMAL', officialDistance: '120.00',
      source: 'IMPORT', version: 1,
    }])
    mocks.events.mockResolvedValue([{ id: 'event-1', type: 'PROFILE_UPDATED', operationalWeek: 2 }])

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<CareerServerProvider><span>ready</span></CareerServerProvider>)
    })
    await flush()

    expect(mocks.get).toHaveBeenCalledWith('ats', 'server-1')
    expect(mocks.trips).toHaveBeenCalledWith('ats', 'server-1')
    expect(mocks.events).toHaveBeenCalledWith('ats', 'server-1')
    expect(getServerCareerOverlay({ id: 'local-1', driverName: 'Local Backup', events: [] }, 'ats')).toMatchObject({
      driverName: 'Server Driver',
      serverCareerId: 'server-1',
      serverVersion: 3,
      serverSyncStatus: 'ready',
      serverTripsStatus: 'ready',
    })
    expect(getServerCareerTrips('ats', 'local-1')).toMatchObject({
      status: 'ready',
      trips: [expect.objectContaining({ id: 'trip-1', week: 2, miles: 120, serverBacked: true })],
    })
  })

  it('keeps the server profile usable but marks trips unavailable if the trip list fails', async () => {
    markCareerImported(
      'user-1',
      { gameId: 'ats', sourceCareerId: 'local-1' },
      { operationId: 'op-1', careerId: 'server-1', summary: {} },
    )
    mocks.get.mockResolvedValue({ id: 'server-1', driverName: 'Server Driver', version: 1 })
    mocks.trips.mockRejectedValue(new Error('trip list failed'))

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<CareerServerProvider><span>ready</span></CareerServerProvider>)
    })
    await flush()

    expect(getServerCareerOverlay({ id: 'local-1', driverName: 'Local Backup' }, 'ats')).toMatchObject({
      driverName: 'Server Driver',
      serverSyncStatus: 'ready',
      serverTripsStatus: 'error',
    })
  })

  it('clears server career state when the session becomes anonymous', async () => {
    markCareerImported(
      'user-1',
      { gameId: 'ats', sourceCareerId: 'local-1' },
      { operationId: 'op-1', careerId: 'server-1', summary: {} },
    )
    mocks.get.mockResolvedValue({ id: 'server-1', driverName: 'Server Driver', version: 1 })

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
