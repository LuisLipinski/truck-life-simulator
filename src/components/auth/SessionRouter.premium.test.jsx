// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  entitlements: null,
}))

vi.mock('../premium/EntitlementProvider.jsx', () => ({
  useEntitlements: () => mocks.entitlements,
}))

vi.mock('../premium/PlansPage.jsx', () => ({
  default: () => <div data-plans-page>Planos Free e Premium</div>,
}))

vi.mock('./AccountPage.jsx', () => ({
  default: () => <div>Conta</div>,
}))

vi.mock('./ProtectedRoute.jsx', () => ({
  default: ({ children }) => children,
}))

import SessionRouter from './SessionRouter.jsx'

let root
let container

beforeEach(() => {
  mocks.entitlements = {
    status: 'ready',
    premiumRestrictionsEnabled: false,
  }
  window.location.hash = '#/'
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  window.location.hash = '#/'
  vi.restoreAllMocks()
})

async function renderAt(hash) {
  window.location.hash = hash
  await act(async () => {
    root.render(<SessionRouter><div data-app>Aplicação</div></SessionRouter>)
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('SessionRouter premium feature flag', () => {
  it('hides the pricing route and redirects home while premium restrictions are disabled', async () => {
    await renderAt('#/pricing')

    expect(container.querySelector('[data-plans-page]')).toBeNull()
    expect(container.textContent).not.toContain('Premium')
    expect(window.location.hash).toBe('#/')
  })

  it('restores the pricing route automatically when the premium flag is enabled', async () => {
    mocks.entitlements = {
      status: 'ready',
      premiumRestrictionsEnabled: true,
    }

    await renderAt('#/pricing')

    expect(container.querySelector('[data-plans-page]')?.textContent).toBe('Planos Free e Premium')
    expect(window.location.hash).toBe('#/pricing')
  })
})
