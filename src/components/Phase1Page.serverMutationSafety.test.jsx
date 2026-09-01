// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from './ConfirmProvider.jsx'
import { GameProvider } from './GameContext.jsx'
import { TutorialProvider } from './GuidedTutorial.jsx'
import { ToastProvider } from './ToastProvider.jsx'
import { CAREERS_KEY } from '../lib/storage.js'
import { phase1StorageKey } from '../lib/phase1.js'
import {
  clearServerCareerState,
  replaceServerCareerBindings,
  setServerCareerSnapshot,
  setServerCareerTrips,
} from '../lib/careerServerState.js'

const mocks = vi.hoisted(() => ({
  createTrip: vi.fn(),
  deleteTrip: vi.fn(),
  listTrips: vi.fn(),
  getFinances: vi.fn(),
}))

vi.mock('../lib/financeApi.js', () => ({
  financeApi: {
    get: mocks.getFinances,
  },
}))

vi.mock('../lib/tripApi.js', () => ({
  tripApi: {
    create: mocks.createTrip,
    delete: mocks.deleteTrip,
    list: mocks.listTrips,
  },
}))

import Phase1Page from './Phase1Page.jsx'

let root
let container

const localCareerId = 'local-server-career'
const serverCareerId = '11111111-1111-1111-1111-111111111111'

function serverTrip() {
  return {
    id: 'trip-server-1',
    operationalWeek: 2,
    departureDay: 'MONDAY',
    departureTime: '08:00:00',
    arrivalDay: 'MONDAY',
    arrivalTime: '10:00:00',
    originCity: 'Los Angeles, CA',
    destinationCity: 'San Diego, CA',
    type: 'LOADED',
    paymentCategory: 'NORMAL',
    officialDistance: '120.00',
    source: 'MANUAL',
    version: 1,
  }
}

function seedServerCareer() {
  localStorage.setItem(CAREERS_KEY, JSON.stringify([{
    id: localCareerId,
    driverName: 'Backup Driver',
    city: 'Los Angeles, CA',
    company: 'Backup Logistics',
    currentLevel: 1,
    currentBalance: 5000,
    stateCode: 'CA',
    currency: 'USD',
    baseCurrency: 'USD',
    exchangeRate: 1,
  }]))
  localStorage.setItem(phase1StorageKey(localCareerId), JSON.stringify({
    balance: 5000,
    emergencyReserve: 0,
    history: [],
    trips: [],
    closedWeeks: [],
    customExpenses: [],
    incidents: [],
    currentLevel: 1,
    careerLevel: 1,
    currentWeek: 2,
  }))
  replaceServerCareerBindings([{
    gameId: 'ats',
    sourceCareerId: localCareerId,
    serverCareerId,
  }])
  setServerCareerSnapshot('ats', localCareerId, {
    id: serverCareerId,
    driverName: 'Server Driver',
    companyName: 'Server Logistics',
    biography: '',
    currentLevel: 1,
    balance: 5000,
    baseCurrency: 'USD',
    displayCurrency: 'USD',
    exchangeRate: 1,
    stateCode: 'CA',
    baseCity: 'Los Angeles, CA',
    currentOperationalWeek: 2,
    version: 3,
  })
  setServerCareerTrips('ats', localCareerId, [serverTrip()])
}

async function renderPage() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      <ToastProvider>
        <ConfirmProvider>
          <TutorialProvider>
            <GameProvider gameId="ats" stateCode="CA" city="Los Angeles, CA">
              <Phase1Page careerId={localCareerId} onBack={vi.fn()} />
            </GameProvider>
          </TutorialProvider>
        </ConfirmProvider>
      </ToastProvider>,
    )
  })
}

async function clickButton(text) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent.includes(text))
  expect(button).not.toBeUndefined()
  await act(async () => button.click())
  return button
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  sessionStorage.clear()
  clearServerCareerState()
  window.scrollTo = vi.fn()
  window.requestAnimationFrame = (callback) => { callback(); return 1 }
  mocks.createTrip.mockReset()
  mocks.deleteTrip.mockReset()
  mocks.listTrips.mockReset()
  mocks.getFinances.mockReset()
  mocks.getFinances.mockResolvedValue({
    balance: 5000,
    displayCurrency: 'USD',
    currentOperationalWeek: 2,
    monthlyExpenseTotal: 1800,
    expenses: [{ id: 'rent-1', type: 'STANDARD', category: 'rent', amount: 1800, included: true }],
    emergencyReserve: { balance: 250, annualYieldRate: 0.0325 },
  })
  seedServerCareer()
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  localStorage.clear()
  sessionStorage.clear()
  clearServerCareerState()
  vi.restoreAllMocks()
})

describe('Phase1Page server mutation safety', () => {
  it('does not report a confirmed server delete as failed only because the refresh GET failed', async () => {
    mocks.deleteTrip.mockResolvedValue(null)
    mocks.listTrips.mockRejectedValue(new Error('refresh failed'))

    await renderPage()
    await clickButton('Diário de Bordo')
    await clickButton('Excluir')

    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog).not.toBeNull()
    await act(async () => {
      dialog.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mocks.deleteTrip).toHaveBeenCalledWith('ats', serverCareerId, 'trip-server-1')
    expect(document.body.textContent).toContain('A viagem foi excluída no servidor, mas a lista não pôde ser recarregada agora')
    expect(document.body.textContent).not.toContain('Exclusão não concluída')
  })

  it('renders server-backed financial controls without enabling the local finance flow', async () => {
    await renderPage()
    await clickButton('Financeiro')

    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mocks.getFinances).toHaveBeenCalledWith('ats', serverCareerId)
    expect(container.textContent).toContain('Reserva de emergência')
    expect(container.textContent).toContain('Aplicar despesas mensais')
    expect(container.textContent).not.toContain('Saldo e despesas temporariamente protegidos')
  })

  it('blocks still-local incident and qualification writes until P4.6.4', async () => {
    await renderPage()
    await clickButton('Diário de Bordo')
    await clickButton('Infrações e Acidentes')
    expect(container.textContent).toContain('Ocorrências temporariamente protegidas')
    expect(container.textContent).not.toContain('Registrar ocorrência')

    await clickButton('Qualificações')
    expect(container.textContent).toContain('Promoções e qualificações temporariamente protegidas')
    expect(container.textContent).toContain('P4.6.4')
  })
})
