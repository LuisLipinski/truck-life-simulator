// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '../../lib/authApi.js'
import { clearAccessSession, getAccessSession } from '../../lib/authSession.js'
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from './AuthPages.jsx'

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

function render(component) {
  act(() => root.render(component))
}

function setInput(selector, value) {
  const input = container.querySelector(selector)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  return input
}

async function submit(selector = 'form') {
  await act(async () => {
    container.querySelector(selector).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
}

function requestBody(callIndex = 0) {
  return JSON.parse(globalThis.fetch.mock.calls[callIndex][1].body)
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  window.location.hash = '#/'
  localStorage.clear()
  sessionStorage.clear()
  clearAccessSession()
})

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  clearAccessSession()
  localStorage.clear()
  sessionStorage.clear()
  window.location.hash = '#/'
  vi.restoreAllMocks()
  delete globalThis.fetch
  root = null
  container = null
})

describe('public authentication pages', () => {
  it('logs in using the API contract, keeps the token in memory and redirects to My Account', async () => {
    globalThis.fetch = vi.fn(async () => response(200, {
      accessToken: 'access-token-only-in-memory',
      tokenType: 'Bearer',
      expiresIn: 900,
    }))
    render(<LoginPage />)
    setInput('#login-email', ' motorista@example.com ')
    setInput('#login-password', 'uma senha segura')

    await submit()

    expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/v1/auth/login`, expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }))
    expect(requestBody()).toEqual({ email: 'motorista@example.com', password: 'uma senha segura' })
    expect(getAccessSession()).toMatchObject({ accessToken: 'access-token-only-in-memory', tokenType: 'Bearer' })
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(window.location.hash).toBe('#/account')
    expect(container.textContent).toContain('Login realizado')
  })

  it('returns to the protected destination after a successful login', async () => {
    globalThis.fetch = vi.fn(async () => response(200, {
      accessToken: 'return-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    }))
    render(<LoginPage params={new URLSearchParams({ returnTo: '/account' })} />)
    setInput('#login-email', 'driver@example.com')
    setInput('#login-password', 'uma senha segura')

    await submit()

    expect(window.location.hash).toBe('#/account')
  })

  it('maps Problem Details to safe login copy without exposing backend detail', async () => {
    globalThis.fetch = vi.fn(async () => response(401, {
      detail: 'Sensitive provider diagnostic that must stay hidden',
      code: 'INVALID_CREDENTIALS',
      correlationId: 'corr-test',
    }, { 'content-type': 'application/problem+json' }))
    render(<LoginPage />)
    const emailInput = setInput('#login-email', 'driver@example.com')
    setInput('#login-password', 'senha incorreta')

    await submit()

    expect(container.textContent).toContain('E-mail ou senha inválidos.')
    expect(container.textContent).not.toContain('Sensitive provider diagnostic')
    expect(emailInput.value).toBe('driver@example.com')
  })

  it('prioritizes the specific unverified-email code over a generic 401 response', async () => {
    globalThis.fetch = vi.fn(async () => response(401, {
      detail: 'Account pending verification',
      code: 'EMAIL_NOT_VERIFIED',
    }, { 'content-type': 'application/problem+json' }))
    render(<LoginPage />)
    setInput('#login-email', 'pending@example.com')
    setInput('#login-password', 'senha correta')

    await submit()

    expect(container.textContent).toContain('E-mail ainda não verificado')
    expect(container.querySelector('a[href="#/verify-email?email=pending%40example.com"]')).not.toBeNull()
  })

  it('registers with displayName, email and password and redirects to login', async () => {
    globalThis.fetch = vi.fn(async () => response(202))
    render(<RegisterPage />)
    setInput('#register-name', ' Maria Estrada ')
    setInput('#register-email', 'maria@example.com')
    setInput('#register-password', 'senha com 12+')
    setInput('#register-confirmation', 'senha com 12+')

    await submit()

    expect(globalThis.fetch.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/v1/auth/register`)
    expect(requestBody()).toEqual({
      displayName: 'Maria Estrada',
      email: 'maria@example.com',
      password: 'senha com 12+',
    })
    expect(window.location.hash).toBe('#/login?registered=1&email=maria%40example.com')
    expect(container.textContent).toContain('Solicitação recebida')
  })

  it('shows the post-registration guidance on the login screen', () => {
    render(<LoginPage params={new URLSearchParams({ registered: '1', email: 'maria@example.com' })} />)

    expect(container.textContent).toContain('Conta criada')
    expect(container.textContent).toContain('Verifique seu e-mail antes de entrar')
    expect(container.querySelector('#login-email').value).toBe('maria@example.com')
  })

  it('verifies the 43-character token and supports a neutral resend request', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response(204))
      .mockResolvedValueOnce(response(202))
    const token = 'a'.repeat(43)
    render(<VerifyEmailPage params={new URLSearchParams({ token, email: 'verify@example.com' })} />)

    await submit('form:first-of-type')
    await submit('.auth-secondary-form')

    expect(globalThis.fetch.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/v1/auth/verify-email`)
    expect(requestBody(0)).toEqual({ token })
    expect(globalThis.fetch.mock.calls[1][0]).toBe(`${API_BASE_URL}/api/v1/auth/resend-verification`)
    expect(requestBody(1)).toEqual({ email: 'verify@example.com' })
    expect(container.textContent).toContain('E-mail verificado')
    expect(container.textContent).toContain('Se houver uma conta aguardando verificação')
  })

  it('keeps the typed email when the API is unavailable', async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Network failed') })
    render(<ForgotPasswordPage />)
    const input = setInput('#forgot-email', 'offline@example.com')

    await submit()

    expect(input.value).toBe('offline@example.com')
    expect(container.textContent).toContain('Serviço temporariamente indisponível')
    expect(container.textContent).toContain('Seus dados digitados foram mantidos')
  })

  it('prepares reset-password but does not call the API when confirmation differs', async () => {
    globalThis.fetch = vi.fn()
    render(<ResetPasswordPage params={new URLSearchParams({ token: 'b'.repeat(43) })} />)
    setInput('#reset-password', 'uma nova senha')
    setInput('#reset-confirmation', 'outra nova senha')

    await submit()

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(container.textContent).toContain('As senhas digitadas não são iguais.')
  })

  it('explains when password recovery is waiting for its backend endpoint', async () => {
    globalThis.fetch = vi.fn(async () => response(404, {
      detail: 'Not Found',
      code: 'HTTP_404',
    }, { 'content-type': 'application/problem+json' }))
    render(<ForgotPasswordPage />)
    setInput('#forgot-email', 'waiting@example.com')

    await submit()

    expect(container.textContent).toContain('Recuperação ainda em ativação')
    expect(container.textContent).toContain('será liberado assim que a API concluir')
  })
})
