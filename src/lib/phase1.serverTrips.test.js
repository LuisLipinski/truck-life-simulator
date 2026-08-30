// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  clearServerCareerState,
  replaceServerCareerBindings,
  serverTripToPhase1Trip,
  setServerCareerSnapshot,
  setServerCareerTrips,
} from './careerServerState.js'
import { loadPhase1State, phase1StorageKey, savePhase1State } from './phase1.js'
import { careersStorageKey } from './storage.js'

function localCareer(gameId = 'ats') {
  return {
    id: 'local-1',
    gameId,
    driverName: 'Backup Driver',
    company: 'Backup Logistics',
    bio: 'Backup bio',
    city: gameId === 'ats' ? 'Los Angeles, CA' : 'Berlin, Germany',
    stateCode: gameId === 'ats' ? 'CA' : undefined,
    countryCode: gameId === 'ets2' ? 'DE' : undefined,
    currency: gameId === 'ats' ? 'USD' : 'EUR',
    baseCurrency: gameId === 'ats' ? 'USD' : 'EUR',
    exchangeRate: 1,
    currentLevel: 1,
    initialBalance: 1000,
    events: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
}

function serverCareer(game = 'ATS') {
  return {
    id: 'server-1',
    game,
    driverName: 'Server Driver',
    companyName: 'Server Logistics',
    biography: '',
    currentLevel: 1,
    balance: 1000,
    baseCurrency: game === 'ATS' ? 'USD' : 'EUR',
    displayCurrency: game === 'ATS' ? 'USD' : 'EUR',
    exchangeRate: 1,
    stateCode: game === 'ATS' ? 'CA' : null,
    countryCode: game === 'ETS2' ? 'DE' : null,
    baseCity: game === 'ATS' ? 'Los Angeles, CA' : 'Berlin, Germany',
    currentOperationalWeek: 4,
    version: 2,
  }
}

function serverTrip(overrides = {}) {
  return {
    id: 'trip-server-1',
    operationalWeek: 4,
    departureDay: 'MONDAY',
    departureTime: '08:05:00',
    arrivalDay: 'MONDAY',
    arrivalTime: '12:30:00',
    originCity: 'Los Angeles, CA',
    originCompany: 'Server Logistics',
    destinationCity: 'San Diego, CA',
    destinationCompany: 'Customer',
    cargo: 'Food',
    type: 'LOADED',
    paymentCategory: 'NORMAL',
    officialDistance: '121.50',
    breakMinutes: 30,
    truckMake: 'Kenworth',
    truckModel: 'T680',
    odometerStart: '1000.0',
    odometerEnd: '1124.5',
    source: 'IMPORT',
    employerSnapshot: { companyName: 'Server Logistics' },
    baseSnapshot: { city: 'Los Angeles, CA' },
    version: 1,
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z',
    ...overrides,
  }
}

afterEach(() => {
  localStorage.clear()
  clearServerCareerState()
})

describe('phase1 server trip source', () => {
  it('maps authoritative ATS and ETS2 trips into the legacy calculation shape without persisting gameplay dates', () => {
    const ats = serverTripToPhase1Trip(serverTrip(), 'ats')
    const ets2 = serverTripToPhase1Trip(serverTrip({ officialDistance: '195.25' }), 'ets2')

    expect(ats).toMatchObject({
      id: 'trip-server-1',
      serverTripId: 'trip-server-1',
      serverBacked: true,
      week: 4,
      departureDay: 'monday',
      departureTime: '08:05',
      arrivalTime: '12:30',
      miles: 121.5,
      payCategory: 'normal',
      source: 'IMPORT',
      truckMake: 'Kenworth',
      odometerEnd: 1124.5,
    })
    expect(ats.departureAt).toBeTruthy()
    expect(ets2.distance).toBe(195.25)
    expect(ets2.miles).toBeUndefined()
  })

  it('reads server trips and server operational week while preserving the original local trip backup on every save', () => {
    localStorage.setItem(careersStorageKey('ats'), JSON.stringify([localCareer('ats')]))
    localStorage.setItem(phase1StorageKey('local-1', 'ats'), JSON.stringify({
      balance: 1000,
      currentLevel: 1,
      currentWeek: 2,
      trips: [{ id: 77, week: 2, origin: 'Local Backup', destination: 'Archive', miles: 10, source: 'MANUAL' }],
    }))
    replaceServerCareerBindings([{ gameId: 'ats', sourceCareerId: 'local-1', serverCareerId: 'server-1' }])
    setServerCareerSnapshot('ats', 'local-1', serverCareer('ATS'), [])
    setServerCareerTrips('ats', 'local-1', [serverTrip()])

    const state = loadPhase1State('local-1', 'ats')
    expect(state.currentWeek).toBe(4)
    expect(state.trips).toHaveLength(1)
    expect(state.trips[0]).toMatchObject({ id: 'trip-server-1', miles: 121.5, serverBacked: true })

    savePhase1State('local-1', { ...state, balance: 1100, tripDraft: { origin: 'Draft' } }, 'ats')

    const persistedState = JSON.parse(localStorage.getItem(phase1StorageKey('local-1', 'ats')))
    const persistedCareer = JSON.parse(localStorage.getItem(careersStorageKey('ats')))[0]
    expect(persistedState.currentWeek).toBe(2)
    expect(persistedState.trips).toEqual([expect.objectContaining({ id: 77, origin: 'Local Backup' })])
    expect(persistedState.tripDraft).toEqual({ origin: 'Draft' })
    expect(persistedCareer.driverName).toBe('Backup Driver')
    expect(persistedCareer.company).toBe('Backup Logistics')
  })
})
