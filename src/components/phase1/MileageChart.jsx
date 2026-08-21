import { BarChart } from './Charts.jsx'
import { formatDistance } from '../../config/games.js'
import { tripDistance } from '../../lib/phase1.js'
import { useGame } from '../GameContext.jsx'

export function weeklyMileageData(trips = []) {
  const totals = new Map()
  for (const trip of Array.isArray(trips) ? trips : []) {
    const week = Math.max(1, Number(trip?.week || 1))
    const distance = tripDistance(trip)
    if (!Number.isFinite(week) || !Number.isFinite(distance) || distance < 0) continue
    totals.set(week, (totals.get(week) || 0) + distance)
  }

  return [...totals.entries()]
    .sort(([weekA], [weekB]) => weekA - weekB)
    .slice(-8)
    .map(([week, value]) => ({ label: `Semana ${week}`, value }))
}

export default function MileageChart({ trips }) {
  const game = useGame()
  return (
    <section className="career-charts-grid diary-charts-grid" aria-label="Gráficos do Diário de Bordo">
      <BarChart
        title={`${game.distanceName[0].toUpperCase() + game.distanceName.slice(1)} por semana`}
        description={`Compara os ${game.distanceName} registrados nas últimas semanas da carreira, incluindo a semana atual.`}
        data={weeklyMileageData(trips)}
        formatValue={(value) => formatDistance(value, game)}
        emptyText={`Registre viagens para começar a acompanhar os ${game.distanceName} por semana.`}
      />
    </section>
  )
}
