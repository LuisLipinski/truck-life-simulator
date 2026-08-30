// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT,
  listCompletedCareerImportAssociations,
  markCareerImported,
} from './careerMigration.js'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('completed career import associations', () => {
  it('exposes only completed server bindings for the authenticated user and announces new bindings', () => {
    const listener = vi.fn()
    window.addEventListener(CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT, listener)

    markCareerImported(
      'user-1',
      { gameId: 'ats', sourceCareerId: 'local-1' },
      { operationId: 'operation-1', careerId: 'server-1', summary: {} },
    )

    expect(listCompletedCareerImportAssociations('user-1')).toEqual([{
      gameId: 'ats',
      sourceCareerId: 'local-1',
      serverCareerId: 'server-1',
      operationId: 'operation-1',
    }])
    expect(listCompletedCareerImportAssociations('other-user')).toEqual([])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail).toMatchObject({
      userId: 'user-1',
      record: { sourceCareerId: 'local-1', serverCareerId: 'server-1', status: 'COMPLETED' },
    })

    window.removeEventListener(CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT, listener)
  })
})
