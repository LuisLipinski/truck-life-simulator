// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Phase1Page from './Phase1Page.jsx'
import { ConfirmProvider } from './ConfirmProvider.jsx'
import { TUTORIAL_STEPS, TUTORIAL_STORAGE_KEY, TutorialProvider } from './GuidedTutorial.jsx'
import { ToastProvider } from './ToastProvider.jsx'
import { CAREERS_KEY } from '../lib/storage.js'
import { phase1StorageKey } from '../lib/phase1.js'

let root
let container

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  window.scrollTo = vi.fn()
  window.requestAnimationFrame = (callback) => {
    callback()
    return 1
  }
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

function setInputValue(input, value) {
  const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set
  act(() => {
    setter.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function seedCareer({ level, miles }) {
  const id = `career_test_level_${level}`
  const career = {
    id,
    driverName: 'Test Driver',
    city: 'Los Angeles, CA',
    company: 'Test Logistics',
    initialBalance: 5000,
    currentBalance: 5000,
    currentLevel: level,
  }
  localStorage.setItem(CAREERS_KEY, JSON.stringify([career]))
  localStorage.setItem(phase1StorageKey(id), JSON.stringify({
    balance: 5000,
    emergencyReserve: 0,
    history: [],
    trips: miles > 0 ? [{
      id: 1,
      week: 1,
      departureAt: '2026-08-19T07:00',
      arrivalAt: '2026-08-19T08:00',
      origin: 'Los Angeles, CA',
      destination: 'Los Angeles, CA',
      type: 'Loaded',
      payCategory: 'normal',
      miles,
    }] : [],
    closedWeeks: [],
    customExpenses: [],
    incidents: [],
    currentLevel: level,
    careerLevel: level,
    hazmatQualified: false,
    academy: { level2: level >= 2, level3: level >= 3 },
    currentWeek: 1,
  }))
  return id
}

function renderCareer(careerId, { openJournal = true } = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(ConfirmProvider, null, React.createElement(TutorialProvider, null, React.createElement(Phase1Page, { careerId, onBack: vi.fn() }))),
      ),
    )
  })

  if (openJournal) {
    const journalButton = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Diário de Bordo')
    act(() => journalButton.click())
  }
}

function registerOneMileTrip() {
  const form = container.querySelector('.trip-form')
  const dateInputs = form.querySelectorAll('input[type="datetime-local"]')
  setInputValue(dateInputs[0], '2026-08-20T07:00')
  setInputValue(dateInputs[1], '2026-08-20T08:00')

  const cityInputs = form.querySelectorAll('.react-city-autocomplete input')
  setInputValue(cityInputs[0], 'Los Angeles, CA')
  setInputValue(cityInputs[1], 'Bakersfield, CA')

  const milesInput = form.querySelector('input[type="number"][min="1"]')
  setInputValue(milesInput, '1')

  const submit = [...form.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Registrar viagem')
  act(() => submit.click())
}

describe('promotion milestone integration', () => {
  it('opens the tab requested by the active guided-tour step', () => {
    const careerId = seedCareer({ level: 1, miles: 0 })
    const incidentStep = TUTORIAL_STEPS.findIndex((step) => step.id === 'incident-form')
    sessionStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({ careerId, index: incidentStep }))
    window.location.hash = `#/phase1?career=${careerId}`

    renderCareer(careerId, { openJournal: false })

    expect(container.querySelector('[data-tour="incident-form"]')).not.toBeNull()
    expect(document.querySelector('.guided-tutorial-popover')?.textContent).toContain('Infrações e acidentes')
  })

  it('opens the Level 2 milestone modal when a trip crosses 10,000 miles and can open Qualifications', () => {
    renderCareer(seedCareer({ level: 1, miles: 9999 }))
    registerOneMileTrip()

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('Nível 2')
    expect(dialog.textContent).toContain('Truck Driving Proficiency')

    const promotionButton = [...dialog.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Ir para a promoção')
    act(() => promotionButton.click())

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(container.textContent).toContain('Qualificações')
    expect(container.textContent).toContain('Truck Driving Proficiency')
  })

  it('opens the Level 3 milestone modal when a trip crosses 50,000 miles and can open the Driving Academy guide', () => {
    renderCareer(seedCareer({ level: 2, miles: 49999 }))
    registerOneMileTrip()

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('Nível 3')
    expect(dialog.textContent).toContain('Double Trailer Handling')

    const guideButton = [...dialog.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Entender o Driving Academy')
    act(() => guideButton.click())

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(container.textContent).toContain('Driving Academy')
    expect(container.textContent).toContain('Double Trailer Handling')
  })

  it('does not reopen a milestone when the driver was already beyond the threshold before the new trip', () => {
    renderCareer(seedCareer({ level: 1, miles: 10000 }))
    registerOneMileTrip()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
