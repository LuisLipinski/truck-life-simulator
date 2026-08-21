// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'
import { TUTORIAL_STEPS, TUTORIAL_STORAGE_KEY, TutorialProvider } from './components/GuidedTutorial.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { ACTIVE_CAREER_KEY, CAREERS_KEY, createCareer, ETS2_CAREERS_KEY } from './lib/storage.js'

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
    root.render(createElement(ToastProvider, null, createElement(ConfirmProvider, null, createElement(TutorialProvider, null, createElement(App)))))
  })
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function setSelectValue(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
  act(() => {
    setter.call(select, String(value))
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('career card navigation', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
    sessionStorage.clear()
    document.body.innerHTML = '<div id="root"></div>'
    root = createRoot(document.getElementById('root'))
  })

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount())
    }
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
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

  it('starts the guided tutorial when the option is checked during career creation', async () => {
    window.location.hash = '#/new'
    await act(async () => {
      root.render(createElement(ToastProvider, null, createElement(ConfirmProvider, null, createElement(TutorialProvider, null, createElement(App)))))
    })

    setInputValue(document.querySelector('input[placeholder="Ex.: Rafael Silva"]'), 'Tutorial Driver')
    setInputValue(document.querySelector('.react-city-autocomplete input'), 'Los Angeles, CA')
    setInputValue(document.querySelector('input[placeholder="Ex.: Pacific Horizon Logistics"]'), 'Tour Logistics')
    await act(async () => document.querySelector('.tutorial-opt-in input').click())

    await act(async () => {
      document.querySelector('.form-panel').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })

    expect(window.location.hash).toContain('#/phases?career=')
    expect(document.querySelector('.guided-tutorial-popover')?.textContent).toContain('As fases da sua carreira')
    expect(JSON.parse(sessionStorage.getItem(TUTORIAL_STORAGE_KEY))).toMatchObject({ index: 0 })
    expect(JSON.parse(localStorage.getItem(CAREERS_KEY))).toHaveLength(1)
  })

  it('creates an independent ETS2 career with European city, euro and kilometer copy', async () => {
    window.location.hash = '#/ets2/new'
    await act(async () => {
      root.render(createElement(ToastProvider, null, createElement(ConfirmProvider, null, createElement(TutorialProvider, null, createElement(App)))))
    })

    expect(document.querySelector('.form-panel')?.textContent).toContain('quilômetros')
    expect(document.querySelector('.form-panel')?.textContent).toContain('€')
    setSelectValue(document.querySelector('#career-country'), 'DE')
    setInputValue(document.querySelector('input[placeholder="Ex.: Rafael Silva"]'), 'Euro Driver')
    setInputValue(document.querySelector('.react-city-autocomplete input'), 'Berlin, Alemanha')
    setInputValue(document.querySelector('input[placeholder="Ex.: Euro Horizon Logistics"]'), 'Euro Logistics')

    await act(async () => {
      document.querySelector('.form-panel').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })

    expect(window.location.hash).toContain('#/ets2/phases?career=')
    expect(JSON.parse(localStorage.getItem(ETS2_CAREERS_KEY) || '[]')).toMatchObject([{ driverName: 'Euro Driver', city: 'Berlin, Alemanha', gameId: 'ets2', countryCode: 'DE', countryName: 'Alemanha', currency: 'EUR' }])
    expect(localStorage.getItem(CAREERS_KEY)).toBeNull()
  })

  it('shows ETS2 qualifications and a European payslip without ATS fiscal copy', async () => {
    const career = createCareer({
      driverName: 'European Driver', city: 'Berlin, Alemanha', company: 'Euro Logistics', initialBalance: 1200, currentBalance: 1200,
    }, 'ets2')
    window.location.hash = `#/ets2/phase1?career=${career.id}`
    await act(async () => {
      root.render(createElement(ToastProvider, null, createElement(ConfirmProvider, null, createElement(TutorialProvider, null, createElement(App)))))
    })

    expect(document.querySelector('.phase1-header')?.textContent).toContain('ETS2')
    expect(document.querySelector('.phase1-header')?.textContent).toContain('km')
    const journal = [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Diário de Bordo')
    await act(async () => journal.click())
    const qualifications = [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Qualificações')
    await act(async () => qualifications.click())
    expect(document.body.textContent).toContain('ADR')
    expect(document.body.textContent).toContain('Euro Combi')
    expect(document.body.textContent).toContain('16.000 km')

    const financial = [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Financeiro')
    await act(async () => financial.click())
    const payslip = [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Holerite')
    await act(async () => payslip.click())
    expect(document.body.textContent).toContain('Imposto de renda (estimado)')
    expect(document.body.textContent).toContain('Gerar holerite mensal')
    expect(document.body.textContent).not.toContain('California Income Tax')
    expect(document.body.textContent).not.toContain('Social Security')
  })

  it('walks through every tutorial step and reaches each screen target', async () => {
    const career = seedCareer()
    sessionStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ careerId: career.id, index: 0 }))
    window.location.hash = `#/phases?career=${career.id}`
    await act(async () => {
      root.render(createElement(ToastProvider, null, createElement(ConfirmProvider, null, createElement(TutorialProvider, null, createElement(App)))))
    })

    for (let index = 0; index < TUTORIAL_STEPS.length; index += 1) {
      const step = TUTORIAL_STEPS[index]
      await act(async () => {
        await Promise.resolve()
        await new Promise((resolve) => window.setTimeout(resolve, 0))
      })

      const dialog = document.querySelector('.guided-tutorial-popover')
      expect(dialog?.textContent, `conteúdo da etapa ${step.id}`).toContain(step.title)
      expect(document.querySelector(`[data-tour="${step.target}"]`), `alvo da etapa ${step.id}`).not.toBeNull()

      const actionLabel = index === TUTORIAL_STEPS.length - 1 ? 'Concluir tutorial' : 'Próximo'
      const action = [...dialog.querySelectorAll('button')].find((button) => button.textContent === actionLabel)
      await act(async () => {
        action.click()
        await Promise.resolve()
      })
    }

    expect(document.querySelector('.guided-tutorial-popover')).toBeNull()
    expect(sessionStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull()
  })
})
