import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { subscriptionApi } from '../../lib/subscriptionApi.js'
import { useAuth } from '../auth/AuthProvider.jsx'

const GUEST_ENTITLEMENTS = {
  plan: 'GUEST',
  premium: false,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  features: {},
}

const fallback = {
  status: 'loading',
  plans: [],
  entitlements: GUEST_ENTITLEMENTS,
  error: null,
  premium: false,
  hasFeature: () => false,
  featureLimit: () => null,
  refresh: async () => null,
}

const EntitlementContext = createContext(fallback)

export function EntitlementProvider({ children }) {
  const auth = useAuth()
  const [state, setState] = useState({
    status: 'loading',
    plans: [],
    entitlements: GUEST_ENTITLEMENTS,
    error: null,
  })

  const load = useCallback(async ({ signal } = {}) => {
    if (auth.status === 'loading') return null

    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const plansPromise = subscriptionApi.plans({ signal })
      const entitlementsPromise = auth.isAuthenticated
        ? subscriptionApi.entitlements({ signal })
        : Promise.resolve(GUEST_ENTITLEMENTS)
      const [plans, entitlements] = await Promise.all([plansPromise, entitlementsPromise])
      const next = {
        status: 'ready',
        plans: Array.isArray(plans) ? plans : [],
        entitlements: entitlements || GUEST_ENTITLEMENTS,
        error: null,
      }
      setState(next)
      return next
    } catch (error) {
      if (error?.name === 'AbortError') return null
      setState((current) => ({
        ...current,
        status: 'error',
        entitlements: auth.isAuthenticated ? current.entitlements : GUEST_ENTITLEMENTS,
        error,
      }))
      return null
    }
  }, [auth.isAuthenticated, auth.status, auth.user?.id])

  useEffect(() => {
    if (auth.status === 'loading') return undefined
    const controller = new AbortController()
    load({ signal: controller.signal })
    return () => controller.abort()
  }, [auth.status, auth.user?.id, load])

  const value = useMemo(() => {
    const features = state.entitlements?.features || {}
    return {
      ...state,
      premium: Boolean(state.entitlements?.premium),
      hasFeature(featureCode) {
        return Boolean(features?.[featureCode]?.enabled)
      },
      featureLimit(featureCode) {
        return features?.[featureCode]?.limit ?? null
      },
      refresh: () => load(),
    }
  }, [state, load])

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>
}

export function useEntitlements() {
  return useContext(EntitlementContext)
}
