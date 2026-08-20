// @vitest-environment jsdom

import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfirmProvider, useConfirm } from './ConfirmProvider.jsx'

let root
let container

function Harness() {
  const confirm = useConfirm()
  const [result, setResult] = useState('pendente')

  async function ask() {
    const confirmed = await confirm({
      title: 'Excluir registro?',
      message: 'O registro será removido permanentemente.',
      confirmLabel: 'Excluir agora',
      tone: 'danger',
    })
    setResult(confirmed ? 'confirmado' : 'cancelado')
  }

  return React.createElement(
    'div',
    null,
    React.createElement('button', { className: 'open-confirm', type: 'button', onClick: ask }, 'Abrir confirmação'),
    React.createElement('output', null, result),
  )
}

function render() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(React.createElement(ConfirmProvider, null, React.createElement(Harness))))
}

async function openDialog() {
  await act(async () => container.querySelector('.open-confirm').click())
  return document.querySelector('[role="alertdialog"]')
}

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  document.body.style.overflow = ''
  root = null
  container = null
})

describe('ConfirmProvider', () => {
  it('shows the requested content and resolves when the action is confirmed', async () => {
    render()
    const dialog = await openDialog()

    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.textContent).toContain('Excluir registro?')
    expect(dialog.textContent).toContain('O registro será removido permanentemente.')
    expect(document.activeElement).toBe(dialog.querySelector('.react-confirm-cancel'))
    expect(document.body.style.overflow).toBe('hidden')

    await act(async () => {
      dialog.querySelector('.react-confirm-confirm').click()
      await Promise.resolve()
    })

    expect(container.querySelector('output').textContent).toBe('confirmado')
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('resolves as cancelled from the visible Cancel button', async () => {
    render()
    const dialog = await openDialog()

    await act(async () => {
      dialog.querySelector('.react-confirm-cancel').click()
      await Promise.resolve()
    })

    expect(container.querySelector('output').textContent).toBe('cancelado')
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
  })

  it('also cancels with Escape or a click on the backdrop', async () => {
    render()
    await openDialog()

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })
    expect(container.querySelector('output').textContent).toBe('cancelado')

    const dialog = await openDialog()
    await act(async () => {
      dialog.parentElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await Promise.resolve()
    })
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(container.querySelector('output').textContent).toBe('cancelado')
  })
})
