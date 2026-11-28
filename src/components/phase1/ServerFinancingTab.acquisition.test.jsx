// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  financing: {
    offers: vi.fn(),
    listContracts: vi.fn(),
    createContract: vi.fn(),
    pay: vi.fn(),
  },
  vehicles: {
    list: vi.fn(),
    financingOffers: vi.fn(),
    acquire: vi.fn(),
  },
  careerGet: vi.fn(),
  setSnapshot: vi.fn(),
  confirm: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../../lib/financingApi.js', () => ({
  financingApi: mocks.financing,
}))

vi.mock('../../lib/vehicleApi.js', () => ({
  vehicleApi: mocks.vehicles,
}))

vi.mock('../../lib/careerApi.js', () => ({
  careerApi: { get: mocks.careerGet },
}))

vi.mock('../../lib/careerServerState.js', () => ({
  setServerCareerSnapshot: mocks.setSnapshot,
}))

vi.mock('../ConfirmProvider.jsx', () => ({
  useConfirm: () => mocks.confirm,
}))

vi.mock('../GameContext.jsx', () => ({
  useGame: () => ({
    id: 'ats',
    shortName: 'ATS',
    distanceUnit: 'mi',
    routes: { phase2: '/phase2' },
    stateOptions: [
      { code: 'AZ', name: 'Arizona' },
      { code: 'TX', name: 'Texas' },
    ],
  }),
}))

vi.mock('../ToastProvider.jsx', () => ({
  useToast: () => mocks.toast,
}))

import ServerFinancingTab from './ServerFinancingTab.jsx'

let root
let container

const career = {
  id: 'career-local',
  serverCareerId: 'career-server',
  serverBacked: true,
  currentOperationalWeek: 1,
  currentPayrollMonth: null,
  currentBalance: 120000,
  currency: 'USD',
  displayCurrency: 'USD',
  defaultTruckMake: '',
  defaultTruckModel: '',
  stateCode: 'AZ',
}

const cashVehicle = {
  id: 'vehicle-1',
  make: 'Peterbilt',
  model: '579',
  modelYear: 2025,
  initialOdometer: 12500,
  purchasePrice: 80000,
  displayCurrency: 'USD',
  acquisitionType: 'CASH',
  status: 'ACTIVE',
  acquiredOperationalWeek: 1,
  currentPhase: 2,
  phase2Unlocked: true,
  currentBalance: 40000,
}

function responseCareer(overrides = {}) {
  return {
    id: 'career-server',
    currentOperationalWeek: 1,
    currentPayrollMonth: null,
    balance: 40000,
    displayCurrency: 'USD',
    currentPhase: 2,
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
    root.render(<ServerFinancingTab career={career} />)
  })
  await flush()
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  mocks.financing.offers.mockReset().mockResolvedValue([])
  mocks.financing.listContracts.mockReset().mockResolvedValue([])
  mocks.financing.createContract.mockReset()
  mocks.financing.pay.mockReset()
  mocks.vehicles.list.mockReset().mockResolvedValue([])
  mocks.vehicles.financingOffers.mockReset().mockResolvedValue([])
  mocks.vehicles.acquire.mockReset()
  mocks.careerGet.mockReset().mockResolvedValue(responseCareer())
  mocks.setSnapshot.mockReset()
  mocks.confirm.mockReset().mockResolvedValue(true)
  Object.values(mocks.toast).forEach((fn) => fn.mockReset())
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('ServerFinancingTab truck acquisition', () => {
  it('buys the first truck for cash and unlocks Phase 2 without creating a financing contract', async () => {
    mocks.vehicles.list
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([cashVehicle])
    mocks.vehicles.acquire.mockResolvedValue(cashVehicle)

    await render()

    const section = [...container.querySelectorAll('section')].find((item) => item.textContent.includes('Adquirir caminhão'))
    expect(section).not.toBeNull()

    const inputs = section.querySelectorAll('input')
    setInput(inputs[0], 'Peterbilt')
    setInput(inputs[1], '579')
    setInput(inputs[2], '2025')
    setInput(inputs[3], '12500')
    setInput(inputs[4], '80000')

    await act(async () => {
      section.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await flush()

    expect(mocks.vehicles.acquire).toHaveBeenCalledTimes(1)
    expect(mocks.vehicles.acquire).toHaveBeenCalledWith(
      'ats',
      'career-server',
      expect.objectContaining({
        acquisitionType: 'CASH',
        vehicleCondition: 'NEW',
        purchaseStateCode: 'AZ',
        make: 'Peterbilt',
        model: '579',
        modelYear: 2025,
        initialOdometer: '12500.000',
        purchasePrice: '80000.00',
        expectedOperationalWeek: 1,
        expectedBalance: '120000.00',
      }),
    )
    expect(mocks.financing.createContract).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Fase 2 desbloqueada')
    expect(container.textContent).toContain('Peterbilt 579')
  })

  it('forces used truck financing to use the headquarters jurisdiction without a selectable state', async () => {
    mocks.vehicles.financingOffers.mockResolvedValue([])

    await render()

    const section = [...container.querySelectorAll('section')].find((item) => item.textContent.includes('Adquirir caminhão'))
    let selects = section.querySelectorAll('select')
    setSelect(selects[0], 'USED')
    await flush()
    selects = section.querySelectorAll('select')
    setSelect(selects[1], 'FINANCED')

    const inputs = section.querySelectorAll('input')
    setInput(inputs[1], 'Kenworth')
    setInput(inputs[2], 'T680')
    setInput(inputs[3], '2024')
    setInput(inputs[4], '250000')
    setInput(inputs[5], '50000')

    await act(async () => {
      section.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await flush()

    expect(section.textContent).toContain('Caminhão usado usa obrigatoriamente a jurisdição da sede atual da carreira.')
    expect(mocks.vehicles.financingOffers).toHaveBeenCalledWith(
      'ats',
      'career-server',
      {
        condition: 'USED',
        purchasePrice: '50000.00',
        purchaseCountryCode: undefined,
        purchaseStateCode: undefined,
      },
    )
  })

  it('uses server financing offers and acquires the truck without sending client-calculated interest or down payment', async () => {
    const offer = {
      productType: 'VEHICLE_FINANCING',
      policyVersion: 'policy-v1',
      requestedAmount: 100000,
      displayCurrency: 'USD',
      downPayment: 20000,
      downPaymentRate: 0.2,
      principal: 80000,
      annualInterestRate: 0.0714,
      paymentFrequency: 'WEEKLY',
      termPeriods: 78,
      installmentAmount: 1100,
      expectedTotalCost: 105800,
      jurisdictionCity: 'Los Angeles, CA',
      jurisdictionStateCode: 'CA',
      jurisdictionRuleSummary: 'Regra local',
      prepaymentRuleSummary: 'Sem multa',
      latePaymentRuleSummary: 'Encargos conforme política',
      policySource: 'https://example.com/rate',
      jurisdictionRuleSource: 'https://example.com/rule',
    }
    const financedVehicle = {
      ...cashVehicle,
      id: 'vehicle-2',
      make: 'Kenworth',
      model: 'T680',
      purchasePrice: 100000,
      acquisitionType: 'FINANCED',
      financingContractId: 'contract-1',
      currentBalance: 10000,
    }

    mocks.vehicles.financingOffers.mockResolvedValue([offer])
    mocks.vehicles.list
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([financedVehicle])
    mocks.vehicles.acquire.mockResolvedValue(financedVehicle)
    mocks.careerGet.mockResolvedValue(responseCareer({ balance: 10000 }))

    await render()

    const section = [...container.querySelectorAll('section')].find((item) => item.textContent.includes('Adquirir caminhão'))
    const inputs = section.querySelectorAll('input')
    setInput(inputs[0], 'Kenworth')
    setInput(inputs[1], 'T680')
    setInput(inputs[2], '2026')
    setInput(inputs[3], '0')
    setInput(inputs[4], '100000')
    const selects = section.querySelectorAll('select')
    setSelect(selects[1], 'TX')
    setSelect(selects[2], 'FINANCED')

    await act(async () => {
      section.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await flush()

    expect(mocks.vehicles.financingOffers).toHaveBeenCalledWith(
      'ats',
      'career-server',
      {
        condition: 'NEW',
        purchasePrice: '100000.00',
        purchaseCountryCode: undefined,
        purchaseStateCode: 'TX',
      },
    )

    const financeButton = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Financiar este caminhão')
    expect(financeButton).not.toBeNull()

    await act(async () => {
      financeButton.click()
      await Promise.resolve()
    })
    await flush()

    expect(mocks.vehicles.acquire).toHaveBeenCalledTimes(1)
    const payload = mocks.vehicles.acquire.mock.calls[0][2]
    expect(payload).toMatchObject({
      acquisitionType: 'FINANCED',
      vehicleCondition: 'NEW',
      purchaseStateCode: 'TX',
      make: 'Kenworth',
      model: 'T680',
      purchasePrice: '100000.00',
      financingTermPeriods: 78,
      expectedOperationalWeek: 1,
      expectedBalance: '120000.00',
    })
    expect(payload).not.toHaveProperty('annualInterestRate')
    expect(payload).not.toHaveProperty('downPayment')
    expect(payload).not.toHaveProperty('principal')
    expect(payload).not.toHaveProperty('installmentAmount')
    expect(mocks.financing.createContract).not.toHaveBeenCalled()
  })
})
