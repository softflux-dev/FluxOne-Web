import { ROLES } from '../../config/constants.js'
import { isTenantWideAdmin } from '../../utils/branchScope.util.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// Cashier, BM, IM, branch_admin — never read/write another branch via sync.
const BRANCH_LOCKED_ROLES = new Set([
  ROLES.CASHIER,
  ROLES.BRANCH_MANAGER,
  ROLES.INVENTORY_MANAGER,
  ROLES.BRANCH_ADMIN,
])

function assertBranchLockedSyncAccess(req, branchId) {
  if (!BRANCH_LOCKED_ROLES.has(req.user?.role)) return

  const tokenBranchId = req.user?.branchId || null
  if (!tokenBranchId) {
    throw httpError(403, 'This account is not assigned to a branch')
  }
  if (tokenBranchId !== branchId) {
    throw httpError(403, 'Branch access denied')
  }
}

// Resolve branchId for sync pull (bootstrap/delta/sales).
export function resolveSyncPullBranchId(req, queryBranchId) {
  const branchId = queryBranchId || req.user?.branchId || null
  if (!branchId) {
    throw httpError(422, 'branchId is required')
  }

  assertBranchLockedSyncAccess(req, branchId)
  return branchId
}

// Push resolves branch from body or JWT; branch-scoped roles must match token.
export function resolveSyncPushBranchId(req, bodyBranchId) {
  const branchId = bodyBranchId || req.user?.branchId || null
  if (!branchId) {
    throw httpError(422, 'branchId is required')
  }

  assertBranchLockedSyncAccess(req, branchId)
  return branchId
}

// GET /api/sync/events — tenant admin sees all; others only their branch.
export function resolveSyncEventsBranchFilter(req, queryBranchId) {
  if (isTenantWideAdmin(req.user?.role)) {
    return queryBranchId || null
  }

  const tokenBranchId = req.user?.branchId || null
  if (!tokenBranchId) {
    throw httpError(403, 'This account is not assigned to a branch')
  }
  if (queryBranchId && queryBranchId !== tokenBranchId) {
    throw httpError(403, 'Branch access denied')
  }
  return tokenBranchId
}
