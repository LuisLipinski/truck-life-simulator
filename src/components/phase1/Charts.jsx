function compactNumber(value) {
  const number = Number(value || 0)
  const absolute = Math.abs(number)
  if (absolute >= 1000000) return `${(number / 1000000).toFixed(1)}M`
  if (absolute >= 1000) return `${(number / 1000).toFixed(1)}k`
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function pointPath(points, width, height, padding) {
  if (!points.length) return ''
  const values = points.map((item) => Number(item.value || 0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min || 1
  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2
  return points.map((item, index) => {
    const x = padding + (points.length === 1 ? usableWidth / 2 : index * usableWidth / (points.length - 1))
    const y = padding + usableHeight - ((Number(item.value || 0) - min) / spread) * usableHeight
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
}

export function LineChart({ title, description, data = [], formatValue = compactNumber, emptyText = 'Ainda não há dados suficientes para este gráfico.' }) {
  const points = data.filter((item) => Number.isFinite(Number(item.value)))
  const width = 640
  const height = 220
  const padding = 24
  const path = pointPath(points, width, height, padding)

  return (
    <section className="panel career-chart-card">
      <div className="career-chart-heading">
        <div><span className="eyebrow">Tendência</span><h3>{title}</h3></div>
        {points.length > 0 && <strong>{formatValue(points.at(-1).value)}</strong>}
      </div>
      {description && <p className="career-chart-description">{description}</p>}
      {points.length < 2 ? <div className="career-chart-empty">{emptyText}</div> : (
        <>
          <div className="career-line-chart" role="img" aria-label={`${title}. ${points.map((item) => `${item.label}: ${formatValue(item.value)}`).join(', ')}`}>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
              <path d={path} className="chart-line" />
              {points.map((item, index) => {
                const values = points.map((point) => Number(point.value || 0))
                const min = Math.min(...values)
                const max = Math.max(...values)
                const spread = max - min || 1
                const usableWidth = width - padding * 2
                const usableHeight = height - padding * 2
                const x = padding + index * usableWidth / (points.length - 1)
                const y = padding + usableHeight - ((Number(item.value || 0) - min) / spread) * usableHeight
                return <circle key={`${item.label}-${index}`} cx={x} cy={y} r="5" className="chart-dot" />
              })}
            </svg>
          </div>
          <div className="career-chart-labels"><span>{points[0].label}</span><span>{points.at(-1).label}</span></div>
        </>
      )}
    </section>
  )
}

export function BarChart({ title, description, data = [], formatValue = compactNumber, emptyText = 'Ainda não há dados para comparar.' }) {
  const rows = data.filter((item) => Number.isFinite(Number(item.value)))
  const max = Math.max(0, ...rows.map((item) => Math.abs(Number(item.value || 0)))) || 1
  return (
    <section className="panel career-chart-card">
      <div className="career-chart-heading"><div><span className="eyebrow">Comparativo</span><h3>{title}</h3></div></div>
      {description && <p className="career-chart-description">{description}</p>}
      {rows.length === 0 ? <div className="career-chart-empty">{emptyText}</div> : (
        <div className="career-bar-chart" role="img" aria-label={`${title}. ${rows.map((item) => `${item.label}: ${formatValue(item.value)}`).join(', ')}`}>
          {rows.map((item, index) => {
            const width = Math.max(2, Math.abs(Number(item.value || 0)) / max * 100)
            return (
              <div className="career-bar-row" key={`${item.label}-${index}`}>
                <div className="career-bar-meta"><span>{item.label}</span><strong>{formatValue(item.value)}</strong></div>
                <div className="career-bar-track"><span className="career-bar-fill" style={{ width: `${width}%` }} /></div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
