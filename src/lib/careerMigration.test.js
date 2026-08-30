// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { phase1StorageKey } from './phase1.js'
import {
  careersStorageKey,
  loadCareers,
  saveCareers,
} from './storage.js'
import {
  CAREER_IMPORT_SOURCE_VERSION,
  countPendingCareerImports,
  getCareerImportRecord,
  listCareerImportCandidates,
  markCareerImported,
  markCareerImportRecovered,
  prepareCareerImportPayload,
} from './careerMigration.js'

function atsCareer() {
  return {
    id: 'ats-local-1',
    gameId: 'ats',
    driverName: 'Ana Freight',
    city: 'Phoenix, AZ',
    company: 'Desert Logistics',
    stateCode: 'AZ',
    currency: 'USD',
    exchangeRate: 1,
    exchangeRateAsOf: '2026-08-01',
    currentLevel: 2,
    currentBalance: 4321.25,
  }
}

function ets2Career() {
  return {
    id: 'ets-local-1',
    gameId: 'ets2',
    driverName: 'Bruno Europe',
    city: 'Berlin',
    company: 'Euro Cargo',
    countryCode: 'DE',
    currency: 'EUR',
    exchangeRate: 1,
    exchangeRateAsOf: '2026-08-01',
    currentLevel: 3,
    currentBalance: 6100,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('career migration local bridge', () => {
  it('detects ATS and ETS2 snapshots and reuses the same operation id across validation retries', () => {
    saveCareers([atsCareer()], 'ats')
    saveCareers([ets2Career()], 'ets2')
    localStorage.setItem(phase1StorageKey('ats-local-1', 'ats'), JSON.stringify({
      balance: 4321.25,
      currentLevel: 2,
      currentWeek: 4,
      trips: [{ id: 1, week: 2, distance: 120, source: 'MANUAL' }],
      closedWeeks: [{ week: 2 }],
      incidents: [{ id: 2, type: 'Infração' }],
      history: [{ type: 'legacy-note' }],
    }))
    localStorage.setItem(phase1StorageKey('ets-local-1', 'ets2'), JSON.stringify({
      balance: 6100,
      currentLevel: 3,
      currentWeek: 7,
      currentPayrollMonth: 2,
      trips: [],
      closedWeeks: [],
      incidents: [],
    }))

    const candidates = listCareerImportCandidates('user-1')
    expect(candidates).toHaveLength(2)
    expect(candidates.map((candidate) => candidate.gameId)).toEqual(['ats', 'ets2'])
    expect(candidates[0].summary).toMatchObject({
      driverName: 'Ana Freight',
      currentOperationalWeek: 4,
      trips: 1,
      closedPeriods: 1,
      incidents: 1,
      careerEvents: 1,
    })
    expect(candidates[1].summary.currentPayrollMonth).toBe(2)

    const firstPayload = prepareCareerImportPayload('user-1', candidates[0])
    const retryPayload = prepareCareerImportPayload('user-1', candidates[0])
    expect(firstPayload.operationId).toBe(retryPayload.operationId)
    expect(firstPayload.operationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(firstPayload).toMatchObject({
      sourceCareerId: 'ats-local-1',
      game: 'ATS',
      sourceVersion: CAREER_IMPORT_SOURCE_VERSION,
      career: { id: 'ats-local-1', driverName: 'Ana Freight' },
      state: { balance: 4321.25, currentWeek: 4 },
    })
    expect(countPendingCareerImports('user-1')).toBe(2)
  })

  it('records only the server association after success and preserves the complete local career snapshot', () => {
    saveCareers([atsCareer()], 'ats')
    const stateKey = phase1StorageKey('ats-local-1', 'ats')
    localStorage.setItem(stateKey, JSON.stringify({
      balance: 4321.25,
      currentLevel: 2,
      currentWeek: 4,
      trips: [{ id: 1, week: 2, distance: 120, source: 'MANUAL' }],
      closedWeeks: [],
      incidents: [],
    }))

    const [candidate] = listCareerImportCandidates('user-1')
    const payload = prepareCareerImportPayload('user-1', candidate)
    markCareerImported('user-1', candidate, {
      operationId: payload.operationId,
      careerId: 'server-career-uuid',
      persisted: true,
      idempotentReplay: false,
      summary: { driverName: 'Ana Freight' },
    })

    expect(getCareerImportRecord('user-1', 'ats', 'ats-local-1')).toMatchObject({
      operationId: payload.operationId,
      serverCareerId: 'server-career-uuid',
      status: 'COMPLETED',
    })
    expect(countPendingCareerImports('user-1')).toBe(0)
    expect(loadCareers('ats')).toHaveLength(1)
    expect(localStorage.getItem(careersStorageKey('ats'))).not.toBeNull()
    expect(localStorage.getItem(stateKey)).toContain('4321.25')
    expect(listCareerImportCandidates('another-user')[0].imported).toBe(false)
  })

  it('restores a completed association without mixing users or games that share the same local id', () => {
    const sharedId = 'shared-local-id'
    saveCareers([{ ...atsCareer(), id: sharedId }], 'ats')
    saveCareers([{ ...ets2Career(), id: sharedId }], 'ets2')
    localStorage.setItem(phase1StorageKey(sharedId, 'ats'), JSON.stringify({ balance: 1000, currentWeek: 2 }))
    localStorage.setItem(phase1StorageKey(sharedId, 'ets2'), JSON.stringify({ balance: 2000, currentWeek: 3, currentPayrollMonth: 1 }))

    const candidates = listCareerImportCandidates('user-1')
    const atsCandidate = candidates.find((candidate) => candidate.gameId === 'ats')
    const ets2Candidate = candidates.find((candidate) => candidate.gameId === 'ets2')

    markCareerImportRecovered('user-1', atsCandidate, {
      operationId: '11111111-1111-4111-8111-111111111111',
      careerId: 'server-ats-career',
      persisted: true,
      idempotentReplay: true,
      summary: { driverName: 'Ana Freight' },
    })

    expect(getCareerImportRecord('user-1', 'ats', sharedId)).toMatchObject({
      serverCareerId: 'server-ats-career',
      status: 'COMPLETED',
      recoveredAt: expect.any(String),
    })
    expect(getCareerImportRecord('user-1', 'ets2', sharedId)).toBeNull()
    expect(getCareerImportRecord('another-user', 'ats', sharedId)).toBeNull()
    expect(listCareerImportCandidates('user-1').find((candidate) => candidate.gameId === 'ats').imported).toBe(true)
    expect(listCareerImportCandidates('user-1').find((candidate) => candidate.gameId === 'ets2').imported).toBe(false)

    markCareerImportRecovered('user-1', ets2Candidate, {
      operationId: '22222222-2222-4222-8222-222222222222',
      careerId: 'server-ets2-career',
      persisted: true,
      idempotentReplay: true,
      summary: { driverName: 'Bruno Europe' },
    })

    expect(getCareerImportRecord('user-1', 'ats', sharedId).serverCareerId).toBe('server-ats-career')
    expect(getCareerImportRecord('user-1', 'ets2', sharedId).serverCareerId).toBe('server-ets2-career')
    expect(loadCareers('ats')).toHaveLength(1)
    expect(loadCareers('ets2')).toHaveLength(1)
  })
})
