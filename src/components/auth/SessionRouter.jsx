import { useEffect, useState } from 'react'
import AccountPage from './AccountPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

function currentPath() {
  return String(window.location.hash || '#/').replace(/^#/, '').split('?')[0] || '/'
}

export default function SessionRouter({ children }) {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onHashChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (path === '/account') {
    return (
      <ProtectedRoute returnTo="/account">
        <AccountPage />
      </ProtectedRoute>
    )
  }

  return children
}
