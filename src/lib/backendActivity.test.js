import { describe, expect, it } from 'vitest'
import {
  beginBackendActivity,
  getBackendActivityCount,
  subscribeBackendActivity,
} from './backendActivity.js'

describe('backend activity tracker', () => {
  it('tracks concurrent requests and notifies subscribers until all requests finish', () => {
    const counts = []
    const unsubscribe = subscribeBackendActivity((count) => counts.push(count))

    const endFirst = beginBackendActivity()
    const endSecond = beginBackendActivity()

    expect(getBackendActivityCount()).toBe(2)

    endFirst()
    expect(getBackendActivityCount()).toBe(1)

    endFirst()
    expect(getBackendActivityCount()).toBe(1)

    endSecond()
    expect(getBackendActivityCount()).toBe(0)
    expect(counts).toEqual([0, 1, 2, 1, 0])

    unsubscribe()
  })
})
