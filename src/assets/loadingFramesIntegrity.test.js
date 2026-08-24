import { describe, expect, it } from 'vitest'
import { LOADING_FRAME_INTERVAL_MS, LOADING_FRAMES } from './loadingFrames.js'

function decodeFrame(dataUri) {
  const [metadata, payload] = dataUri.split(',', 2)
  expect(metadata).toBe('data:image/jpeg;base64')
  expect(payload).toBeTruthy()
  return Buffer.from(payload, 'base64')
}

describe('loading frame integrity', () => {
  it('keeps five complete JPEG frames', () => {
    expect(LOADING_FRAMES).toHaveLength(5)

    for (const frame of LOADING_FRAMES) {
      const bytes = decodeFrame(frame)
      expect(bytes.length).toBeGreaterThan(5_000)
      expect([...bytes.subarray(0, 2)]).toEqual([0xff, 0xd8])
      expect([...bytes.subarray(-2)]).toEqual([0xff, 0xd9])
    }
  })

  it('cycles the loading animation every 200ms', () => {
    expect(LOADING_FRAME_INTERVAL_MS).toBe(200)
  })
})
