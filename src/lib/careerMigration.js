import { loadPhase1State } from './phase1.js'
import { careersStorageKey, loadCareers } from './storage.js'

export const CAREER_IMPORT_SOURCE_VERSION = 12
export const CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT = 'truck-life:career-import-association-updated'
const MIGRATION_REGISTRY_PREFIX = 'truck_life_career_imports_v1'
const GAME_IDS = ['ats', 'ets2']

function registryKey(userId) {
  return `${MIGRATION_REGISTRY_PREFIX}_${String(userId || '').trim()}`
}

function careerKey(gameId, sourceCareerId) {
  return `${String(gameId || '').toLowerCase()}:${String(sourceCareerId || '')}`
}

function loadRegistry(userId) {
  if (!userId) return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(registryKey(userId)) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function saveRegistry(userId, registry) {
  if (!userId) return
  localStorage.setItem(registryKey(userId), JSON.stringify(registry))
}

function notifyAssociationUpdated(userId, record) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CAREER_IMPORT_ASSOCIATION_UPDATED_EVENT, {
    detail: { userId: String(userId), record },
  }))
}

function createOperationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function localSummary(career, state, gameId) {
  return {
    driverName: career?.driverName || 'Motorista sem nome',
    baseCity: career?.city || 'Cidade não informada',
    companyName: career?.company || 'Empresa não informada',
    currentLevel: Math.max(1, Number(state?.currentLevel || career?.currentLevel || 1)),
    balance: numberOrZero(state?.balance ?? career?.currentBalance ?? career?.initialBalance),
    currentOperationalWeek: Math.max(1, Number(state?.currentWeek || 1)),
    currentPayrollMonth: gameId === 'ets2' ? Math.max(1, Number(state?.currentPayrollMonth || 1)) : null,
    trips: Array.isArray(state?.trips) ? state.trips.length : 0,
    closedPeriods: Array.isArray(state?.closedWeeks) ? state.closedWeeks.length : 0,
    incidents: Array.isArray(state?.incidents) ? state.incidents.length : 0,
    careerEvents: Array.isArray(state?.history) ? state.history.length : 0,
    customExpenses: Array.isArray(state?.customExpenses) ? state.customExpenses.length : 0,
  }
}

function saveCompletedAssociation(userId, candidate, response, timestampField) {
  if (!userId || !candidate?.sourceCareerId || !response?.careerId) {
    throw new Error('Completed career import response is incomplete')
  }
  const registry = loadRegistry(userId)
  const key = careerKey(candidate.gameId, candidate.sourceCareerId)
  const current = registry[key] || {}
  registry[key] = {
    ...current,
    gameId: candidate.gameId,
    sourceCareerId: candidate.sourceCareerId,
    operationId: response.operationId || current.operationId,
    serverCareerId: response.careerId,
    status: 'COMPLETED',
    [timestampField]: new Date().toISOString(),
    summary: response.summary || null,
  }
  saveRegistry(userId, registry)
  notifyAssociationUpdated(userId, registry[key])
  return registry[key]
}

export function getCareerImportRecord(userId, gameId, sourceCareerId) {
  return loadRegistry(userId)[careerKey(gameId, sourceCareerId)] || null
}

export function listCompletedCareerImportAssociations(userId) {
  return Object.values(loadRegistry(userId))
    .filter((record) => record?.status === 'COMPLETED' && record?.gameId && record?.sourceCareerId && record?.serverCareerId)
    .map((record) => ({
      gameId: String(record.gameId).toLowerCase(),
      sourceCareerId: String(record.sourceCareerId),
      serverCareerId: String(record.serverCareerId),
      operationId: record.operationId || null,
    }))
}

export function listCareerImportCandidates(userId) {
  if (!userId) return []
  const registry = loadRegistry(userId)
  return GAME_IDS.flatMap((gameId) => loadCareers(gameId).map((career) => {
    const state = loadPhase1State(career.id, gameId)
    const key = careerKey(gameId, career.id)
    const record = registry[key] || null
    return {
      key,
      gameId,
      sourceCareerId: String(career.id),
      career,
      state,
      summary: localSummary(career, state, gameId),
      record,
      imported: Boolean(record?.status === 'COMPLETED' && record?.serverCareerId),
    }
  }))
}

export function countPendingCareerImports(userId) {
  return listCareerImportCandidates(userId).filter((candidate) => !candidate.imported).length
}

export function ensureCareerImportOperationId(userId, gameId, sourceCareerId) {
  if (!userId) throw new Error('Authenticated user is required for career migration')
  if (!sourceCareerId) throw new Error('Local career id is required for career migration')

  const registry = loadRegistry(userId)
  const key = careerKey(gameId, sourceCareerId)
  const current = registry[key]
  if (current?.operationId) return current.operationId

  const operationId = createOperationId()
  registry[key] = {
    ...current,
    gameId,
    sourceCareerId: String(sourceCareerId),
    operationId,
    status: current?.status || 'PENDING',
  }
  saveRegistry(userId, registry)
  return operationId
}

export function prepareCareerImportPayload(userId, candidate) {
  if (!candidate?.career || !candidate?.state) throw new Error('Career migration candidate is incomplete')
  const operationId = ensureCareerImportOperationId(
    userId,
    candidate.gameId,
    candidate.sourceCareerId,
  )
  return {
    operationId,
    sourceCareerId: candidate.sourceCareerId,
    game: candidate.gameId.toUpperCase(),
    sourceVersion: CAREER_IMPORT_SOURCE_VERSION,
    career: candidate.career,
    state: candidate.state,
  }
}

export function markCareerImported(userId, candidate, response) {
  return saveCompletedAssociation(userId, candidate, response, 'importedAt')
}

export function markCareerImportRecovered(userId, candidate, response) {
  return saveCompletedAssociation(userId, candidate, response, 'recoveredAt')
}

export function localCareerStillExists(candidate) {
  if (!candidate?.sourceCareerId) return false
  return loadCareers(candidate.gameId).some((career) => career.id === candidate.sourceCareerId)
    && localStorage.getItem(careersStorageKey(candidate.gameId)) !== null
}
