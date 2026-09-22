// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  entitlements: null,
}))

vi.mock('./EntitlementProvider.jsx', () => ({
  useEntitlements: () => mocks.entitlements,
}))

import PremiumGate, { PREMIUM_LOCK_TEXT } from './PremiumGate.jsx'

let root
let container

beforeEach(() => {
  mocks.entitlements = {
    status: 'ready',
    premium: false,
    hasFeature: () => false,
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

function render(children) {
  act(() => root.render(children))
}

describe('PremiumGate', () => {
  it('uses the standard Premium copy for locked content', () => {
    render(
      <PremiumGate feature="ADVANCED_CHARTS" variant="chart">
        <div>Conteúdo protegido</div>
      </PremiumGate>,
    )

    expect(container.textContent).toContain('Premium')
    expect(container.textContent).toContain(PREMIUM_LOCK_TEXT)
    expect(container.textContent).not.toContain('Conteúdo protegido')
    expect(container.querySelector('.premium-gate-chart')).not.toBeNull()
  })

  it('disables locked controls instead of leaving a clickable premium action', () => {
    render(
      <PremiumGate feature="BATCH_EXPORT" variant="control">
        <button type="button" onClick={vi.fn()}>Exportar carreiras</button>
      </PremiumGate>,
    )

    const button = container.querySelector('button')
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(container.textContent).toContain(PREMIUM_LOCK_TEXT)
    expect(container.querySelector('.premium-lock-control')).not.toBeNull()
  })

  it('renders the original feature without lock styling for Premium access', () => {
    mocks.entitlements = {
      status: 'ready',
      premium: true,
      hasFeature: () => true,
    }

    render(
      <PremiumGate feature="ADVANCED_CHARTS">
        <div data-premium-content>Conteúdo liberado</div>
      </PremiumGate>,
    )

    expect(container.querySelector('[data-premium-content]')?.textContent).toBe('Conteúdo liberado')
    expect(container.querySelector('.premium-gate-locked')).toBeNull()
  })
})
