import { getGame } from '../config/games.js'
import { getAtsStateProfile, inferAtsStateCode } from '../config/atsStates.js'
import { ATS_EXCHANGE_RATE_DATE, getAtsCurrency, getAtsExchangeRate } from '../config/atsCurrencies.js'
import { getEts2CountryProfile, inferEts2CountryCode } from '../config/ets2Countries.js'
import { ETS2_EXCHANGE_RATE_DATE, getEts2Currency, getEts2ExchangeRate } from '../config/ets2Currencies.js'
import { getServerCareerOverlay, setActiveServerCareerForLocal } from './careerServerState.js'

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
export const CAREER_UPDATED_EVENT = 'truck-life:career-updated'

const SERVER_ONLY_FIELDS = Object.freeze([
  'serverBacked',
  'serverCareerId',
  'serverVersion',
  'serverSyncStatus',
  'serverTripsStatus',
])

const SERVER_PROFILE_FIELDS = Object.freeze([
  'driverName',
  'company',
  'bio',
  'biography',
  'baseCurrency',
  'currency',
  'exchangeRate',
  'exchangeRateAsOf',
  'stateCode',
  'stateName',
  'countryCode',
  'countryName',
  'city',
  'cityMarketVersion',
  'cityMarketLabel',
  'cityCostFactor',
  'citySalaryFactor',
  'events',
  'currentOperationalWeek',
  'currentPayrollMonth',
])

function normalizeCareer(career, gameId = 'ats') {
  if (!career) return career
  if (gameId === 'ats') {
    const inferredCode = inferAtsStateCode(career.city)
    const stateCode = getAtsStateProfile(career.stateCode)?.code || inferredCode || 'CA'
    const profile = getAtsStateProfile(stateCode)
    const currency = getAtsCurrency(career.currency)?.code || 'USD'
    const exchangeRate = currency === 'USD'
      ? 1
      : Number(career.exchangeRate) > 0
        ? Number(career.exchangeRate)
        : getAtsExchangeRate('USD', currency)
    const financialProfile = getGame(
      'ats', stateCode, currency, exchangeRate, career.exchangeRateAsOf || ATS_EXCHANGE_RATE_DATE,
      career.city, career.cityCostFactor, career.citySalaryFactor, career.cityMarketLabel,
    )
    return {
      ...career,
      gameId: 'ats',
      stateCode,
      stateName: profile.name,
      baseCurrency: 'USD',
      currency,
      exchangeRate,
      exchangeRateAsOf: career.exchangeRateAsOf || ATS_EXCHANGE_RATE_DATE,
      cityMarketVersion: financialProfile.cityMarketVersion,
      cityMarketLabel: financialProfile.cityMarketLabel,
      cityCostFactor: financialProfile.cityCostFactor,
      citySalaryFactor: financialProfile.citySalaryFactor,
      events: Array.isArray(career.events) ? career.events : [],
    }
  }
  const inferredCode = inferEts2CountryCode(career.city)
  const countryCode = getEts2CountryProfile(career.countryCode)?.code || inferredCode || 'DE'
  const profile = getEts2CountryProfile(countryCode)
  const currency = getEts2Currency(career.currency)?.code || profile.currency
  const exchangeRate = currency === profile.currency
    ? 1
    : Number(career.exchangeRate) > 0
      ? Number(career.exchangeRate)
      : getEts2ExchangeRate(profile.currency, currency)
  const financialProfile = getGame(
    'ets2', countryCode, currency, exchangeRate, career.exchangeRateAsOf || ETS2_EXCHANGE_RATE_DATE,
    career.city, career.cityCostFactor, career.citySalaryFactor, career.cityMarketLabel,
  )
  return {
    ...career,
    gameId: 'ets2',
    countryCode,
    countryName: profile.name,
    baseCurrency: profile.currency,
    currency,
    exchangeRate,
    exchangeRateAsOf: career.exchangeRateAsOf || ETS2_EXCHANGE_RATE_DATE,
    cityMarketVersion: financialProfile.cityMarketVersion,
    cityMarketLabel: financialProfile.cityMarketLabel,
    cityCostFactor: financialProfile.cityCostFactor,
    citySalaryFactor: financialProfile.citySalaryFactor,
    events: Array.isArray(career.events) ? career.events : [],
  }
}

function rawCareers(gameId = 'ats') {
  try {
    const value = JSON.parse(localStorage.getItem(careersStorageKey(gameId)) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function loadLocalCareers(gameId = 'ats') {
  const value = rawCareers(gameId)
  const normalized = value.map((career) => normalizeCareer(career, gameId))
  if (JSON.stringify(normalized) !== JSON.stringify(value)) {
    localStorage.setItem(careersStorageKey(gameId), JSON.stringify(normalized))
  }
  return normalized
}

function withServerCareer(career, gameId) {
  return normalizeCareer(getServerCareerOverlay(career, gameId), gameId)
}

function localStorageCareer(career, existing) {
  if (!career?.serverBacked) return career
  const next = { ...career }
  for (const field of SERVER_PROFILE_FIELDS) {
    if (existing && Object.prototype.hasOwnProperty.call(existing, field)) next[field] = existing[field]
    else delete next[field]
  }
  for (const field of SERVER_ONLY_FIELDS) delete next[field]
  return next
}

export function loadCareers(gameId = 'ats') {
  return loadLocalCareers(gameId).map((career) => withServerCareer(career, gameId))
}

export function saveCareers(careers, gameId = 'ats') {
  const existing = new Map(rawCareers(gameId).map((career) => [career?.id, career]))
  const safe = (Array.isArray(careers) ? careers : []).map((career) => localStorageCareer(career, existing.get(career?.id)))
  localStorage.setItem(careersStorageKey(gameId), JSON.stringify(safe))
}

export function getCareer(id, gameId = 'ats') {
  return loadCareers(gameId).find((career) => career.id === id) || null
}

export function createCareer(input, gameId = 'ats') {
  const careers = loadLocalCareers(gameId)
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
  setActiveCareer(career.id, gameId)
  return career
}

export function updateCareer(id, updates, gameId = 'ats') {
  const careers = loadLocalCareers(gameId)
  const index = careers.findIndex((career) => career.id === id)
  if (index < 0) return null
  const current = careers[index]
  const updated = normalizeCareer({
    ...current,
    ...(updates || {}),
    id: current.id,
    gameId,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  }, gameId)
  careers[index] = updated
  saveCareers(careers, gameId)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CAREER_UPDATED_EVENT, { detail: { careerId: id, gameId } }))
  }
  return withServerCareer(updated, gameId)
}

export function deleteCareer(id, gameId = 'ats') {
  saveCareers(loadLocalCareers(gameId).filter((career) => career.id !== id), gameId)
  if (localStorage.getItem(activeCareerStorageKey(gameId)) === id) {
    localStorage.removeItem(activeCareerStorageKey(gameId))
    setActiveServerCareerForLocal(gameId, null)
  }
}

export function setActiveCareer(id, gameId = 'ats') {
  localStorage.setItem(activeCareerStorageKey(gameId), id)
  setActiveServerCareerForLocal(gameId, id)
}

export function getActiveCareerId(gameId = 'ats') {
  const id = localStorage.getItem(activeCareerStorageKey(gameId))
  if (id) setActiveServerCareerForLocal(gameId, id)
  return id
}
