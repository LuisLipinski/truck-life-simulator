// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { careerApi } from '../../lib/careerApi.js'
import CareerManagementPanel from './CareerManagementPanel.jsx'
import { ConfirmProvider } from '../ConfirmProvider.jsx'
import { GameProvider } from '../GameContext.jsx'
import { ToastProvider } from '../ToastProvider.jsx'

let root
let container

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

function render(career, callbacks = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <ToastProvider>
        <ConfirmProvider>
          <GameProvider gameId="ats" stateCode="CA" currencyCode="USD" city="Los Angeles, CA">
            <CareerManagementPanel
              career={career}
              onUpdateProfile={callbacks.onUpdateProfile || vi.fn()}
              onChangeEmployer={callbacks.onChangeEmployer || vi.fn()}
              onChangeBase={callbacks.onChangeBase || vi.fn()}
            />
          </GameProvider>
        </ConfirmProvider>
      </ToastProvider>,
    )
  })
  return container
}

function setControlledValue(element, value) {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')
  descriptor.set.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function serverCareer(overrides = {}) {
  return {
    id: 'local-1',
    driverName: 'Driver',
    bio: '',
    company: 'Old Logistics',
    city: 'Los Angeles, CA',
    stateCode: 'CA',
    currency: 'USD',
    baseCurrency: 'USD',
    exchangeRate: 1,
    serverBacked: true,
    serverCareerId: 'server-1',
    serverVersion: 4,
    serverSyncStatus: 'ready',
    ...overrides,
  }
}

describe('CareerManagementPanel server source', () => {
  it('updates a migrated career profile through the backend without invoking the local write callback', async () => {
    const localUpdate = vi.fn()
    vi.spyOn(careerApi, 'updateProfile').mockResolvedValue({
      id: 'server-1',
      driverName: 'Server Driver',
      companyName: 'Old Logistics',
      biography: 'Server bio',
      version: 5,
    })
    vi.spyOn(careerApi, 'events').mockResolvedValue([])

    render(serverCareer(), { onUpdateProfile: localUpdate })
    const name = container.querySelector('#career-edit-driver')
    const bio = container.querySelector('#career-edit-bio')
    await act(async () => {
      setControlledValue(name, 'Server Driver')
      setControlledValue(bio, 'Server bio')
    })
    await act(async () => {
      container.querySelector('#career-profile-editor').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(careerApi.updateProfile).toHaveBeenCalledWith('ats', 'server-1', {
      version: 4,
      driverName: 'Server Driver',
      biography: 'Server bio',
    })
    expect(localUpdate).not.toHaveBeenCalled()
  })

  it('keeps the existing local callback for a career that has not been migrated', async () => {
    const localUpdate = vi.fn()
    const apiSpy = vi.spyOn(careerApi, 'updateProfile')
    render(serverCareer({ serverBacked: false, serverCareerId: undefined, serverVersion: undefined, serverSyncStatus: undefined }), {
      onUpdateProfile: localUpdate,
    })

    const name = container.querySelector('#career-edit-driver')
    await act(async () => {
      setControlledValue(name, 'Local Driver')
    })
    await act(async () => {
      container.querySelector('#career-profile-editor').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(localUpdate).toHaveBeenCalledWith({ driverName: 'Local Driver', bio: '', effectiveDate: '' })
    expect(apiSpy).not.toHaveBeenCalled()
  })

  it('blocks writes while an associated server career has not finished loading', () => {
    render(serverCareer({ serverVersion: null, serverSyncStatus: 'loading' }))
    expect(container.querySelector('#career-profile-editor button[type="submit"]').disabled).toBe(true)
    expect(container.textContent).toContain('Aguardando sincronização do perfil server-side')
  })
})
