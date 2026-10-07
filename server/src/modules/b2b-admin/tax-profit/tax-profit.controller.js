import {
  bulkSetProfitPercent,
  bulkSetTaxPercent,
  getTaxProfitMeta,
  listTaxProfitProducts,
  updateTaxProfitDefaults,
} from './tax-profit.model.js'
import { success, failFromError } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'

export async function taxProfitProductsList(req, res) {
  const result = await listTaxProfitProducts(req.tenantId, req.validated.query)
  return success(res, paginatedResult(result.items, result))
}

export async function taxProfitMeta(req, res) {
  const meta = await getTaxProfitMeta(req.tenantId)
  return success(res, meta)
}

export async function updateDefaultsHandler(req, res) {
  try {
    const result = await updateTaxProfitDefaults(req.tenantId, req.validated.body)
    return success(res, result)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function bulkProfitHandler(req, res) {
  try {
    const { productIds, profitPercent } = req.validated.body
    const result = await bulkSetProfitPercent(req.tenantId, productIds, profitPercent)
    return success(res, result)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function bulkTaxHandler(req, res) {
  try {
    const { productIds, taxPercent } = req.validated.body
    const result = await bulkSetTaxPercent(req.tenantId, productIds, taxPercent)
    return success(res, result)
  } catch (err) {
    return failFromError(res, err)
  }
}

