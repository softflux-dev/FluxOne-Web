import {
  approvePurchaseOrder,
  buildPurchaseOrderPrint,
  cancelPurchaseOrder,
  completePurchaseOrderReceival,
  generatePurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  priceHistory,
  recordPurchaseOrderReceival,
  rejectPurchaseOrder,
  sendPurchaseOrderSms,
  updatePendingPurchaseOrder,
} from './purchase_order.model.js'
import { resolveInventoryCreateScope, resolveInventoryScope } from '../shared.access.js'
import { fail, failFromError, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'
import {
  notifyBranchManagersOfItemsReceived,
  notifyBranchManagersOfOrderRequest,
  notifyInventoryManagerOfOrderApproved,
  notifyInventoryManagerOfOrderRejected,
} from '../../notifications/notifications.service.js'

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

    // Notify BM — Demand Requests (TL §7.2)
    try {
      await notifyBranchManagersOfOrderRequest(tenantId, order, {
        inventoryManagerName: order.createdByName || 'Inventory Manager',
        itemCount: order.itemsNumber,
        companyCount: order.companiesNumber,
      })
    } catch (notifyErr) {
      console.error('Order submit notification failed:', notifyErr.message)
    }

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

// BM edit while Pending
export async function updatePending(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const order = await updatePendingPurchaseOrder(
      tenantId,
      req.validated.params.id,
      req.validated.body,
      { branchId, actorId: req.user.id },
    )
    if (!order) return fail(res, 'Purchase order not found', 404)
    return success(res, order)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function cancel(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const order = await cancelPurchaseOrder(tenantId, req.validated.params.id, {
      branchId,
      actorId: req.user.id,
    })
    if (!order) return fail(res, 'Purchase order not found', 404)
    return success(res, order)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function approve(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const order = await approvePurchaseOrder(tenantId, req.validated.params.id, req.user.id, {
      branchId,
    })
    if (!order) return fail(res, 'Purchase order not found', 404)

    try {
      await notifyInventoryManagerOfOrderApproved(tenantId, order, {
        branchManagerName: order.approvedByName || 'Branch Manager',
      })
    } catch (notifyErr) {
      console.error('Order approve notification failed:', notifyErr.message)
    }

    return success(res, order)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function reject(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const notes = req.validated.body.rejectionNotes || req.validated.body.notes || null
    const order = await rejectPurchaseOrder(tenantId, req.validated.params.id, req.user.id, {
      branchId,
      rejectionNotes: notes,
    })
    if (!order) return fail(res, 'Purchase order not found', 404)

    try {
      await notifyInventoryManagerOfOrderRejected(tenantId, order, {
        branchManagerName: order.rejectedByName || 'Branch Manager',
        rejectionNotes: notes,
      })
    } catch (notifyErr) {
      console.error('Order reject notification failed:', notifyErr.message)
    }

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

// IM — Record Receival (multi-round stock-in linked to Order ID)
export async function recordReceival(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const data = await recordPurchaseOrderReceival(
      tenantId,
      req.validated.params.id,
      req.validated.body,
      { branchId, actorId: req.user.id },
    )

    try {
      const order = data.order || data
      await notifyBranchManagersOfItemsReceived(tenantId, order, {
        inventoryManagerName: req.user?.name || req.user?.fullName || 'Inventory Manager',
        lineCount: data.lineCount,
        totalUnits: data.totalUnits,
        completed: false,
      })
    } catch (notifyErr) {
      console.error('Order receival notification failed:', notifyErr.message)
    }

    return success(res, data, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

// IM — Mark Complete after ≥1 receival round
export async function completeReceival(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const order = await completePurchaseOrderReceival(tenantId, req.validated.params.id, {
      branchId,
      actorId: req.user.id,
    })
    if (!order) return fail(res, 'Purchase order not found', 404)

    try {
      await notifyBranchManagersOfItemsReceived(tenantId, order, {
        inventoryManagerName: req.user?.name || req.user?.fullName || 'Inventory Manager',
        completed: true,
      })
    } catch (notifyErr) {
      console.error('Order complete notification failed:', notifyErr.message)
    }

    return success(res, order)
  } catch (err) {
    return failFromError(res, err)
  }
}
