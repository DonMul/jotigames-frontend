import { createContext, useContext, useMemo, useState } from 'react'

import { clearAuthState, loadAuthState, saveAuthState } from './storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuthState())

  const value = useMemo(
    () => ({
      auth,
      isAuthenticated: Boolean(auth?.token),
      login(nextAuth) {
        setAuth(nextAuth)
        saveAuthState(nextAuth)
      },
      logout() {
        setAuth(null)
        clearAuthState()
      },
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
