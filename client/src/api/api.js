import { API_BASE_URL, DEMO_ACCOUNTS, MOCK_API } from '@/lib/constants'
import { endpoints } from '@/api/endpoints'
import { getErrorMessage, parseJson, toQuery } from '@/api/apiHelper'
import { fail, ok } from '@/api/result'
import { tokenStorage } from '@/api/tokenStorage'

// Auth paths where 401 must not wipe / redirect as “session ended”.
const NO_SESSION_CLEAR_PATHS = new Set([
  endpoints.auth.login,
  endpoints.auth.logout,
  endpoints.auth.logoutAll,
])

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mockPath(path) {
  return path.split('?')[0]
}

function mockOpaqueToken(role) {
  return `mock.session.${role}.${Date.now()}.${crypto.randomUUID()}`
}

async function syncSessionToStore(session) {
  try {
    const [{ store }, { hydrateSession, sessionExpired }] = await Promise.all([
      import('@/rtk/store'),
      import('@/rtk/features/auth/authSlice'),
    ])
    if (!session) {
      store.dispatch(sessionExpired())
      return
    }
    store.dispatch(
      hydrateSession({
        token: session.token,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        user: session.user,
      }),
    )
  } catch {
    // Store may be unavailable during early boot — localStorage still updated
  }
}

function applySession(data) {
  const user = data.user || tokenStorage.getUser()
  const token = data.token || data.accessToken
  tokenStorage.setSession({
    token,
    sessionId: data.sessionId,
    expiresAt: data.expiresAt,
    user,
  })
  return syncSessionToStore({
    token,
    sessionId: data.sessionId,
    expiresAt: data.expiresAt,
    user,
  })
}

function clearSession() {
  tokenStorage.clear()
  return syncSessionToStore(null)
}

// Minimal mock: auth only (inventory/branch modules use live API).
async function mockRequest(method, path, body) {
  await delay()
  const route = mockPath(path)

  if (route === endpoints.auth.login && method === 'POST') {
    const loginId = body?.id || body?.email
    const matches = DEMO_ACCOUNTS.filter(
      (item) => item.id === loginId && item.password === body?.password,
    )
    if (!matches.length) return fail('Invalid id or password')
    if (matches.length > 1) {
      return fail('This User ID exists in more than one company. Contact your administrator.')
    }
    const account = matches[0]
    const user = {
      id: `mock-${account.id}`,
      name: account.name,
      email: account.id,
      role: account.role,
      tenantSlug: account.tenantSlug,
      tenantId: account.tenantSlug,
      tenantName:
        account.tenantSlug === 'company-a'
          ? 'Company A'
          : account.tenantSlug === 'softwareflux'
            ? 'SoftwareFlux'
            : 'Company B',
      branchId: null,
    }
    const token = mockOpaqueToken(account.role)
    const expiresAt = new Date(Date.now() + 14 * 86_400_000).toISOString()
    return ok({
      sessionId: crypto.randomUUID(),
      token,
      accessToken: token,
      expiresAt,
      expiresIn: 14 * 86_400,
      user,
    })
  }

  if (route === endpoints.auth.me || route === endpoints.auth.update) {
    const user = tokenStorage.getUser()
    if (!user) return fail('Unauthorized')
    if (method === 'PATCH') {
      const asForm = typeof FormData !== 'undefined' && body instanceof FormData
      const nextName = (asForm ? body.get('name') : body?.name)?.toString?.()?.trim?.() || ''
      const nextId =
        (asForm ? body.get('id') : body?.id || body?.email)?.toString?.()?.trim?.() || ''
      const nextPassword = (asForm ? body.get('password') : body?.password) || ''
      const nextImage = asForm ? body.get('image') : body?.image
      if (!nextName && !nextId && !nextPassword && !nextImage) {
        return fail('name, id, password, or image is required')
      }
      return ok({
        ...user,
        name: nextName || user.name,
        email: nextId || user.email,
        imageUrl: nextImage ? user.imageUrl || 'mock://profile-image' : user.imageUrl,
        passwordUpdated: Boolean(nextPassword),
      })
    }
    return ok(user)
  }

  if (route === endpoints.auth.logout) return ok({ loggedOut: true })
  if (route === endpoints.auth.logoutAll) return ok({ loggedOutAll: true })

  if (method === 'POST' || method === 'PATCH') {
    return ok({ ...(body || {}), id: body?.id || crypto.randomUUID() })
  }

  if (route.includes('/inventory/control') || route.includes('/inventory/')) {
    return fail(
      `Mock API does not cover inventory Control. Disable VITE_MOCK_API and use the live API for ${method} ${route}`,
    )
  }

  return fail(`No mock handler for ${method} ${route}`)
}

function isFormDataBody(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function shouldClearOnUnauthorized(path, options, status) {
  if (status !== 401) return false
  if (options.skipSessionClear) return false
  const route = mockPath(path)
  if (NO_SESSION_CLEAR_PATHS.has(route)) return false
  return Boolean(tokenStorage.getToken())
}

// Prevent form submit from hanging forever (QA tc-IM-suppliers091)
const DEFAULT_FETCH_TIMEOUT_MS = 45_000

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body

  if (MOCK_API) {
    return mockRequest(method, path, body)
  }

  const url = `${API_BASE_URL}${path}`
  const asForm = isFormDataBody(body)
  const timeoutMs =
    typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_FETCH_TIMEOUT_MS
  const controller = new AbortController()
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null

  try {
    const token = tokenStorage.getToken()
    const response = await fetch(url, {
      method,
      // Avoid stale 304/ETag responses after mutations
      cache: 'no-store',
      signal: options.signal || controller.signal,
      headers: {
        ...(asForm ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body:
        body === undefined ? undefined : asForm ? body : JSON.stringify(body),
    })

    if (response.status === 304) {
      return fail(`Stale cache for ${url}`)
    }

    const payload = await parseJson(response)

    if (!response.ok) {
      if (shouldClearOnUnauthorized(path, options, response.status)) {
        await clearSession()
        return fail('Session ended. Please sign in again.', { status: 401 })
      }
      const retryAfterRaw = response.headers.get('Retry-After')
      const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : undefined
      return fail(getErrorMessage(payload, `HTTP ${response.status}`), {
        status: response.status,
        ...(Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? { retryAfterSec }
          : {}),
      })
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      if (!payload.success) return fail(payload.error || 'Request failed')
      return ok(payload.data)
    }
    return ok(payload?.data ?? payload)
  } catch (error) {
    if (error?.name === 'AbortError') {
      return fail('Request timed out. Please try again.')
    }
    return fail(error.message || `Network error calling ${url}`)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export const apiClient = {
  get: (path, params) => api(`${path}${toQuery(params)}`),
  post: (path, body, options = {}) =>
    api(path, { method: 'POST', body, ...options }),
  put: (path, body, options = {}) =>
    api(path, { method: 'PUT', body, ...options }),
  patch: (path, body, options = {}) =>
    api(path, { method: 'PATCH', body, ...options }),
  delete: (path) => api(path, { method: 'DELETE' }),
}

// Used by login slice / tests when applying a login payload outside api().
export { applySession, clearSession }