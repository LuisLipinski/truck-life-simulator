import { useEffect, useState } from 'react'
import { countPendingCareerImports } from '../../lib/careerMigration.js'
import { useAuth } from './AuthProvider.jsx'

const PUBLIC_AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
])

function currentPath() {
  return String(window.location.hash || '#/').replace(/^#/, '').split('?')[0] || '/'
}

export default function SessionNavigation() {
  const auth = useAuth()
  const [path, setPath] = useState(currentPath)
  const [signingOut, setSigningOut] = useState(false)
  const pendingImports = auth.isAuthenticated && auth.user?.id
    ? countPendingCareerImports(auth.user.id)
    : 0

  useEffect(() => {
    const onHashChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (!auth.isAuthenticated || PUBLIC_AUTH_PATHS.has(path) || path === '/account') return null

  async function signOut() {
    setSigningOut(true)
    try {
      await auth.logout()
    } finally {
      setSigningOut(false)
      window.location.hash = '#/'
    }
  }

  return (
    <nav className="session-account-bar" aria-label="Sessão da conta">
      <div>
        <span>Conectado como</span>
        <strong>{auth.user?.displayName || auth.user?.email || 'Conta'}</strong>
      </div>
      {pendingImports > 0 && (
        <a className="button primary compact session-migration-link" href="#/account">
          Migrar {pendingImports} {pendingImports === 1 ? 'carreira' : 'carreiras'}
        </a>
      )}
      <a className="button secondary compact" href="#/account">Minha conta</a>
      <button className="button secondary compact" type="button" onClick={signOut} disabled={signingOut}>
        {signingOut ? 'Saindo…' : 'Sair'}
      </button>
    </nav>
  )
}
