import {
  createVariantType,
  deleteVariantType,
  getVariantTypeById,
  listVariantTypes,
  updateVariantType,
} from './variant_types.model.js'
import {
  createVariantValue,
  deleteVariantValue,
  getVariantValueById,
  listVariantValues,
  updateVariantValue,
} from './variant_values.model.js'
import { fail, failFromError, success } from '../../../utils/response.util.js'
import { isTenantWideAdmin, resolveTenantBranchScope } from '../../../utils/branchScope.util.js'

function validatedBody(req) {
  return req.validated?.body || req.body || {}
}

function validatedQuery(req) {
  return req.validated?.query || req.query || {}
}

function validatedParams(req) {
  return req.validated?.params || req.params || {}
}

// Same pattern as hardware — admin may pass branchId; others forced to JWT branch
function resolveBranchId(req, explicit) {
  if (isTenantWideAdmin(req.user?.role)) {
    return explicit || req.user?.branchId || null
  }
  return resolveTenantBranchScope(req).branchId
}

function requireBranchId(req, explicit) {
  const branchId = resolveBranchId(req, explicit)
  if (!branchId) {
    const err = new Error('branchId is required')
    err.status = 400
    throw err
  }
  return branchId
}

// ─── Variant Types ─────────────────────────────────────────────────────────

export async function variantTypesList(req, res) {
  try {
    const { q, active, includeValues, branchId: queryBranchId } = validatedQuery(req)
    const branchId = resolveBranchId(req, queryBranchId)
    if (!isTenantWideAdmin(req.user?.role) && !branchId) {
      return fail(res, 'Branch context is required', 400)
    }
    const rows = await listVariantTypes(req.tenantId, {
      q,
      active,
      includeValues,
      branchId,
    })
    return success(res, rows)
  } catch (err) {
    return failFromError(res, err, 'Failed to list variant types')
  }
}

export async function variantTypesGet(req, res) {
  try {
    const { id } = validatedParams(req)
    const branchId = resolveBranchId(req, validatedQuery(req).branchId)
    const row = await getVariantTypeById(req.tenantId, id, { branchId })
    if (!row) return fail(res, 'Variant type not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to get variant type')
  }
}

export async function variantTypesCreate(req, res) {
  try {
    const body = validatedBody(req)
    const branchId = requireBranchId(req, body.branchId)
    const row = await createVariantType(req.tenantId, { ...body, branchId })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create variant type')
  }
}

export async function variantTypesUpdate(req, res) {
  try {
    const { id } = validatedParams(req)
    const body = validatedBody(req)
    const branchId = resolveBranchId(req, body.branchId)
    const row = await updateVariantType(req.tenantId, id, body, { branchId })
    if (!row) return fail(res, 'Variant type not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to update variant type')
  }
}

export async function variantTypesRemove(req, res) {
  try {
    const { id } = validatedParams(req)
    const branchId = resolveBranchId(req, validatedQuery(req).branchId)
    const row = await deleteVariantType(req.tenantId, id, { branchId })
    if (!row) return fail(res, 'Variant type not found', 404)

    const message =
      row.deletedValuesCount > 0
        ? `Variant type deleted. ${row.deletedValuesCount} associated value(s) also removed.`
        : 'Variant type deleted successfully'

    return success(res, {
      message,
      id: row.id,
      deletedValuesCount: row.deletedValuesCount,
    })
  } catch (err) {
    return failFromError(res, err, 'Failed to delete variant type')
  }
}

// ─── Variant Values ────────────────────────────────────────────────────────

export async function variantValuesList(req, res) {
  try {
    const { q, variantTypeId, active, branchId: queryBranchId } = validatedQuery(req)
    const branchId = resolveBranchId(req, queryBranchId)
    if (!isTenantWideAdmin(req.user?.role) && !branchId) {
      return fail(res, 'Branch context is required', 400)
    }
    const rows = await listVariantValues(req.tenantId, {
      q,
      variantTypeId,
      active,
      branchId,
    })
    return success(res, rows)
  } catch (err) {
    return failFromError(res, err, 'Failed to list variant values')
  }
}

export async function variantValuesGet(req, res) {
  try {
    const { id } = validatedParams(req)
    const branchId = resolveBranchId(req, validatedQuery(req).branchId)
    const row = await getVariantValueById(req.tenantId, id, { branchId })
    if (!row) return fail(res, 'Variant value not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to get variant value')
  }
}

export async function variantValuesCreate(req, res) {
  try {
    const body = validatedBody(req)
    const branchId = requireBranchId(req, body.branchId)
    const row = await createVariantValue(req.tenantId, { ...body, branchId })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create variant value')
  }
}

export async function variantValuesUpdate(req, res) {
  try {
    const { id } = validatedParams(req)
    const body = validatedBody(req)
    const branchId = resolveBranchId(req, body.branchId)
    const row = await updateVariantValue(req.tenantId, id, body, { branchId })
    if (!row) return fail(res, 'Variant value not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to update variant value')
  }
}

export async function variantValuesRemove(req, res) {
  try {
    const { id } = validatedParams(req)
    const branchId = resolveBranchId(req, validatedQuery(req).branchId)
    const row = await deleteVariantValue(req.tenantId, id, { branchId })
    if (!row) return fail(res, 'Variant value not found', 404)
    return success(res, {
      message: 'Variant value deleted successfully',
      id: row.id,
    })
  } catch (err) {
    return failFromError(res, err, 'Failed to delete variant value')
  }
}
