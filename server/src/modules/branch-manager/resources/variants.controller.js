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


function validatedBody(req) {
  return req.validated?.body || req.body || {}
}

function validatedQuery(req) {
  return req.validated?.query || req.query || {}
}

function validatedParams(req) {
  return req.validated?.params || req.params || {}
}

// ─── Variant Types ─────────────────────────────────────────────────────────

export async function variantTypesList(req, res) {
  try {
    const { q, active, includeValues } = validatedQuery(req)
    const rows = await listVariantTypes(req.tenantId, { q, active, includeValues })
    return success(res, rows)
  } catch (err) {
    return failFromError(res, err, 'Failed to list variant types')
  }
}

export async function variantTypesGet(req, res) {
  try {
    const { id } = validatedParams(req)
    const row = await getVariantTypeById(req.tenantId, id)
    if (!row) return fail(res, 'Variant type not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to get variant type')
  }
}

export async function variantTypesCreate(req, res) {
  try {
    const body = validatedBody(req)
    const row = await createVariantType(req.tenantId, body)
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create variant type')
  }
}

export async function variantTypesUpdate(req, res) {
  try {
    const { id } = validatedParams(req)
    const body = validatedBody(req)
    const row = await updateVariantType(req.tenantId, id, body)
    if (!row) return fail(res, 'Variant type not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to update variant type')
  }
}

export async function variantTypesRemove(req, res) {
  try {
    const { id } = validatedParams(req)
    const row = await deleteVariantType(req.tenantId, id)
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
    const { q, variantTypeId, active } = validatedQuery(req)
    const rows = await listVariantValues(req.tenantId, { q, variantTypeId, active })
    return success(res, rows)
  } catch (err) {
    return failFromError(res, err, 'Failed to list variant values')
  }
}

export async function variantValuesGet(req, res) {
  try {
    const { id } = validatedParams(req)
    const row = await getVariantValueById(req.tenantId, id)
    if (!row) return fail(res, 'Variant value not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to get variant value')
  }
}

export async function variantValuesCreate(req, res) {
  try {
    const body = validatedBody(req)
    const row = await createVariantValue(req.tenantId, body)
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create variant value')
  }
}

export async function variantValuesUpdate(req, res) {
  try {
    const { id } = validatedParams(req)
    const body = validatedBody(req)
    const row = await updateVariantValue(req.tenantId, id, body)
    if (!row) return fail(res, 'Variant value not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err, 'Failed to update variant value')
  }
}

export async function variantValuesRemove(req, res) {
  try {
    const { id } = validatedParams(req)
    const row = await deleteVariantValue(req.tenantId, id)
    if (!row) return fail(res, 'Variant value not found', 404)
    return success(res, {
      message: 'Variant value deleted successfully',
      id: row.id,
    })
  } catch (err) {
    return failFromError(res, err, 'Failed to delete variant value')
  }
}
