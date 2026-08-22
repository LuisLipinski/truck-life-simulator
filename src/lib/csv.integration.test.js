// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CAREER_TABLE_HEADERS, createCareerTableRows, createCareerTemplateRows, importCareerCSVText, parseCSV } from './csv.js'
import { CAREERS_KEY, getCareer } from './storage.js'
import { loadPhase1State } from './phase1.js'

function rowsToCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }).join(',')).join('\n')
}

describe('CSV backup integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('parses quoted fields containing commas', () => {
    expect(parseCSV('A,"Los Angeles, CA",C\n')).toEqual([['A', 'Los Angeles, CA', 'C']])
  })

  it('creates a simple template with headers first and one career per following row', () => {
    const rows = createCareerTemplateRows('ats')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(CAREER_TABLE_HEADERS)
    expect(rows[1][CAREER_TABLE_HEADERS.indexOf('Nome do motorista *')]).toBe('Seu Nome')
    expect(rows[1][CAREER_TABLE_HEADERS.indexOf('Formato [não editar]')]).toBe('ATS_CAREERS_TABLE')
  })

  it('imports multiple careers from consecutive table rows', () => {
    const rows = createCareerTemplateRows('ats')
    const secondCareer = [...rows[1]]
    secondCareer[CAREER_TABLE_HEADERS.indexOf('Nome do motorista *')] = 'Texas Driver'
    secondCareer[CAREER_TABLE_HEADERS.indexOf('Cidade-base *')] = 'Dallas, TX'
    secondCareer[CAREER_TABLE_HEADERS.indexOf('Empresa *')] = 'Lone Star Logistics'
    secondCareer[CAREER_TABLE_HEADERS.indexOf('Código da sede financeira *')] = 'TX'
    rows.push(secondCareer)

    const result = importCareerCSVText(rowsToCsv(rows), 'ats')
    const stored = JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')

    expect(result.count).toBe(2)
    expect(result.careers.map((career) => career.driverName)).toEqual(['Seu Nome', 'Texas Driver'])
    expect(stored).toHaveLength(2)
    expect(stored[1]).toMatchObject({ city: 'Dallas, TX', stateCode: 'TX', stateName: 'Texas' })
    expect(loadPhase1State(stored[1].id).currentWeek).toBe(1)
  })

  it('round-trips a complete career in a single data row', () => {
    const career = {
      id: 'career_original', gameId: 'ats', driverName: 'Backup Driver', city: 'Los Angeles, CA', company: 'Pacific Logistics',
      stateCode: 'CA', stateName: 'California', currency: 'USD', baseCurrency: 'USD', exchangeRate: 1, exchangeRateAsOf: '2026-08-20',
      arrivalBalance: 5000, initialBalance: 793, currentBalance: 1200, currentLevel: 2, bio: 'Backup completo',
      setupCosts: { rent: 1650, deposit: 1650, license: 100 }, createdAt: '2026-08-20T10:00:00.000Z',
      events: [{ id: 'event_1', type: 'EMPLOYER_CHANGED', effectiveDate: '2026-08-21', changes: { company: { previous: 'Old Co', next: 'Pacific Logistics' } } }],
    }
    const state = {
      balance: 1200, emergencyReserve: 250, currentLevel: 2, careerLevel: 2, currentWeek: 4,
      expenses: { rent: 1650 }, history: [{ desc: 'Teste', value: 10 }],
      trips: [{ id: 1, week: 3, origin: 'Los Angeles, CA', destination: 'Fresno, CA', miles: 220, type: 'Loaded', truckMake: 'Kenworth', truckModel: 'T680', odometerStart: 1200, odometerEnd: 1425, source: 'MANUAL' }],
      customExpenses: [{ id: 'exp_1', name: 'Lavanderia', value: 25, monthly: true }], incidents: [], closedWeeks: [],
      academy: { level2: true, level3: false }, hazmatQualified: true, dangerousGoodsQualified: true,
    }
    const rows = createCareerTableRows([{ career, state }], 'ats')

    expect(rows).toHaveLength(2)
    const result = importCareerCSVText(rowsToCsv(rows), 'ats')
    const importedState = loadPhase1State(result.career.id)

    expect(result.career.id).not.toBe(career.id)
    expect(result.career).toMatchObject({ driverName: 'Backup Driver', currentBalance: 1200, currentLevel: 2, events: career.events })
    expect(importedState).toMatchObject({ balance: 1200, emergencyReserve: 250, currentWeek: 4 })
    expect(importedState.trips).toEqual(state.trips)
    expect(importedState.customExpenses).toEqual(state.customExpenses)
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

  it('imports backup v10 with ATS state, display currency and tax snapshot', () => {
    const csv = [
      'ATS_CAREER_BACKUP,10',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt,countryCode,countryName,currency,baseCurrency,exchangeRate,exchangeRateAsOf,stateCode,stateName',
      'CAREER,,Euro Texas Driver,"Dallas, TX",Lone Star Logistics,3500,1425,Bio,2026-08-20T10:00:00.000Z,,,EUR,USD,0.856090,2026-08-20,TX,Texas',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,hazmatQualified,emergencyReserve,currentPayrollMonth,payPeriodStartWeek,closedOperationalWeeks,autoReserveEnabled,autoReserveAmount',
      'STATE,1500,1,2,0,0,0,100,1,1,,0,0',
      'CLOSED_WEEK,week,closedAt,miles,level,gross,taxes,benefits,netSalary,perDiem,incidentDeduction,reserveInterest,deposit,desc,periodType,month,startWeek,endWeek,weeks,countryCode,currency,taxBreakdown,baseCurrency,exchangeRate,exchangeRateAsOf,stateCode,stateName',
      'CLOSED_WEEK,1,20/08/2026,400,1,924,160,30,734,0,0,0.06,734,Semana 1,week,,1,1,1,,EUR,"{""federal"":75}",USD,0.856090,2026-08-20,TX,Texas',
    ].join('\n')

    const result = importCareerCSVText(csv, 'ats')
    expect(result.version).toBe(10)
    expect(result.career).toMatchObject({ stateCode: 'TX', stateName: 'Texas', currency: 'EUR', baseCurrency: 'USD', cityMarketLabel: 'Metrópole principal', cityCostFactor: 1.10, citySalaryFactor: 1.05 })
    expect(result.career.exchangeRate).toBeCloseTo(0.85609)
    expect(result.state.closedWeeks[0]).toMatchObject({ stateCode: 'TX', stateName: 'Texas', currency: 'EUR', baseCurrency: 'USD', city: 'Dallas, TX', cityCostFactor: 1.10, citySalaryFactor: 1.05 })
  })

  it('imports backup v11 with immutable city market snapshots', () => {
    const csv = [
      'ETS2_CAREER_BACKUP,11',
      'CAREER,id,driverName,city,company,arrivalBalance,initialBalance,bio,createdAt,countryCode,countryName,currency,baseCurrency,exchangeRate,exchangeRateAsOf,stateCode,stateName,cityMarketVersion,cityMarketLabel,cityCostFactor,citySalaryFactor',
      'CAREER,,Historic London Driver,"Londres, Reino Unido",Historic Logistics,4000,1200,Bio,2026-08-20T10:00:00.000Z,GB,Reino Unido,EUR,GBP,1.166521,2026-08-20,,,1,Mercado histórico,1.19,1.07',
      'STATE,balance,careerLevel,currentWeek,academyLevel2,academyLevel3,adrQualified,emergencyReserve,currentPayrollMonth,payPeriodStartWeek,closedOperationalWeeks,autoReserveEnabled,autoReserveAmount',
      'STATE,1500,2,5,1,0,1,100,2,5,,0,0',
      'CLOSED_WEEK,week,closedAt,kilometers,level,gross,taxes,benefits,netSalary,perDiem,incidentDeduction,reserveInterest,deposit,desc,periodType,month,startWeek,endWeek,weeks,countryCode,currency,taxBreakdown,baseCurrency,exchangeRate,exchangeRateAsOf,stateCode,stateName,city,cityMarketLabel,cityCostFactor,citySalaryFactor',
      'CLOSED_WEEK,4,20/08/2026,1200,2,3000,700,0,2300,180,0,0.06,2480,Mês 1,month,1,1,4,1|2|3|4,GB,EUR,"{""incomeTax"":700}",GBP,1.166521,2026-08-20,,,"Londres, Reino Unido",Mercado histórico,1.19,1.07',
    ].join('\n')

    const result = importCareerCSVText(csv, 'ets2')
    expect(result.version).toBe(11)
    expect(result.career).toMatchObject({ countryCode: 'GB', city: 'Londres, Reino Unido', cityMarketLabel: 'Mercado histórico', cityCostFactor: 1.19, citySalaryFactor: 1.07 })
    expect(result.state.closedWeeks[0]).toMatchObject({ city: 'Londres, Reino Unido', cityMarketLabel: 'Mercado histórico', cityCostFactor: 1.19, citySalaryFactor: 1.07 })
  })
})
