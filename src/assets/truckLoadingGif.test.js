import { describe, expect, it } from 'vitest'
import truckLoadingGif from './truckLoadingGif.js'

describe('truck loading GIF asset', () => {
  it('embeds a valid GIF89a image as a data URI', () => {
    expect(truckLoadingGif.startsWith('data:image/gif;base64,R0lGODlh')).toBe(true)

    const encoded = truckLoadingGif.slice('data:image/gif;base64,'.length)
    const bytes = Buffer.from(encoded, 'base64')

    expect(bytes.subarray(0, 6).toString('ascii')).toBe('GIF89a')
    expect(bytes.length).toBeGreaterThan(10000)
  })
})
