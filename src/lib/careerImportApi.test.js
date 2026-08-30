// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from './authApi.js'
import { clearAccessSession, setAccessSession } from './authSession.js'
import { careerImportApi } from './careerImportApi.js'

function response(status, payload) {
  const headers = new Map([
    ['content-type', 'application/json'],
  ])
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers.get(String(name).toLowerCase()) || null },
    json: vi.fn(async () => payload),
  }
}

const payload = {
  operationId: '11111111-1111-4111-8111-111111111111',
  sourceCareerId: 'ats-local-1',
  game: 'ATS',
  sourceVersion: 12,
  career: { id: 'ats-local-1' },
  state: { balance: 1000 },
}

beforeEach(() => {
  clearAccessSession()
  setAccessSession({ accessToken: 'migration-token', tokenType: 'Bearer', expiresIn: 600 })
})

afterEach(() => {
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
})

describe('career import API client', () => {
  it('validates and imports the same authenticated v12 payload using the dedicated backend endpoints', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(200, { valid: true, persisted: false }))
      .mockResolvedValueOnce(response(201, { persisted: true, careerId: 'server-career' }))

    await careerImportApi.validate(payload)
    await careerImportApi.importCareer(payload)

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/careers/imports/validate`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ Authorization: 'Bearer migration-token' }),
      }),
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      `${API_BASE_URL}/api/v1/careers/imports`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ Authorization: 'Bearer migration-token' }),
      }),
    )
  })

  it('recovers an existing association with an authenticated GET and only identity query parameters', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response(200, {
      persisted: true,
      idempotentReplay: true,
      careerId: 'server-career',
    }))

    await careerImportApi.recover('ets2', 'local career/1')

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/careers/imports?game=ETS2&sourceCareerId=local+career%2F1`,
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        cache: 'no-store',
        headers: expect.objectContaining({ Authorization: 'Bearer migration-token' }),
      }),
    )
  })
})
