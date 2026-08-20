// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { BarChart, LineChart } from './Charts.jsx'

let root
let container

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
})

function render(component) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(component))
}

describe('career charts', () => {
  it('shows an explanatory empty state when a line chart has fewer than two points', () => {
    render(createElement(LineChart, {
      title: 'Evolução do saldo',
      data: [{ label: 'Hoje', value: 100 }],
      emptyText: 'Dados insuficientes',
    }))

    expect(container.textContent).toContain('Evolução do saldo')
    expect(container.textContent).toContain('Dados insuficientes')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders accessible line chart information for multiple points', () => {
    render(createElement(LineChart, {
      title: 'Evolução do saldo',
      data: [{ label: 'A', value: 100 }, { label: 'B', value: 125.5 }],
      formatValue: (value) => `$${Number(value).toFixed(2)}`,
    }))

    const chart = container.querySelector('[role="img"]')
    expect(chart).not.toBeNull()
    expect(chart.getAttribute('aria-label')).toContain('A: $100.00')
    expect(chart.getAttribute('aria-label')).toContain('B: $125.50')
    expect(container.querySelectorAll('.chart-dot')).toHaveLength(2)
  })

  it('adds hover and keyboard targets with the exact value for every line point', () => {
    render(createElement(LineChart, {
      title: 'Evolução do saldo',
      data: [{ label: '20/08/2026 10:00', value: 793 }, { label: '20/08/2026 12:00', value: 912.34 }],
      formatValue: (value) => `$${Number(value).toFixed(2)}`,
    }))

    const targets = container.querySelectorAll('.career-chart-point-hit')
    expect(targets).toHaveLength(2)
    expect(targets[0].getAttribute('aria-label')).toBe('20/08/2026 10:00: $793.00')
    expect(targets[1].getAttribute('title')).toBe('20/08/2026 12:00: $912.34')
    expect(targets[1].querySelector('.career-chart-tooltip').textContent).toContain('$912.34')
  })

  it('renders proportional bar rows and labels', () => {
    render(createElement(BarChart, {
      title: 'Milhas por semana',
      data: [{ label: 'Semana 1', value: 100 }, { label: 'Semana 2', value: 200 }],
      formatValue: (value) => `${value} mi`,
    }))

    const fills = container.querySelectorAll('.career-bar-fill')
    expect(fills).toHaveLength(2)
    expect(fills[0].style.width).toBe('50%')
    expect(fills[1].style.width).toBe('100%')
    expect(container.textContent).toContain('Semana 2')
    expect(container.textContent).toContain('200 mi')
  })
})
