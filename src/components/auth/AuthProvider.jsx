import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiProblemError, authApi, refreshAccessSession } from '../../lib/authApi.js'
import {
  clearAccessSession,
  setAccessSession,
  subscribeAccessSession,
} from '../../lib/authSession.js'

const fallbackAuth = {
  status: 'anonymous',
  user: null,
  error: null,
  isAuthenticated: false,
  async login(credentials) {
    const session = await authApi.login(credentials)
    setAccessSession(session)
    return session
  },
  async logout() {
    await authApi.logout()
  },
  async refreshUser() {
    return null
  },
}

const AuthContext = createContext(fallbackAuth)

function isMissingSession(error) {
  return error instanceof ApiProblemError && error.status === 401
}

function savedLoginDestination() {
  const [path, query = ''] = String(window.location.hash || '').replace(/^#/, '').split('?')
  if (path !== '/login') return null
  const returnTo = new URLSearchParams(query).get('returnTo') || ''
  if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.startsWith('/login')) return null
  return returnTo
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    error: null,
  })

  useEffect(() => {
    let active = true

    async function syncAuthenticatedUser() {
      try {
        const user = await authApi.me()
        if (!active) return
        setState({ status: 'authenticated', user, error: null })
        const destination = savedLoginDestination()
        if (destination) window.location.hash = `#${destination}`
      } catch (error) {
        if (!active) return
        if (isMissingSession(error)) {
          clearAccessSession()
          setState({ status: 'anonymous', user: null, error: null })
        } else {
          setState({ status: 'error', user: null, error })
        }
      }
    }

    const unsubscribe = subscribeAccessSession((session) => {
      if (!active) return
      if (!session) {
        setState({ status: 'anonymous', user: null, error: null })
        return
      }
      syncAuthenticatedUser()
    })

    async function restore() {
      try {
        await refreshAccessSession()
      } catch (error) {
        clearAccessSession()
        if (!active) return
        if (isMissingSession(error)) {
          setState({ status: 'anonymous', user: null, error: null })
        } else {
          setState({ status: 'error', user: null, error })
        }
      }
    }

    restore()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (state.status === 'loading') {
      delete document.documentElement.dataset.authResolved
    } else {
      document.documentElement.dataset.authResolved = 'true'
    }

    if (state.status === 'authenticated') {
      document.documentElement.dataset.authenticated = 'true'
    } else {
      delete document.documentElement.dataset.authenticated
    }

    return () => {
      delete document.documentElement.dataset.authResolved
      delete document.documentElement.dataset.authenticated
    }
  }, [state.status])

  const login = useCallback(async (credentials) => {
    const session = await authApi.login(credentials)
    setAccessSession(session)
    return session
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearAccessSession()
      setState({ status: 'anonymous', user: null, error: null })
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.me()
      setState({ status: 'authenticated', user, error: null })
      return user
    } catch (error) {
      if (isMissingSession(error)) {
        clearAccessSession()
        setState({ status: 'anonymous', user: null, error: null })
      }
      throw error
    }
  }, [])

  const value = useMemo(() => ({
    ...state,
    isAuthenticated: state.status === 'authenticated',
    login,
    logout,
    refreshUser,
  }), [state, login, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
