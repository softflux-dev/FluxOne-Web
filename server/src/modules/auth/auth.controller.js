import bcrypt from 'bcryptjs'
import {
  findAuthUserById,
  findAuthUsersByLoginId,
  findAuthUsersByLoginIdIncludingInactive,
  updateAuthProfile,
  updatePasswordHash,
} from './auth.model.js'
import {
  createSession,
  revokeAllForUser,
  revokeById,
  revokeByTokenHash,
} from './auth_sessions.model.js'
import {
  buildSessionExpiryDates,
  deviceLabelFromUserAgent,
  generateOpaqueToken,
  hashToken,
  newSessionId,
  secondsUntil,
} from '../../utils/sessionToken.util.js'
import { listBranchesForLookup } from '../inventory-manager/lookups/lookup.model.js'
import { ROLES, BCRYPT_COST } from '../../config/constants.js'
import { fail, failFromError, success } from '../../utils/response.util.js'
import { resolveUploadUrl } from '../../utils/uploadUrl.util.js'
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
} from '../../services/authLockout.service.js'

function publicUser(user) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug || null,
    tenantName: user.tenantName || null,
    defaultCurrency: user.defaultCurrency || 'PKR',
    branchId: user.branchId,
    branchName: user.branchName || null,
    openingTime: user.openingTime || null,
    closingTime: user.closingTime || null,
    workingDays: Array.isArray(user.workingDays) ? user.workingDays : [],
    imageUrl: user.imageUrl || null,
  }
}

async function branchesForUser(user) {
  if (user.role === ROLES.B2B_ADMIN) {
    const rows = await listBranchesForLookup(user.tenantId)
    return rows.map((b) => ({ id: b.id, name: b.name, code: null }))
  }

  if (user.branchId) {
    return [{ id: user.branchId, name: user.branchName || null, code: null }]
  }

  return []
}

function authPayload(user, session) {
  return {
    sessionId: session.sessionId,
    // Opaque session secret (shown once).
    token: session.token,
    // Alias for POS / older clients that read accessToken.
    accessToken: session.token,
    expiresAt: session.expiresAt,
    expiresIn: session.expiresIn,
    tenantId: user.tenantId,
    user: publicUser(user),
    branches: [],
  }
}

function requestMeta(req) {
  const userAgent = req.get?.('user-agent') || null
  return {
    userAgent,
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    deviceLabel: deviceLabelFromUserAgent(userAgent),
  }
}

// Create opaque session row and return raw token once.
async function issueSession(user, req) {
  const rawToken = generateOpaqueToken()
  const sessionId = newSessionId()
  const { expiresAt, absoluteExpiresAt } = buildSessionExpiryDates()
  const meta = requestMeta(req)

  await createSession({
    id: sessionId,
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: hashToken(rawToken),
    expiresAt,
    absoluteExpiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    deviceLabel: meta.deviceLabel,
  })

  return {
    sessionId,
    token: rawToken,
    expiresAt: expiresAt.toISOString(),
    expiresIn: secondsUntil(expiresAt),
  }
}

export async function login(req, res) {
  const { password } = req.validated.body
  const loginId = (req.validated.body.id || req.validated.body.email || '').trim()
  const ip = req.ip || req.socket?.remoteAddress || 'unknown'

  // Account lockout after repeated failures (Redis when available)
  const lockState = await isLoginLocked(loginId, ip)
  if (lockState.locked) {
    res.set('Retry-After', String(lockState.retryAfterSec || 60))
    return fail(
      res,
      `Too many failed login attempts. Try again in ${lockState.retryAfterSec || 60} seconds.`,
      429,
    )
  }

  const candidates = await findAuthUsersByLoginId(loginId)
  if (!candidates.length) {
    // Clearer error when credentials are valid but the branch is blocked / account off.
    const inactiveCandidates = await findAuthUsersByLoginIdIncludingInactive(loginId)
    for (const candidate of inactiveCandidates) {
      const ok = await bcrypt.compare(password, candidate.passwordHash)
      if (!ok) continue
      if (candidate.branchId && candidate.branchStatus === 'blocked') {
        await recordLoginFailure(loginId, ip)
        return fail(
          res,
          'This branch is blocked. You cannot log in until an administrator opens it again.',
          403,
        )
      }
      if (!candidate.isActive) {
        await recordLoginFailure(loginId, ip)
        return fail(res, 'Account deactivated. Contact your administrator.', 403)
      }
    }
    await recordLoginFailure(loginId, ip)
    return fail(res, 'Invalid id or password', 401)
  }

  const matched = []
  for (const candidate of candidates) {
    const ok = await bcrypt.compare(password, candidate.passwordHash)
    if (ok) matched.push(candidate)
  }

  if (!matched.length) {
    const afterFail = await recordLoginFailure(loginId, ip)
    if (afterFail.locked) {
      res.set('Retry-After', String(afterFail.retryAfterSec || 60))
      return fail(
        res,
        `Too many failed login attempts. Try again in ${afterFail.retryAfterSec || 60} seconds.`,
        429,
      )
    }
    return fail(res, 'Invalid id or password', 401)
  }

  if (matched.length > 1) {
    return fail(
      res,
      'This User ID exists in more than one company. Contact your administrator.',
      409,
    )
  }

  const user = matched[0]
  if (user.branchId && user.branchStatus === 'blocked') {
    return fail(
      res,
      'This branch is blocked. You cannot log in until an administrator opens it again.',
      403,
    )
  }

  // Successful auth — clear failure counters for this id+IP
  await clearLoginFailures(loginId, ip)

  const session = await issueSession(user, req)
  const payload = authPayload(user, session)
  payload.branches = await branchesForUser(user)
  return success(res, payload)
}

export async function me(req, res) {
  const user = await findAuthUserById(req.user.id, req.tenantId)
  if (!user) {
    return fail(res, 'User not found', 404)
  }
  return success(res, publicUser(user))
}

export async function updateMe(req, res) {
  const body = req.validated.body
  const fullName = body.name?.trim() || undefined
  const loginId = body.id?.trim() || undefined
  const newPassword = body.password || undefined
  const currentPassword = body.currentPassword || undefined
  // New upload or replace — multer field name `image`
  const imageUrl = resolveUploadUrl(req.file, req) || undefined

  if (!fullName && !loginId && !newPassword && !imageUrl) {
    return fail(res, 'name, id, password, or image is required', 422)
  }

  try {
    if (newPassword) {
      const existing = await findAuthUserById(req.user.id, req.tenantId)
      if (!existing) return fail(res, 'User not found', 404)
      if (!currentPassword) {
        return fail(res, 'Current password is required to set a new password', 422)
      }
      const match = await bcrypt.compare(currentPassword, existing.passwordHash)
      if (!match) {
        return fail(res, 'Current password is incorrect', 401)
      }
      if (currentPassword === newPassword) {
        return fail(res, 'New password must be different from current password', 422)
      }
    }

    if (fullName || loginId || imageUrl) {
      const updated = await updateAuthProfile(req.user.id, req.tenantId, {
        fullName,
        email: loginId,
        imageUrl,
      })
      if (!updated) return fail(res, 'User not found', 404)
    }

    if (newPassword) {
      const nextHash = await bcrypt.hash(newPassword, BCRYPT_COST)
      await updatePasswordHash(req.user.id, req.tenantId, nextHash)
      // Password change → logout every device for this user.
      await revokeAllForUser(req.user.id, req.tenantId)
    }
  } catch (err) {
    return failFromError(res, err)
  }

  const user = await findAuthUserById(req.user.id, req.tenantId)
  if (!user) return fail(res, 'User not found', 404)
  return success(res, {
    ...publicUser(user),
    passwordUpdated: Boolean(newPassword),
  })
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.validated.body
  const user = await findAuthUserById(req.user.id, req.tenantId)
  if (!user) {
    return fail(res, 'User not found', 404)
  }
  const match = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!match) {
    return fail(res, 'Current password is incorrect', 401)
  }
  if (currentPassword === newPassword) {
    return fail(res, 'New password must be different from current password', 422)
  }
  const nextHash = await bcrypt.hash(newPassword, BCRYPT_COST)
  await updatePasswordHash(user.id, req.tenantId, nextHash)
  await revokeAllForUser(user.id, req.tenantId)
  return success(res, { updated: true })
}

// Revoke this device only. Idempotent success so clients can clear local state.
export async function logout(req, res) {
  // Prefer session id set by authMiddleware when route is protected.
  if (req.sessionId) {
    await revokeById(req.sessionId)
    return success(res, { loggedOut: true })
  }

  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    const raw = header.slice(7).trim()
    if (raw) {
      await revokeByTokenHash(hashToken(raw))
    }
  }

  return success(res, { loggedOut: true })
}

// Revoke every session for the authenticated user (this tenant).
export async function logoutAll(req, res) {
  await revokeAllForUser(req.user.id, req.tenantId)
  return success(res, { loggedOutAll: true })
}