// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  vehicles: { list: vi.fn() },
  phase2: { transition: vi.fn(), completeTransition: vi.fn() },
  careerGet: vi.fn(),
  setSnapshot: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('../lib/vehicleApi.js', () => ({ vehicleApi: mocks.vehicles }))
vi.mock('../lib/phase2Api.js', () => ({ phase2Api: mocks.phase2 }))
vi.mock('../lib/careerApi.js', () => ({ careerApi: { get: mocks.careerGet } }))
vi.mock('../lib/careerServerState.js', () => ({ setServerCareerSnapshot: mocks.setSnapshot }))
vi.mock('../lib/storage.js', () => ({ CAREER_UPDATED_EVENT: 'truck-life-career-updated' }))
vi.mock('./ToastProvider.jsx', () => ({ useToast: () => mocks.toast }))
vi.mock('./GameContext.jsx', () => ({
  useGame: () => ({
    id: 'ats',
    shortName: 'ATS',
    distanceUnit: 'mi',
    companyPlaceholder: 'Pacific Horizon Logistics',
    stateOptions: [
      { code: 'AZ', name: 'Arizona' },
      { code: 'TX', name: 'Texas' },
    ],
    countryOptions: [],
  }),
}))

import Phase2Page from './Phase2Page.jsx'

let root
let container

const career = {
  id: 'career-local',
  serverCareerId: 'career-server',
  serverBacked: true,
  currentPhase: 2,
  currentBalance: 10000,
  balance: 10000,
  companyName: 'Road Logistics',
  stateCode: 'AZ',
  countryCode: null,
}

const vehicle = {
  id: 'truck-1',
  make: 'Kenworth',
  model: 'T680',
  modelYear: 2026,
  initialOdometer: 0,
  purchasePrice: 100000,
  displayCurrency: 'USD',
  vehicleCondition: 'NEW',
  purchaseCountryCode: 'US',
  purchaseStateCode: 'TX',
  acquisitionType: 'FINANCED',
  status: 'ACTIVE',
  acquiredOperationalWeek: 5,
  financingContractId: 'finance-1',
}

const pending = {
  id: 'transition-1',
  status: 'PENDING',
  previousCompanyName: 'Road Logistics',
  terminationReason: 'VOLUNTARY_PHASE2_TRANSITION',
  terminationCountryCode: 'US',
  terminationStateCode: 'AZ',
  employmentStartOperationalWeek: 1,
  terminationOperationalWeek: 5,
  terminationEffectiveDay: null,
  statutorySettlementAmount: 0,
  displayCurrency: 'USD',
  policyVersion: 'phase2-voluntary-exit-2026-v1',
  policySource: 'https://www.dol.gov/general/topic/benefits-other/severancepay',
  policySummary: 'Saída voluntária sem severance pay estatutário.',
  selectedAffiliation: null,
  completedAt: null,
  carrierContract: null,
  currentBalance: 10000,
  replay: false,
}

function completed(overrides = {}) {
  return {
    ...pending,
    status: 'COMPLETED',
    selectedAffiliation: 'CURRENT_COMPANY',
    terminationEffectiveDay: 'MONDAY',
    completedAt: '2026-11-28T12:00:00Z',
    carrierContract: {
      id: 'carrier-1',
      status: 'ACTIVE',
      carrierName: 'Road Logistics',
      affiliationOrigin: 'CURRENT_COMPANY',
      jurisdictionCountryCode: 'US',
      jurisdictionStateCode: 'AZ',
      compensationRuleKey: 'ATS:AZ',
      compensationPolicyStatus: 'JURISDICTION_SELECTED',
      startedOperationalWeek: 5,
      startedEffectiveDay: 'MONDAY',
    },
    ...overrides,
  }
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function setInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, String(value))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function setSelect(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
  act(() => {
    setter.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<Phase2Page career={career} onBack={vi.fn()} />)
  })
  await flush()
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  mocks.vehicles.list.mockReset().mockResolvedValue([vehicle])
  mocks.phase2.transition.mockReset().mockResolvedValue(pending)
  mocks.phase2.completeTransition.mockReset()
  mocks.careerGet.mockReset().mockResolvedValue({
    id: 'career-server',
    currentPhase: 2,
    balance: 10000,
    companyName: 'Road Logistics',
  })
  mocks.setSnapshot.mockReset()
  Object.values(mocks.toast).forEach((fn) => fn.mockReset())
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('Phase2Page mandatory transition onboarding', () => {
  it('blocks the screen with the transition modal and shows the termination settlement', async () => {
    await render()

    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('Você chegou à Fase 2')
    expect(dialog.textContent).toContain('Rescisão com Road Logistics')
    expect(dialog.textContent).toContain('Arizona')
    expect(dialog.textContent).toContain('Saída voluntária sem severance pay estatutário.')
    expect(dialog.textContent).toContain('Holerites e salários normais permanecem separados')
    expect(dialog.querySelector('button[type="button"]')).toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('continues with the current company and creates the carrier contract before releasing the modal', async () => {
    mocks.phase2.completeTransition.mockResolvedValue(completed())

    await render()

    const dialog = container.querySelector('[role="dialog"]')
    const selects = dialog.querySelectorAll('select')
    setSelect(selects[1], 'MONDAY')

    await act(async () => {
      dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await flush()

    expect(mocks.phase2.completeTransition).toHaveBeenCalledTimes(1)
    expect(mocks.phase2.completeTransition).toHaveBeenCalledWith(
      'ats',
      'career-server',
      expect.objectContaining({
        affiliation: 'CURRENT_COMPANY',
        effectiveDay: 'MONDAY',
        expectedBalance: '10000.00',
      }),
    )
    const body = mocks.phase2.completeTransition.mock.calls[0][2]
    expect(body.operationId).toEqual(expect.any(String))
    expect(body).not.toHaveProperty('carrierName')
    expect(body).not.toHaveProperty('carrierStateCode')
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(container.textContent).toContain('Contrato de agregado')
    expect(container.textContent).toContain('Road Logistics')
    expect(container.textContent).toContain('ATS:AZ')
    expect(mocks.careerGet).toHaveBeenCalledWith('ats', 'career-server')
    expect(mocks.setSnapshot).toHaveBeenCalled()
  })

  it('requires name and state for a different ATS carrier and sends that jurisdiction to the backend', async () => {
    mocks.phase2.completeTransition.mockResolvedValue(completed({
      selectedAffiliation: 'OTHER_COMPANY',
      carrierContract: {
        ...completed().carrierContract,
        carrierName: 'Texas Haul',
        affiliationOrigin: 'OTHER_COMPANY',
        jurisdictionStateCode: 'TX',
        compensationRuleKey: 'ATS:TX',
        startedEffectiveDay: 'TUESDAY',
      },
    }))

    await render()

    let dialog = container.querySelector('[role="dialog"]')
    let selects = dialog.querySelectorAll('select')
    setSelect(selects[0], 'OTHER_COMPANY')
    await flush()

    dialog = container.querySelector('[role="dialog"]')
    selects = dialog.querySelectorAll('select')
    const companyInput = dialog.querySelector('input:not([readonly])')
    setInput(companyInput, 'Texas Haul')
    setSelect(selects[1], 'TX')
    setSelect(selects[2], 'TUESDAY')

    await act(async () => {
      dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await flush()

    expect(mocks.phase2.completeTransition).toHaveBeenCalledWith(
      'ats',
      'career-server',
      expect.objectContaining({
        affiliation: 'OTHER_COMPANY',
        carrierName: 'Texas Haul',
        carrierStateCode: 'TX',
        effectiveDay: 'TUESDAY',
        expectedBalance: '10000.00',
      }),
    )
    expect(container.textContent).toContain('Texas Haul')
    expect(container.textContent).toContain('ATS:TX')
  })
})
