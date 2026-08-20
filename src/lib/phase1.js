import { getCareer, loadCareers, saveCareers } from './storage.js'

const LEGACY_STATE_KEY = 'ats_phase1_tabs_v3'
const OLD_LEGACY_KEY = 'ats_phase1_tabs_v2'

export const EMERGENCY_RESERVE_ANNUAL_YIELD = 0.0325
export const LEVEL1_ROUTE_OVERRUN_RATE = 21.25
export const LEVEL1_DAILY_WORK_MINUTES = 8 * 60

export const DEFAULT_EXPENSES = {
  rent: 1650,
  electricity: 100,
  water: 60,
  internet: 65,
  phone: 55,
  groceries: 400,
  eatingOut: 150,
  health: 180,
  publicTransport: 72,
  household: 80,
  leisure: 150,
}

export const EXPENSE_LABELS = {
  rent: 'Aluguel',
  electricity: 'Eletricidade',
  water: 'Água / lixo',
  internet: 'Internet',
  phone: 'Celular',
  groceries: 'Mercado',
  eatingOut: 'Alimentação fora',
  health: 'Saúde / parcela pessoal',
  publicTransport: 'Ônibus / metrô',
  household: 'Higiene / casa',
  leisure: 'Lazer',
}

export const PAY_RATES = {
  normal: 0.60,
  hazmat: 0.63,
  doubles: 0.64,
  hazmat_doubles: 0.67,
  deadhead: 0.50,
}

export const PAY_LABELS = {
  normal: 'Loaded normal',
  hazmat: 'Loaded HazMat',
  doubles: 'Loaded Doubles / bitrem',
  hazmat_doubles: 'Loaded HazMat + Doubles',
  deadhead: 'Deadhead',
}

export function phase1StorageKey(careerId) {
  return careerId ? `ats_phase1_state_${careerId}` : LEGACY_STATE_KEY
}

function makeDefaultState(career) {
  const level = Number(career?.currentLevel || 1)
  return {
    balance: Number(career?.currentBalance ?? career?.initialBalance ?? 793),
    emergencyReserve: 0,
    expenses: { ...DEFAULT_EXPENSES },
    history: [],
    trips: [],
    closedWeeks: [],
    customExpenses: [],
    incidents: [],
    currentLevel: level,
    careerLevel: level,
    hazmatQualified: false,
    academy: { level2: false, level3: false },
    currentWeek: 1,
  }
}

function normalizeExpenses(expenses) {
  return Object.fromEntries(
    Object.entries({ ...DEFAULT_EXPENSES, ...(expenses || {}) })
      .filter(([key]) => key !== 'emergency'),
  )
}

function normalizeState(raw, career) {
  const base = makeDefaultState(career)
  const state = { ...base, ...(raw || {}) }
  state.balance = Number(raw?.balance ?? base.balance)
  state.emergencyReserve = Math.max(0, Number(raw?.emergencyReserve || 0))
  state.expenses = normalizeExpenses(raw?.expenses)
  state.history = Array.isArray(raw?.history) ? raw.history : []
  state.trips = Array.isArray(raw?.trips) ? raw.trips : []
  state.closedWeeks = Array.isArray(raw?.closedWeeks) ? raw.closedWeeks : []
  state.customExpenses = Array.isArray(raw?.customExpenses) ? raw.customExpenses : []
  state.incidents = Array.isArray(raw?.incidents) ? raw.incidents : []
  const level = Number(raw?.currentLevel || raw?.careerLevel || career?.currentLevel || 1)
  state.currentLevel = level
  state.careerLevel = level
  state.currentWeek = Number(raw?.currentWeek || 1)
  state.hazmatQualified = Boolean(raw?.hazmatQualified)
  state.academy = {
    level2: Boolean(raw?.academy?.level2 || state.currentLevel >= 2),
    level3: Boolean(raw?.academy?.level3 || state.currentLevel >= 3),
  }
  return state
}

export function loadPhase1State(careerId) {
  const career = getCareer(careerId)
  let raw = localStorage.getItem(phase1StorageKey(careerId))
  if (!raw && careerId) raw = localStorage.getItem(LEGACY_STATE_KEY) || localStorage.getItem(OLD_LEGACY_KEY)
  if (!raw) return makeDefaultState(career)
  try {
    return normalizeState(JSON.parse(raw), career)
  } catch {
    return makeDefaultState(career)
  }
}

export function savePhase1State(careerId, state) {
  const normalized = {
    ...state,
    emergencyReserve: Math.max(0, Number(state.emergencyReserve || 0)),
    expenses: normalizeExpenses(state.expenses),
    currentLevel: Number(state.currentLevel || state.careerLevel || 1),
    careerLevel: Number(state.currentLevel || state.careerLevel || 1),
  }
  localStorage.setItem(phase1StorageKey(careerId), JSON.stringify(normalized))
  const careers = loadCareers()
  const index = careers.findIndex((item) => item.id === careerId)
  if (index >= 0) {
    careers[index] = {
      ...careers[index],
      currentBalance: Number(normalized.balance || 0),
      currentLevel: Number(normalized.currentLevel || 1),
      updatedAt: new Date().toISOString(),
    }
    saveCareers(careers)
  }
}

export function totalMiles(state) {
  return state.trips.reduce((sum, trip) => sum + Number(trip.miles || 0), 0)
}

export function currentWeekTrips(state) {
  return state.trips.filter((trip) => Number(trip.week || 1) === Number(state.currentWeek || 1))
}

export function currentWeekMiles(state) {
  return currentWeekTrips(state).reduce((sum, trip) => sum + Number(trip.miles || 0), 0)
}

export function tripPayCategory(trip) {
  return trip.type === 'Deadhead' ? 'deadhead' : (trip.payCategory || 'normal')
}

export function validPayCategories(state) {
  if (state.currentLevel <= 1) return ['normal']
  const categories = ['normal']
  if (state.hazmatQualified) categories.push('hazmat')
  if (state.currentLevel >= 3) {
    categories.push('doubles')
    if (state.hazmatQualified) categories.push('hazmat_doubles')
  }
  return categories
}

export function mileagePaySummary(trips) {
  const totals = { normal: 0, hazmat: 0, doubles: 0, hazmat_doubles: 0, deadhead: 0 }
  for (const trip of trips) {
    const category = tripPayCategory(trip)
    totals[category] = (totals[category] || 0) + Number(trip.miles || 0)
  }
  const gross = Object.entries(totals).reduce((sum, [key, miles]) => sum + miles * (PAY_RATES[key] || 0), 0)
  return { totals, gross }
}

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function routeOverrunSummary(trips, dailyWorkMinutes = LEVEL1_DAILY_WORK_MINUTES) {
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
  const pay = Math.round((overrunMinutes * LEVEL1_ROUTE_OVERRUN_RATE / 60) * 100) / 100

  return {
    days,
    totalMinutes,
    totalHours: totalMinutes / 60,
    overrunMinutes,
    overrunHours: overrunMinutes / 60,
    rate: LEVEL1_ROUTE_OVERRUN_RATE,
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

export function estimateTaxes(gross) {
  const value = Math.max(0, Number(gross || 0))
  const ss = value * 0.062
  const medicare = value * 0.0145
  const sdi = value * 0.013
  let federal = 0
  if (value > 260) federal = (value - 260) * 0.10
  if (value > 1000) federal = 74 + (value - 1000) * 0.12
  let ca = 0
  if (value > 500) ca = (value - 500) * 0.0527
  return { federal, ss, medicare, sdi, ca }
}

export function pendingIncidentTotal(state) {
  return (state.incidents || []).reduce((sum, incident) => sum + Math.max(0, Number(incident.remaining || 0)), 0)
}

export function applyPendingIncidentDeductions(incidents, maxAmount) {
  let available = Math.max(0, Number(maxAmount || 0))
  let applied = 0
  const nextIncidents = (incidents || []).map((incident) => {
    const copy = { ...incident }
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

export function getPromotionStatus(state) {
  const miles = totalMiles(state)
  if (state.currentLevel === 1) {
    return {
      goal: 10000,
      remaining: Math.max(0, 10000 - miles),
      ready: miles >= 10000 && !state.academy.level2,
      nextLevel: 2,
      title: 'Nível 2 disponível',
      requirement: 'Truck Driving Proficiency + US$ 300',
    }
  }
  if (state.currentLevel === 2) {
    return {
      goal: 50000,
      remaining: Math.max(0, 50000 - miles),
      ready: miles >= 50000 && !state.academy.level3,
      nextLevel: 3,
      title: 'Nível 3 disponível',
      requirement: 'Double Trailer Handling + US$ 59',
    }
  }
  return { goal: 50000, remaining: 0, ready: false, nextLevel: null, title: 'Nível máximo da Fase 1', requirement: '' }
}
