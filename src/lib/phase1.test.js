import { describe, expect, it } from 'vitest'
import { getGame } from '../config/games.js'
import {
  EMERGENCY_RESERVE_ANNUAL_YIELD,
  applyPendingIncidentDeductions,
  currentWeekMiles,
  currentWeekTrips,
  estimateTaxes,
  getPromotionStatus,
  mileagePaySummary,
  monthlyExpenseTotal,
  normalizeTrip,
  normalizeTripSource,
  perDiemDaysForTrips,
  pendingIncidentTotal,
  routeOverrunSummary,
  suggestedTripBreakMinutes,
  totalMiles,
  tripBreakMinutes,
  tripOdometerDistance,
  tripPayCategory,
  tripVehicleLabel,
  validPayCategories,
  weeklyEmergencyReserveYield,
} from './phase1.js'

function makeState(overrides = {}) {
  return {
    trips: [],
    expenses: {},
    customExpenses: [],
    incidents: [],
    currentWeek: 1,
    currentLevel: 1,
    hazmatQualified: false,
    academy: { level2: false, level3: false },
    ...overrides,
  }
}

describe('Phase 1 mileage and weekly filters', () => {
  it('sums all career miles and only current-week miles separately', () => {
    const state = makeState({
      currentWeek: 2,
      trips: [
        { week: 1, miles: 100 },
        { week: 2, miles: 250 },
        { week: 2, miles: '50' },
      ],
    })

    expect(totalMiles(state)).toBe(400)
    expect(currentWeekTrips(state)).toHaveLength(2)
    expect(currentWeekMiles(state)).toBe(300)
  })
})

describe('telemetry-ready trip data', () => {
  it('derives an auxiliary odometer distance without changing the official distance', () => {
    const trip = { miles: 115, odometerStart: 48200.4, odometerEnd: 48320.9 }

    expect(tripOdometerDistance(trip)).toBe(120.5)
    expect(totalMiles(makeState({ trips: [trip] }))).toBe(115)
  })

  it('requires a complete, non-decreasing odometer pair for the derived distance', () => {
    expect(tripOdometerDistance({ odometerStart: 100 })).toBeNull()
    expect(tripOdometerDistance({ odometerStart: 100, odometerEnd: 99 })).toBeNull()
    expect(tripOdometerDistance({ odometerStart: -1, odometerEnd: 10 })).toBeNull()
  })

  it('normalizes supported sources and keeps legacy trips compatible', () => {
    expect(normalizeTripSource('telemetry')).toBe('TELEMETRY')
    expect(normalizeTripSource('unknown')).toBe('MANUAL')
    expect(normalizeTrip({ truckMake: '  Volvo ', truckModel: ' FH16 ', odometerStart: '10.5', odometerEnd: '20' })).toEqual({
      source: 'MANUAL', truckMake: 'Volvo', truckModel: 'FH16', odometerStart: 10.5, odometerEnd: 20,
    })
    expect(tripVehicleLabel({ truckMake: 'Volvo', truckModel: 'FH16' })).toBe('Volvo FH16')
  })
})

describe('Phase 1 pay categories and mileage pay', () => {
  it('forces deadhead category and calculates each mileage rate', () => {
    const trips = [
      { type: 'Loaded', payCategory: 'normal', miles: 100 },
      { type: 'Loaded', payCategory: 'hazmat', miles: 100 },
      { type: 'Loaded', payCategory: 'doubles', miles: 100 },
      { type: 'Loaded', payCategory: 'hazmat_doubles', miles: 100 },
      { type: 'Deadhead', payCategory: 'hazmat', miles: 100 },
    ]

    expect(tripPayCategory(trips[4])).toBe('deadhead')
    const summary = mileagePaySummary(trips)
    expect(summary.totals).toEqual({ normal: 100, hazmat: 100, doubles: 100, hazmat_doubles: 100, deadhead: 100 })
    expect(summary.gross).toBeCloseTo(304)
  })

  it('unlocks categories according to level and HazMat qualification', () => {
    expect(validPayCategories(makeState({ currentLevel: 1 }))).toEqual(['normal'])
    expect(validPayCategories(makeState({ currentLevel: 2 }))).toEqual(['normal'])
    expect(validPayCategories(makeState({ currentLevel: 2, hazmatQualified: true }))).toEqual(['normal', 'hazmat'])
    expect(validPayCategories(makeState({ currentLevel: 3 }))).toEqual(['normal', 'doubles'])
    expect(validPayCategories(makeState({ currentLevel: 3, hazmatQualified: true }))).toEqual(['normal', 'hazmat', 'doubles', 'hazmat_doubles'])
  })
})

describe('Phase 1 Level 1 route overrun', () => {
  it('counts only time beyond eight worked hours in the same day', () => {
    const summary = routeOverrunSummary([
      { departureAt: '2026-08-20T07:00:00', arrivalAt: '2026-08-20T12:00:00' },
      { departureAt: '2026-08-20T13:00:00', arrivalAt: '2026-08-20T18:30:00' },
    ])

    expect(summary.days).toHaveLength(1)
    expect(summary.days[0].hours).toBe(10.5)
    expect(summary.overrunHours).toBe(2.5)
    expect(summary.pay).toBe(53.13)
  })

  it('calculates the eight-hour threshold separately for each calendar day', () => {
    const summary = routeOverrunSummary([
      { departureAt: '2026-08-20T07:00:00', arrivalAt: '2026-08-20T16:00:00' },
      { departureAt: '2026-08-21T08:00:00', arrivalAt: '2026-08-21T18:00:00' },
    ])

    expect(summary.days.map((day) => day.overrunHours)).toEqual([1, 2])
    expect(summary.overrunHours).toBe(3)
  })

  it('splits a trip that crosses midnight into the correct calendar days', () => {
    const summary = routeOverrunSummary([
      { departureAt: '2026-08-20T20:00:00', arrivalAt: '2026-08-21T06:00:00' },
    ])

    expect(summary.days.map((day) => day.hours)).toEqual([4, 6])
    expect(summary.overrunHours).toBe(0)
  })

  it('suggests ETS2 driving breaks after each continued 4h30 block', () => {
    const firstBlock = { departureAt: '2026-08-20T07:00:00', arrivalAt: '2026-08-20T11:30:00' }
    const continuedFirstBlock = { ...firstBlock, arrivalAt: '2026-08-20T11:31:00' }
    const continuedSecondBlock = { ...firstBlock, arrivalAt: '2026-08-20T16:46:00' }

    expect(suggestedTripBreakMinutes(firstBlock, 'ets2')).toBe(0)
    expect(suggestedTripBreakMinutes(continuedFirstBlock, 'ets2')).toBe(45)
    expect(suggestedTripBreakMinutes(continuedSecondBlock, 'ets2')).toBe(90)
    expect(suggestedTripBreakMinutes(continuedSecondBlock, 'ats')).toBe(0)
  })

  it('deducts an ETS2 trip break before calculating the daily overtime balance', () => {
    const trip = {
      departureAt: '2026-08-20T07:00:00',
      arrivalAt: '2026-08-20T16:00:00',
      breakMinutes: 45,
    }
    const summary = routeOverrunSummary([trip], undefined, 20, 'ets2')

    expect(tripBreakMinutes(trip, 'ets2')).toBe(45)
    expect(summary.totalElapsedHours).toBe(9)
    expect(summary.totalBreakHours).toBe(0.75)
    expect(summary.totalHours).toBe(8.25)
    expect(summary.overrunHours).toBe(0.25)
    expect(summary.pay).toBe(5)
  })

  it('uses the ETS2 suggestion for legacy trips and lets an explicit pause override it', () => {
    const legacyTrip = { departureAt: '2026-08-20T07:00:00', arrivalAt: '2026-08-20T16:00:00' }
    const explicitTrip = { ...legacyTrip, breakMinutes: 30 }

    expect(tripBreakMinutes(legacyTrip, 'ets2')).toBe(45)
    expect(routeOverrunSummary([legacyTrip], undefined, 20, 'ets2').overrunHours).toBe(0.25)
    expect(routeOverrunSummary([explicitTrip], undefined, 20, 'ets2').overrunHours).toBe(0.5)
  })

  it('normalizes negative or invalid recorded pauses safely', () => {
    const trip = { departureAt: '2026-08-20T07:00:00', arrivalAt: '2026-08-20T16:00:00' }

    expect(tripBreakMinutes({ ...trip, breakMinutes: -30 }, 'ets2')).toBe(0)
    expect(tripBreakMinutes({ ...trip, breakMinutes: 'inválida' }, 'ets2')).toBe(45)
  })

  it('distributes a recorded break across both days when a trip crosses midnight', () => {
    const trip = {
      departureAt: '2026-08-20T20:00:00',
      arrivalAt: '2026-08-21T06:00:00',
      breakMinutes: 60,
    }
    const summary = routeOverrunSummary([trip], undefined, 20, 'ets2')

    expect(summary.days.map((day) => day.breakHours)).toEqual([0.4, 0.6])
    expect(summary.days.map((day) => day.hours)).toEqual([3.6, 5.4])
    expect(summary.totalBreakHours).toBe(1)
  })

  it('combines pauses from multiple trips on the same day before calculating overtime', () => {
    const summary = routeOverrunSummary([
      { departureAt: '2026-08-20T07:00:00', arrivalAt: '2026-08-20T12:00:00', breakMinutes: 30 },
      { departureAt: '2026-08-20T13:00:00', arrivalAt: '2026-08-20T18:30:00', breakMinutes: 30 },
    ], undefined, 20, 'ets2')

    expect(summary.days).toHaveLength(1)
    expect(summary.totalElapsedHours).toBe(10.5)
    expect(summary.totalBreakHours).toBe(1)
    expect(summary.totalHours).toBe(9.5)
    expect(summary.overrunHours).toBe(1.5)
  })
})

describe('Phase 1 per diem', () => {
  it('ignores same-day trips and deduplicates qualifying dates', () => {
    const trips = [
      { departureAt: '2026-08-20T08:00:00', arrivalAt: '2026-08-20T16:00:00' },
      { departureAt: '2026-08-20T20:00:00', arrivalAt: '2026-08-21T07:00:00' },
      { departureAt: '2026-08-21T18:00:00', arrivalAt: '2026-08-22T06:00:00' },
    ]

    expect(perDiemDaysForTrips(trips)).toEqual({
      days: 3,
      dates: ['2026-08-20', '2026-08-21', '2026-08-22'],
    })
  })
})

describe('Phase 1 expenses, reserve, taxes and incidents', () => {
  it('adds fixed and monthly custom expenses only', () => {
    const state = makeState({
      expenses: { rent: 1000, phone: 50 },
      customExpenses: [
        { value: 25, monthly: true },
        { value: 40, monthly: false },
      ],
    })
    expect(monthlyExpenseTotal(state)).toBe(1075)
  })

  it('ignores the discontinued legacy reserve field in monthly expenses', () => {
    const state = makeState({
      expenses: { rent: 1000, phone: 50, emergency: 200 },
      customExpenses: [{ value: 25, monthly: true }],
    })
    expect(monthlyExpenseTotal(state)).toBe(1075)
  })

  it('calculates reserve yield proportionally using the annual simulated rate', () => {
    expect(weeklyEmergencyReserveYield(200)).toBeCloseTo(200 * EMERGENCY_RESERVE_ANNUAL_YIELD / 52, 12)
    expect(weeklyEmergencyReserveYield(5000)).toBeCloseTo(5000 * EMERGENCY_RESERVE_ANNUAL_YIELD / 52, 12)
    expect(weeklyEmergencyReserveYield(5000)).toBeGreaterThan(weeklyEmergencyReserveYield(200))
    expect(weeklyEmergencyReserveYield(0)).toBe(0)
    expect(weeklyEmergencyReserveYield(-10)).toBe(0)
  })

  it('uses the 2026 federal and state profile selected for the ATS career', () => {
    const california = estimateTaxes(1080, getGame('ats', 'CA'))
    const texas = estimateTaxes(1080, getGame('ats', 'TX'))
    const washington = estimateTaxes(1080, getGame('ats', 'WA'))

    expect(california.federal).toBeCloseTo(87.6769)
    expect(california.ss).toBeCloseTo(66.96)
    expect(california.medicare).toBeCloseTo(15.66)
    expect(california.stateIncomeTax).toBeGreaterThan(0)
    expect(california.statePayroll).toBeCloseTo(14.04)
    expect(texas.stateIncomeTax).toBeUndefined()
    expect(texas.statePayroll).toBeUndefined()
    expect(washington.stateIncomeTax).toBeUndefined()
    expect(washington.statePayroll).toBeCloseTo(6.264)
  })

  it('applies incident deductions in order and carries the remainder', () => {
    const incidents = [
      { id: 1, remaining: 100, status: 'Pendente' },
      { id: 2, remaining: 80, status: 'Pendente' },
    ]

    expect(pendingIncidentTotal(makeState({ incidents }))).toBe(180)
    const result = applyPendingIncidentDeductions(incidents, 130)
    expect(result.applied).toBe(130)
    expect(result.incidents[0].remaining).toBe(0)
    expect(result.incidents[0].status).toBe('Descontado no holerite')
    expect(result.incidents[1].remaining).toBe(50)
    expect(result.incidents[1].status).toBe('Parcialmente descontado'
    )
  })
})

describe('Phase 1 promotions', () => {
  it('does not unlock Level 2 before 10,000 total miles', () => {
    const level1 = makeState({ currentLevel: 1, trips: [{ miles: 9999 }] })
    expect(getPromotionStatus(level1)).toMatchObject({ ready: false, nextLevel: 2, remaining: 1 })
  })

  it('unlocks Level 2 exactly at 10,000 total miles', () => {
    const level1 = makeState({ currentLevel: 1, trips: [{ miles: 10000 }] })
    expect(getPromotionStatus(level1)).toMatchObject({ ready: true, nextLevel: 2, remaining: 0 })
  })

  it('does not unlock Level 3 before 50,000 total miles', () => {
    const level2 = makeState({ currentLevel: 2, trips: [{ miles: 49999 }] })
    expect(getPromotionStatus(level2)).toMatchObject({ ready: false, nextLevel: 3, remaining: 1 })
  })

  it('unlocks Level 3 exactly at 50,000 total miles', () => {
    const level2 = makeState({ currentLevel: 2, trips: [{ miles: 50000 }] })
    expect(getPromotionStatus(level2)).toMatchObject({ ready: true, nextLevel: 3, remaining: 0 })
  })

  it('keeps Level 3 as the maximum of Phase 1', () => {
    const max = makeState({ currentLevel: 3, trips: [{ miles: 80000 }] })
    expect(getPromotionStatus(max)).toMatchObject({ ready: false, nextLevel: null, remaining: 0 })
  })
})
