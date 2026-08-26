import { useState } from 'react'
import { formatDistance, formatMoney } from '../../config/games.js'
import {
  suggestedTripBreakMinutes,
  tripOdometerDistance,
  validPayCategories,
} from '../../lib/phase1.js'
import { buildWeeklyDateTimeRange, WEEKDAY_OPTIONS } from '../../lib/tripWeek.js'
import CityAutocomplete from '../CityAutocomplete.jsx'
import { useGame } from '../GameContext.jsx'
import { useToast } from '../ToastProvider.jsx'

function draftValue(draft, key, fallback = '') {
  return draft && draft[key] != null ? String(draft[key]) : fallback
}

export default function TripForm({ state, onAdd, onSaveDraft }) {
  const game = useGame()
  const toast = useToast()
  const draft = state.tripDraft || {}
  const [departureDay, setDepartureDay] = useState(() => draftValue(draft, 'departureDay'))
  const [departureTime, setDepartureTime] = useState(() => draftValue(draft, 'departureTime'))
  const [arrivalDay, setArrivalDay] = useState(() => draftValue(draft, 'arrivalDay'))
  const [arrivalTime, setArrivalTime] = useState(() => draftValue(draft, 'arrivalTime'))
  const [origin, setOrigin] = useState(() => draftValue(draft, 'origin'))
  const [originCompany, setOriginCompany] = useState(() => draftValue(draft, 'originCompany'))
  const [destination, setDestination] = useState(() => draftValue(draft, 'destination'))
  const [destinationCompany, setDestinationCompany] = useState(() => draftValue(draft, 'destinationCompany'))
  const [cargo, setCargo] = useState(() => draftValue(draft, 'cargo'))
  const [type, setType] = useState(() => draftValue(draft, 'type', 'Loaded'))
  const [payCategory, setPayCategory] = useState(() => draftValue(draft, 'payCategory', 'normal'))
  const [distance, setDistance] = useState(() => draftValue(draft, 'distance'))
  const [breakMinutes, setBreakMinutes] = useState(() => draftValue(draft, 'breakMinutes'))
  const [truckMake, setTruckMake] = useState(() => draftValue(draft, 'truckMake'))
  const [truckModel, setTruckModel] = useState(() => draftValue(draft, 'truckModel'))
  const [odometerStart, setOdometerStart] = useState(() => draftValue(draft, 'odometerStart'))
  const [odometerEnd, setOdometerEnd] = useState(() => draftValue(draft, 'odometerEnd'))

  const categories = validPayCategories(state, game.id)
  const effectiveCategory = type === 'Deadhead' ? 'deadhead' : (categories.includes(payCategory) ? payCategory : 'normal')

  let previewSchedule = null
  try {
    previewSchedule = buildWeeklyDateTimeRange(departureDay, departureTime, arrivalDay, arrivalTime)
  } catch {
    previewSchedule = null
  }

  const breakSuggestion = suggestedTripBreakMinutes(previewSchedule || {}, game)
  const odometerDistance = tripOdometerDistance({ odometerStart, odometerEnd })
  const officialDistance = Number(distance)
  const odometerDifference = odometerDistance == null || !Number.isFinite(officialDistance) || officialDistance <= 0
    ? null
    : Math.round((odometerDistance - officialDistance) * 100) / 100

  function currentDraft() {
    return {
      week: state.currentWeek,
      departureDay,
      departureTime,
      arrivalDay,
      arrivalTime,
      origin,
      originCompany,
      destination,
      destinationCompany,
      cargo,
      type,
      payCategory,
      distance,
      breakMinutes,
      truckMake,
      truckModel,
      odometerStart,
      odometerEnd,
      savedAt: new Date().toISOString(),
    }
  }

  function saveDraft() {
    onSaveDraft(currentDraft())
  }

  function submit(event) {
    event.preventDefault()

    let schedule
    try {
      schedule = buildWeeklyDateTimeRange(departureDay, departureTime, arrivalDay, arrivalTime)
    } catch (error) {
      toast.error(error.message)
      return
    }

    if (!schedule) {
      toast.error('Informe o dia da semana e o horário de saída e chegada.')
      return
    }

    const distanceValue = Number(distance)
    const start = new Date(schedule.departureAt)
    const end = new Date(schedule.arrivalAt)

    if (!origin.trim() || !destination.trim()) {
      toast.error('Informe cidade de origem e destino.')
      return
    }
    if (!Number.isFinite(distanceValue) || distanceValue <= 0) {
      toast.error(`Informe uma distância válida em ${game.distanceName}.`)
      return
    }

    const hasOdometerStart = String(odometerStart).trim() !== ''
    const hasOdometerEnd = String(odometerEnd).trim() !== ''
    if (hasOdometerStart !== hasOdometerEnd) {
      toast.error('Para comparar o odômetro, informe as leituras inicial e final.')
      return
    }
    if (hasOdometerStart) {
      const startValue = Number(odometerStart)
      const endValue = Number(odometerEnd)
      if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || startValue < 0 || endValue < 0) {
        toast.error('As leituras do odômetro precisam ser números maiores ou iguais a zero.')
        return
      }
      if (endValue < startValue) {
        toast.error('A leitura final do odômetro não pode ser menor que a inicial.')
        return
      }
    }

    const elapsedMinutes = Math.round((end - start) / 60000)
    const pauseValue = game.id === 'ets2' && breakMinutes === ''
      ? breakSuggestion
      : Math.max(0, Number(breakMinutes) || 0)
    if (!Number.isFinite(pauseValue) || pauseValue >= elapsedMinutes) {
      toast.error('A pausa precisa ser menor que o tempo total entre a saída e a chegada.')
      return
    }

    onAdd({
      id: Date.now(),
      week: state.currentWeek,
      departureDay,
      departureTime,
      arrivalDay,
      arrivalTime,
      departureAt: schedule.departureAt,
      arrivalAt: schedule.arrivalAt,
      origin: origin.trim(),
      originCompany: originCompany.trim(),
      destination: destination.trim(),
      destinationCompany: destinationCompany.trim(),
      cargo: type === 'Deadhead' ? '' : cargo.trim(),
      type,
      payCategory: effectiveCategory,
      source: 'MANUAL',
      ...(truckMake.trim() ? { truckMake: truckMake.trim() } : {}),
      ...(truckModel.trim() ? { truckModel: truckModel.trim() } : {}),
      ...(hasOdometerStart ? { odometerStart: Number(odometerStart), odometerEnd: Number(odometerEnd) } : {}),
      ...(game.id === 'ets2' ? { breakMinutes: Math.round(pauseValue) } : {}),
      [game.distanceField]: distanceValue,
      createdAt: new Date().toISOString(),
    })

    setDepartureDay('')
    setDepartureTime('')
    setArrivalDay('')
    setArrivalTime('')
    setOrigin('')
    setOriginCompany('')
    setDestination('')
    setDestinationCompany('')
    setCargo('')
    setDistance('')
    setBreakMinutes('')
    setTruckMake('')
    setTruckModel('')
    setOdometerStart('')
    setOdometerEnd('')
  }

  const weekdayOptions = <>
    <option value="">Selecione</option>
    {WEEKDAY_OPTIONS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
  </>

  return (
    <form className="panel trip-form" data-tour="trip-form" onSubmit={submit}>
      <div className="section-heading compact-heading">
        <span className="eyebrow">Semana {state.currentWeek}</span>
        <h2>Registrar viagem</h2>
        <p>O ATS não possui calendário: registre o dia da semana e o horário exibido no jogo.</p>
      </div>

      <div className="two-columns">
        <div>
          <label>Dia da saída</label>
          <select value={departureDay} onChange={(event) => setDepartureDay(event.target.value)} required>{weekdayOptions}</select>
        </div>
        <div>
          <label>Horário de saída</label>
          <input type="time" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} required />
        </div>
      </div>
      <div className="two-columns">
        <div>
          <label>Dia da chegada</label>
          <select value={arrivalDay} onChange={(event) => setArrivalDay(event.target.value)} required>{weekdayOptions}</select>
        </div>
        <div>
          <label>Horário de chegada</label>
          <input type="time" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} required />
        </div>
      </div>

      <div className="two-columns">
        <CityAutocomplete value={origin} onChange={setOrigin} label="Cidade de origem" required />
        <div><label>Filial / empresa de origem</label><input value={originCompany} onChange={(event) => setOriginCompany(event.target.value)} placeholder={`Ex.: ${game.companyPlaceholder}`} /></div>
      </div>
      <div className="two-columns">
        <CityAutocomplete value={destination} onChange={setDestination} label="Cidade de destino" required />
        <div><label>Empresa de destino</label><input value={destinationCompany} onChange={(event) => setDestinationCompany(event.target.value)} placeholder="Cliente ou filial" /></div>
      </div>
      <div className="two-columns">
        <div><label>Tipo</label><select value={type} onChange={(event) => setType(event.target.value)}><option value="Loaded">{game.tripTypes.loaded}</option><option value="Deadhead">{game.tripTypes.deadhead}</option></select></div>
        <div><label>Categoria de pagamento</label><select value={effectiveCategory} disabled={type === 'Deadhead' || state.currentLevel <= 1} onChange={(event) => setPayCategory(event.target.value)}>{(type === 'Deadhead' ? ['deadhead'] : categories).map((category) => <option value={category} key={category}>{game.payLabels[category]} — {formatMoney(game.payRates[category], game)}/{game.distanceUnit}</option>)}</select></div>
      </div>
      <div className="two-columns">
        <div><label>Carga</label><input value={cargo} disabled={type === 'Deadhead'} onChange={(event) => setCargo(event.target.value)} placeholder={type === 'Deadhead' ? 'Viagem vazia' : 'Ex.: alimentos, equipamentos'} /></div>
        <div><label>{game.distanceName[0].toUpperCase() + game.distanceName.slice(1)}</label><input type="number" min="1" step="1" value={distance} onChange={(event) => setDistance(event.target.value)} required /></div>
      </div>
      <div className="two-columns">
        <div><label htmlFor="trip-truck-make">Marca do caminhão (opcional)</label><input id="trip-truck-make" name="truckMake" value={truckMake} onChange={(event) => setTruckMake(event.target.value)} placeholder="Ex.: Volvo, Scania, Kenworth" /></div>
        <div><label htmlFor="trip-truck-model">Modelo do caminhão (opcional)</label><input id="trip-truck-model" name="truckModel" value={truckModel} onChange={(event) => setTruckModel(event.target.value)} placeholder="Aceita modelos e caminhões de mods" /></div>
      </div>
      <div className="two-columns">
        <div><label htmlFor="trip-odometer-start">Odômetro inicial ({game.distanceUnit}, opcional)</label><input id="trip-odometer-start" name="odometerStart" type="number" min="0" step="0.1" value={odometerStart} onChange={(event) => setOdometerStart(event.target.value)} /></div>
        <div><label htmlFor="trip-odometer-end">Odômetro final ({game.distanceUnit}, opcional)</label><input id="trip-odometer-end" name="odometerEnd" type="number" min="0" step="0.1" value={odometerEnd} onChange={(event) => setOdometerEnd(event.target.value)} /></div>
      </div>
      <small className="trip-field-help">As duas leituras são usadas somente para conferência e futura telemetria. A distância informada acima continua sendo o valor oficial da viagem.</small>
      {odometerDistance != null && <div className={`odometer-comparison${odometerDifference ? ' has-difference' : ''}`} role="status">
        <strong>Odômetro: {formatDistance(odometerDistance, game)}</strong>
        <span>{odometerDifference == null
          ? 'Preencha a distância oficial para concluir a comparação.'
          : odometerDifference === 0
            ? 'A leitura coincide com a distância oficial informada.'
            : `${formatDistance(Math.abs(odometerDifference), game)} ${odometerDifference > 0 ? 'acima' : 'abaixo'} da distância oficial. Nenhum valor foi substituído.`}</span>
      </div>}
      {game.id === 'ets2' && <div>
        <label>Pausa não trabalhada dentro da viagem (minutos)</label>
        <input type="number" min="0" step="15" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} placeholder={String(breakSuggestion)} />
        <small>Deixe vazio para aplicar a sugestão de {breakSuggestion} min conforme a duração registrada. Ajuste se a pausa real foi diferente. Intervalos entre duas viagens já ficam fora das horas trabalhadas.</small>
      </div>}

      {state.tripDraft && <small className="trip-field-help">Há um rascunho salvo para esta viagem. Salvar novamente atualiza o mesmo rascunho; enviar a viagem o remove.</small>}
      <button className="button secondary submit-button" type="button" onClick={saveDraft}>Salvar rascunho</button>
      <button className="button primary submit-button" type="submit">Enviar viagem</button>
    </form>
  )
}
