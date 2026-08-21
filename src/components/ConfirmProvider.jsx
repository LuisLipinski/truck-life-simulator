import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

const TONE_ICONS = {
  danger: '!',
  warning: '!',
  success: '✓',
  primary: '?',
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const pending = useRef(null)
  const cancelButton = useRef(null)
  const modal = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  const close = useCallback((confirmed) => {
    const request = pending.current
    if (!request) return
    pending.current = null
    setDialog(null)
    request.resolve(confirmed)
  }, [])

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    if (pending.current) pending.current.resolve(false)

    const request = {
      title: options.title || 'Confirmar ação?',
      message: options.message || 'Deseja continuar?',
      confirmLabel: options.confirmLabel || 'Confirmar',
      cancelLabel: options.cancelLabel || 'Cancelar',
      tone: ['danger', 'warning', 'success', 'primary'].includes(options.tone) ? options.tone : 'primary',
      resolve,
    }

    pending.current = request
    setDialog(request)
  }), [])

  useEffect(() => () => {
    if (pending.current) pending.current.resolve(false)
    pending.current = null
  }, [])

  useEffect(() => {
    if (!dialog) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    cancelButton.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(false)
        return
      }

      if (event.key !== 'Tab') return
      const focusable = [...(modal.current?.querySelectorAll('button:not([disabled])') || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [close, dialog])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="react-confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close(false)}>
          <section
            className={`react-confirm-modal react-confirm-${dialog.tone}`}
            ref={modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <div className="react-confirm-icon" aria-hidden="true">{TONE_ICONS[dialog.tone]}</div>
            <div className="react-confirm-copy">
              <span className="eyebrow">Confirmação necessária</span>
              <h2 id={titleId}>{dialog.title}</h2>
              <p id={descriptionId}>{dialog.message}</p>
            </div>
            <div className="react-confirm-actions">
              <button ref={cancelButton} className="button secondary react-confirm-cancel" type="button" onClick={() => close(false)}>{dialog.cancelLabel}</button>
              <button className={`button ${dialog.tone === 'danger' ? 'danger' : dialog.tone === 'success' ? 'success' : 'primary'} react-confirm-confirm`} type="button" onClick={() => close(true)}>{dialog.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm precisa estar dentro de ConfirmProvider')
  return context
}
