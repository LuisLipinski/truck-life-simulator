// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACTIVE_CAREER_KEY,
  CAREERS_KEY,
  createCareer,
  deleteCareer,
  getActiveCareerId,
  getCareer,
  loadCareers,
  setActiveCareer,
  updateCareer,
} from './storage.js'
import {
  loadPhase1State,
  phase1StorageKey,
  savePhase1State,
} from './phase1.js'

describe('career and Phase 1 storage integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('creates a career, makes it active and loads a default Phase 1 state', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456)
    vi.spyOn(Math, 'random').mockReturnValue(0.25)

    const career = createCareer({
      driverName: 'Teste Driver',
      city: 'Los Angeles, CA',
      company: 'Pacific Horizon Logistics',
      initialBalance: 793,
      currentBalance: 793,
    })

    expect(loadCareers()).toHaveLength(1)
    expect(getActiveCareerId()).toBe(career.id)
    expect(getCareer(career.id)?.driverName).toBe('Teste Driver')

    const state = loadPhase1State(career.id)
    expect(state.balance).toBe(793)
    expect(state.emergencyReserve).toBe(0)
    expect(state.currentLevel).toBe(1)
    expect(state.currentWeek).toBe(1)
    expect(state.trips).toEqual([])
  })

  it('migrates an older ATS career to the state inferred from its city', () => {
    localStorage.setItem(CAREERS_KEY, JSON.stringify([{
      id: 'legacy_texas', driverName: 'Texas Driver', city: 'Dallas, TX', company: 'Lone Star Logistics', initialBalance: 900,
    }]))

    const [career] = loadCareers('ats')
    expect(career).toMatchObject({ gameId: 'ats', stateCode: 'TX', stateName: 'Texas', currency: 'USD', baseCurrency: 'USD', exchangeRate: 1, cityMarketLabel: 'Metrópole principal', cityCostFactor: 1.10, citySalaryFactor: 1.05 })
    expect(career.exchangeRateAsOf).toBe('2026-08-20')
  })

  it('preserves a previously stored city market snapshot', () => {
    localStorage.setItem(CAREERS_KEY, JSON.stringify([{
      id: 'snapshot_ca', driverName: 'Snapshot Driver', city: 'San Francisco, CA', company: 'Historic Logistics',
      stateCode: 'CA', currency: 'USD', initialBalance: 900,
      cityMarketLabel: 'Mercado histórico', cityCostFactor: 1.11, citySalaryFactor: 1.03,
    }]))

    const [career] = loadCareers('ats')
    expect(career).toMatchObject({ cityMarketLabel: 'Mercado histórico', cityCostFactor: 1.11, citySalaryFactor: 1.03 })
  })

  it('persists Phase 1 state and synchronizes balance and level back to the career record', () => {
    const career = createCareer({
      driverName: 'Teste Driver',
      city: 'Fresno, CA',
      company: 'Pacific Horizon Logistics',
      initialBalance: 793,
      currentBalance: 793,
    })

    const state = loadPhase1State(career.id)
    savePhase1State(career.id, {
      ...state,
      balance: 1540.25,
      emergencyReserve: 625.40,
      autoReserveContribution: { enabled: true, amount: 100 },
      currentLevel: 2,
      careerLevel: 2,
      currentWeek: 4,
      trips: [{ id: 1, week: 4, miles: 320, type: 'Loaded', payCategory: 'normal' }],
    })

    const restored = loadPhase1State(career.id)
    const syncedCareer = getCareer(career.id)

    expect(restored.balance).toBe(1540.25)
    expect(restored.emergencyReserve).toBe(625.40)
    expect(restored.autoReserveContribution).toEqual({ enabled: true, amount: 100 })
    expect(restored.currentLevel).toBe(2)
    expect(restored.currentWeek).toBe(4)
    expect(restored.trips).toHaveLength(1)
    expect(syncedCareer?.currentBalance).toBe(1540.25)
    expect(syncedCareer?.currentLevel).toBe(2)
    expect(localStorage.getItem(phase1StorageKey(career.id))).toBeTruthy()
  })

  it('normalizes older state fields while preserving compatibility', () => {
    const career = createCareer({
      driverName: 'Legacy Driver',
      city: 'Sacramento, CA',
      company: 'Pacific Horizon Logistics',
      initialBalance: 793,
    })

    localStorage.setItem(phase1StorageKey(career.id), JSON.stringify({
      balance: 900,
      careerLevel: 2,
      currentWeek: 3,
      expenses: { rent: 1200, emergency: 200 },
      trips: [{ id: 9, week: 2, miles: 100 }],
    }))

    const restored = loadPhase1State(career.id)
    expect(restored.currentLevel).toBe(2)
    expect(restored.careerLevel).toBe(2)
    expect(restored.balance).toBe(900)
    expect(restored.emergencyReserve).toBe(0)
    expect(restored.currentWeek).toBe(3)
    expect(restored.academy.level2).toBe(true)
    expect(restored.incidents).toEqual([])
    expect(restored.customExpenses).toEqual([])
    expect(restored.expenses.rent).toBe(1200)
    expect(restored.expenses).not.toHaveProperty('emergency')
  })

  it('clamps a negative imported reserve to zero during normalization', () => {
    const career = createCareer({ driverName: 'Reserve Clamp', initialBalance: 793 })
    localStorage.setItem(phase1StorageKey(career.id), JSON.stringify({
      balance: 793,
      emergencyReserve: -25,
    }))

    expect(loadPhase1State(career.id).emergencyReserve).toBe(0)
  })

  it('updates a career while preserving its identity and normalizing legacy events', () => {
    const career = createCareer({ driverName: 'Old Driver', city: 'Los Angeles, CA', company: 'Old Logistics', initialBalance: 793 })
    expect(getCareer(career.id).events).toEqual([])

    const updated = updateCareer(career.id, {
      driverName: 'Corrected Driver',
      events: [{ id: 'event_1', type: 'PROFILE_UPDATED', effectiveDate: '2026-08-22' }],
    })

    expect(updated).toMatchObject({ id: career.id, driverName: 'Corrected Driver' })
    expect(getCareer(career.id).events).toEqual([{ id: 'event_1', type: 'PROFILE_UPDATED', effectiveDate: '2026-08-22' }])
  })

  it('removes the active career pointer when that career is deleted', () => {
    const career = createCareer({ driverName: 'Delete Me' })
    setActiveCareer(career.id)
    expect(localStorage.getItem(ACTIVE_CAREER_KEY)).toBe(career.id)

    deleteCareer(career.id)

    expect(getCareer(career.id)).toBeNull()
    expect(localStorage.getItem(ACTIVE_CAREER_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toEqual([])
  })
})
