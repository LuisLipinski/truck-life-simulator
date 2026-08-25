import { describe, expect, it } from 'vitest'
import {
  CAREER_EVENT_TYPES,
  careerBaseSnapshot,
  careerEventDescription,
  createCareerEvent,
  preserveHistoricalCareerContext,
} from './careerEvents.js'

describe('career events', () => {
  it('stores structured previous and next values while dropping unchanged fields', () => {
    const event = createCareerEvent({
      type: CAREER_EVENT_TYPES.PROFILE_UPDATED,
      effectiveDate: '2026-08-22',
      recordedAt: '2026-08-22T12:00:00.000Z',
      changes: {
        driverName: { previous: 'Old Driver', next: 'New Driver' },
        bio: { previous: 'Same', next: 'Same' },
      },
    })

    expect(event).toMatchObject({
      type: 'PROFILE_UPDATED',
      effectiveDate: '2026-08-22',
      recordedAt: '2026-08-22T12:00:00.000Z',
      changes: { driverName: { previous: 'Old Driver', next: 'New Driver' } },
    })
    expect(event.changes).not.toHaveProperty('bio')
    expect(careerEventDescription(event)).toContain('Old Driver')
    expect(careerEventDescription(event)).toContain('New Driver')
  })

  it('backfills missing historical context without replacing existing snapshots', () => {
    const career = {
      company: 'Old Logistics', city: 'Los Angeles, CA', stateCode: 'CA', stateName: 'California',
      currency: 'USD', baseCurrency: 'USD', cityMarketLabel: 'Metrópole principal',
    }
    const existingBase = { city: 'Sacramento, CA', stateCode: 'CA' }
    const state = {
      trips: [{ id: 1 }, { id: 2, employer: 'Earlier Co', baseSnapshot: existingBase }],
      closedWeeks: [{ week: 1, city: 'Fresno, CA' }],
    }

    const preserved = preserveHistoricalCareerContext(state, career)

    expect(preserved.trips[0]).toMatchObject({ employer: 'Old Logistics', baseSnapshot: { city: 'Los Angeles, CA', stateCode: 'CA' } })
    expect(preserved.trips[1]).toMatchObject({ employer: 'Earlier Co', baseSnapshot: existingBase })
    expect(preserved.closedWeeks[0]).toMatchObject({ employer: 'Old Logistics', baseSnapshot: { city: 'Fresno, CA' } })
    expect(careerBaseSnapshot(career)).toMatchObject({ city: 'Los Angeles, CA', stateCode: 'CA', currency: 'USD' })
  })
})
