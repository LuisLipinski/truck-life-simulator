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
  getDraft: vi.fn(),
  saveDraft: vi.fn(),
  getFinances: vi.fn(),
  listLedger: vi.fn(),
  listPayslips: vi.fn(),
  listIncidents: vi.fn(),
  getProgression: vi.fn(),
  updateDefaultTruck: vi.fn(),
}))

vi.mock('../lib/financeApi.js', () => ({
  financeApi: {
    get: mocks.getFinances,
    listLedger: mocks.listLedger,
  },
}))

vi.mock('../lib/tripApi.js', () => ({
  tripApi: {
    create: mocks.createTrip,
    delete: mocks.deleteTrip,
    list: mocks.listTrips,
    getDraft: mocks.getDraft,
    saveDraft: mocks.saveDraft,
  },
}))

vi.mock('../lib/payrollApi.js', () => ({
  payrollApi: {
    listPayslips: mocks.listPayslips,
  },
}))

vi.mock('../lib/careerApi.js', () => ({
  careerApi: {
    updateDefaultTruck: mocks.updateDefaultTruck,
  },
}))

vi.mock('../lib/incidentApi.js', () => ({
  incidentApi: {
    list: mocks.listIncidents,
    create: vi.fn(),
    cancel: vi.fn(),
  },
}))

vi.mock('../lib/progressionApi.js', () => ({
  progressionApi: {
    get: mocks.getProgression,
    promote: vi.fn(),
    acquireDangerousGoods: vi.fn(),
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
  mocks.getDraft.mockReset().mockResolvedValue({ operationalWeek: 2, data: {}, updatedAt: null })
  mocks.saveDraft.mockReset().mockImplementation(async (_game, _careerId, week, data) => ({ operationalWeek: week, data, updatedAt: '2026-09-20T11:00:00Z' }))
  mocks.getFinances.mockReset()
  mocks.listLedger.mockReset().mockResolvedValue([])
  mocks.listPayslips.mockReset().mockResolvedValue([])
  mocks.updateDefaultTruck.mockReset().mockResolvedValue({
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
    defaultTruckMake: 'Volvo',
    defaultTruckModel: 'VNL 860',
    currentOperationalWeek: 2,
    version: 4,
  })
  mocks.listIncidents.mockReset().mockResolvedValue([])
  mocks.getProgression.mockReset().mockResolvedValue({
    careerId: serverCareerId,
    game: 'ATS',
    currentLevel: 1,
    balance: 5000,
    displayCurrency: 'USD',
    totalDistance: 120,
    dangerousGoodsQualified: false,
    academyProgress: [],
    qualifications: [],
    promotions: [
      { targetLevel: 2, moduleName: 'Truck Driving Proficiency', requiredDistance: 10000, currentDistance: 120, remainingDistance: 9880, feeAmount: 300, completed: false, ready: false },
      { targetLevel: 3, moduleName: 'Double Trailer Handling', requiredDistance: 50000, currentDistance: 120, remainingDistance: 49880, feeAmount: 59, completed: false, ready: false },
    ],
    dangerousQualification: { type: 'HAZMAT', name: 'HazMat', minimumLevel: 2, feeAmount: 144.25, acquired: false, ready: false },
  })
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
  it('saves the existing trip draft control only on the backend and leaves the legacy backup unchanged', async () => {
    const storageKey = phase1StorageKey(localCareerId)
    const backupBefore = localStorage.getItem(storageKey)

    await renderPage()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    await clickButton('Diário de Bordo')
    await clickButton('Salvar rascunho')
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mocks.saveDraft).toHaveBeenCalledWith(
      'ats',
      serverCareerId,
      2,
      expect.objectContaining({ week: 2 }),
    )
    expect(localStorage.getItem(storageKey)).toBe(backupBefore)
  })

  it('hydrates the existing overview and history with server-side finance data', async () => {
    mocks.listLedger.mockResolvedValue([{
      id: 'ledger-1',
      type: 'MONTHLY_EXPENSE',
      operationalWeek: 2,
      balanceDelta: -1800,
      balanceAfter: 3200,
      description: 'Despesas mensais aplicadas',
    }])
    mocks.listPayslips.mockResolvedValue([{
      id: 'payslip-1',
      operationalWeek: 1,
      startOperationalWeek: 1,
      endOperationalWeek: 1,
      grossAmount: 1000,
      perDiemAmount: 80,
      incidentDeductionAmount: 0,
      depositAmount: 900,
    }])
    mocks.listIncidents.mockResolvedValue([{ id: 'incident-1' }])

    await renderPage()
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })

    expect(container.textContent).toContain('US$ 1.800,00')
    await clickButton('Financeiro')
    await clickButton('Histórico')
    expect(mocks.listLedger).toHaveBeenCalledWith('ats', serverCareerId, 100, expect.objectContaining({ signal: expect.anything() }))
    expect(mocks.listPayslips).toHaveBeenCalledWith('ats', serverCareerId, expect.objectContaining({ signal: expect.anything() }))
    expect(container.textContent).toContain('Despesas mensais aplicadas')
    expect(container.textContent).toContain('1 períodos')
    expect(container.textContent).toContain('1 ocorrências')
  })

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

  it('renders server-backed incidents and qualifications instead of the migration guards', async () => {
    await renderPage()
    await clickButton('Diário de Bordo')
    await clickButton('Infrações e Acidentes')
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mocks.listIncidents).toHaveBeenCalledWith('ats', serverCareerId)
    expect(container.textContent).toContain('Registrar ocorrência')
    expect(container.textContent).not.toContain('Ocorrências temporariamente protegidas')

    await clickButton('Qualificações')
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(mocks.getProgression).toHaveBeenCalledWith('ats', serverCareerId)
    expect(container.textContent).toContain('Truck Driving Proficiency')
    expect(container.textContent).toContain('HazMat')
    expect(container.textContent).not.toContain('Promoções e qualificações temporariamente protegidas')
  })

  it('opens independent header editors and explains when employer/base changes become effective', async () => {
    await renderPage()

    expect(container.textContent).not.toContain('Gerenciar carreira')

    const driverEdit = container.querySelector('button[aria-label="Editar nome do motorista"]')
    const biographyEdit = container.querySelector('button[aria-label="Editar biografia"]')
    const baseEdit = container.querySelector('button[aria-label="Editar base"]')
    const companyEdit = container.querySelector('button[aria-label="Editar empresa"]')
    expect(driverEdit).not.toBeNull()
    expect(biographyEdit).not.toBeNull()
    expect(baseEdit).not.toBeNull()
    expect(companyEdit).not.toBeNull()

    await act(async () => driverEdit.click())
    expect(document.querySelector('[role="dialog"][aria-label="Editar dados da carreira"]')).not.toBeNull()
    expect(document.querySelector('#career-edit-driver')).not.toBeNull()
    expect(document.querySelector('#career-edit-bio')).toBeNull()

    let close = document.querySelector('button[aria-label="Fechar edição"]')
    await act(async () => close.click())

    await act(async () => biographyEdit.click())
    expect(document.querySelector('#career-edit-driver')).toBeNull()
    expect(document.querySelector('#career-edit-bio')).not.toBeNull()

    close = document.querySelector('button[aria-label="Fechar edição"]')
    await act(async () => close.click())

    await act(async () => companyEdit.click())
    expect(document.body.textContent).toContain('Quando a troca passa a valer?')
    expect(document.body.textContent).toContain('Válida a partir de')
    expect(document.body.textContent).not.toContain('Dia da semana efetivo')

    close = document.querySelector('button[aria-label="Fechar edição"]')
    await act(async () => close.click())

    await act(async () => baseEdit.click())
    expect(document.body.textContent).toContain('Nova cidade-base')
    expect(document.body.textContent).toContain('Quando a mudança passa a valer?')
    expect(document.body.textContent).toContain('Válida a partir de')
    expect(document.body.textContent).not.toContain('Dia da semana efetivo')
  })

})
