// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { toServerTripPayload, tripApi } from './tripApi.js'

function response(status, payload = null) {
  const headers = new Map([['content-type', status === 204 ? '' : 'application/json']])
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers.get(String(name).toLowerCase()) || null },
    json: vi.fn(async () => payload),
  }
}

beforeEach(() => {
  clearAccessSession()
  setAccessSession({ accessToken: 'trip-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('trip API client', () => {
  it('lists all trips or one operational week using authenticated no-store requests', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, []))

    await tripApi.list('ats', 'career/1')
    await tripApi.list('ets2', 'career/2', { operationalWeek: 4 })

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/career%2F1/trips?game=ATS`,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer trip-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/career%2F2/trips?game=ETS2&operationalWeek=4`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer trip-token' }) }),
    )
  })

  it('maps the frontend trip into the authoritative calendarless create contract', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(201, { id: 'trip-1' }))
    const trip = {
      departureDay: 'monday',
      departureTime: '08:30',
      arrivalDay: 'monday',
      arrivalTime: '13:15',
      origin: 'Phoenix, AZ',
      originCompany: 'Road Logistics',
      destination: 'Tucson, AZ',
      destinationCompany: 'Customer Depot',
      cargo: 'Food',
      type: 'Loaded',
      payCategory: 'normal',
      miles: 122,
      breakMinutes: 30,
      truckMake: 'Kenworth',
      truckModel: 'T680',
      odometerStart: 1000,
      odometerEnd: 1124.5,
      departureAt: '2000-01-03T08:30:00',
      arrivalAt: '2000-01-03T13:15:00',
      week: 99,
    }

    const expected = {
      departureDay: 'monday',
      departureTime: '08:30',
      arrivalDay: 'monday',
      arrivalTime: '13:15',
      originCity: 'Phoenix, AZ',
      originCompany: 'Road Logistics',
      destinationCity: 'Tucson, AZ',
      destinationCompany: 'Customer Depot',
      cargo: 'Food',
      type: 'Loaded',
      paymentCategory: 'normal',
      officialDistance: 122,
      breakMinutes: 30,
      truckMake: 'Kenworth',
      truckModel: 'T680',
      odometerStart: 1000,
      odometerEnd: 1124.5,
    }

    expect(toServerTripPayload(trip)).toEqual(expected)
    await tripApi.create('ats', 'server-career', trip)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/server-career/trips?game=ATS`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(expected),
        headers: expect.objectContaining({ Authorization: 'Bearer trip-token' }),
      }),
    )
    expect(globalThis.fetch.mock.calls[0][1].body).not.toContain('departureAt')
    expect(globalThis.fetch.mock.calls[0][1].body).not.toContain('week')
  })

  it('deletes only through the server trip endpoint and accepts a no-content response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(204))

    await expect(tripApi.delete('ats', 'career-1', 'trip/1')).resolves.toBeNull()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/career-1/trips/trip%2F1?game=ATS`,
      expect.objectContaining({
        method: 'DELETE',
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer trip-token' }),
      }),
    )
  })
})
