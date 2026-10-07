import {
  approvePurchaseOrder,
  buildPurchaseOrderPrint,
  cancelPurchaseOrder,
  generatePurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  priceHistory,
  sendPurchaseOrderSms,
} from './purchase_order.model.js'
import { resolveInventoryCreateScope, resolveInventoryScope } from '../shared.access.js'
import { fail, failFromError, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'


export async function list(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const result = await listPurchaseOrders(tenantId, { ...req.validated.query, branchId })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function generate(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryCreateScope(req)
    const order = await generatePurchaseOrder(tenantId, {
      ...req.validated.body,
      branchId,
      createdBy: req.user.id,
    })

    let sms = null
    if (req.validated.body.sendSms) {
      try {
        sms = await sendPurchaseOrderSms(tenantId, order.id, { branchId })
      } catch (err) {
        sms = { sent: false, error: err.message || 'Failed to send SMS' }
      }
    }

    return success(res, { ...order, sms }, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function detail(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const order = await getPurchaseOrderById(tenantId, req.validated.params.id, { branchId })
    if (!order) return fail(res, 'Purchase order not found', 404)
    return success(res, order)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function history(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const data = await priceHistory(tenantId, req.validated.params.id, { branchId })
    if (!data) return fail(res, 'Purchase order not found', 404)
    return success(res, data)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function cancel(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const order = await cancelPurchaseOrder(tenantId, req.validated.params.id, { branchId })
    if (!order) return fail(res, 'Purchase order not found', 404)
    return success(res, order)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function approve(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const order = await approvePurchaseOrder(tenantId, req.validated.params.id, req.user.id, { branchId })
    if (!order) return fail(res, 'Purchase order not found', 404)
    return success(res, order)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function print(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const data = await buildPurchaseOrderPrint(tenantId, req.validated.params.id, { branchId })
    if (!data) return fail(res, 'Purchase order not found', 404)

    if (req.query.format === 'json') {
      return success(res, data)
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.send(data.html)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function sendSmsToSupplier(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const result = await sendPurchaseOrderSms(tenantId, req.validated.params.id, { branchId })
    if (!result) return fail(res, 'Purchase order not found', 404)
    return success(res, result)
  } catch (err) {
    return failFromError(res, err)
  }
}
