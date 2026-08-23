import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiProblemError, authApi, refreshAccessSession } from '../../lib/authApi.js'
import { clearAccessSession, setAccessSession } from '../../lib/authSession.js'

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

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    error: null,
  })

  useEffect(() => {
    let active = true

    async function restore() {
      try {
        await refreshAccessSession()
        const user = await authApi.me()
        if (active) setState({ status: 'authenticated', user, error: null })
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
    return () => { active = false }
  }, [])

  const login = useCallback(async (credentials) => {
    const session = await authApi.login(credentials)
    setAccessSession(session)
    try {
      const user = await authApi.me()
      setState({ status: 'authenticated', user, error: null })
      return user
    } catch (error) {
      clearAccessSession()
      setState({ status: 'anonymous', user: null, error: null })
      throw error
    }
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
