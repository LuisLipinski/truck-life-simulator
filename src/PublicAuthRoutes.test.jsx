// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App.jsx'

let root

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
})

afterEach(() => {
  if (root) act(() => root.unmount())
  window.location.hash = '#/'
  root = null
})

describe('public authentication routes', () => {
  it.each([
    ['#/login', 'Entre para continuar'],
    ['#/register', 'Comece sua jornada'],
    ['#/verify-email', 'Confirme seu e-mail'],
    ['#/forgot-password', 'Esqueceu sua senha?'],
    ['#/reset-password', 'Redefina seu acesso'],
  ])('renders %s through the application hash router', async (hash, title) => {
    window.location.hash = hash
    await act(async () => root.render(<App />))
    expect(document.querySelector('.auth-form-panel')?.textContent).toContain(title)
  })

  it('exposes account actions without blocking local careers on the home page', async () => {
    window.location.hash = '#/'
    await act(async () => root.render(<App />))

    expect(document.querySelector('a[href="#/login"]')?.textContent).toBe('Entrar')
    expect(document.querySelector('a[href="#/register"]')?.textContent).toBe('Criar conta')
    expect(document.querySelector('.game-grid')).not.toBeNull()
    expect(document.body.textContent).toContain('continua disponível sem login')
  })
})
