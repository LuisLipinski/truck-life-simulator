// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Phase1Page from './Phase1Page.jsx'
import { ConfirmProvider } from './ConfirmProvider.jsx'
import { TUTORIAL_STEPS, TUTORIAL_STORAGE_KEY, TutorialProvider } from './GuidedTutorial.jsx'
import { ToastProvider } from './ToastProvider.jsx'
import { GameProvider } from './GameContext.jsx'
import { CAREERS_KEY, ETS2_CAREERS_KEY, getCareer } from '../lib/storage.js'
import { loadPhase1State, phase1StorageKey } from '../lib/phase1.js'
import { getGame } from '../config/games.js'

let root
let container

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
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
  if (!input) throw new Error(`Test control not found for value: ${value}`)
  const prototype = input instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
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

function seedEts2Career({ distance = 0 } = {}) {
  const id = 'career_test_ets2'
  const career = {
    id,
    gameId: 'ets2',
    driverName: 'Euro Driver',
    city: 'Berlin, Alemanha',
    company: 'Berlin Logistics',
    countryCode: 'DE',
    countryName: 'Alemanha',
    currency: 'EUR',
    baseCurrency: 'EUR',
    exchangeRate: 1,
    initialBalance: 3000,
    currentBalance: 3000,
    currentLevel: 1,
  }
  localStorage.setItem(ETS2_CAREERS_KEY, JSON.stringify([career]))
  localStorage.setItem(phase1StorageKey(id, 'ets2'), JSON.stringify({
    balance: 3000,
    emergencyReserve: 0,
    history: [],
    trips: distance > 0 ? [{
      id: 1,
      week: 1,
      departureAt: '2026-08-19T07:00',
      arrivalAt: '2026-08-19T08:00',
      origin: 'Berlin, Alemanha',
      destination: 'Hannover, Alemanha',
      type: 'Loaded',
      payCategory: 'normal',
      distance,
    }] : [],
    closedWeeks: [],
    customExpenses: [],
    incidents: [],
    currentLevel: 1,
    careerLevel: 1,
    dangerousGoodsQualified: false,
    academy: { level2: false, level3: false },
    currentWeek: 1,
    currentPayrollMonth: 1,
    payPeriodStartWeek: 1,
    closedOperationalWeeks: [],
  }))
  return id
}

function renderCareer(careerId, { openJournal = true, gameId = 'ats' } = {}) {
  const career = getCareer(careerId, gameId)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(ConfirmProvider, null, React.createElement(TutorialProvider, null,
          React.createElement(GameProvider, {
            gameId,
            countryCode: career?.countryCode || null,
            stateCode: career?.stateCode || null,
            currencyCode: career?.currency || null,
            exchangeRate: career?.exchangeRate || null,
            exchangeRateAsOf: career?.exchangeRateAsOf || null,
            city: career?.city || '',
            cityCostFactor: career?.cityCostFactor || null,
            citySalaryFactor: career?.citySalaryFactor || null,
            cityMarketLabel: career?.cityMarketLabel || null,
          }, React.createElement(Phase1Page, { careerId, onBack: vi.fn() })),
        )),
      ),
    )
  })

  if (openJournal) {
    const journalButton = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Diário de Bordo')
    act(() => journalButton.click())
  }
}

function remountCareer(careerId, options) {
  act(() => root.unmount())
  container.remove()
  root = null
  container = null
  renderCareer(careerId, options)
}

function fillTripSchedule(form, { departureDay = 'thursday', departureTime = '07:00', arrivalDay = 'thursday', arrivalTime = '10:00' } = {}) {
  const weekdaySelects = form.querySelectorAll('select')
  const timeInputs = form.querySelectorAll('input[type="time"]')
  setInputValue(weekdaySelects[0], departureDay)
  setInputValue(timeInputs[0], departureTime)
  setInputValue(weekdaySelects[1], arrivalDay)
  setInputValue(timeInputs[1], arrivalTime)
}

function fillRequiredTrip({ distance = 100 } = {}) {
  const form = container.querySelector('.trip-form')
  fillTripSchedule(form)
  const cityInputs = form.querySelectorAll('.react-city-autocomplete input')
  setInputValue(cityInputs[0], 'Los Angeles, CA')
  setInputValue(cityInputs[1], 'Bakersfield, CA')
  setInputValue(form.querySelector('input[type="number"][min="1"]'), distance)
  return form
}

function registerOneMileTrip() {
  const form = fillRequiredTrip({ distance: 1 })
  const submit = [...form.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Enviar viagem')
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

describe('weekday trip draft integration', () => {
  it('persists an incomplete trip draft across a remount without creating a trip', () => {
    const careerId = seedCareer({ level: 1, miles: 0 })
    renderCareer(careerId)
    const form = container.querySelector('.trip-form')
    const weekdaySelects = form.querySelectorAll('select')
    const timeInputs = form.querySelectorAll('input[type="time"]')
    setInputValue(weekdaySelects[0], 'monday')
    setInputValue(timeInputs[0], '08:15')
    setInputValue(form.querySelector('.react-city-autocomplete input'), 'Los Angeles, CA')

    const save = [...form.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Salvar rascunho')
    act(() => save.click())

    const stored = loadPhase1State(careerId)
    expect(stored.trips).toEqual([])
    expect(stored.tripDraft).toMatchObject({ departureDay: 'monday', departureTime: '08:15', origin: 'Los Angeles, CA' })

    remountCareer(careerId)
    const restoredForm = container.querySelector('.trip-form')
    expect(restoredForm.querySelectorAll('select')[0].value).toBe('monday')
    expect(restoredForm.querySelectorAll('input[type="time"]')[0].value).toBe('08:15')
    expect(restoredForm.querySelector('.react-city-autocomplete input').value).toBe('Los Angeles, CA')
  })

  it('clears the saved draft only after the trip is sent successfully', () => {
    const careerId = seedCareer({ level: 1, miles: 0 })
    renderCareer(careerId)
    const form = fillRequiredTrip({ distance: 25 })
    const save = [...form.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Salvar rascunho')
    act(() => save.click())
    expect(loadPhase1State(careerId).tripDraft).not.toBeNull()

    act(() => form.querySelector('[type="submit"]').click())
    const stored = loadPhase1State(careerId)
    expect(stored.trips).toHaveLength(1)
    expect(stored.tripDraft).toBeNull()
    expect(stored.trips[0]).toMatchObject({
      departureDay: 'thursday',
      departureTime: '07:00',
      arrivalDay: 'thursday',
      arrivalTime: '10:00',
      miles: 25,
    })
  })
})

describe('telemetry-ready trip registration', () => {
  it('persists truck and odometers while keeping the typed distance authoritative', () => {
    const careerId = seedCareer({ level: 1, miles: 0 })
    renderCareer(careerId)
    const form = fillRequiredTrip({ distance: 100 })

    setInputValue(form.querySelector('[name="truckMake"]'), 'Volvo')
    setInputValue(form.querySelector('[name="truckModel"]'), 'FH16')
    setInputValue(form.querySelector('[name="odometerStart"]'), '100000')
    setInputValue(form.querySelector('[name="odometerEnd"]'), '100120')

    expect(form.textContent).toContain('Odômetro: 120 mi')
    expect(form.textContent).toContain('20 mi acima da distância oficial')
    act(() => form.querySelector('[type="submit"]').click())

    const stored = JSON.parse(localStorage.getItem(phase1StorageKey(careerId)))
    expect(stored.trips[0]).toMatchObject({
      miles: 100,
      truckMake: 'Volvo',
      truckModel: 'FH16',
      odometerStart: 100000,
      odometerEnd: 100120,
      source: 'MANUAL',
    })
    expect(container.textContent).toContain('Volvo FH16')
    expect(container.textContent).toContain('percorrido: 120 mi')
  })

  it('rejects a final odometer reading below the initial reading', () => {
    const careerId = seedCareer({ level: 1, miles: 0 })
    renderCareer(careerId)
    const form = fillRequiredTrip()
    setInputValue(form.querySelector('[name="odometerStart"]'), '200')
    setInputValue(form.querySelector('[name="odometerEnd"]'), '199')

    act(() => form.querySelector('[type="submit"]').click())

    expect(document.body.textContent).toContain('A leitura final do odômetro não pode ser menor que a inicial.')
    expect(JSON.parse(localStorage.getItem(phase1StorageKey(careerId))).trips).toEqual([])
  })
})

describe('career profile and effective changes', () => {
  it('updates driver name and biography and records previous and new values', () => {
    const careerId = seedCareer({ level: 1, miles: 0 })
    renderCareer(careerId, { openJournal: false })

    setInputValue(container.querySelector('#career-edit-driver'), 'Corrected Driver')
    setInputValue(container.querySelector('#career-edit-bio'), 'Nova biografia')
    act(() => container.querySelector('.career-change-form [type="submit"]').click())

    const career = getCareer(careerId)
    expect(career).toMatchObject({ driverName: 'Corrected Driver', bio: 'Nova biografia' })
    expect(career.events[0]).toMatchObject({
      type: 'PROFILE_UPDATED',
      changes: {
        driverName: { previous: 'Test Driver', next: 'Corrected Driver' },
        bio: { previous: '', next: 'Nova biografia' },
      },
    })
  })

  it('changes employer only after confirmation and snapshots the old employer in existing trips', async () => {
    const careerId = seedCareer({ level: 1, miles: 50 })
    renderCareer(careerId, { openJournal: false })
    const employerTab = [...container.querySelectorAll('.career-management-tabs button')].find((button) => button.textContent === 'Empresa')
    act(() => employerTab.click())
    setInputValue(container.querySelector('#career-new-company'), 'Future Logistics')

    await act(async () => {
      container.querySelector('.career-change-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    expect(getCareer(careerId).company).toBe('Test Logistics')
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('Confirmar troca de empresa?')

    await act(async () => {
      document.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    expect(getCareer(careerId)).toMatchObject({ company: 'Future Logistics' })
    expect(getCareer(careerId).events[0]).toMatchObject({
      type: 'EMPLOYER_CHANGED',
      changes: { company: { previous: 'Test Logistics', next: 'Future Logistics' } },
    })
    expect(loadPhase1State(careerId).trips[0].employer).toBe('Test Logistics')

    remountCareer(careerId)
    registerOneMileTrip()
    expect(loadPhase1State(careerId).trips.map((trip) => trip.employer)).toEqual(['Test Logistics', 'Future Logistics'])
  })

  it('moves the ATS base after confirmation and applies the new financial profile only to open defaults', async () => {
    const careerId = seedCareer({ level: 1, miles: 50 })
    renderCareer(careerId, { openJournal: false })
    const baseTab = [...container.querySelectorAll('.career-management-tabs button')].find((button) => button.textContent === 'Base')
    act(() => baseTab.click())
    setInputValue(container.querySelector('#career-new-location'), 'TX')
    setInputValue(container.querySelector('.career-change-form .react-city-autocomplete input'), 'Dallas, TX')

    await act(async () => {
      container.querySelector('.career-change-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain('Confirmar mudança de base?')
    await act(async () => {
      document.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    const career = getCareer(careerId)
    const state = loadPhase1State(careerId)
    const dallas = getGame('ats', 'TX', 'USD', null, null, 'Dallas, TX')
    expect(career).toMatchObject({ city: 'Dallas, TX', stateCode: 'TX', stateName: 'Texas' })
    expect(career.events[0]).toMatchObject({
      type: 'BASE_CHANGED',
      changes: { base: { previous: { city: 'Los Angeles, CA' }, next: { city: 'Dallas, TX', stateCode: 'TX' } } },
    })
    expect(state.trips[0].baseSnapshot).toMatchObject({ city: 'Los Angeles, CA', stateCode: 'CA' })
    expect(state.expenses).toMatchObject(dallas.expenses)

    remountCareer(careerId)
    registerOneMileTrip()
    expect(loadPhase1State(careerId).trips.map((trip) => trip.baseSnapshot.city)).toEqual(['Los Angeles, CA', 'Dallas, TX'])
  })

  it('moves an ETS2 base to another country while keeping the chosen display currency', async () => {
    const careerId = seedEts2Career({ distance: 80 })
    renderCareer(careerId, { openJournal: false, gameId: 'ets2' })
    const baseTab = [...container.querySelectorAll('.career-management-tabs button')].find((button) => button.textContent === 'Base')
    act(() => baseTab.click())
    setInputValue(container.querySelector('#career-new-location'), 'GB')
    setInputValue(container.querySelector('.career-change-form .react-city-autocomplete input'), 'Londres, Reino Unido')

    await act(async () => {
      container.querySelector('.career-change-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await act(async () => {
      document.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    const career = getCareer(careerId, 'ets2')
    const state = loadPhase1State(careerId, 'ets2')
    const london = getGame('ets2', 'GB', 'EUR', null, null, 'Londres, Reino Unido')
    expect(career).toMatchObject({ city: 'Londres, Reino Unido', countryCode: 'GB', countryName: 'Reino Unido', currency: 'EUR', baseCurrency: 'GBP' })
    expect(career.exchangeRate).toBe(london.exchangeRate)
    expect(state.trips[0].baseSnapshot).toMatchObject({ city: 'Berlin, Alemanha', countryCode: 'DE', baseCurrency: 'EUR' })
    expect(state.expenses).toMatchObject(london.expenses)
  })
})
