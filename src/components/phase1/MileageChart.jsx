import { BarChart } from './Charts.jsx'

export function weeklyMileageData(trips = []) {
  const totals = new Map()
  for (const trip of Array.isArray(trips) ? trips : []) {
    const week = Math.max(1, Number(trip?.week || 1))
    const miles = Number(trip?.miles || 0)
    if (!Number.isFinite(week) || !Number.isFinite(miles) || miles < 0) continue
    totals.set(week, (totals.get(week) || 0) + miles)
  }

  return [...totals.entries()]
    .sort(([weekA], [weekB]) => weekA - weekB)
    .slice(-8)
    .map(([week, value]) => ({ label: `Semana ${week}`, value }))
}

export default function MileageChart({ trips }) {
  return (
    <section className="career-charts-grid diary-charts-grid" aria-label="Gráficos do Diário de Bordo">
      <BarChart
        title="Milhas por semana"
        description="Compara as milhas registradas nas últimas semanas da carreira, incluindo a semana atual."
        data={weeklyMileageData(trips)}
        formatValue={(value) => `${Number(value || 0).toLocaleString('en-US')} mi`}
        emptyText="Registre viagens para começar a acompanhar as milhas por semana."
      />
    </section>
  )
}
