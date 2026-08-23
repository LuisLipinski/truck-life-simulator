import { describe, expect, it } from 'vitest'
import { FRAME_INTERVAL_MS, LOADING_FRAMES } from './loadingFrames.js'

describe('loading frames', () => {
  it('keeps five embedded JPEG frames for the loading animation', () => {
    expect(FRAME_INTERVAL_MS).toBe(200)
    expect(LOADING_FRAMES).toHaveLength(5)

    for (const frame of LOADING_FRAMES) {
      expect(frame.startsWith('data:image/jpeg;base64,/9j/')).toBe(true)
    }
  })
})
