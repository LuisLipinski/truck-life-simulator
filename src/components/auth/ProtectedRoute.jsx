import { useEffect } from 'react'
import { useAuth } from './AuthProvider.jsx'

export function normalizeReturnTo(value, fallback = '/') {
  const candidate = String(value || '').trim()
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback
  return candidate
}

export default function ProtectedRoute({ children, returnTo = '/' }) {
  const auth = useAuth()
  const safeReturnTo = normalizeReturnTo(returnTo)

  useEffect(() => {
    if (auth.status === 'anonymous') {
      window.location.hash = `#/login?returnTo=${encodeURIComponent(safeReturnTo)}`
    }
  }, [auth.status, safeReturnTo])

  if (auth.status === 'loading') {
    return (
      <main className="page-shell form-shell">
        <div className="empty-state" role="status">
          <h2>Restaurando sua sessão…</h2>
          <p>Estamos verificando com segurança se sua conta ainda está conectada.</p>
        </div>
      </main>
    )
  }

  if (auth.status === 'error') {
    return (
      <main className="page-shell form-shell">
        <div className="empty-state" role="alert">
          <h2>Não foi possível validar sua sessão</h2>
          <p>A API está temporariamente indisponível. Sua carreira local continua preservada neste dispositivo.</p>
          <a className="button secondary compact" href="#/">Voltar ao simulador</a>
        </div>
      </main>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="page-shell form-shell">
        <div className="empty-state" role="status">
          <h2>Redirecionando para o login…</h2>
        </div>
      </main>
    )
  }

  return children
}
