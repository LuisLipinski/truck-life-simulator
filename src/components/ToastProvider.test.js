// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './ToastProvider.jsx'

let root
let container

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
})

function Harness() {
  const toast = useToast()
  return React.createElement(
    'div',
    null,
    React.createElement('button', { onClick: () => toast.success('Operação concluída.') }, 'success'),
    React.createElement('button', { onClick: () => toast.error('Falha controlada.') }, 'error'),
    React.createElement('button', { onClick: () => toast.warning('Revise os dados.') }, 'warning'),
  )
}

function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(React.createElement(ToastProvider, null, React.createElement(Harness))))
}

describe('ToastProvider', () => {
  it('uses the same success and error notification pattern across the app', () => {
    render()
    const [successButton, errorButton] = container.querySelectorAll('button')

    act(() => successButton.click())
    const success = document.querySelector('[role="status"]')
    expect(success.textContent).toContain('Tudo certo')
    expect(success.textContent).toContain('Operação concluída.')
    expect(success.className).toContain('app-toast-success')

    act(() => errorButton.click())
    const error = document.querySelector('[role="alert"]')
    expect(error.textContent).toContain('Não foi possível concluir')
    expect(error.textContent).toContain('Falha controlada.')
    expect(error.className).toContain('app-toast-error')
  })

  it('allows dismissing a toast manually', () => {
    render()
    act(() => container.querySelector('button').click())
    expect(document.querySelector('.app-toast')).not.toBeNull()

    const close = document.querySelector('.app-toast-close')
    act(() => close.click())
    expect(document.querySelector('.app-toast')).toBeNull()
  })

  it('removes non-error notifications automatically', () => {
    vi.useFakeTimers()
    render()
    act(() => container.querySelector('button').click())
    expect(document.querySelector('.app-toast')).not.toBeNull()

    act(() => vi.advanceTimersByTime(4000))
    expect(document.querySelector('.app-toast')).toBeNull()
  })
})
