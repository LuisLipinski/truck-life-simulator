export const WEEKDAY_OPTIONS = [
  { value: 'monday', label: 'Segunda-feira', offset: 0 },
  { value: 'tuesday', label: 'Terça-feira', offset: 1 },
  { value: 'wednesday', label: 'Quarta-feira', offset: 2 },
  { value: 'thursday', label: 'Quinta-feira', offset: 3 },
  { value: 'friday', label: 'Sexta-feira', offset: 4 },
  { value: 'saturday', label: 'Sábado', offset: 5 },
  { value: 'sunday', label: 'Domingo', offset: 6 },
]

const WEEKDAY_BY_VALUE = Object.fromEntries(WEEKDAY_OPTIONS.map((day) => [day.value, day]))
const REFERENCE_MONDAY_UTC = Date.UTC(2000, 0, 3)

function timeParts(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''))
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes, totalMinutes: (hours * 60) + minutes }
}

function syntheticDateTime(dayOffset, time) {
  const parts = timeParts(time)
  if (!parts) return ''
  const date = new Date(REFERENCE_MONDAY_UTC + (dayOffset * 86400000))
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}T${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}:00`
}

export function buildWeeklyDateTimeRange(departureDay, departureTime, arrivalDay, arrivalTime) {
  if (!departureDay || !departureTime || !arrivalDay || !arrivalTime) return null

  const departure = WEEKDAY_BY_VALUE[departureDay]
  const arrival = WEEKDAY_BY_VALUE[arrivalDay]
  const departureClock = timeParts(departureTime)
  const arrivalClock = timeParts(arrivalTime)

  if (!departure || !arrival || !departureClock || !arrivalClock) return null

  let arrivalOffset = arrival.offset
  if (arrivalOffset < departure.offset) arrivalOffset += 7
  if (arrivalOffset === departure.offset && arrivalClock.totalMinutes <= departureClock.totalMinutes) {
    throw new Error('A chegada precisa ser posterior à saída. Se a viagem virar o dia, selecione o próximo dia da semana.')
  }

  return {
    departureAt: syntheticDateTime(departure.offset, departureTime),
    arrivalAt: syntheticDateTime(arrivalOffset, arrivalTime),
  }
}

export function weekdayLabel(value) {
  return WEEKDAY_BY_VALUE[value]?.label || ''
}

export function formatTripWeekMoment(day, time) {
  const label = weekdayLabel(day)
  if (!label && !time) return ''
  if (!label) return time
  if (!time) return label
  return `${label}, ${time}`
}
