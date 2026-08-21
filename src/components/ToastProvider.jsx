import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

const TITLES = {
  success: 'Tudo certo',
  error: 'Não foi possível concluir',
  warning: 'Atenção',
  info: 'Informação',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const notify = useCallback((type, message, options = {}) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const toast = {
      id,
      type: ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info',
      title: options.title || TITLES[type] || TITLES.info,
      message,
    }
    setToasts((current) => [...current.slice(-3), toast])
    const duration = Number(options.duration || (toast.type === 'error' ? 5200 : 3800))
    timers.current.set(id, window.setTimeout(() => dismiss(id), duration))
    return id
  }, [dismiss])

  const value = useMemo(() => ({
    notify,
    success: (message, options) => notify('success', message, options),
    error: (message, options) => notify('error', message, options),
    warning: (message, options) => notify('warning', message, options),
    info: (message, options) => notify('info', message, options),
  }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="app-toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className={`app-toast app-toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'} key={toast.id}>
            <div className="app-toast-icon" aria-hidden="true">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : toast.type === 'warning' ? '!' : 'i'}</div>
            <div className="app-toast-copy">
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </div>
            <button type="button" className="app-toast-close" aria-label="Fechar notificação" onClick={() => dismiss(toast.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider')
  return context
}
