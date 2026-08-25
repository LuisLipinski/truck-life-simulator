// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '../../lib/authApi.js'
import { clearAccessSession, getAccessSession, setAccessSession } from '../../lib/authSession.js'
import AccountPage from './AccountPage.jsx'

const authState = {
  user: {
    id: 'user-1',
    displayName: 'Road Driver',
    email: 'driver@example.com',
    role: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    createdAt: '2026-08-24T12:00:00Z',
    lastLoginAt: '2026-08-24T13:00:00Z',
  },
  logout: vi.fn(async () => {}),
}

vi.mock('./AuthProvider.jsx', () => ({
  useAuth: () => authState,
}))

let container
let root

function response(status, payload = null, extraHeaders = {}) {
  const headers = new Map(Object.entries({
    ...(payload === null ? {} : { 'content-type': 'application/json' }),
    ...extraHeaders,
  }).map(([key, value]) => [key.toLowerCase(), String(value)]))
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers.get(String(name).toLowerCase()) || null },
    json: vi.fn(async () => payload),
  }
}

function setInput(selector, value) {
  const input = container.querySelector(selector)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function submitPasswordForm() {
  await act(async () => {
    container.querySelector('.account-security-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  authState.logout.mockClear()
  clearAccessSession()
  setAccessSession({ accessToken: 'current-access-token', tokenType: 'Bearer', expiresIn: 600 })
  act(() => root.render(<AccountPage />))
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  clearAccessSession()
  vi.restoreAllMocks()
  delete globalThis.fetch
  root = null
  container = null
})

describe('My Account password change', () => {
  it('blocks submission when confirmation differs from the new password', async () => {
    globalThis.fetch = vi.fn()
    setInput('#account-current-password', 'senha atual segura')
    setInput('#account-new-password', 'nova senha segura 2026')
    setInput('#account-confirm-password', 'outra senha segura 2026')

    await submitPasswordForm()

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(container.textContent).toContain('A confirmação precisa ser igual à nova senha.')
  })

  it('changes the password without logging out or clearing the current access token', async () => {
    globalThis.fetch = vi.fn(async () => response(204))
    setInput('#account-current-password', 'senha atual segura')
    setInput('#account-new-password', 'nova senha segura 2026')
    setInput('#account-confirm-password', 'nova senha segura 2026')

    await submitPasswordForm()

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/me/change-password`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'senha atual segura',
          newPassword: 'nova senha segura 2026',
        }),
        headers: expect.objectContaining({ Authorization: 'Bearer current-access-token' }),
      }),
    )
    expect(authState.logout).not.toHaveBeenCalled()
    expect(getAccessSession()).toMatchObject({ accessToken: 'current-access-token' })
    expect(container.textContent).toContain('Você continua conectado nesta sessão')
    expect(container.querySelector('#account-current-password').value).toBe('')
    expect(container.querySelector('#account-new-password').value).toBe('')
    expect(container.querySelector('#account-confirm-password').value).toBe('')
  })

  it('shows a specific message when the current password is incorrect', async () => {
    globalThis.fetch = vi.fn(async () => response(
      400,
      { code: 'CURRENT_PASSWORD_INVALID', detail: 'The current password is invalid' },
      { 'content-type': 'application/problem+json' },
    ))
    setInput('#account-current-password', 'senha atual errada')
    setInput('#account-new-password', 'nova senha segura 2026')
    setInput('#account-confirm-password', 'nova senha segura 2026')

    await submitPasswordForm()

    expect(container.textContent).toContain('A senha atual informada está incorreta.')
    expect(authState.logout).not.toHaveBeenCalled()
  })
})
