// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { importCareerCSVText } from './csv.js'
import { getGame } from '../config/games.js'
import { currentPayrollTrips, estimateTaxes, getPromotionStatus, isTripWeekLocked, loadPhase1State, mileagePaySummary, payrollWeeks, phase1StorageKey, savePhase1State, totalMiles } from './phase1.js'
import { CAREERS_KEY, createCareer, ETS2_CAREERS_KEY, getActiveCareerId, getCareer, loadCareers } from './storage.js'

describe('ETS2 career domain', () => {
  beforeEach(() => localStorage.clear())

  it('keeps ATS and ETS2 careers and Phase 1 state isolated', () => {
    const ats = createCareer({ driverName: 'American Driver', initialBalance: 1000 }, 'ats')
    const ets2 = createCareer({ driverName: 'European Driver', initialBalance: 900 }, 'ets2')

    expect(loadCareers('ats').map((career) => career.id)).toEqual([ats.id])
    expect(loadCareers('ets2').map((career) => career.id)).toEqual([ets2.id])
    expect(localStorage.getItem(CAREERS_KEY)).toContain('American Driver')
    expect(localStorage.getItem(ETS2_CAREERS_KEY)).toContain('European Driver')
    expect(getActiveCareerId('ats')).toBe(ats.id)
    expect(getActiveCareerId('ets2')).toBe(ets2.id)

    const state = loadPhase1State(ets2.id, 'ets2')
    savePhase1State(ets2.id, { ...state, trips: [{ distance: 420, type: 'Loaded', payCategory: 'normal' }] }, 'ets2')
    expect(localStorage.getItem(phase1StorageKey(ets2.id, 'ets2'))).toBeTruthy()
    expect(localStorage.getItem(phase1StorageKey(ets2.id, 'ats'))).toBeNull()
  })

  it('calculates kilometers, national rates and promotion goals from the country profile', () => {
    const germany = getGame('ets2', 'DE')
    const trips = [
      { distance: 100, type: 'Loaded', payCategory: 'normal' },
      { distance: 100, type: 'Loaded', payCategory: 'hazmat' },
      { distance: 100, type: 'Loaded', payCategory: 'doubles' },
      { distance: 100, type: 'Deadhead', payCategory: 'normal' },
    ]
    expect(totalMiles({ trips })).toBe(400)
    expect(mileagePaySummary(trips, germany).gross).toBeCloseTo(123)
    expect(getPromotionStatus({ currentLevel: 1, trips: [{ distance: 15999 }], academy: {} }, germany).remaining).toBe(1)
    expect(getPromotionStatus({ currentLevel: 1, trips: [{ distance: 16000 }], academy: {} }, germany).ready).toBe(true)
    expect(getPromotionStatus({ currentLevel: 2, trips: [{ distance: 80000 }], academy: {} }, germany).ready).toBe(true)

    const deductions = estimateTaxes(2800, germany)
    expect(deductions.pensionInsurance).toBeCloseTo(260.4)
    expect(deductions.unemploymentInsurance).toBeCloseTo(36.4)
    expect(deductions.healthInsurance).toBeCloseTo(245)
    expect(deductions.careInsurance).toBeCloseTo(67.2)
    expect(deductions.incomeTax).toBeGreaterThan(0)
    expect(estimateTaxes(1000, 'ets2')).toEqual({})
  })

  it('applies tax thresholds in the country currency and returns deductions in the selected currency', () => {
    const britishInPounds = getGame('ets2', 'GB', 'GBP')
    const britishInEuro = getGame('ets2', 'GB', 'EUR')
    const localTaxes = estimateTaxes(britishInPounds.level1Gross, britishInPounds)
    const euroTaxes = estimateTaxes(britishInEuro.level1Gross, britishInEuro)

    expect(britishInEuro.baseCurrency).toBe('GBP')
    expect(britishInEuro.currency).toBe('EUR')
    expect(euroTaxes.incomeTax).toBeCloseTo(localTaxes.incomeTax * britishInEuro.exchangeRate)
    expect(euroTaxes.nationalInsurance).toBeCloseTo(localTaxes.nationalInsurance * britishInEuro.exchangeRate)
  })

  it('preserves a selected ETS2 currency and its exchange-rate snapshot in storage', () => {
    const britishInEuro = getGame('ets2', 'GB', 'EUR')
    const career = createCareer({
      driverName: 'London Euro Driver', city: 'Londres, Reino Unido', company: 'Euro Logistics',
      initialBalance: 1000, currentBalance: 1000, countryCode: 'GB', countryName: 'Reino Unido',
      currency: 'EUR', baseCurrency: 'GBP', exchangeRate: britishInEuro.exchangeRate, exchangeRateAsOf: '2026-08-20',
    }, 'ets2')

    expect(getCareer(career.id, 'ets2')).toMatchObject({
      countryCode: 'GB', currency: 'EUR', baseCurrency: 'GBP', exchangeRateAsOf: '2026-08-20',
    })
    expect(loadPhase1State(career.id, 'ets2').expenses.rent).toBeCloseTo(britishInEuro.expenses.rent)
  })

  it('groups closed operational weeks into the current monthly payroll', () => {
    const germany = getGame('ets2', 'DE')
    const state = {
      currentWeek: 5,
      payPeriodStartWeek: 1,
      closedOperationalWeeks: [1, 2, 3, 4],
      trips: [
        { id: 1, week: 1, distance: 100 },
        { id: 2, week: 4, distance: 250 },
        { id: 3, week: 5, distance: 500 },
      ],
    }

    expect(payrollWeeks(state, germany)).toEqual([1, 2, 3, 4])
    expect(currentPayrollTrips(state, germany).map((trip) => trip.id)).toEqual([1, 2])
    expect(isTripWeekLocked(state, 4, germany)).toBe(true)
    expect(isTripWeekLocked(state, 5, germany)).toBe(false)
  })

  it('imports an ETS2 backup into ETS2 storage and normalizes European terms', () => {
    const text = [
      'ETS2_CAREER_BACKUP,7',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt',
      'CAREER,,Euro Driver,"Berlin, Alemanha",Euro Logistics,3500,795,Bio,2026-08-20T00:00:00.000Z',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,adrQualified,emergencyReserve',
      'STATE,1200,2,3,1,0,1,100',
      'TRIP,id,week,departureAt,arrivalAt,origin,originCompany,destination,destinationCompany,cargo,type,payCategory,kilometers',
      'TRIP,1,3,2026-08-20T07:00,2026-08-20T10:00,"Berlin, Alemanha",Base,"Hannover, Alemanha",Cliente,,Reposicionamento vazio,empty,280',
      'CLOSED_WEEK,week,closedAt,kilometers,level,gross,taxes,benefits,netSalary,perDiem,incidentDeduction,reserveInterest,deposit,desc',
    ].join('\n')

    const result = importCareerCSVText(text, 'ets2')
    expect(result.gameId).toBe('ets2')
    expect(getCareer(result.career.id, 'ets2')?.city).toBe('Berlin, Alemanha')
    expect(getCareer(result.career.id, 'ats')).toBeNull()
    expect(result.state.trips[0]).toMatchObject({ type: 'Deadhead', payCategory: 'deadhead', distance: 280 })
    expect(result.state.dangerousGoodsQualified).toBe(true)
    expect(result.career.countryCode).toBe('DE')
    expect(result.career.currency).toBe('EUR')
  })

  it('imports backup v8 with country, currency and monthly payroll state', () => {
    const text = [
      'ETS2_CAREER_BACKUP,8',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt,countryCode,countryName,currency',
      'CAREER,,Polish Driver,"Warszawa, Polônia",Baltic Logistics,15000,9720,Bio,2026-08-20T00:00:00.000Z,PL,Polônia,PLN',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,adrQualified,emergencyReserve,currentPayrollMonth,payPeriodStartWeek,closedOperationalWeeks',
      'STATE,12000,1,5,0,0,0,500,2,5,1|2|3|4,1,250',
      'BASE_EXPENSE,name,value',
      'BASE_EXPENSE,rent,3200',
      'CLOSED_WEEK,week,closedAt,kilometers,level,gross,taxes,benefits,netSalary,perDiem,incidentDeduction,reserveInterest,deposit,desc,periodType,month,startWeek,endWeek,weeks,countryCode,currency,taxBreakdown',
      'CLOSED_WEEK,4,20/08/2026,900,1,10000,2500,0,7500,0,0,1.35,7500,Mês 1,month,1,1,4,1|2|3|4,PL,PLN,"{""incomeTax"":900}"',
    ].join('\n')

    const result = importCareerCSVText(text, 'ets2')
    expect(result.version).toBe(8)
    expect(result.career).toMatchObject({ countryCode: 'PL', countryName: 'Polônia', currency: 'PLN' })
    expect(result.state).toMatchObject({ currentWeek: 5, currentPayrollMonth: 2, payPeriodStartWeek: 5, closedOperationalWeeks: [1, 2, 3, 4] })
    expect(result.state.expenses.rent).toBe(3200)
    expect(result.state.autoReserveContribution).toEqual({ enabled: true, amount: 250 })
    expect(result.state.closedWeeks[0]).toMatchObject({ periodType: 'month', month: 1, weeks: [1, 2, 3, 4], countryCode: 'PL', currency: 'PLN', taxBreakdown: { incomeTax: 900 } })
  })

  it('imports backup v9 with an independent display currency and exchange-rate snapshot', () => {
    const text = [
      'ETS2_CAREER_BACKUP,9',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt,countryCode,countryName,currency,baseCurrency,exchangeRate,exchangeRateAsOf',
      'CAREER,,London Euro Driver,"Londres, Reino Unido",Euro Logistics,4082.99,1699.34,Bio,2026-08-20T00:00:00.000Z,GB,Reino Unido,EUR,GBP,1.1665208516,2026-08-20',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,adrQualified,emergencyReserve,currentPayrollMonth,payPeriodStartWeek,closedOperationalWeeks,autoReserveEnabled,autoReserveAmount',
      'STATE,2000,1,1,0,0,0,0,1,1,,0,0',
      'CLOSED_WEEK,week,closedAt,kilometers,level,gross,taxes,benefits,netSalary,perDiem,incidentDeduction,reserveInterest,deposit,desc,periodType,month,startWeek,endWeek,weeks,countryCode,currency,taxBreakdown,baseCurrency,exchangeRate,exchangeRateAsOf',
    ].join('\n')

    const result = importCareerCSVText(text, 'ets2')
    expect(result.version).toBe(9)
    expect(result.career).toMatchObject({ countryCode: 'GB', currency: 'EUR', baseCurrency: 'GBP', exchangeRateAsOf: '2026-08-20' })
    expect(result.career.exchangeRate).toBeCloseTo(1.1665208516)
    expect(result.state.expenses.rent).toBeCloseTo(1166.52)
  })
})
