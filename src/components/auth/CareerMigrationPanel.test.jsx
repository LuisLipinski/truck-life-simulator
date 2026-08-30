// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiProblemError } from '../../lib/authApi.js'
import { phase1StorageKey } from '../../lib/phase1.js'
import { getCareerImportRecord } from '../../lib/careerMigration.js'
import { careersStorageKey, saveCareers } from '../../lib/storage.js'
import CareerMigrationPanel from './CareerMigrationPanel.jsx'

const { validateMock, importMock, recoverMock } = vi.hoisted(() => ({
  validateMock: vi.fn(),
  importMock: vi.fn(),
  recoverMock: vi.fn(),
}))

vi.mock('../../lib/careerImportApi.js', () => ({
  careerImportApi: {
    validate: validateMock,
    importCareer: importMock,
    recover: recoverMock,
  },
}))

let container
let root

function localCareer() {
  return {
    id: 'ats-local-panel',
    gameId: 'ats',
    driverName: 'Driver Migration',
    city: 'Phoenix, AZ',
    company: 'Local Freight',
    stateCode: 'AZ',
    currency: 'USD',
    exchangeRate: 1,
    exchangeRateAsOf: '2026-08-01',
    currentLevel: 2,
    currentBalance: 2500,
  }
}

async function click(selector) {
  await act(async () => {
    container.querySelector(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  validateMock.mockReset()
  importMock.mockReset()
  recoverMock.mockReset()
  saveCareers([localCareer()], 'ats')
  localStorage.setItem(phase1StorageKey('ats-local-panel', 'ats'), JSON.stringify({
    balance: 2500,
    currentLevel: 2,
    currentWeek: 5,
    trips: [{ id: 1, week: 4, distance: 300, source: 'MANUAL' }],
    closedWeeks: [{ week: 4 }],
    incidents: [],
    history: [],
  }))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<CareerMigrationPanel userId="user-panel" />))
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  localStorage.clear()
  root = null
  container = null
})

describe('CareerMigrationPanel', () => {
  it('shows the local summary before any request, validates first, then imports while preserving localStorage', async () => {
    expect(container.textContent).toContain('Driver Migration')
    expect(container.textContent).toContain('Phoenix, AZ')
    expect(container.textContent).toContain('Local Freight')
    expect(container.textContent).toContain('O snapshot completo só é enviado ao backend')
    expect(validateMock).not.toHaveBeenCalled()
    expect(importMock).not.toHaveBeenCalled()
    expect(recoverMock).not.toHaveBeenCalled()

    validateMock.mockResolvedValue({
      valid: true,
      persisted: false,
      summary: {
        driverName: 'Driver Migration',
        baseCity: 'Phoenix, AZ',
        companyName: 'Local Freight',
      },
    })
    await click('.career-migration-validate')

    expect(validateMock).toHaveBeenCalledTimes(1)
    const payload = validateMock.mock.calls[0][0]
    expect(payload).toMatchObject({
      sourceCareerId: 'ats-local-panel',
      game: 'ATS',
      sourceVersion: 12,
      state: { balance: 2500, currentWeek: 5 },
    })
    expect(container.textContent).toContain('Validado pelo servidor')
    expect(container.querySelector('.career-migration-import')).not.toBeNull()

    importMock.mockResolvedValue({
      operationId: payload.operationId,
      sourceCareerId: 'ats-local-panel',
      game: 'ATS',
      sourceVersion: 12,
      careerId: 'server-career-panel',
      persisted: true,
      idempotentReplay: false,
      summary: { driverName: 'Driver Migration' },
    })
    await click('.career-migration-import')

    expect(importMock).toHaveBeenCalledWith(payload)
    expect(getCareerImportRecord('user-panel', 'ats', 'ats-local-panel')).toMatchObject({
      operationId: payload.operationId,
      serverCareerId: 'server-career-panel',
      status: 'COMPLETED',
    })
    expect(localStorage.getItem(careersStorageKey('ats'))).toContain('ats-local-panel')
    expect(localStorage.getItem(phase1StorageKey('ats-local-panel', 'ats'))).toContain('2500')
    expect(container.textContent).toContain('Já associadas a esta conta')
    expect(container.textContent).toContain('Backup local preservado')
  })

  it('recovers a lost local association without validating or importing the snapshot again', async () => {
    recoverMock.mockResolvedValue({
      operationId: '33333333-3333-4333-8333-333333333333',
      sourceCareerId: 'ats-local-panel',
      game: 'ATS',
      sourceVersion: 12,
      careerId: 'server-career-recovered',
      persisted: true,
      idempotentReplay: true,
      summary: { driverName: 'Driver Migration' },
    })

    await click('.career-migration-recover')

    expect(recoverMock).toHaveBeenCalledTimes(1)
    expect(recoverMock).toHaveBeenCalledWith('ats', 'ats-local-panel')
    expect(validateMock).not.toHaveBeenCalled()
    expect(importMock).not.toHaveBeenCalled()
    expect(getCareerImportRecord('user-panel', 'ats', 'ats-local-panel')).toMatchObject({
      operationId: '33333333-3333-4333-8333-333333333333',
      serverCareerId: 'server-career-recovered',
      status: 'COMPLETED',
      recoveredAt: expect.any(String),
    })
    expect(localStorage.getItem(careersStorageKey('ats'))).toContain('ats-local-panel')
    expect(localStorage.getItem(phase1StorageKey('ats-local-panel', 'ats'))).toContain('2500')
    expect(container.textContent).toContain('Vínculo recuperado')
    expect(container.textContent).toContain('Backup local preservado')
  })

  it('keeps the career pending when recovery returns 404 and never starts an import automatically', async () => {
    recoverMock.mockRejectedValue(new ApiProblemError('Association not found', {
      status: 404,
      code: 'CAREER_IMPORT_NOT_FOUND',
    }))

    await click('.career-migration-recover')

    expect(recoverMock).toHaveBeenCalledWith('ats', 'ats-local-panel')
    expect(validateMock).not.toHaveBeenCalled()
    expect(importMock).not.toHaveBeenCalled()
    expect(getCareerImportRecord('user-panel', 'ats', 'ats-local-panel')).toBeNull()
    expect(container.textContent).toContain('Vínculo não encontrado')
    expect(container.textContent).toContain('Nada foi importado ou alterado')
    expect(container.querySelector('.career-migration-validate')).not.toBeNull()
    expect(localStorage.getItem(careersStorageKey('ats'))).toContain('ats-local-panel')
    expect(localStorage.getItem(phase1StorageKey('ats-local-panel', 'ats'))).toContain('2500')
  })
})
