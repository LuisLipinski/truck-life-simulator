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
  getCareer: vi.fn(),
  setServerCareerSnapshot: vi.fn(),
}))

vi.mock('../../lib/payrollApi.js', () => ({
  payrollApi: {
    listPeriods: mocks.listPeriods,
    closeOperationalWeek: mocks.closeOperationalWeek,
    listPayslips: mocks.listPayslips,
    generatePayslip: mocks.generatePayslip,
  },
}))

vi.mock('../../lib/careerApi.js', () => ({
  careerApi: { get: mocks.getCareer },
}))

vi.mock('../../lib/careerServerState.js', () => ({
  setServerCareerSnapshot: mocks.setServerCareerSnapshot,
}))

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

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
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

beforeEach(() => {
  mocks.listPeriods.mockReset().mockResolvedValue([])
  mocks.closeOperationalWeek.mockReset()
  mocks.listPayslips.mockReset().mockResolvedValue([])
  mocks.generatePayslip.mockReset()
  mocks.getCareer.mockReset().mockResolvedValue({ id: 'server-1', currentOperationalWeek: 5, currentPayrollMonth: 1, version: 2 })
  mocks.setServerCareerSnapshot.mockReset()
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
    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Gerar holerite da Semana 4'))
    await act(async () => generate.click())
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
    mocks.listPayslips
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    await render('ats')
    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Gerar holerite da Semana 4'))
    await act(async () => generate.click())
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
    mocks.listPayslips
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([persisted])

    await render('ats')
    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Gerar holerite da Semana 4'))
    await act(async () => generate.click())
    await confirmDialog()
    await flush()

    expect(document.body.textContent).toContain('Holerite confirmado')
    expect(document.body.textContent).toContain('já existe no servidor e foi reconciliado')
    expect(container.textContent).toContain('Crédito efetivo no saldo')
    expect(mocks.getCareer).toHaveBeenCalledWith('ats', 'server-1')
  })

  it('reconciles an ETS2 week close only when the closed week exists on the server', async () => {
    const period = { id: 'period-4', operationalWeek: 4, payrollMonth: 1, closedAt: '2026-08-30T20:00:00Z' }
    mocks.closeOperationalWeek.mockRejectedValue(new Error('connection lost'))
    mocks.listPeriods
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([period])

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
