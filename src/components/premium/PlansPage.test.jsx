// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true },
  entitlements: null,
}))

vi.mock('../auth/AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}))

vi.mock('./EntitlementProvider.jsx', () => ({
  useEntitlements: () => mocks.entitlements,
}))

import PlansPage from './PlansPage.jsx'

let root
let container

beforeEach(() => {
  mocks.auth = { isAuthenticated: true }
  mocks.entitlements = {
    status: 'ready',
    error: null,
    entitlements: { plan: 'FREE', premium: false },
    refresh: vi.fn(),
    plans: [
      {
        code: 'FREE',
        name: 'Free',
        priceCents: 0,
        currency: 'BRL',
        features: {
          MAX_ATS_CAREERS: { enabled: true, limit: 2 },
          MAX_ETS2_CAREERS: { enabled: true, limit: 2 },
          BATCH_EXPORT: { enabled: false, limit: null },
          XLSX_EXPORT: { enabled: false, limit: null },
          FULL_HISTORY: { enabled: false, limit: null },
          ADVANCED_CHARTS: { enabled: false, limit: null },
        },
      },
      {
        code: 'PREMIUM',
        name: 'Premium',
        priceCents: null,
        currency: 'BRL',
        billingPeriod: 'PREPAID_30_DAYS',
        features: {
          MAX_ATS_CAREERS: { enabled: true, limit: null },
          MAX_ETS2_CAREERS: { enabled: true, limit: null },
          BATCH_EXPORT: { enabled: true, limit: null },
          XLSX_EXPORT: { enabled: true, limit: null },
          FULL_HISTORY: { enabled: true, limit: null },
          ADVANCED_CHARTS: { enabled: true, limit: null },
        },
      },
    ],
  }
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

async function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<PlansPage />)
  })
}

describe('PlansPage', () => {
  it('shows the confirmed Free 2+2 matrix and Premium unlimited without inventing a price', async () => {
    await render()

    expect(container.textContent).toContain('Seu plano atual: Free')
    expect(container.textContent).toContain('Preço ainda não definido')
    expect(container.textContent).toContain('Pagamento ainda não disponível')

    const cards = [...container.querySelectorAll('.premium-plan-card')]
    expect(cards).toHaveLength(2)
    expect(cards[0].textContent).toContain('Carreiras ATS2')
    expect(cards[0].textContent).toContain('Carreiras ETS22')
    expect(cards[1].textContent).toContain('Carreiras ATSIlimitadas')
    expect(cards[1].textContent).toContain('Exportação em loteIncluído')
  })

  it('keeps the gameplay core described as Free', async () => {
    await render()

    expect(container.textContent).toContain('O gameplay principal não fica atrás de pagamento')
    expect(container.textContent).toContain('empréstimos e financiamentos')
    expect(container.textContent).toContain('Nenhuma carreira existente será apagada')
  })
})
