import bcrypt from 'bcryptjs'
import {
  findAuthUserById,
  findAuthUsersByLoginId,
  findAuthUsersByLoginIdIncludingInactive,
  updateAuthProfile,
  updatePasswordHash,
} from './auth.model.js'
import {
  findRefreshTokenByJti,
  insertRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshTokenByHash,
  revokeRefreshTokenByJti,
} from './refresh_tokens.model.js'
import {
  getRefreshTokenExpiresAt,
  hashToken,
  signAuthTokens,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../utils/jwt.util.js'
import { listBranchesForLookup } from '../inventory-manager/lookups/lookup.model.js'
import { ROLES, BCRYPT_COST } from '../../config/constants.js'
import { fail, success } from '../../utils/response.util.js'
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

function authPayload(user, tokens) {
  return {
    accessToken: tokens.accessToken,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tenantId: user.tenantId,
    user: publicUser(user),
    branches: [],
  }
}

function requestMeta(req) {
  return {
    userAgent: req.get?.('user-agent') || null,
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  }
}

/** Sign JWTs and persist refresh token hash for rotation/revocation. */
async function issueSession(user, req) {
  const tokens = signAuthTokens(user)
  const meta = requestMeta(req)
  await insertRefreshToken({
    jti: tokens.jti,
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: hashToken(tokens.refreshToken),
    expiresAt: getRefreshTokenExpiresAt(),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  })
  return tokens
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

  const tokens = await issueSession(user, req)
  const payload = authPayload(user, tokens)
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
      await revokeAllRefreshTokensForUser(req.user.id, req.tenantId)
    }
  } catch (err) {
    if (err.status === 409) return fail(res, err.message, 409)
    throw err
  }

  const user = await findAuthUserById(req.user.id, req.tenantId)
  if (!user) return fail(res, 'User not found', 404)
  return success(res, {
    ...publicUser(user),
    passwordUpdated: Boolean(newPassword),
  })
}

export async function refresh(req, res) {
  try {
    const rawToken = req.validated.body.refreshToken
    const decoded = verifyRefreshToken(rawToken)
    if (!decoded?.jti || !decoded?.sub || !decoded?.tenantId) {
      return fail(res, 'Invalid refresh token', 401)
    }

    const stored = await findRefreshTokenByJti(decoded.jti)
    if (!stored) {
      return fail(res, 'Invalid refresh token', 401)
    }

    const incomingHash = hashToken(rawToken)
    if (stored.tokenHash !== incomingHash) {
      return fail(res, 'Invalid refresh token', 401)
    }

    // Reuse of a rotated token usually means theft. Two open tabs can present the
    // same token in the same moment, so a just-rotated token must not kill the new session.
    if (stored.revokedAt) {
      const revokedMs = new Date(stored.revokedAt).getTime()
      const ageMs = Date.now() - revokedMs
      const rotatedJustNow = Boolean(stored.replacedByJti) && ageMs >= 0 && ageMs < 30_000
      if (!rotatedJustNow) {
        await revokeAllRefreshTokensForUser(stored.userId, stored.tenantId)
      }
      return fail(res, 'Invalid refresh token', 401)
    }

    if (new Date(stored.expiresAt).getTime() <= Date.now()) {
      await revokeRefreshTokenByJti(decoded.jti)
      return fail(res, 'Invalid refresh token', 401)
    }

    const user = await findAuthUserById(decoded.sub, decoded.tenantId)
    if (!user || !user.isActive || (user.branchId && user.branchStatus === 'blocked')) {
      await revokeAllRefreshTokensForUser(decoded.sub, decoded.tenantId)
      return fail(res, 'Invalid refresh token', 401)
    }

    const tokens = await issueSession(user, req)
    await revokeRefreshTokenByJti(decoded.jti, { replacedByJti: tokens.jti })

    const payload = authPayload(user, tokens)
    payload.branches = await branchesForUser(user)
    return success(res, payload)
  } catch (err) {
    const name = err?.name
    if (name === 'TokenExpiredError' || name === 'JsonWebTokenError' || name === 'NotBeforeError') {
      return fail(res, 'Invalid refresh token', 401)
    }
    // Database and other failures stay 5xx so the client keeps the session.
    throw err
  }
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
  await revokeAllRefreshTokensForUser(user.id, req.tenantId)
  return success(res, { updated: true })
}

/**
 * Revoke refresh session(s). Accepts refreshToken in body and/or Bearer access token.
 * Always returns success so clients can clear local state without leaking validity.
 */
export async function logout(req, res) {
  const rawRefresh = req.validated?.body?.refreshToken || req.body?.refreshToken

  if (rawRefresh && String(rawRefresh).length >= 10) {
    try {
      const decoded = verifyRefreshToken(rawRefresh)
      if (decoded?.jti) {
        await revokeRefreshTokenByJti(decoded.jti)
      } else {
        await revokeRefreshTokenByHash(hashToken(rawRefresh))
      }
    } catch {
      await revokeRefreshTokenByHash(hashToken(rawRefresh))
    }
  }

  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    try {
      const access = verifyAccessToken(header.slice(7))
      if (access?.sub && access?.tenantId) {
        await revokeAllRefreshTokensForUser(access.sub, access.tenantId)
      }
    } catch {
      // Access may already be expired — refresh revoke above is enough
    }
  }

  return success(res, { loggedOut: true })
}
