// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { ACTIVE_CAREER_KEY, CAREERS_KEY } from './lib/storage.js'

let root

function seedCareer() {
  const career = {
    id: 'career_test_1',
    driverName: 'Test Driver',
    city: 'Los Angeles, CA',
    company: 'Pacific Horizon Logistics',
    currentLevel: 1,
    initialBalance: 793,
    currentBalance: 793,
    bio: 'Carreira de teste',
  }
  localStorage.setItem(CAREERS_KEY, JSON.stringify([career]))
  return career
}

async function renderCareers() {
  window.location.hash = '#/ats'
  await act(async () => {
    root.render(createElement(ToastProvider, null, createElement(ConfirmProvider, null, createElement(App))))
  })
}

describe('career card navigation', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
    document.body.innerHTML = '<div id="root"></div>'
    root = createRoot(document.getElementById('root'))
  })

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount())
    }
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('opens the career when the card itself is clicked and has no Continue button', async () => {
    const career = seedCareer()
    await renderCareers()

    expect(document.querySelector('.career-card .button.primary')).toBeNull()
    const card = document.querySelector(`[aria-label="Abrir carreira ${career.driverName}"]`)
    expect(card).not.toBeNull()

    await act(async () => {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(localStorage.getItem(ACTIVE_CAREER_KEY)).toBe(career.id)
    expect(window.location.hash).toBe(`#/phases?career=${career.id}`)
  })

  it('supports keyboard opening from the focused career card', async () => {
    const career = seedCareer()
    await renderCareers()
    const card = document.querySelector(`[aria-label="Abrir carreira ${career.driverName}"]`)

    await act(async () => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(localStorage.getItem(ACTIVE_CAREER_KEY)).toBe(career.id)
    expect(window.location.hash).toBe(`#/phases?career=${career.id}`)
  })

  it('deletes from the small trash button without opening the career', async () => {
    const career = seedCareer()
    await renderCareers()

    const trash = document.querySelector(`[aria-label="Excluir carreira ${career.driverName}"]`)
    expect(trash).not.toBeNull()

    await act(async () => {
      trash.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('Excluir carreira?')
    expect(document.querySelector(`[aria-label="Abrir carreira ${career.driverName}"]`)).not.toBeNull()

    await act(async () => {
      document.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    expect(window.location.hash).toBe('#/ats')
    expect(localStorage.getItem(ACTIVE_CAREER_KEY)).toBeNull()
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')).toEqual([])
    expect(document.querySelector(`[aria-label="Abrir carreira ${career.driverName}"]`)).toBeNull()
  })
})
