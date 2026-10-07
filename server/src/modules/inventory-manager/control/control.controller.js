import {
  clearThreshold,
  createStockTransfer,
  deleteLedgerEvent,
  exportLedgerRows,
  getControlSummary,
  getPriceUtilizationRule,
  importControlMovements,
  insertLedgerEvent,
  insertLedgerLines,
  listControlAlerts,
  listDailyPricePending,
  listLedger,
  listThresholds,
  listTransfers,
  processDueExpirations,
  setPriceUtilizationRule,
  updateDailyPrice,
  updateLedgerEvent,
  upsertThreshold,
} from './control.model.js'
import { receivePurchaseOrder } from '../purchase-orders/purchase_order.model.js'
import {
  resolveInventoryBranchId,
  resolveInventoryScope,
} from '../shared.access.js'
import { MOVEMENT_TYPES } from '../../../config/constants.js'
import { fail, failFromError, success } from '../../../utils/response.util.js'
import { paginatedResult } from '../../../utils/pagination.util.js'


function listByType(movementType) {
  return async (req, res) => {
    try {
      const { tenantId, branchId } = resolveInventoryScope(req)
      const result = await listLedger(tenantId, { ...req.validated.query, movementType, branchId })
      return success(res, paginatedResult(result.items, result))
    } catch (err) {
      return failFromError(res, err)
    }
  }
}

function updateByType(movementType) {
  return async (req, res) => {
    try {
      const { tenantId, branchId } = resolveInventoryScope(req)
      const row = await updateLedgerEvent(
        tenantId,
        req.validated.params.id,
        req.validated.body,
        movementType,
        { branchId },
      )
      if (!row) return fail(res, 'Record not found', 404)
      return success(res, row)
    } catch (err) {
      return failFromError(res, err)
    }
  }
}

// Adjustment and damaged deletes drop the log only. Stock stays until a new adjustment.
const HISTORY_ONLY_DELETE = new Set([MOVEMENT_TYPES.ADJUSTMENT, MOVEMENT_TYPES.DAMAGED])

function removeByType(movementType) {
  return async (req, res) => {
    try {
      const { tenantId, branchId } = resolveInventoryScope(req)
      const deleted = await deleteLedgerEvent(tenantId, req.validated.params.id, movementType, {
        branchId,
        reverseOnHand: !HISTORY_ONLY_DELETE.has(movementType),
      })
      if (!deleted) return fail(res, 'Record not found', 404)
      return success(res, { deleted: true })
    } catch (err) {
      return failFromError(res, err)
    }
  }
}

// Control summary KPIs + tab counts (Phase 2 chrome).
export async function getSummary(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const data = await getControlSummary(tenantId, {
      ...req.validated.query,
      branchId,
    })
    return success(res, data)
  } catch (err) {
    return failFromError(res, err)
  }
}

export const listStockIn = listByType(MOVEMENT_TYPES.IN)
export const listStockOut = listByType(MOVEMENT_TYPES.OUT)
export const listAdjustments = listByType(MOVEMENT_TYPES.ADJUSTMENT)

// Unified adjustment tab — adjustment + damaged + expired + other ledger rows.
export async function listAdjustmentLedger(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const { ledgerKind, ...query } = req.validated.query
    const movementTypes = ledgerKind
      ? [ledgerKind]
      : [
          MOVEMENT_TYPES.ADJUSTMENT,
          MOVEMENT_TYPES.DAMAGED,
          MOVEMENT_TYPES.EXPIRED,
          MOVEMENT_TYPES.OTHER,
        ]
    const result = await listLedger(tenantId, {
      ...query,
      movementTypes,
      branchId,
    })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return failFromError(res, err)
  }
}

export const listDamaged = listByType(MOVEMENT_TYPES.DAMAGED)
export const listOthers = listByType(MOVEMENT_TYPES.OTHER)

// Process past-due stock-in lots, then list expired history.
export async function listExpired(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    try {
      await processDueExpirations(tenantId, req.user?.id || null, { branchId })
    } catch (err) {
      console.error('[listExpired] processDueExpirations', err.message)
    }
    const result = await listLedger(tenantId, {
      ...req.validated.query,
      movementType: MOVEMENT_TYPES.EXPIRED,
      branchId,
    })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function listStockTransfers(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const result = await listTransfers(tenantId, { ...req.validated.query, branchId })
    return success(res, paginatedResult(result.items, result))
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function createStockIn(req, res) {
  try {
    const { tenantId } = resolveInventoryScope(req)
    const { supplierId, branchId: bodyBranchId, lines } = req.validated.body
    // Branch scope: IM forces JWT branch; B2B may pass body branchId
    const branchId = resolveInventoryBranchId(req, bodyBranchId)
    const saved = await insertLedgerLines(
      tenantId,
      lines.map((line) => ({
        ...line,
        movementType: MOVEMENT_TYPES.IN,
        supplierId,
        branchId,
        scopeBranchId: branchId,
        createdBy: req.user.id,
      })),
    )
    return success(res, saved, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function stockInFromOrder(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const data = await receivePurchaseOrder(
      tenantId,
      req.validated.body.purchaseOrderId,
      req.user.id,
      { branchId },
    )
    return success(res, data, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function createAdjustment(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await insertLedgerEvent(tenantId, {
      ...req.validated.body,
      movementType: MOVEMENT_TYPES.ADJUSTMENT,
      createdBy: req.user.id,
      scopeBranchId: branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function createDamaged(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await insertLedgerEvent(tenantId, {
      ...req.validated.body,
      movementType: MOVEMENT_TYPES.DAMAGED,
      createdBy: req.user.id,
      scopeBranchId: branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function createOther(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await insertLedgerEvent(tenantId, {
      ...req.validated.body,
      movementType: MOVEMENT_TYPES.OTHER,
      createdBy: req.user.id,
      scopeBranchId: branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function createStockOut(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await insertLedgerEvent(tenantId, {
      ...req.validated.body,
      movementType: MOVEMENT_TYPES.OUT,
      createdBy: req.user.id,
      scopeBranchId: branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function createExpired(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await insertLedgerEvent(tenantId, {
      ...req.validated.body,
      movementType: MOVEMENT_TYPES.EXPIRED,
      createdBy: req.user.id,
      scopeBranchId: branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function createTransfer(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    // Branch scope: IM must transfer from JWT branch
    const fromBranchId = resolveInventoryBranchId(req, req.validated.body.fromBranchId)
    const row = await createStockTransfer(tenantId, {
      ...req.validated.body,
      fromBranchId,
      createdBy: req.user.id,
      scopeBranchId: branchId,
    })
    return success(res, row, 201)
  } catch (err) {
    return failFromError(res, err)
  }
}

export const updateAdjustment = updateByType(MOVEMENT_TYPES.ADJUSTMENT)
export const updateDamaged = updateByType(MOVEMENT_TYPES.DAMAGED)
export const updateExpired = updateByType(MOVEMENT_TYPES.EXPIRED)
export const updateOther = updateByType(MOVEMENT_TYPES.OTHER)

export const removeAdjustment = removeByType(MOVEMENT_TYPES.ADJUSTMENT)
export const removeDamaged = removeByType(MOVEMENT_TYPES.DAMAGED)
export const removeExpired = removeByType(MOVEMENT_TYPES.EXPIRED)
export const removeOther = removeByType(MOVEMENT_TYPES.OTHER)

// Phase 5 — export / import / price utilization rule
export async function exportControl(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const query = req.validated.query || {}
    const movementType = query.movementType
    const { ledgerKind, ...rest } = query

    // Adjustment tab export = same scope as adjustment-ledger list.
    let filters
    if (movementType === MOVEMENT_TYPES.ADJUSTMENT) {
      const movementTypes = ledgerKind
        ? [ledgerKind]
        : [
            MOVEMENT_TYPES.ADJUSTMENT,
            MOVEMENT_TYPES.DAMAGED,
            MOVEMENT_TYPES.EXPIRED,
            MOVEMENT_TYPES.OTHER,
          ]
      filters = {
        ...rest,
        branchId,
        movementTypes,
      }
      delete filters.movementType
    } else {
      filters = {
        ...rest,
        branchId,
        movementType,
      }
    }

    const rows = await exportLedgerRows(tenantId, filters)
    return success(res, { rows, exported: rows.length, movementType })
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function importControl(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const data = await importControlMovements(tenantId, {
      movementType: req.validated.body.movementType,
      rows: req.validated.body.rows,
      createdBy: req.user.id,
      branchId,
    })
    return success(res, data)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function getBranchStockPriceRule(req, res) {
  try {
    const data = await getPriceUtilizationRule(req.tenantId)
    return success(res, {
      priceRequiresStockUtilized: data.priceRequiresStockUtilized,
      updateAllStock: !data.priceRequiresStockUtilized,
    })
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function patchBranchStockPriceRule(req, res) {
  try {
    const keepOld = !req.validated.body.updateAllStock
    const data = await setPriceUtilizationRule(req.tenantId, keepOld)
    return success(res, {
      priceRequiresStockUtilized: data.priceRequiresStockUtilized,
      updateAllStock: !data.priceRequiresStockUtilized,
    })
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function getPriceRule(req, res) {
  try {
    const { tenantId } = resolveInventoryScope(req)
    const data = await getPriceUtilizationRule(tenantId)
    return success(res, data)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function patchPriceRule(req, res) {
  try {
    const { tenantId } = resolveInventoryScope(req)
    const data = await setPriceUtilizationRule(
      tenantId,
      req.validated.body.priceRequiresStockUtilized,
    )
    return success(res, data)
  } catch (err) {
    return failFromError(res, err)
  }
}

// Phase 4 — daily prices / thresholds / alerts
export async function listDailyPrices(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const items = await listDailyPricePending(tenantId, { branchId })
    return success(res, { items, count: items.length })
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function patchDailyPrice(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await updateDailyPrice(tenantId, req.validated.params.id, {
      ...req.validated.body,
      branchId,
    })
    if (!row) return fail(res, 'Product not found or daily price change is off', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function getThresholds(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const items = await listThresholds(tenantId, {
      branchId,
      q: req.validated.query?.q,
    })
    return success(res, { items, count: items.length })
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function saveThreshold(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const { productId, reorderPoint } = req.validated.body
    const row = await upsertThreshold(tenantId, productId, reorderPoint, { branchId })
    if (!row) return fail(res, 'Product not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function deleteThreshold(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const row = await clearThreshold(tenantId, req.validated.params.id, { branchId })
    if (!row) return fail(res, 'Product not found', 404)
    return success(res, row)
  } catch (err) {
    return failFromError(res, err)
  }
}

export async function getAlerts(req, res) {
  try {
    const { tenantId, branchId } = resolveInventoryScope(req)
    const items = await listControlAlerts(tenantId, { branchId })
    return success(res, { items, count: items.length })
  } catch (err) {
    return failFromError(res, err)
  }
}
