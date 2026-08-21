import { describe, expect, it } from 'vitest'
import { formatDistance, formatMoney, getGame } from './games.js'

describe('Euro Truck Simulator 2 configuration', () => {
  it('uses European routes, cities, currency, distance and official app links', () => {
    const ets2 = getGame('ets2')
    expect(ets2.routes).toEqual({ careers: '/ets2', new: '/ets2/new', phases: '/ets2/phases', phase1: '/ets2/phase1' })
    expect(ets2.cities).toContain('Berlin, Alemanha')
    expect(ets2.cities).toContain('Lisboa, Portugal')
    expect(ets2.cities.length).toBeGreaterThan(200)
    expect(ets2.currency).toBe('EUR')
    expect(ets2.distanceUnit).toBe('km')
    expect(ets2.storeUrl).toContain('/227300/')
    expect(ets2.workshopUrl).toContain('/227300/')
  })

  it('formats the ETS2 economy as euro and kilometers', () => {
    expect(formatMoney(1234.5, 'ets2')).toContain('€')
    expect(formatDistance(16000, 'ets2')).toContain('km')
    expect(formatDistance(16000, 'ets2')).not.toContain('mi')
  })

  it('loads country-specific base cities, currencies and monthly payroll profiles', () => {
    const germany = getGame('ets2', 'DE')
    const unitedKingdom = getGame('ets2', 'GB')
    const poland = getGame('ets2', 'PL')

    expect(germany.baseCities).toContain('Berlin, Alemanha')
    expect(germany.baseCities.every((city) => city.endsWith(', Alemanha'))).toBe(true)
    expect(germany.currency).toBe('EUR')
    expect(unitedKingdom.currency).toBe('GBP')
    expect(unitedKingdom.baseCities).toContain('Londres, Reino Unido')
    expect(poland.currency).toBe('PLN')
    expect(poland.baseCities).toContain('Warszawa, Polônia')
    expect([germany, unitedKingdom, poland].every((game) => game.payrollPeriod === 'monthly')).toBe(true)
    expect([germany, unitedKingdom, poland].every((game) => game.taxes.length > 0)).toBe(true)
  })

  it('keeps the fiscal country currency separate from the career display currency', () => {
    const londonInEuro = getGame('ets2', 'GB', 'EUR')

    expect(londonInEuro.baseCurrency).toBe('GBP')
    expect(londonInEuro.currency).toBe('EUR')
    expect(londonInEuro.exchangeRate).toBeCloseTo(1 / 0.85725)
    expect(londonInEuro.level1Gross).toBeCloseTo(3032.95, 1)
    expect(londonInEuro.setupCosts.rent).toBeCloseTo(1166.52, 1)
    expect(londonInEuro.currencyOptions.map((currency) => currency.code)).toEqual(expect.arrayContaining(['EUR', 'GBP', 'PLN', 'CHF', 'RSD']))
  })
})
