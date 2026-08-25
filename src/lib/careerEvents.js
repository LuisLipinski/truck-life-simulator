export const CAREER_EVENT_TYPES = Object.freeze({
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  EMPLOYER_CHANGED: 'EMPLOYER_CHANGED',
  BASE_CHANGED: 'BASE_CHANGED',
})

export function createCareerEvent({ type, effectiveDate, changes, recordedAt = new Date().toISOString() }) {
  const normalizedChanges = Object.fromEntries(
    Object.entries(changes || {}).filter(([, change]) => change && JSON.stringify(change.previous) !== JSON.stringify(change.next)),
  )
  return {
    id: `career_event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    effectiveDate,
    recordedAt,
    changes: normalizedChanges,
  }
}

export function careerBaseSnapshot(career) {
  return {
    city: career?.city || '',
    countryCode: career?.countryCode || '',
    countryName: career?.countryName || '',
    stateCode: career?.stateCode || '',
    stateName: career?.stateName || '',
    currency: career?.currency || '',
    baseCurrency: career?.baseCurrency || career?.currency || '',
    exchangeRate: Number(career?.exchangeRate || 1),
    exchangeRateAsOf: career?.exchangeRateAsOf || '',
    cityMarketVersion: career?.cityMarketVersion,
    cityMarketLabel: career?.cityMarketLabel || '',
    cityCostFactor: Number(career?.cityCostFactor || 1),
    citySalaryFactor: Number(career?.citySalaryFactor || 1),
  }
}

function closedPeriodBaseSnapshot(period, fallback) {
  return {
    ...fallback,
    city: period?.city || fallback.city,
    countryCode: period?.countryCode || fallback.countryCode,
    countryName: period?.countryName || fallback.countryName,
    stateCode: period?.stateCode || fallback.stateCode,
    stateName: period?.stateName || fallback.stateName,
    currency: period?.currency || fallback.currency,
    baseCurrency: period?.baseCurrency || fallback.baseCurrency,
    exchangeRate: Number(period?.exchangeRate || fallback.exchangeRate || 1),
    exchangeRateAsOf: period?.exchangeRateAsOf || fallback.exchangeRateAsOf,
    cityMarketLabel: period?.cityMarketLabel || fallback.cityMarketLabel,
    cityCostFactor: Number(period?.cityCostFactor || fallback.cityCostFactor || 1),
    citySalaryFactor: Number(period?.citySalaryFactor || fallback.citySalaryFactor || 1),
  }
}

export function preserveHistoricalCareerContext(state, career) {
  const baseSnapshot = careerBaseSnapshot(career)
  const employer = String(career?.company || '').trim()
  return {
    ...state,
    trips: (state?.trips || []).map((trip) => ({
      ...trip,
      ...(trip.employer == null ? { employer } : {}),
      ...(trip.baseSnapshot ? {} : { baseSnapshot }),
    })),
    closedWeeks: (state?.closedWeeks || []).map((period) => ({
      ...period,
      ...(period.employer == null ? { employer } : {}),
      ...(period.baseSnapshot ? {} : { baseSnapshot: closedPeriodBaseSnapshot(period, baseSnapshot) }),
    })),
  }
}

export function careerEventDescription(event) {
  const changes = event?.changes || {}
  if (event?.type === CAREER_EVENT_TYPES.PROFILE_UPDATED) {
    const labels = []
    if (changes.driverName) labels.push(`nome: “${changes.driverName.previous || '—'}” → “${changes.driverName.next || '—'}”`)
    if (changes.bio) labels.push(`biografia: “${changes.bio.previous || 'vazia'}” → “${changes.bio.next || 'vazia'}”`)
    return labels.join(' • ') || 'Perfil atualizado'
  }
  if (event?.type === CAREER_EVENT_TYPES.EMPLOYER_CHANGED) {
    return `“${changes.company?.previous || '—'}” → “${changes.company?.next || '—'}”`
  }
  if (event?.type === CAREER_EVENT_TYPES.BASE_CHANGED) {
    return `“${changes.base?.previous?.city || '—'}” → “${changes.base?.next?.city || '—'}”`
  }
  return 'Evento da carreira'
}

export function careerEventLabel(type) {
  return ({
    [CAREER_EVENT_TYPES.PROFILE_UPDATED]: 'Perfil atualizado',
    [CAREER_EVENT_TYPES.EMPLOYER_CHANGED]: 'Troca de empresa',
    [CAREER_EVENT_TYPES.BASE_CHANGED]: 'Mudança de base',
  })[type] || 'Evento da carreira'
}
