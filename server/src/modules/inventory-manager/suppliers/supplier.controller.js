import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  setSupplierActive,
  updateSupplier,
} from './supplier.model.js'
import { resolveInventoryCreateScope, resolveInventoryScope } from '../shared.access.js'
import { fail, failFromError, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'
import { resolveUploadUrl } from '../../../utils/uploadUrl.util.js'

function fileUrl(file, req) {
  return resolveUploadUrl(file, req)
}

function filesFromRequest(req) {
  return {
    imageUrl: fileUrl(req.files?.image?.[0] || req.file, req),
    signatureUrl: fileUrl(req.files?.signature?.[0], req),
  }
}


export async function list(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const result = await listSuppliers(tenantId, { ...req.validated.query, branchId })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function create(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryCreateScope(req)
    const row = await createSupplier(tenantId, {
      ...req.validated.body,
      ...filesFromRequest(req),
      branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function update(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await updateSupplier(
      tenantId,
      req.validated.params.id,
      {
        ...req.validated.body,
        ...filesFromRequest(req),
      },
      { branchId },
    )
    if (!row) return fail(res, 'Supplier not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function setActive(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await setSupplierActive(
      tenantId,
      req.validated.params.id,
      req.validated.body.isActive,
      { branchId },
    )
    if (!row) return fail(res, 'Supplier not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err)
  }
}

// Soft-deactivate (Active → Inactive). Keeps purchase order history intact.
export async function remove(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const deactivated = await deleteSupplier(tenantId, req.validated.params.id, { branchId })
    if (!deactivated) return fail(res, 'Supplier not found', 404)
    return success(res, { id: req.validated.params.id, isActive: false, deactivated: true })
  } catch (err) {
    return failFromError(res, err)
  }
}
