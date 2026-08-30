// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  clearServerCareerState,
  getActiveServerCareerId,
  getServerCareerOverlay,
  markServerCareerUnavailable,
  replaceServerCareerBindings,
  setActiveServerCareerForLocal,
  setServerCareerSnapshot,
} from './careerServerState.js'

afterEach(() => clearServerCareerState())

describe('server career state', () => {
  it('overlays server profile without mutating the local backup object', () => {
    const local = {
      id: 'local-1',
      driverName: 'Nome antigo',
      company: 'Empresa antiga',
      city: 'Los Angeles, CA',
      stateCode: 'CA',
      currency: 'USD',
      defaultTruckMake: 'Kenworth',
      events: [{ id: 'legacy-event', type: 'PROFILE_UPDATED' }],
    }
    replaceServerCareerBindings([{ gameId: 'ats', sourceCareerId: 'local-1', serverCareerId: 'server-1' }])
    setServerCareerSnapshot('ats', 'local-1', {
      id: 'server-1',
      driverName: 'Nome servidor',
      companyName: 'Empresa servidor',
      biography: 'Bio servidor',
      currentLevel: 2,
      balance: 1250.5,
      baseCurrency: 'USD',
      displayCurrency: 'USD',
      exchangeRate: 1,
      stateCode: 'TX',
      baseCity: 'Dallas, TX',
      cityMarketVersion: 'v2',
      cityMarketLabel: 'Dallas',
      cityCostFactor: 1.1,
      citySalaryFactor: 1.05,
      currentOperationalWeek: 4,
      currentPayrollMonth: null,
      version: 9,
    }, [{ id: 'server-event', type: 'EMPLOYER_CHANGED', operationalWeek: 4, effectiveDay: 'monday', changes: {} }])

    const overlay = getServerCareerOverlay(local, 'ats')

    expect(overlay).toMatchObject({
      id: 'local-1',
      driverName: 'Nome servidor',
      company: 'Empresa servidor',
      city: 'Dallas, TX',
      stateCode: 'TX',
      defaultTruckMake: 'Kenworth',
      serverBacked: true,
      serverCareerId: 'server-1',
      serverVersion: 9,
      serverSyncStatus: 'ready',
    })
    expect(overlay.events).toHaveLength(2)
    expect(overlay.events[1]).toMatchObject({ effectiveDate: 'monday', operationalWeek: 4, serverBacked: true })
    expect(local.driverName).toBe('Nome antigo')
    expect(local.company).toBe('Empresa antiga')
  })

  it('keeps ATS and ETS2 bindings isolated even when local ids are equal', () => {
    replaceServerCareerBindings([
      { gameId: 'ats', sourceCareerId: 'same-id', serverCareerId: 'ats-server' },
      { gameId: 'ets2', sourceCareerId: 'same-id', serverCareerId: 'ets-server' },
    ])
    setActiveServerCareerForLocal('ats', 'same-id')
    setActiveServerCareerForLocal('ets2', 'same-id')

    expect(getActiveServerCareerId('ats')).toBe('ats-server')
    expect(getActiveServerCareerId('ets2')).toBe('ets-server')
  })

  it('marks an associated career as server-backed even while the backend is temporarily unavailable', () => {
    replaceServerCareerBindings([{ gameId: 'ats', sourceCareerId: 'local-1', serverCareerId: 'server-1' }])
    markServerCareerUnavailable('ats', 'local-1')

    expect(getServerCareerOverlay({ id: 'local-1', driverName: 'Backup local' }, 'ats')).toMatchObject({
      driverName: 'Backup local',
      serverBacked: true,
      serverCareerId: 'server-1',
      serverVersion: null,
      serverSyncStatus: 'error',
    })
  })
})
