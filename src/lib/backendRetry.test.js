import { describe, expect, it, vi } from 'vitest'
import {
  backendRetryDelayMs,
  isTransientBackendError,
  retryTransientBackend,
} from './backendRetry.js'

describe('backendRetry', () => {
  it('retries transient availability failures until the backend responds', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ status: 503, code: 'HTTP_503' })
      .mockRejectedValueOnce({ status: 0, code: 'API_UNAVAILABLE' })
      .mockResolvedValue({ ok: true })
    const wait = vi.fn(async () => {})

    await expect(retryTransientBackend(operation, { wait })).resolves.toEqual({ ok: true })

    expect(operation).toHaveBeenCalledTimes(3)
    expect(wait).toHaveBeenNthCalledWith(1, 1000)
    expect(wait).toHaveBeenNthCalledWith(2, 2000)
  })

  it('does not retry authentication or business errors', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 401, code: 'EMAIL_NOT_VERIFIED' })
    const wait = vi.fn(async () => {})

    await expect(retryTransientBackend(operation, { wait })).rejects.toMatchObject({ status: 401 })
    expect(operation).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })

  it('caps retry spacing at five seconds', () => {
    expect(backendRetryDelayMs(1)).toBe(1000)
    expect(backendRetryDelayMs(3)).toBe(3000)
    expect(backendRetryDelayMs(20)).toBe(5000)
    expect(isTransientBackendError({ status: 502 })).toBe(true)
    expect(isTransientBackendError({ status: 503 })).toBe(true)
    expect(isTransientBackendError({ status: 504 })).toBe(true)
    expect(isTransientBackendError({ status: 400 })).toBe(false)
  })
})
