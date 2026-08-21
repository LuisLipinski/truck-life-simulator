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
})
