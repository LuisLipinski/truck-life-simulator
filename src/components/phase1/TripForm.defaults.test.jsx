// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TripForm from './TripForm.jsx'
import { GameProvider } from '../GameContext.jsx'
import { ToastProvider } from '../ToastProvider.jsx'

let root
let container

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

function setInputValue(input, value) {
  const prototype = input instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set
  act(() => {
    setter.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function renderForm({ career = {}, state = {}, onAdd = vi.fn(), onSaveDefaultTruck = vi.fn() } = {}) {
  const normalizedState = {
    currentWeek: 1,
    currentLevel: 1,
    trips: [],
    tripDraft: null,
    ...state,
  }

  act(() => {
    root.render(
      <ToastProvider>
        <GameProvider gameId="ats" stateCode="CA" currencyCode="USD" city="Los Angeles, CA">
          <TripForm
            career={career}
            state={normalizedState}
            onAdd={onAdd}
            onSaveDraft={vi.fn()}
            onSaveDefaultTruck={onSaveDefaultTruck}
          />
        </GameProvider>
      </ToastProvider>,
    )
  })

  return { form: container.querySelector('.trip-form'), onAdd, onSaveDefaultTruck }
}

function fillRequiredTrip(form) {
  const selects = form.querySelectorAll('select')
  const times = form.querySelectorAll('input[type="time"]')
  setInputValue(selects[0], 'monday')
  setInputValue(times[0], '08:00')
  setInputValue(selects[1], 'monday')
  setInputValue(times[1], '10:00')

  const cities = form.querySelectorAll('.react-city-autocomplete input')
  setInputValue(cities[0], 'Los Angeles, CA')
  setInputValue(cities[1], 'Bakersfield, CA')
  setInputValue(form.querySelector('input[type="number"][min="1"]'), '100')
}

describe('trip defaults', () => {
  it('prefills the truck saved in the career and the last final odometer', () => {
    const { form } = renderForm({
      career: { defaultTruckMake: 'Kenworth', defaultTruckModel: 'T680' },
      state: { trips: [{ id: 1, odometerEnd: 45210.5 }] },
    })

    expect(form.querySelector('[name="truckMake"]').value).toBe('Kenworth')
    expect(form.querySelector('[name="truckModel"]').value).toBe('T680')
    expect(form.querySelector('[name="keepTruckSaved"]').checked).toBe(true)
    expect(form.querySelector('[name="odometerStart"]').value).toBe('45210.5')
  })

  it('saves a selected truck as the default and carries the final odometer into the next trip', () => {
    const onAdd = vi.fn()
    const onSaveDefaultTruck = vi.fn()
    const { form } = renderForm({ onAdd, onSaveDefaultTruck })
    fillRequiredTrip(form)

    setInputValue(form.querySelector('[name="truckMake"]'), 'Volvo')
    setInputValue(form.querySelector('[name="truckModel"]'), 'VNL 860')
    act(() => form.querySelector('[name="keepTruckSaved"]').click())
    setInputValue(form.querySelector('[name="odometerStart"]'), '1000')
    setInputValue(form.querySelector('[name="odometerEnd"]'), '1100')

    act(() => form.querySelector('[type="submit"]').click())

    expect(onSaveDefaultTruck).toHaveBeenCalledWith({ truckMake: 'Volvo', truckModel: 'VNL 860' })
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      truckMake: 'Volvo',
      truckModel: 'VNL 860',
      odometerStart: 1000,
      odometerEnd: 1100,
      miles: 100,
    }))
    expect(form.querySelector('[name="truckMake"]').value).toBe('Volvo')
    expect(form.querySelector('[name="truckModel"]').value).toBe('VNL 860')
    expect(form.querySelector('[name="odometerStart"]').value).toBe('1100')
    expect(form.querySelector('[name="odometerEnd"]').value).toBe('')
  })
})
