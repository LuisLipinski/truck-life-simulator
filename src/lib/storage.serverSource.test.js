// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  clearServerCareerState,
  replaceServerCareerBindings,
  setServerCareerSnapshot,
} from './careerServerState.js'
import { careersStorageKey, loadCareers, updateCareer } from './storage.js'

afterEach(() => {
  localStorage.clear()
  clearServerCareerState()
})

function localCareer() {
  return {
    id: 'local-1',
    gameId: 'ats',
    driverName: 'Backup Driver',
    company: 'Backup Logistics',
    bio: 'Backup bio',
    city: 'Los Angeles, CA',
    stateCode: 'CA',
    currency: 'USD',
    baseCurrency: 'USD',
    exchangeRate: 1,
    defaultTruckMake: 'Kenworth',
    defaultTruckModel: 'T680',
    currentLevel: 1,
    initialBalance: 1000,
    events: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
}

function serverCareer() {
  return {
    id: 'server-1',
    game: 'ATS',
    driverName: 'Server Driver',
    companyName: 'Server Logistics',
    biography: 'Server bio',
    currentLevel: 2,
    balance: 1500,
    baseCurrency: 'USD',
    displayCurrency: 'USD',
    exchangeRate: 1,
    exchangeRateAsOf: '2026-08-01',
    stateCode: 'TX',
    countryCode: null,
    baseCity: 'Dallas, TX',
    cityMarketVersion: 'v2',
    cityMarketLabel: 'Dallas',
    cityCostFactor: 1.1,
    citySalaryFactor: 1.05,
    currentOperationalWeek: 3,
    currentPayrollMonth: null,
    version: 4,
  }
}

describe('storage server career source', () => {
  it('reads migrated profile from memory while leaving the localStorage backup unchanged', () => {
    localStorage.setItem(careersStorageKey('ats'), JSON.stringify([localCareer()]))
    replaceServerCareerBindings([{ gameId: 'ats', sourceCareerId: 'local-1', serverCareerId: 'server-1' }])
    setServerCareerSnapshot('ats', 'local-1', serverCareer(), [])

    const career = loadCareers('ats')[0]
    const persisted = JSON.parse(localStorage.getItem(careersStorageKey('ats')))[0]

    expect(career).toMatchObject({
      id: 'local-1',
      driverName: 'Server Driver',
      company: 'Server Logistics',
      city: 'Dallas, TX',
      serverBacked: true,
      serverCareerId: 'server-1',
    })
    expect(persisted.driverName).toBe('Backup Driver')
    expect(persisted.company).toBe('Backup Logistics')
    expect(persisted.city).toBe('Los Angeles, CA')
  })

  it('can still persist a not-yet-cut-over field without copying server profile values into the backup', () => {
    localStorage.setItem(careersStorageKey('ats'), JSON.stringify([localCareer()]))
    replaceServerCareerBindings([{ gameId: 'ats', sourceCareerId: 'local-1', serverCareerId: 'server-1' }])
    setServerCareerSnapshot('ats', 'local-1', serverCareer(), [])

    const returned = updateCareer('local-1', { defaultTruckModel: 'W900' }, 'ats')
    const persisted = JSON.parse(localStorage.getItem(careersStorageKey('ats')))[0]

    expect(returned.driverName).toBe('Server Driver')
    expect(returned.defaultTruckModel).toBe('W900')
    expect(persisted.driverName).toBe('Backup Driver')
    expect(persisted.company).toBe('Backup Logistics')
    expect(persisted.defaultTruckModel).toBe('W900')
  })
})
