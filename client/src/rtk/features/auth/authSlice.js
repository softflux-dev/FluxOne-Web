// Auth Slice — Express /api/auth → RTK → AuthContext / useAuthSession → UI
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { tokenStorage } from '@/api/tokenStorage'
import { invalidateProductCatalog } from '@/lib/productCatalogCache'

const storedUser = tokenStorage.getUser()
const storedToken = tokenStorage.getToken()
const storedSessionId = tokenStorage.getSessionId()
const storedExpiresAt = tokenStorage.getExpiresAt()

function clearSessionState(state) {
  state.user = null
  state.token = null
  state.sessionId = null
  state.expiresAt = null
  state.role = null
  state.isAuthenticated = false
  state.status = 'idle'
  state.error = null
}

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  const result = await apiClient.post(endpoints.auth.login, credentials)
  if (!result?.success) {
    // Pass retryAfterSec so LoginForm can show a live countdown while locked
    return rejectWithValue({
      message: result?.error || 'Login failed',
      retryAfterSec: Number(result?.retryAfterSec) || 0,
      status: result?.status || 0,
    })
  }
  return result.data
})

// Optimistic logout: UI signs out on pending; token stays until revoke API runs.
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    // Bearer comes from tokenStorage via apiClient.
    await apiClient.post(endpoints.auth.logout, {}, { skipSessionClear: true })
  } catch {
    // Ignore network errors — local session is cleared either way
  } finally {
    tokenStorage.clear()
  }
})

// Revoke every device/session for this user.
export const logoutAllDevices = createAsyncThunk('auth/logoutAll', async () => {
  try {
    await apiClient.post(endpoints.auth.logoutAll, {}, { skipSessionClear: true })
  } catch {
    // Still clear local session
  } finally {
    tokenStorage.clear()
  }
})

// JSON when text-only; multipart FormData when a new profile image is selected
function buildProfileUpdateBody(payload) {
  const hasImage = payload.image instanceof File && payload.image.size > 0

  if (!hasImage) {
    const body = {
      name: payload.name,
      id: payload.id,
    }
    if (payload.password) {
      body.password = payload.password
      if (payload.currentPassword) body.currentPassword = payload.currentPassword
    }
    return body
  }

  const form = new FormData()
  if (payload.name) form.append('name', payload.name)
  if (payload.id) form.append('id', payload.id)
  if (payload.password) {
    form.append('password', payload.password)
    if (payload.currentPassword) form.append('currentPassword', payload.currentPassword)
  }
  form.append('image', payload.image)
  return form
}

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { rejectWithValue }) => {
    const result = await apiClient.patch(endpoints.auth.update, buildProfileUpdateBody(payload))
    if (!result?.success) {
      return rejectWithValue(result?.error || 'Profile update failed')
    }
    return result.data
  },
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    const result = await apiClient.get(endpoints.auth.me)
    if (!result?.success) {
      return rejectWithValue(result?.error || 'Failed to load profile')
    }
    return result.data
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    token: storedToken,
    sessionId: storedSessionId,
    expiresAt: storedExpiresAt,
    role: storedUser?.role || null,
    isAuthenticated: Boolean(storedToken && storedUser),
    status: 'idle',
    error: null,
  },
  reducers: {
    hydrateSession(state, action) {
      const { user, token, sessionId, expiresAt } = action.payload || {}
      if (user !== undefined) state.user = user
      if (token !== undefined) state.token = token
      if (sessionId !== undefined) state.sessionId = sessionId
      if (expiresAt !== undefined) state.expiresAt = expiresAt
      state.role = (user || state.user)?.role || null
      state.isAuthenticated = Boolean((token ?? state.token) && (user ?? state.user))
    },
    sessionExpired(state) {
      invalidateProductCatalog()
      clearSessionState(state)
    },
    clearAuthError(state) {
      state.error = null
    },
    // Keep session in sync after Admin Settings → Currency save
    setDefaultCurrency(state, action) {
      const code = action.payload
      if (!state.user || !code) return
      state.user = { ...state.user, defaultCurrency: code }
      tokenStorage.setUser(state.user)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        invalidateProductCatalog()
        state.status = 'succeeded'
        const token = action.payload.token || action.payload.accessToken
        state.user = action.payload.user
        state.token = token
        state.sessionId = action.payload.sessionId || null
        state.expiresAt = action.payload.expiresAt || null
        state.role = action.payload.user?.role || null
        state.isAuthenticated = true
        tokenStorage.setSession({
          token,
          sessionId: action.payload.sessionId,
          expiresAt: action.payload.expiresAt,
          user: action.payload.user,
        })
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        const payload = action.payload
        state.error =
          (typeof payload === 'string' ? payload : payload?.message) ||
          action.error.message ||
          'Login failed'
      })
      .addCase(logoutUser.pending, (state) => {
        // Optimistic UI only — keep tokenStorage so revoke can send Bearer
        invalidateProductCatalog()
        clearSessionState(state)
      })
      .addCase(logoutUser.fulfilled, (state) => {
        tokenStorage.clear()
        clearSessionState(state)
      })
      .addCase(logoutUser.rejected, (state) => {
        tokenStorage.clear()
        invalidateProductCatalog()
        clearSessionState(state)
      })
      .addCase(logoutAllDevices.pending, (state) => {
        invalidateProductCatalog()
        clearSessionState(state)
      })
      .addCase(logoutAllDevices.fulfilled, (state) => {
        tokenStorage.clear()
        clearSessionState(state)
      })
      .addCase(logoutAllDevices.rejected, (state) => {
        tokenStorage.clear()
        invalidateProductCatalog()
        clearSessionState(state)
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        const payload = action.payload || {}
        const { passwordUpdated, ...user } = payload
        if (passwordUpdated) {
          // Server revoked all sessions — force re-login on this device too.
          tokenStorage.clear()
          invalidateProductCatalog()
          clearSessionState(state)
          return
        }
        state.user = user
        state.role = user?.role || state.role
        tokenStorage.setUser(user)
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        // A late /me must not restore a user after this tab already signed out.
        if (!state.isAuthenticated || !action.payload) return
        state.user = action.payload
        state.role = action.payload?.role || state.role
        tokenStorage.setUser(action.payload)
      })
  },
})

export const { hydrateSession, sessionExpired, clearAuthError, setDefaultCurrency } =
  authSlice.actions
export default authSlice.reducer