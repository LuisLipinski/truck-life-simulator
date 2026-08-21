import { getGame } from '../config/games.js'
import { getEts2CountryProfile, inferEts2CountryCode } from '../config/ets2Countries.js'

export function careersStorageKey(gameId = 'ats') {
  return `${getGame(gameId).storagePrefix}_careers_v1`
}

export function activeCareerStorageKey(gameId = 'ats') {
  return `${getGame(gameId).storagePrefix}_active_career`
}

export const CAREERS_KEY = careersStorageKey('ats')
export const ACTIVE_CAREER_KEY = activeCareerStorageKey('ats')
export const ETS2_CAREERS_KEY = careersStorageKey('ets2')
export const ETS2_ACTIVE_CAREER_KEY = activeCareerStorageKey('ets2')

function normalizeCareer(career, gameId = 'ats') {
  if (!career || gameId !== 'ets2') return career
  const inferredCode = inferEts2CountryCode(career.city)
  const countryCode = getEts2CountryProfile(career.countryCode)?.code || inferredCode || 'DE'
  const profile = getEts2CountryProfile(countryCode)
  return {
    ...career,
    gameId: 'ets2',
    countryCode,
    countryName: profile.name,
    currency: profile.currency,
  }
}

export function loadCareers(gameId = 'ats') {
  try {
    const value = JSON.parse(localStorage.getItem(careersStorageKey(gameId)) || '[]')
    if (!Array.isArray(value)) return []
    const normalized = value.map((career) => normalizeCareer(career, gameId))
    if (gameId === 'ets2' && JSON.stringify(normalized) !== JSON.stringify(value)) {
      localStorage.setItem(careersStorageKey(gameId), JSON.stringify(normalized))
    }
    return normalized
  } catch {
    return []
  }
}

export function saveCareers(careers, gameId = 'ats') {
  localStorage.setItem(careersStorageKey(gameId), JSON.stringify(careers))
}

export function getCareer(id, gameId = 'ats') {
  return loadCareers(gameId).find((career) => career.id === id) || null
}

export function createCareer(input, gameId = 'ats') {
  const careers = loadCareers(gameId)
  const career = normalizeCareer({
    id: `career_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    gameId,
    currentLevel: 1,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, gameId)
  careers.push(career)
  saveCareers(careers, gameId)
  localStorage.setItem(activeCareerStorageKey(gameId), career.id)
  return career
}

export function deleteCareer(id, gameId = 'ats') {
  saveCareers(loadCareers(gameId).filter((career) => career.id !== id), gameId)
  if (localStorage.getItem(activeCareerStorageKey(gameId)) === id) {
    localStorage.removeItem(activeCareerStorageKey(gameId))
  }
}

export function setActiveCareer(id, gameId = 'ats') {
  localStorage.setItem(activeCareerStorageKey(gameId), id)
}

export function getActiveCareerId(gameId = 'ats') {
  return localStorage.getItem(activeCareerStorageKey(gameId))
}
