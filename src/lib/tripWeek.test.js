import { describe, expect, it } from 'vitest'
import { buildWeeklyDateTimeRange, formatTripWeekMoment, weekdayLabel } from './tripWeek.js'

describe('tripWeek', () => {
  it('builds a trip range inside the same weekday', () => {
    expect(buildWeeklyDateTimeRange('monday', '08:30', 'monday', '12:45')).toEqual({
      departureAt: '2000-01-03T08:30:00',
      arrivalAt: '2000-01-03T12:45:00',
    })
  })

  it('moves the arrival to the following synthetic week when the weekday wraps', () => {
    expect(buildWeeklyDateTimeRange('sunday', '22:00', 'monday', '02:00')).toEqual({
      departureAt: '2000-01-09T22:00:00',
      arrivalAt: '2000-01-10T02:00:00',
    })
  })

  it('requires the next weekday when a trip crosses midnight', () => {
    expect(() => buildWeeklyDateTimeRange('friday', '23:30', 'friday', '01:00')).toThrow(/próximo dia da semana/)
  })

  it('returns null while the draft is incomplete', () => {
    expect(buildWeeklyDateTimeRange('monday', '08:00', '', '')).toBeNull()
  })

  it('formats weekday moments for the UI', () => {
    expect(weekdayLabel('wednesday')).toBe('Quarta-feira')
    expect(formatTripWeekMoment('wednesday', '14:20')).toBe('Quarta-feira, 14:20')
  })
})
