const TOKEN_KEY = 'fluxone.auth.token'
const SESSION_ID_KEY = 'fluxone.auth.sessionId'
const EXPIRES_AT_KEY = 'fluxone.auth.expiresAt'
const USER_KEY = 'fluxone.auth.user'
// Legacy key — cleared so old refresh tokens cannot poison the session.
const LEGACY_REFRESH_KEY = 'fluxone.auth.refresh'
const LEGACY_REFRESH_LOCK_KEY = 'fluxone.auth.refreshLock'

// Keys another tab must observe so login and logout stay in sync.
export const AUTH_STORAGE_KEYS = [TOKEN_KEY, SESSION_ID_KEY, EXPIRES_AT_KEY, USER_KEY]

export function isAuthStorageKey(key) {
  return AUTH_STORAGE_KEYS.includes(key)
}

function removeLegacyRefreshArtifacts() {
  localStorage.removeItem(LEGACY_REFRESH_KEY)
  localStorage.removeItem(LEGACY_REFRESH_LOCK_KEY)
}

export const tokenStorage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  },
  getSessionId() {
    return localStorage.getItem(SESSION_ID_KEY)
  },
  setSessionId(sessionId) {
    if (sessionId) localStorage.setItem(SESSION_ID_KEY, sessionId)
    else localStorage.removeItem(SESSION_ID_KEY)
  },
  getExpiresAt() {
    return localStorage.getItem(EXPIRES_AT_KEY)
  },
  setExpiresAt(expiresAt) {
    if (expiresAt) localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt))
    else localStorage.removeItem(EXPIRES_AT_KEY)
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    } catch {
      return null
    }
  },
  setUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  },
  // Persist opaque session from login response.
  setSession({ token, sessionId, expiresAt, user } = {}) {
    removeLegacyRefreshArtifacts()
    if (token !== undefined) this.setToken(token)
    if (sessionId !== undefined) this.setSessionId(sessionId)
    if (expiresAt !== undefined) this.setExpiresAt(expiresAt)
    if (user !== undefined) this.setUser(user)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_ID_KEY)
    localStorage.removeItem(EXPIRES_AT_KEY)
    localStorage.removeItem(USER_KEY)
    removeLegacyRefreshArtifacts()
  },
}