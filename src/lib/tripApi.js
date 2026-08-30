import { apiRequest } from './authApi.js'

function gameQuery(gameId, operationalWeek) {
  const query = new URLSearchParams({ game: String(gameId || '').toUpperCase() })
  if (operationalWeek != null) query.set('operationalWeek', String(operationalWeek))
  return query.toString()
}

function tripsPath(careerId, gameId, tripId = null, operationalWeek = null) {
  const career = encodeURIComponent(String(careerId || ''))
  const trip = tripId == null ? '' : `/${encodeURIComponent(String(tripId))}`
  return `/api/v1/careers/${career}/trips${trip}?${gameQuery(gameId, operationalWeek)}`
}

function optionalNumber(value) {
  if (value == null || String(value).trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

export function toServerTripPayload(trip = {}) {
  return {
    departureDay: trip.departureDay,
    departureTime: trip.departureTime,
    arrivalDay: trip.arrivalDay,
    arrivalTime: trip.arrivalTime,
    originCity: trip.origin,
    originCompany: trip.originCompany || undefined,
    destinationCity: trip.destination,
    destinationCompany: trip.destinationCompany || undefined,
    cargo: trip.type === 'Deadhead' ? undefined : (trip.cargo || undefined),
    type: trip.type,
    paymentCategory: trip.type === 'Deadhead' ? 'deadhead' : (trip.payCategory || 'normal'),
    officialDistance: Number(trip.officialDistance ?? trip.distance ?? trip.miles),
    breakMinutes: optionalNumber(trip.breakMinutes),
    truckMake: trip.truckMake || undefined,
    truckModel: trip.truckModel || undefined,
    odometerStart: optionalNumber(trip.odometerStart),
    odometerEnd: optionalNumber(trip.odometerEnd),
  }
}

export const tripApi = {
  list: (gameId, careerId, options = {}) => apiRequest(
    tripsPath(careerId, gameId, null, options.operationalWeek),
    { auth: true, signal: options.signal },
  ),
  create: (gameId, careerId, trip, options = {}) => apiRequest(tripsPath(careerId, gameId), {
    auth: true,
    method: 'POST',
    body: toServerTripPayload(trip),
    signal: options.signal,
  }),
  delete: (gameId, careerId, tripId, options = {}) => apiRequest(tripsPath(careerId, gameId, tripId), {
    auth: true,
    method: 'DELETE',
    signal: options.signal,
  }),
}
