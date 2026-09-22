// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: { status: 'authenticated', isAuthenticated: true, user: { id: 'user-1' } },
  plans: vi.fn(),
  entitlements: vi.fn(),
}))

vi.mock('../auth/AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}))

vi.mock('../../lib/subscriptionApi.js', () => ({
  subscriptionApi: {
    plans: mocks.plans,
    entitlements: mocks.entitlements,
  },
}))

import { EntitlementProvider, useEntitlements } from './EntitlementProvider.jsx'

let root
let container

function Probe() {
  const value = useEntitlements()
  return (
    <div>
      <span data-status>{value.status}</span>
      <span data-plan>{value.entitlements?.plan}</span>
      <span data-premium>{String(value.premium)}</span>
      <span data-limit>{String(value.featureLimit('MAX_ATS_CAREERS'))}</span>
      <span data-batch>{String(value.hasFeature('BATCH_EXPORT'))}</span>
    </div>
  )
}

async function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<EntitlementProvider><Probe /></EntitlementProvider>)
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  mocks.auth = { status: 'authenticated', isAuthenticated: true, user: { id: 'user-1' } }
  mocks.plans.mockReset().mockResolvedValue([{ code: 'FREE' }, { code: 'PREMIUM' }])
  mocks.entitlements.mockReset().mockResolvedValue({
    plan: 'FREE',
    premium: false,
    features: {
      MAX_ATS_CAREERS: { enabled: true, limit: 2 },
      BATCH_EXPORT: { enabled: false, limit: null },
    },
  })
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

describe('EntitlementProvider', () => {
  it('loads plans and authenticated server entitlements', async () => {
    await render()

    expect(mocks.plans).toHaveBeenCalledTimes(1)
    expect(mocks.entitlements).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-status]').textContent).toBe('ready')
    expect(container.querySelector('[data-plan]').textContent).toBe('FREE')
    expect(container.querySelector('[data-premium]').textContent).toBe('false')
    expect(container.querySelector('[data-limit]').textContent).toBe('2')
    expect(container.querySelector('[data-batch]').textContent).toBe('false')
  })

  it('keeps anonymous users as guest and does not call protected entitlements', async () => {
    mocks.auth = { status: 'anonymous', isAuthenticated: false, user: null }

    await render()

    expect(mocks.plans).toHaveBeenCalledTimes(1)
    expect(mocks.entitlements).not.toHaveBeenCalled()
    expect(container.querySelector('[data-plan]').textContent).toBe('GUEST')
    expect(container.querySelector('[data-premium]').textContent).toBe('false')
  })
})
