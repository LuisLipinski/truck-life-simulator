import { describe, expect, it } from 'vitest'
import { weeklyMileageData } from './MileageChart.jsx'

describe('weeklyMileageData', () => {
  it('groups trip miles by week and keeps chronological order', () => {
    expect(weeklyMileageData([
      { week: 2, miles: 80 },
      { week: 1, miles: 120 },
      { week: 2, miles: 45.5 },
    ])).toEqual([
      { label: 'Semana 1', value: 120 },
      { label: 'Semana 2', value: 125.5 },
    ])
  })

  it('includes the current/open week because it reads directly from trips', () => {
    expect(weeklyMileageData([{ week: 7, miles: 315 }])).toEqual([
      { label: 'Semana 7', value: 315 },
    ])
  })

  it('limits the chart to the latest eight weeks', () => {
    const trips = Array.from({ length: 10 }, (_, index) => ({ week: index + 1, miles: 100 + index }))
    const result = weeklyMileageData(trips)

    expect(result).toHaveLength(8)
    expect(result[0].label).toBe('Semana 3')
    expect(result.at(-1).label).toBe('Semana 10')
  })
})
