import { getCareer, loadCareers, saveCareers } from './storage.js'
import { getGame, getGameForCareer } from '../config/games.js'

const LEGACY_STATE_KEY = 'ats_phase1_tabs_v3'
const OLD_LEGACY_KEY = 'ats_phase1_tabs_v2'

export const EMERGENCY_RESERVE_ANNUAL_YIELD = 0.0325
export const LEVEL1_ROUTE_OVERRUN_RATE = 21.25
export const LEVEL1_DAILY_WORK_MINUTES = 8 * 60

export const DEFAULT_EXPENSES = getGame('ats').expenses
export const EXPENSE_LABELS = getGame('ats').expenseLabels
export const PAY_RATES = getGame('ats').payRates
export const PAY_LABELS = getGame('ats').payLabels

export function phase1StorageKey(careerId, gameId = 'ats') {
  const game = getGame(gameId)
  return careerId ? `${game.storagePrefix}_phase1_state_${careerId}` : `${game.storagePrefix}_phase1_tabs_v3`
}

function makeDefaultState(career, gameId = 'ats') {
  const game = getGameForCareer(career, gameId)
  const level = Number(career?.currentLevel || 1)
  return {
    balance: Number(career?.currentBalance ?? career?.initialBalance ?? 793),
    emergencyReserve: 0,
    expenses: { ...game.expenses },
    history: [],
    trips: [],
    closedWeeks: [],
    customExpenses: [],
    incidents: [],
    currentLevel: level,
    careerLevel: level,
    hazmatQualified: false,
    dangerousGoodsQualified: false,
    academy: { level2: false, level3: false },
    currentWeek: 1,
    currentPayrollMonth: 1,
    payPeriodStartWeek: 1,
    closedOperationalWeeks: [],
  }
}

function normalizeExpenses(expenses, gameId = 'ats', career = null) {
  const defaults = getGameForCareer(career, gameId).expenses
  return Object.fromEntries(
    Object.entries({ ...defaults, ...(expenses || {}) })
      .filter(([key]) => key !== 'emergency'),
  )
}

function normalizeState(raw, career, gameId = 'ats') {
  const base = makeDefaultState(career, gameId)
  const state = { ...base, ...(raw || {}) }
  state.balance = Number(raw?.balance ?? base.balance)
  state.emergencyReserve = Math.max(0, Number(raw?.emergencyReserve || 0))
  state.expenses = normalizeExpenses(raw?.expenses, gameId, career)
  state.history = Array.isArray(raw?.history) ? raw.history : []
  state.trips = Array.isArray(raw?.trips) ? raw.trips : []
  state.closedWeeks = Array.isArray(raw?.closedWeeks) ? raw.closedWeeks : []
  state.customExpenses = Array.isArray(raw?.customExpenses) ? raw.customExpenses : []
  state.incidents = Array.isArray(raw?.incidents) ? raw.incidents : []
  const level = Number(raw?.currentLevel || raw?.careerLevel || career?.currentLevel || 1)
  state.currentLevel = level
  state.careerLevel = level
  state.currentWeek = Number(raw?.currentWeek || 1)
  const previouslyLocked = state.closedWeeks.flatMap((period) => Array.isArray(period.weeks) ? period.weeks : [period.week]).map(Number).filter(Number.isFinite)
  state.closedOperationalWeeks = Array.isArray(raw?.closedOperationalWeeks)
    ? [...new Set(raw.closedOperationalWeeks.map(Number).filter(Number.isFinite))]
    : [...new Set(previouslyLocked)]
  state.currentPayrollMonth = Math.max(1, Number(raw?.currentPayrollMonth || state.closedWeeks.filter((period) => period.periodType === 'month').length + 1))
  state.payPeriodStartWeek = Math.max(1, Number(raw?.payPeriodStartWeek || (gameId === 'ets2' && state.closedWeeks.length ? state.currentWeek : 1)))
  state.dangerousGoodsQualified = Boolean(raw?.dangerousGoodsQualified ?? raw?.hazmatQualified)
  state.hazmatQualified = state.dangerousGoodsQualified
  state.academy = {
    level2: Boolean(raw?.academy?.level2 || state.currentLevel >= 2),
    level3: Boolean(raw?.academy?.level3 || state.currentLevel >= 3),
  }
  return state
}

export function loadPhase1State(careerId, gameId = 'ats') {
  const career = getCareer(careerId, gameId)
  let raw = localStorage.getItem(phase1StorageKey(careerId, gameId))
  if (!raw && careerId && gameId === 'ats') raw = localStorage.getItem(LEGACY_STATE_KEY) || localStorage.getItem(OLD_LEGACY_KEY)
  if (!raw) return makeDefaultState(career, gameId)
  try {
    return normalizeState(JSON.parse(raw), career, gameId)
  } catch {
    return makeDefaultState(career, gameId)
  }
}

export function savePhase1State(careerId, state, gameId = 'ats') {
  const career = getCareer(careerId, gameId)
  const normalized = {
    ...state,
    emergencyReserve: Math.max(0, Number(state.emergencyReserve || 0)),
    expenses: normalizeExpenses(state.expenses, gameId, career),
    dangerousGoodsQualified: Boolean(state.dangerousGoodsQualified ?? state.hazmatQualified),
    hazmatQualified: Boolean(state.dangerousGoodsQualified ?? state.hazmatQualified),
    currentLevel: Number(state.currentLevel || state.careerLevel || 1),
    careerLevel: Number(state.currentLevel || state.careerLevel || 1),
    currentPayrollMonth: Math.max(1, Number(state.currentPayrollMonth || 1)),
    payPeriodStartWeek: Math.max(1, Number(state.payPeriodStartWeek || 1)),
    closedOperationalWeeks: [...new Set((state.closedOperationalWeeks || []).map(Number).filter(Number.isFinite))],
  }
  localStorage.setItem(phase1StorageKey(careerId, gameId), JSON.stringify(normalized))
  const careers = loadCareers(gameId)
  const index = careers.findIndex((item) => item.id === careerId)
  if (index >= 0) {
    careers[index] = {
      ...careers[index],
      currentBalance: Number(normalized.balance || 0),
      currentLevel: Number(normalized.currentLevel || 1),
      updatedAt: new Date().toISOString(),
    }
    saveCareers(careers, gameId)
  }
}

export function tripDistance(trip) {
  return Number(trip?.distance ?? trip?.miles ?? 0)
}

export function totalMiles(state) {
  return state.trips.reduce((sum, trip) => sum + tripDistance(trip), 0)
}

export const totalDistance = totalMiles

export function currentWeekTrips(state) {
  return state.trips.filter((trip) => Number(trip.week || 1) === Number(state.currentWeek || 1))
}

export function currentWeekMiles(state) {
  return currentWeekTrips(state).reduce((sum, trip) => sum + tripDistance(trip), 0)
}

export const currentWeekDistance = currentWeekMiles

export function payrollWeeks(state, gameOrId = 'ats') {
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  if (game.payrollPeriod !== 'monthly') return [Number(state.currentWeek || 1)]
  const start = Math.max(1, Number(state.payPeriodStartWeek || 1))
  const current = Math.max(start, Number(state.currentWeek || start))
  return [...new Set((state.closedOperationalWeeks || []).map(Number))]
    .filter((week) => Number.isFinite(week) && week >= start && week < current)
    .sort((a, b) => a - b)
}

export function currentPayrollTrips(state, gameOrId = 'ats') {
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  if (game.payrollPeriod !== 'monthly') return currentWeekTrips(state)
  const weeks = new Set(payrollWeeks(state, game))
  return (state.trips || []).filter((trip) => weeks.has(Number(trip.week || 1)))
}

export function isTripWeekLocked(state, week, gameOrId = 'ats') {
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  const weekNumber = Number(week || 1)
  if (game.payrollPeriod === 'monthly') return (state.closedOperationalWeeks || []).map(Number).includes(weekNumber)
  return (state.closedWeeks || []).some((period) => Number(period.week) === weekNumber)
}

export function tripPayCategory(trip) {
  return trip.type === 'Deadhead' ? 'deadhead' : (trip.payCategory || 'normal')
}

export function validPayCategories(state, gameId = 'ats') {
  if (state.currentLevel <= 1) return ['normal']
  const categories = ['normal']
  const qualified = Boolean(state.dangerousGoodsQualified ?? state.hazmatQualified)
  if (qualified) categories.push('hazmat')
  if (state.currentLevel >= 3) {
    categories.push('doubles')
    if (qualified) categories.push('hazmat_doubles')
  }
  return categories
}

export function mileagePaySummary(trips, gameOrId = 'ats') {
  const rates = (typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId).payRates
  const totals = { normal: 0, hazmat: 0, doubles: 0, hazmat_doubles: 0, deadhead: 0 }
  for (const trip of trips) {
    const category = tripPayCategory(trip)
    totals[category] = (totals[category] || 0) + tripDistance(trip)
  }
  const gross = Object.entries(totals).reduce((sum, [key, distance]) => sum + distance * (rates[key] || 0), 0)
  return { totals, gross }
}

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function routeOverrunSummary(trips, dailyWorkMinutes = LEVEL1_DAILY_WORK_MINUTES, rate = LEVEL1_ROUTE_OVERRUN_RATE) {
  const minutesByDay = new Map()

  for (const trip of trips || []) {
    if (!trip.departureAt || !trip.arrivalAt) continue
    const start = new Date(trip.departureAt)
    const end = new Date(trip.arrivalAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue

    let cursor = new Date(start)
    while (cursor < end) {
      const nextMidnight = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
      const segmentEnd = end < nextMidnight ? end : nextMidnight
      const minutes = Math.max(0, Math.round((segmentEnd - cursor) / 60000))
      const key = localDayKey(cursor)
      minutesByDay.set(key, (minutesByDay.get(key) || 0) + minutes)
      cursor = segmentEnd
    }
  }

  const days = [...minutesByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, minutes]) => ({
    date,
    minutes,
    hours: minutes / 60,
    overrunMinutes: Math.max(0, minutes - dailyWorkMinutes),
    overrunHours: Math.max(0, minutes - dailyWorkMinutes) / 60,
  }))
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0)
  const overrunMinutes = days.reduce((sum, day) => sum + day.overrunMinutes, 0)
  const pay = Math.round((overrunMinutes * rate / 60) * 100) / 100

  return {
    days,
    totalMinutes,
    totalHours: totalMinutes / 60,
    overrunMinutes,
    overrunHours: overrunMinutes / 60,
    rate,
    pay,
  }
}

export function perDiemDaysForTrips(trips) {
  const valid = new Set()
  for (const trip of trips) {
    if (!trip.departureAt || !trip.arrivalAt) continue
    const start = new Date(trip.departureAt)
    const end = new Date(trip.arrivalAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    if (endDay <= startDay) continue
    for (let day = new Date(startDay); day <= endDay; day.setDate(day.getDate() + 1)) {
      valid.add(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`)
    }
  }
  return { days: valid.size, dates: [...valid].sort() }
}

export function monthlyExpenseTotal(state) {
  const base = Object.entries(state.expenses || {})
    .filter(([key]) => key !== 'emergency')
    .reduce((sum, [, value]) => sum + Number(value || 0), 0)
  const custom = (state.customExpenses || [])
    .filter((item) => item.monthly)
    .reduce((sum, item) => sum + Number(item.value || 0), 0)
  return base + custom
}

export function weeklyEmergencyReserveYield(reserveBalance) {
  const principal = Math.max(0, Number(reserveBalance || 0))
  return principal * EMERGENCY_RESERVE_ANNUAL_YIELD / 52
}

export function monthlyEmergencyReserveYield(reserveBalance) {
  const principal = Math.max(0, Number(reserveBalance || 0))
  return principal * EMERGENCY_RESERVE_ANNUAL_YIELD / 12
}

function progressiveTax(value, brackets) {
  let remaining = Math.max(0, Number(value || 0))
  let previous = 0
  let total = 0
  for (const [limit, rate] of brackets) {
    const slice = Math.max(0, Math.min(remaining, limit - previous))
    total += slice * rate
    remaining -= slice
    previous = limit
    if (remaining <= 0) return total
  }
  return total
}

function estimateGermanTaxes(monthlyGross) {
  const pensionBase = Math.min(monthlyGross, 8450)
  const healthBase = Math.min(monthlyGross, 5812.5)
  const pensionInsurance = pensionBase * 0.093
  const unemploymentInsurance = pensionBase * 0.013
  const healthInsurance = healthBase * 0.0875
  const careInsurance = healthBase * 0.024
  const annualSocial = (pensionInsurance + unemploymentInsurance + healthInsurance + careInsurance) * 12
  const annualTaxable = Math.max(0, monthlyGross * 12 - annualSocial)
  const incomeTax = progressiveTax(annualTaxable, [
    [12348, 0], [17799, 0.14], [69878, 0.24], [277825, 0.42], [Infinity, 0.45],
  ]) / 12
  return { incomeTax, pensionInsurance, healthInsurance, unemploymentInsurance, careInsurance }
}

function estimateBritishTaxes(monthlyGross) {
  const annualGross = monthlyGross * 12
  const personalAllowance = annualGross > 100000 ? Math.max(0, 12570 - (annualGross - 100000) / 2) : 12570
  const taxable = Math.max(0, annualGross - personalAllowance)
  const incomeTax = progressiveTax(taxable, [[37700, 0.20], [125140 - personalAllowance, 0.40], [Infinity, 0.45]]) / 12
  const nationalInsurance = (Math.min(Math.max(0, annualGross - 12570), 50270 - 12570) * 0.08 + Math.max(0, annualGross - 50270) * 0.02) / 12
  return { incomeTax, nationalInsurance }
}

function estimatePolishTaxes(monthlyGross) {
  const pensionInsurance = monthlyGross * 0.0976
  const disabilityInsurance = monthlyGross * 0.015
  const sicknessInsurance = monthlyGross * 0.0245
  const socialTotal = pensionInsurance + disabilityInsurance + sicknessInsurance
  const healthInsurance = Math.max(0, monthlyGross - socialTotal) * 0.09
  const annualTaxable = Math.max(0, (monthlyGross - socialTotal) * 12)
  const annualPit = Math.max(0, Math.min(annualTaxable, 120000) * 0.12 + Math.max(0, annualTaxable - 120000) * 0.32 - 3600)
  return { incomeTax: annualPit / 12, pensionInsurance, disabilityInsurance, sicknessInsurance, healthInsurance }
}

function estimateEffectiveCountryTaxes(monthlyGross, rates = {}) {
  return {
    incomeTax: monthlyGross * Math.max(0, Number(rates.incomeTax || 0)),
    socialContributions: monthlyGross * Math.max(0, Number(rates.socialContributions || 0)),
  }
}

function estimateUsStateTaxes(weeklyGross, game) {
  const annualGross = weeklyGross * 52
  const federalTaxable = Math.max(0, annualGross - 16100)
  const federal = progressiveTax(federalTaxable, [
    [12400, 0.10], [50400, 0.12], [105700, 0.22],
    [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37],
  ]) / 52
  const ss = Math.min(annualGross, 184500) * 0.062 / 52
  const medicare = (annualGross * 0.0145 + Math.max(0, annualGross - 200000) * 0.009) / 52
  const result = { federal, ss, medicare }

  if (game.stateIncomeTax) {
    const stateTaxable = Math.max(0, annualGross
      - Number(game.stateIncomeTax.standardDeduction || 0)
      - Number(game.stateIncomeTax.personalExemption || 0))
    const annualStateTax = Math.max(0,
      progressiveTax(stateTaxable, game.stateIncomeTax.brackets || [])
      - Number(game.stateIncomeTax.credit || 0),
    )
    result.stateIncomeTax = annualStateTax / 52
  }
  if (game.statePayrollTax) result.statePayroll = weeklyGross * Number(game.statePayrollTax.rate || 0)
  return result
}

export function estimateTaxes(gross, gameOrId = 'ats') {
  const value = Math.max(0, Number(gross || 0))
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  const exchangeRate = Number(game.exchangeRate) > 0 ? Number(game.exchangeRate) : 1
  const baseValue = value / exchangeRate
  let result = null
  if (game.taxModel === 'de-2026-simplified') result = estimateGermanTaxes(baseValue)
  if (game.taxModel === 'gb-2026-simplified') result = estimateBritishTaxes(baseValue)
  if (game.taxModel === 'pl-2026-simplified') result = estimatePolishTaxes(baseValue)
  if (game.taxModel === 'effective-country-2025') result = estimateEffectiveCountryTaxes(baseValue, game.taxRates)
  if (game.taxModel === 'us-state-2026') result = estimateUsStateTaxes(baseValue, game)
  if (result) return Object.fromEntries(Object.entries(result).map(([key, amount]) => [key, amount * exchangeRate]))
  return {}
}

export function pendingIncidentTotal(state) {
  return (state.incidents || []).reduce((sum, incident) => sum + Math.max(0, Number(incident.remaining || 0)), 0)
}

export function applyPendingIncidentDeductions(incidents, maxAmount, isEligible = () => true) {
  let available = Math.max(0, Number(maxAmount || 0))
  let applied = 0
  const nextIncidents = (incidents || []).map((incident) => {
    const copy = { ...incident }
    if (!isEligible(copy)) return copy
    const remaining = Math.max(0, Number(copy.remaining || 0))
    if (remaining <= 0 || available <= 0) return copy
    const take = Math.min(remaining, available)
    copy.remaining = remaining - take
    available -= take
    applied += take
    copy.status = copy.remaining <= 0 ? 'Descontado no holerite' : 'Parcialmente descontado'
    return copy
  })
  return { incidents: nextIncidents, applied }
}

export function getPromotionStatus(state, gameOrId = 'ats') {
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  const distance = totalMiles(state)
  const [level2Goal, level3Goal] = game.promotionGoals
  if (state.currentLevel === 1) {
    return {
      goal: level2Goal,
      remaining: Math.max(0, level2Goal - distance),
      ready: distance >= level2Goal && !state.academy.level2,
      nextLevel: 2,
      title: 'Nível 2 disponível',
      requirement: `${game.promotionModules[0]} + ${game.currencyLabel} ${game.promotionCosts[0]}`,
    }
  }
  if (state.currentLevel === 2) {
    return {
      goal: level3Goal,
      remaining: Math.max(0, level3Goal - distance),
      ready: distance >= level3Goal && !state.academy.level3,
      nextLevel: 3,
      title: 'Nível 3 disponível',
      requirement: `${game.promotionModules[1]} + ${game.currencyLabel} ${game.promotionCosts[1]}`,
    }
  }
  return { goal: level3Goal, remaining: 0, ready: false, nextLevel: null, title: 'Nível máximo da Fase 1', requirement: '' }
}
