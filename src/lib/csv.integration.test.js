// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importCareerCSVText, parseCSV } from './csv.js'
import { getCareer } from './storage.js'
import { loadPhase1State } from './phase1.js'

describe('CSV backup integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('parses quoted fields containing commas', () => {
    expect(parseCSV('A,"Los Angeles, CA",C\n')).toEqual([['A', 'Los Angeles, CA', 'C']])
  })

  it('imports CSV v7 with emergency reserve and reserve interest history fields', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1787220000000)
    vi.spyOn(Math, 'random').mockReturnValue(0.25)

    const csv = [
      'ATS_CAREER_BACKUP,7',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt',
      'CAREER,old,CSV Driver,"Los Angeles, CA",Test Logistics,5000,793,Teste,2026-08-20T10:00:00.000Z',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,hazmatQualified,emergencyReserve',
      'STATE,1500,2,5,1,0,1,625.4',
      'CLOSED_WEEK,week,closedAt,miles,level,gross,taxes,benefits,netSalary,perDiem,incidentDeduction,reserveInterest,deposit,desc',
      'CLOSED_WEEK,4,20/08/2026 10:00,500,2,300,70,36,194,80,0,0.39,274,Semana 4',
    ].join('\n')

    const result = importCareerCSVText(csv)
    const storedCareer = getCareer(result.career.id)
    const storedState = loadPhase1State(result.career.id)

    expect(result.version).toBe(7)
    expect(storedCareer.currentBalance).toBe(1500)
    expect(storedCareer.currentLevel).toBe(2)
    expect(storedState.emergencyReserve).toBe(625.4)
    expect(storedState.hazmatQualified).toBe(true)
    expect(storedState.closedWeeks[0]).toMatchObject({
      week: 4,
      reserveInterest: 0.39,
      deposit: 274,
    })
  })

  it('keeps old backups compatible by initializing reserve fields safely', () => {
    const csv = [
      'ATS_CAREER_BACKUP,6',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt',
      'CAREER,old,Legacy CSV Driver,Sacramento CA,Test Logistics,5000,793,,2026-08-20T10:00:00.000Z',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,hazmatQualified',
      'STATE,900,1,2,0,0,0',
    ].join('\n')

    const result = importCareerCSVText(csv)
    const storedState = loadPhase1State(result.career.id)
    expect(storedState.balance).toBe(900)
    expect(storedState.emergencyReserve).toBe(0)
  })
})
