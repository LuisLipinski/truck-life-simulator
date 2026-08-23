// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginBackendActivity } from '../lib/backendActivity.js'
import BackendLoadingRetryFallback, { LOADING_RETRY_DELAY_MS } from './BackendLoadingRetryFallback.jsx'

let root
let container
let endActivity

afterEach(() => {
  if (endActivity) endActivity()
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  endActivity = null
  vi.useRealTimers()
})

function render(reload = vi.fn()) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(React.createElement(BackendLoadingRetryFallback, { reload })))
  return reload
}

describe('BackendLoadingRetryFallback', () => {
  it('shows the manual retry only after 55 seconds of continuous backend activity', () => {
    vi.useFakeTimers()
    render()

    act(() => { endActivity = beginBackendActivity() })
    act(() => vi.advanceTimersByTime(LOADING_RETRY_DELAY_MS - 1))
    expect(container.textContent).not.toContain('Tentar novamente')

    act(() => vi.advanceTimersByTime(1))
    expect(container.textContent).toContain('Parece que o caminhão não quer pegar. Tente novamente.')
    expect(container.querySelector('button')?.textContent).toContain('Tentar novamente')
  })

  it('reloads the application when the user asks to try again', () => {
    vi.useFakeTimers()
    const reload = render()

    act(() => { endActivity = beginBackendActivity() })
    act(() => vi.advanceTimersByTime(LOADING_RETRY_DELAY_MS))
    act(() => container.querySelector('button').click())

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('hides the fallback as soon as backend activity finishes', () => {
    vi.useFakeTimers()
    render()

    act(() => { endActivity = beginBackendActivity() })
    act(() => vi.advanceTimersByTime(LOADING_RETRY_DELAY_MS))
    expect(container.querySelector('button')).not.toBeNull()

    act(() => {
      endActivity()
      endActivity = null
    })
    expect(container.querySelector('button')).toBeNull()
  })
})
