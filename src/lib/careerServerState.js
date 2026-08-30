const bindings = new Map()
const snapshots = new Map()
const activeIds = new Map()

const cacheKey = (gameId, localCareerId) => `${String(gameId || '').toLowerCase()}:${String(localCareerId || '')}`

function numberOr(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function eventFromServer(event) {
  return {
    ...event,
    id: String(event?.id || ''),
    effectiveDate: event?.effectiveDay || '',
    operationalWeek: Number(event?.operationalWeek || 0),
    serverBacked: true,
  }
}

function mergeEvents(localEvents, serverEvents) {
  const result = Array.isArray(localEvents) ? [...localEvents] : []
  const ids = new Set(result.map((event) => String(event?.id || '')).filter(Boolean))
  for (const event of (serverEvents || []).map(eventFromServer)) {
    if (event.id && ids.has(event.id)) continue
    result.push(event)
    if (event.id) ids.add(event.id)
  }
  return result
}

export function replaceServerCareerBindings(records = []) {
  const next = new Map()
  for (const record of records) {
    if (!record?.gameId || !record?.sourceCareerId || !record?.serverCareerId) continue
    const binding = {
      gameId: String(record.gameId).toLowerCase(),
      sourceCareerId: String(record.sourceCareerId),
      serverCareerId: String(record.serverCareerId),
    }
    next.set(cacheKey(binding.gameId, binding.sourceCareerId), binding)
  }
  for (const [existingKey, existingBinding] of bindings) {
    const nextBinding = next.get(existingKey)
    if (!nextBinding || nextBinding.serverCareerId !== existingBinding.serverCareerId) snapshots.delete(existingKey)
  }
  bindings.clear()
  for (const [key, value] of next) bindings.set(key, value)
}

export function clearServerCareerState() {
  bindings.clear()
  snapshots.clear()
  activeIds.clear()
}

export function getServerCareerBinding(gameId, localCareerId) {
  return bindings.get(cacheKey(gameId, localCareerId)) || null
}

export function setServerCareerSnapshot(gameId, localCareerId, career, events) {
  const key = cacheKey(gameId, localCareerId)
  const binding = bindings.get(key)
  if (!binding || !career || String(career.id) !== binding.serverCareerId) return false
  const previous = snapshots.get(key) || {}
  snapshots.set(key, {
    career,
    events: events === undefined ? (previous.events || []) : (Array.isArray(events) ? events : []),
    unavailable: false,
  })
  return true
}

export function setServerCareerEvents(gameId, localCareerId, events) {
  const key = cacheKey(gameId, localCareerId)
  if (!bindings.has(key)) return false
  snapshots.set(key, { ...(snapshots.get(key) || {}), events: Array.isArray(events) ? events : [] })
  return true
}

export function markServerCareerUnavailable(gameId, localCareerId) {
  const key = cacheKey(gameId, localCareerId)
  if (!bindings.has(key)) return false
  snapshots.set(key, { ...(snapshots.get(key) || {}), unavailable: true })
  return true
}

export function getServerCareerOverlay(localCareer, gameId = 'ats') {
  if (!localCareer?.id) return localCareer
  const key = cacheKey(gameId, localCareer.id)
  const binding = bindings.get(key)
  if (!binding) return localCareer
  const snapshot = snapshots.get(key) || {}
  const server = snapshot.career
  if (!server) {
    return {
      ...localCareer,
      serverBacked: true,
      serverCareerId: binding.serverCareerId,
      serverVersion: null,
      serverSyncStatus: snapshot.unavailable ? 'error' : 'loading',
    }
  }
  return {
    ...localCareer,
    driverName: server.driverName,
    company: server.companyName,
    bio: server.biography || '',
    biography: server.biography || '',
    currentLevel: numberOr(server.currentLevel, localCareer.currentLevel || 1),
    currentBalance: numberOr(server.balance, localCareer.currentBalance),
    baseCurrency: server.baseCurrency || localCareer.baseCurrency,
    currency: server.displayCurrency || localCareer.currency,
    exchangeRate: numberOr(server.exchangeRate, localCareer.exchangeRate || 1),
    exchangeRateAsOf: server.exchangeRateAsOf || localCareer.exchangeRateAsOf,
    stateCode: server.stateCode || localCareer.stateCode,
    countryCode: server.countryCode || localCareer.countryCode,
    city: server.baseCity || localCareer.city,
    cityMarketVersion: server.cityMarketVersion || localCareer.cityMarketVersion,
    cityMarketLabel: server.cityMarketLabel || localCareer.cityMarketLabel,
    cityCostFactor: numberOr(server.cityCostFactor, localCareer.cityCostFactor || 1),
    citySalaryFactor: numberOr(server.citySalaryFactor, localCareer.citySalaryFactor || 1),
    currentOperationalWeek: numberOr(server.currentOperationalWeek, localCareer.currentOperationalWeek || 1),
    currentPayrollMonth: server.currentPayrollMonth == null ? localCareer.currentPayrollMonth : Number(server.currentPayrollMonth),
    events: mergeEvents(localCareer.events, snapshot.events),
    serverBacked: true,
    serverCareerId: binding.serverCareerId,
    serverVersion: numberOr(server.version, 0),
    serverSyncStatus: 'ready',
  }
}

export function setActiveServerCareerForLocal(gameId, localCareerId) {
  const game = String(gameId || '').toLowerCase()
  const binding = getServerCareerBinding(game, localCareerId)
  if (binding) activeIds.set(game, binding.serverCareerId)
  else activeIds.delete(game)
}

export function getActiveServerCareerId(gameId = 'ats') {
  return activeIds.get(String(gameId).toLowerCase()) || null
}
