import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { isAuthStorageKey, tokenStorage } from '@/api/tokenStorage'
import {
  fetchCurrentUser,
  hydrateSession,
  loginUser,
  logoutAllDevices,
  logoutUser,
  sessionExpired,
} from '@/rtk/features/auth/authSlice'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (!auth.token || !auth.isAuthenticated) return
    void dispatch(fetchCurrentUser())
  }, [dispatch, auth.token, auth.isAuthenticated])

  // Other tabs share localStorage. Adopt their login, or sign out if they clear.
  useEffect(() => {
    function onStorage(event) {
      if (!isAuthStorageKey(event.key)) return
      const token = tokenStorage.getToken()
      const sessionId = tokenStorage.getSessionId()
      const expiresAt = tokenStorage.getExpiresAt()
      const user = tokenStorage.getUser()
      if (token && user) {
        dispatch(hydrateSession({ token, sessionId, expiresAt, user }))
        return
      }
      if (!token && !user) dispatch(sessionExpired())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dispatch])

  const value = useMemo(
    () => ({
      ...auth,
      login: (credentials) => dispatch(loginUser(credentials)).unwrap(),
      logout: () => dispatch(logoutUser()),
      logoutAll: () => dispatch(logoutAllDevices()),
    }),
    [auth, dispatch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}