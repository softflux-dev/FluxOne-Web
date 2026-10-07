import {
  createPolicy,
  deletePolicy,
  getPolicyById,
  listPolicies,
  updatePolicy,
} from './policies.model.js'
import { fail, success, failFromError } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'

export async function policiesList(req, res) {
  const result = await listPolicies(req.tenantId, req.validated.query)
  return success(res, paginatedResult(result.items, result))
}

export async function policyDetail(req, res) {
  const row = await getPolicyById(req.tenantId, req.validated.params.id)
  if (!row) return fail(res, 'Policy not found', 404)
  return success(res, row)
}

export async function createPolicyHandler(req, res) {
  try {
    const row = await createPolicy(req.tenantId, req.validated.body)
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function patchPolicy(req, res) {
  try {
    const row = await updatePolicy(req.tenantId, req.validated.params.id, req.validated.body)
    if (!row) return fail(res, 'Policy not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function removePolicy(req, res) {
  try {
    const result = await deletePolicy(req.tenantId, req.validated.params.id)
    return success(res, result)
  } catch (err) {
    return failFromError(res, err)
  }
}
