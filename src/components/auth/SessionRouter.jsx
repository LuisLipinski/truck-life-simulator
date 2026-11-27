import { useEffect, useState } from 'react'
import AccountPage from './AccountPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import PlansPage from '../premium/PlansPage.jsx'
import { useEntitlements } from '../premium/EntitlementProvider.jsx'

function currentPath() {
  return String(window.location.hash || '#/').replace(/^#/, '').split('?')[0] || '/'
}

export default function SessionRouter({ children }) {
  const entitlements = useEntitlements()
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onHashChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (
      path === '/pricing'
      && entitlements.status === 'ready'
      && entitlements.premiumRestrictionsEnabled === false
    ) {
      window.location.hash = '#/'
    }
  }, [path, entitlements.status, entitlements.premiumRestrictionsEnabled])

  if (path === '/pricing') {
    if (entitlements.status !== 'ready') return null
    if (entitlements.premiumRestrictionsEnabled === false) return null
    return <PlansPage />
  }

  if (path === '/account') {
    return (
      <ProtectedRoute returnTo="/account">
        <AccountPage />
      </ProtectedRoute>
    )
  }

  return children
}
