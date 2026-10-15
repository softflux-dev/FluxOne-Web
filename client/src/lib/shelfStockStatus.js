import { DEFAULT_REORDER_POINT } from '@/lib/mapProduct'

/**
 * Branch Manager shelf badges: Empty / Limited / In Stock.
 * Separate from IM catalog labels (Out of Stock / Low Stock).
 */
export function getShelfStockStatus(quantity, reorderPoint = DEFAULT_REORDER_POINT) {
  const qty = Number(quantity ?? 0)
  const point = Number(
    reorderPoint == null || reorderPoint === '' ? DEFAULT_REORDER_POINT : reorderPoint,
  )

  if (qty <= 0) {
    return {
      key: 'empty',
      label: 'Empty',
      variant: 'destructive',
      className: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-none px-2.5 py-0.5',
    }
  }
  if (qty <= point) {
    return {
      key: 'limited',
      label: 'Limited',
      variant: 'warning',
      className: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-2.5 py-0.5',
    }
  }
  return {
    key: 'in',
    label: 'In Stock',
    variant: 'success',
    className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-0.5',
  }
}

export function formatShelfQuantity(quantity, scale = 'pcs') {
  const qty = Number(quantity ?? 0)
  const unit = !scale || scale === 'unit' ? 'units' : scale
  return { qty, unit, display: `${qty.toLocaleString()} ${unit}` }
}

/** Suggested replenishment qty (gap to reorder point, min 1). */
export function suggestRestockQty(quantity, reorderPoint) {
  const current = Math.max(0, Math.floor(Number(quantity) || 0))
  const reorder = Math.max(0, Math.ceil(Number(reorderPoint) || 0))
  return Math.max(1, reorder > current ? reorder - current : 1)
}
