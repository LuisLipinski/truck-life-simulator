// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from '../ConfirmProvider.jsx'
import { GameProvider } from '../GameContext.jsx'
import { ToastProvider } from '../ToastProvider.jsx'

const mocks = vi.hoisted(() => ({
  listPeriods: vi.fn(),
  closeOperationalWeek: vi.fn(),
  listPayslips: vi.fn(),
  generatePayslip: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getPreview: vi.fn(),
  getCareer: vi.fn(),
  setServerCareerSnapshot: vi.fn(),
  getFinance: vi.fn(),
  configureAutoReserve: vi.fn(),
}))

vi.mock('../../lib/payrollApi.js', () => ({
  payrollApi: {
    listPeriods: mocks.listPeriods,
    closeOperationalWeek: mocks.closeOperationalWeek,
    listPayslips: mocks.listPayslips,
    generatePayslip: mocks.generatePayslip,
    getSettings: mocks.getSettings,
    updateSettings: mocks.updateSettings,
    getPreview: mocks.getPreview,
  },
}))
vi.mock('../../lib/financeApi.js', () => ({
  financeApi: {
    get: mocks.getFinance,
    configureAutoReserve: mocks.configureAutoReserve,
  },
}))
vi.mock('../../lib/careerApi.js', () => ({ careerApi: { get: mocks.getCareer } }))
vi.mock('../../lib/careerServerState.js', () => ({ setServerCareerSnapshot: mocks.setServerCareerSnapshot }))

import ServerPayslipTab from './ServerPayslipTab.jsx'

let root
let container

function career(overrides = {}) {
  return {
    id: 'local-1',
    serverCareerId: 'server-1',
    serverBacked: true,
    currentOperationalWeek: 4,
    currentPayrollMonth: 1,
    currentLevel: 1,
    ...overrides,
  }
}

function finance(overrides = {}) {
  return {
    careerId: 'server-1',
    displayCurrency: 'USD',
    currentOperationalWeek: 4,
    currentPayrollMonth: 1,
    emergencyReserve: {
      balance: 0,
      annualYieldRate: 0.04,
      autoContributionEnabled: false,
      autoContributionAmount: 0,
    },
    ...overrides,
  }
}

function payslip(overrides = {}) {
  return {
    id: 'pay-1',
    operationalWeek: 4,
    payrollMonth: null,
    startOperationalWeek: 4,
    endOperationalWeek: 4,
    level: 1,
    displayCurrency: 'USD',
    grossAmount: 850,
    taxAmount: 150,
    benefitsAmount: 36,
    netSalaryAmount: 664,
    perDiemAmount: 0,
    incidentDeductionAmount: 0,
    depositAmount: 664,
    reserveContributionAmount: 0,
    balanceCreditAmount: 664,
    totalDistance: 120,
    generatedAt: '2026-08-30T20:00:00Z',
    lines: [],
    ...overrides,
  }
}

function preview(overrides = {}) {
  return {
    ready: true,
    operationalWeek: 4,
    payrollMonth: null,
    level: 1,
    displayCurrency: 'USD',
    grossAmount: 850,
    taxAmount: 150,
    benefitsAmount: 36,
    netSalaryAmount: 664,
    perDiemAmount: 0,
    incidentDeductionAmount: 0,
    depositAmount: 664,
    totalDistance: 120,
    elapsedMinutes: 419,
    breakMinutes: 0,
    workedMinutes: 419,
    overrunMinutes: 0,
    dailyWorkBreakdown: [
      { operationalWeek: 4, day: 'MONDAY', elapsedMinutes: 419, breakMinutes: 0, workedMinutes: 419, overrunMinutes: 0 },
    ],
    contextSnapshot: { stateCode: 'CA', baseCity: 'Los Angeles, CA', cityMarketLabel: 'Metro' },
    lines: [
      { code: 'FEDERAL_TAX', label: 'Federal Income Tax', type: 'DEDUCTION', amount: 80 },
      { code: 'SOCIAL_SECURITY', label: 'Social Security', type: 'DEDUCTION', amount: 52 },
      { code: 'MEDICARE', label: 'Medicare', type: 'DEDUCTION', amount: 12 },
      { code: 'STATE_INCOME_TAX', label: 'State Income Tax', type: 'DEDUCTION', amount: 6 },
      { code: 'BENEFITS', label: 'Benefits', type: 'DEDUCTION', amount: 36 },
    ],
    ...overrides,
  }
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
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

async function render(gameId = 'ats', careerOverrides = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      <ToastProvider>
        <ConfirmProvider>
          <GameProvider gameId={gameId} countryCode={gameId === 'ets2' ? 'DE' : null} stateCode={gameId === 'ats' ? 'CA' : null} city={gameId === 'ets2' ? 'Berlin, Alemanha' : 'Los Angeles, CA'}>
            <ServerPayslipTab career={career(careerOverrides)} />
          </GameProvider>
        </ConfirmProvider>
      </ToastProvider>,
    )
  })
  await flush()
}

async function confirmDialog() {
  const dialog = document.querySelector('[role="alertdialog"]')
  expect(dialog).not.toBeNull()
  await act(async () => {
    dialog.querySelector('.react-confirm-confirm').click()
    await Promise.resolve()
  })
}

function generateButton() {
  return [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Gerar holerite e depositar'))
}

beforeEach(() => {
  mocks.listPeriods.mockReset().mockResolvedValue([])
  mocks.closeOperationalWeek.mockReset()
  mocks.listPayslips.mockReset().mockResolvedValue([])
  mocks.generatePayslip.mockReset()
  mocks.getSettings.mockReset().mockResolvedValue({
    editable: true,
    currentLevel: 1,
    level1Gross: 850,
    routeOverrunRate: 21.25,
    benefits: 36,
    perDiemRate: 80,
    displayCurrency: 'USD',
  })
  mocks.updateSettings.mockReset()
  mocks.getPreview.mockReset().mockResolvedValue(preview())
  mocks.getCareer.mockReset().mockResolvedValue({ id: 'server-1', currentOperationalWeek: 5, currentPayrollMonth: 1, version: 2 })
  mocks.setServerCareerSnapshot.mockReset()
  mocks.getFinance.mockReset().mockResolvedValue(finance())
  mocks.configureAutoReserve.mockReset().mockResolvedValue(finance({
    emergencyReserve: {
      balance: 0,
      annualYieldRate: 0.04,
      autoContributionEnabled: true,
      autoContributionAmount: 75,
    },
  }))
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  document.querySelectorAll('[role="alert"], [role="alertdialog"]').forEach((node) => node.remove())
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('ServerPayslipTab confirmation safety', () => {
  it('renders the legacy payslip hierarchy from the authoritative backend preview', async () => {
    await render('ats')

    expect(container.textContent).toContain('Gerar holerite')
    expect(container.textContent).toContain('Route Overrun automático')
    expect(container.textContent).toContain('Semana 4 • Segunda-feira')
    expect(container.textContent).toContain('6h 59min trabalhadas • sem extra')
    expect(container.textContent).toContain('Federal Income Tax')
    expect(container.textContent).toContain('Social Security')
    expect(container.textContent).toContain('Salário líquido')
    expect(container.textContent).toContain('Depósito total')
    expect(container.textContent).toContain('Histórico de holerites')
    expect(container.textContent).toContain('Adicionar automaticamente à reserva ao fechar a semana')
    expect(mocks.getFinance).toHaveBeenCalledWith('ats', 'server-1')
  })

  it('persists payroll preferences and refreshes the authoritative preview', async () => {
    mocks.updateSettings.mockResolvedValue({
      editable: true,
      currentLevel: 1,
      level1Gross: 1000,
      routeOverrunRate: 30,
      benefits: 50,
      perDiemRate: 90,
      displayCurrency: 'USD',
    })
    mocks.getPreview
      .mockResolvedValueOnce(preview())
      .mockResolvedValueOnce(preview({ grossAmount: 1000, netSalaryAmount: 800, depositAmount: 800 }))

    await render('ats')
    setInputValue(container.querySelector('input[aria-label="Salário N1"]'), '1000')
    const save = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Salvar ajustes no servidor'))
    expect(save).not.toBeUndefined()
    await act(async () => save.click())
    await flush()

    expect(mocks.updateSettings).toHaveBeenCalledWith('ats', 'server-1', expect.objectContaining({
      expectedOperationalWeek: 4,
      expectedPayrollMonth: null,
    }))
    expect(container.textContent).toContain('Depósito total')
    expect(container.textContent).toContain('US$ 800,00')
  })

  it('persists automatic reserve configuration in the finance backend before generation', async () => {
    await render('ats')
    const checkbox = container.querySelector('.server-reserve-control input[type="checkbox"]')
    act(() => checkbox.click())

    const amount = container.querySelector('input[aria-label="Valor do aporte automático"]')
    setInputValue(amount, '75')
    const save = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Salvar configuração da reserva'))
    expect(save).not.toBeUndefined()
    await act(async () => save.click())
    await flush()

    expect(mocks.configureAutoReserve).toHaveBeenCalledWith('ats', 'server-1', {
      expectedOperationalWeek: 4,
      expectedPayrollMonth: null,
      enabled: true,
      amount: 75,
    })
    expect(generateButton().disabled).toBe(false)
  })

  it('never falls back to local payroll history when the server history cannot be loaded', async () => {
    mocks.listPeriods.mockRejectedValue(new Error('offline'))
    mocks.listPayslips.mockRejectedValue(new Error('offline'))

    await render('ats')

    expect(container.textContent).toContain('Não foi possível carregar a folha')
    expect(container.textContent).toContain('histórico local não será usado como substituto')
    expect(container.textContent).not.toContain('Holerite gerado')
  })

  it('does not show success while the payslip POST is still pending', async () => {
    let resolvePost
    mocks.generatePayslip.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve }))

    await render('ats')
    await act(async () => generateButton().click())
    await confirmDialog()

    expect(container.textContent).toContain('Aguardando confirmação do servidor')
    expect(document.body.textContent).not.toContain('Holerite gerado')

    await act(async () => {
      resolvePost(payslip())
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.body.textContent).toContain('Holerite gerado')
    expect(document.body.textContent).toContain('Semana 4 confirmado pelo servidor')
  })

  it('keeps the operation unconfirmed after POST failure when GET reconciliation finds nothing', async () => {
    mocks.generatePayslip.mockRejectedValue(new Error('A API não pôde ser acessada.'))
    mocks.listPayslips.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    await render('ats')
    await act(async () => generateButton().click())
    await confirmDialog()
    await flush()

    expect(document.body.textContent).toContain('Holerite não confirmado')
    expect(document.body.textContent).toContain('Nenhum depósito será assumido nesta tela')
    expect(container.textContent).toContain('Confirmação pendente de sincronização')
    expect(mocks.setServerCareerSnapshot).not.toHaveBeenCalled()
  })

  it('accepts success after a lost POST response only when GET confirms the exact ATS period', async () => {
    const persisted = payslip()
    mocks.generatePayslip.mockRejectedValue(new Error('connection lost'))
    mocks.listPayslips.mockResolvedValueOnce([]).mockResolvedValueOnce([persisted])

    await render('ats')
    await act(async () => generateButton().click())
    await confirmDialog()
    await flush()

    expect(document.body.textContent).toContain('Holerite confirmado')
    expect(document.body.textContent).toContain('já existe no servidor e foi reconciliado')
    expect(container.textContent).toContain('Crédito no saldo')
    expect(mocks.getCareer).toHaveBeenCalledWith('ats', 'server-1')
  })

  it('sends only the expected period in the final generation call', async () => {
    mocks.generatePayslip.mockResolvedValue(payslip())

    await render('ats')
    await act(async () => generateButton().click())
    await confirmDialog()
    await flush()

    expect(mocks.generatePayslip).toHaveBeenCalledWith('ats', 'server-1', {
      expectedOperationalWeek: 4,
      expectedPayrollMonth: 1,
    })
  })

  it('reconciles an ETS2 week close only when the closed week exists on the server', async () => {
    const period = { id: 'period-4', operationalWeek: 4, payrollMonth: 1, closedAt: '2026-08-30T20:00:00Z' }
    mocks.closeOperationalWeek.mockRejectedValue(new Error('connection lost'))
    mocks.listPeriods.mockResolvedValueOnce([]).mockResolvedValueOnce([period])

    await render('ets2', { currentOperationalWeek: 4, currentPayrollMonth: 1 })
    const close = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Encerrar Semana 4'))
    await act(async () => close.click())
    await confirmDialog()
    await flush()

    expect(document.body.textContent).toContain('Fechamento confirmado')
    expect(document.body.textContent).toContain('servidor já possui o fechamento da Semana 4')
    expect(mocks.getCareer).toHaveBeenCalledWith('ets2', 'server-1')
  })
})
