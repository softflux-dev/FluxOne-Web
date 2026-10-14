import {
  assertCategoryInBranch,
  createOffer,
  listOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
} from './discounts.model.js'
import { resolveListBranchId, resolveScopedBranchId } from '../staff/staff.access.js'
import { success, fail, failFromError } from '../../../utils/response.util.js'

// BM locked to JWT branch — never list/mutate another branch's offers
function requireBranchId(req) {
  try {
    return resolveListBranchId(req, null)
  } catch (err) {
    err.status = err.status || 403
    throw err
  }
}

export async function getDiscounts(req, res) {
  try {
    const branchId = requireBranchId(req)
    const categoryId = req.validated.query.categoryId || undefined
    const q = req.validated.query.q || undefined
    const rows = await listOffers(req.tenantId, { branchId, categoryId, q })
    return success(res, rows)
  } catch (err) {
    return failFromError(res, err, 'Failed to list discounts')
  }
}

export async function addDiscount(req, res) {
  const { name, percent, categoryId } = req.validated.body

  try {
    const branchId = resolveScopedBranchId(req, null)
    if (!branchId) {
      return fail(res, 'Discounts must be created for a specific branch', 400)
    }
    await assertCategoryInBranch(req.tenantId, categoryId, branchId)
    const row = await createOffer(req.tenantId, { name, percent, categoryId, branchId })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create discount')
  }
}

export async function editDiscount(req, res) {
  const { id } = req.validated.params
  const { name, percent, categoryId } = req.validated.body

  try {
    const branchId = resolveScopedBranchId(req, null)
    if (!branchId) {
      return fail(res, 'Discounts must be updated for a specific branch', 400)
    }
    await assertCategoryInBranch(req.tenantId, categoryId, branchId)

    // Cross-branch id → not found (no leak)
    const existing = await getOfferById(req.tenantId, id, { branchId })
    if (!existing) {
      return fail(res, 'Discount not found', 404)
    }

    const row = await updateOffer(
      req.tenantId,
      id,
      { name, percent, categoryId },
      { branchId },
    )
    if (!row) {
      return fail(res, 'Discount not found', 404)
    }
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to update discount')
  }
}

export async function removeDiscount(req, res) {
  const { id } = req.validated.params
  try {
    const branchId = resolveScopedBranchId(req, null)
    if (!branchId) {
      return fail(res, 'Discounts must be deleted for a specific branch', 400)
    }
    const ok = await deleteOffer(req.tenantId, id, { branchId })
    if (!ok) {
      return fail(res, 'Discount not found', 404)
    }
    return success(res, { message: 'Discount deleted successfully' })
  } catch (err) {
    return failFromError(res, err, 'Failed to delete discount')
  }
}
