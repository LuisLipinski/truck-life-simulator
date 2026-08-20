// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TUTORIAL_STEPS,
  TUTORIAL_STORAGE_KEY,
  TutorialProvider,
  useTutorial,
} from './GuidedTutorial.jsx'

let root
let container

function Harness() {
  const { startTutorial } = useTutorial()
  return React.createElement(
    'main',
    null,
    React.createElement('button', { className: 'start-tour', type: 'button', onClick: () => startTutorial('career_tour') }, 'Iniciar'),
    ...TUTORIAL_STEPS.map((step) => React.createElement('div', { 'data-tour': step.target, key: step.id }, step.id)),
  )
}

function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(React.createElement(TutorialProvider, null, React.createElement(Harness))))
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  sessionStorage.clear()
  window.location.hash = '#/'
  window.scrollTo = vi.fn()
  window.requestAnimationFrame = (callback) => {
    callback()
    return 1
  }
  window.cancelAnimationFrame = vi.fn()
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  sessionStorage.clear()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('TutorialProvider', () => {
  it('starts the complete tour and supports next and back navigation', async () => {
    render()
    await act(async () => container.querySelector('.start-tour').click())

    let dialog = document.querySelector('.guided-tutorial-popover')
    expect(dialog.textContent).toContain('As fases da sua carreira')
    expect(dialog.textContent).toContain(`Etapa 1 de ${TUTORIAL_STEPS.length}`)
    expect(window.location.hash).toBe('#/phases?career=career_tour')
    expect(JSON.parse(sessionStorage.getItem(TUTORIAL_STORAGE_KEY))).toEqual({ careerId: 'career_tour', index: 0 })

    await act(async () => [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Próximo').click())
    dialog = document.querySelector('.guided-tutorial-popover')
    expect(dialog.textContent).toContain('Fase 1 — Motorista Empregado')
    expect(dialog.textContent).toContain('Etapa 2')

    await act(async () => [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Voltar').click())
    expect(document.querySelector('.guided-tutorial-popover').textContent).toContain('As fases da sua carreira')
  })

  it('exits immediately from the visible button or Escape', async () => {
    render()
    await act(async () => container.querySelector('.start-tour').click())
    await act(async () => document.querySelector('.guided-tutorial-exit').click())
    expect(document.querySelector('.guided-tutorial-popover')).toBeNull()
    expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull()

    await act(async () => container.querySelector('.start-tour').click())
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(document.querySelector('.guided-tutorial-popover')).toBeNull()
    expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull()
  })

  it('resumes a saved step and clears it when the tutorial is completed', async () => {
    sessionStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ careerId: 'career_tour', index: TUTORIAL_STEPS.length - 1 }))
    render()

    const dialog = document.querySelector('.guided-tutorial-popover')
    expect(dialog.textContent).toContain('Tutorial concluído')
    expect(window.location.hash).toBe('#/phase1?career=career_tour')

    await act(async () => [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Concluir tutorial').click())
    expect(document.querySelector('.guided-tutorial-popover')).toBeNull()
    expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull()
  })
})
