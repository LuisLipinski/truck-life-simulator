// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { importCareerCSVText } from './csv.js'
import { estimateTaxes, getPromotionStatus, loadPhase1State, mileagePaySummary, phase1StorageKey, savePhase1State, totalMiles } from './phase1.js'
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

  it('calculates kilometers, ETS2 rates, European deductions and promotion goals', () => {
    const trips = [
      { distance: 100, type: 'Loaded', payCategory: 'normal' },
      { distance: 100, type: 'Loaded', payCategory: 'hazmat' },
      { distance: 100, type: 'Loaded', payCategory: 'doubles' },
      { distance: 100, type: 'Deadhead', payCategory: 'normal' },
    ]
    expect(totalMiles({ trips })).toBe(400)
    expect(mileagePaySummary(trips, 'ets2').gross).toBeCloseTo(145)
    expect(getPromotionStatus({ currentLevel: 1, trips: [{ distance: 15999 }], academy: {} }, 'ets2').remaining).toBe(1)
    expect(getPromotionStatus({ currentLevel: 1, trips: [{ distance: 16000 }], academy: {} }, 'ets2').ready).toBe(true)
    expect(getPromotionStatus({ currentLevel: 2, trips: [{ distance: 80000 }], academy: {} }, 'ets2').ready).toBe(true)
    expect(estimateTaxes(1000, 'ets2')).toEqual({ incomeTax: 160, socialInsurance: 90, solidarity: 15 })
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
  })
})
