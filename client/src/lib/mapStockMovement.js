import { formatDateTimeInline } from '@/lib/formatDateTime'

export const MOVEMENT_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  DAMAGED: 'damaged',
  EXPIRED: 'expired',
  TRANSFER: 'transfer',
  OTHER: 'other',
}

export const DAMAGED_LOCATIONS = [
  { value: 'traveling', label: 'Traveling' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'item_transfer', label: 'Item transfer' },
  { value: 'other', label: 'Other' },
]

// Map inventory_ledger list rows from Control API into UI shape.
export function mapStockMovement(row = {}) {
  const movementCandidates = [
    row.movementType,
    row.movement_type,
    // Legacy mock rows used `type` for movement kind
    ['in', 'out', 'adjustment', 'damaged', 'expired', 'transfer', 'other'].includes(row.type)
      ? row.type
      : null,
  ]
  const productType =
    row.productType ||
    row.product_type ||
    (['single', 'bundle', 'variant'].includes(row.type) ? row.type : null) ||
    'single'

  const reason = row.reason || ''

  return {
    id: row.id,
    productId: row.productId ?? row.product_id ?? null,
    parentId: row.parentId ?? row.parent_id ?? null,
    movementType: movementCandidates.find(Boolean) || '',
    quantity: Number(row.quantity ?? 0),
    scale: row.scale || 'unit',
    variantLabel: row.variantLabel || row.variant_label || '',
    reason,
    notes: row.notes || reason,
    createdAt: row.createdAt ?? row.created_at ?? null,
    expiresAt: row.expiresAt ?? row.expires_at ?? null,
    productName: row.productName || row.product_name || row.itemName || '',
    imageUrl: row.imageUrl || row.image_url || null,
    type: productType,
    itemCode: row.itemCode || row.item_code || '',
    barcode: row.barcode || '',
    categoryName: row.categoryName || row.category_name || '',
    subcategoryName: row.subcategoryName || row.subcategory_name || '',
    companyName: row.companyName || row.company_name || '',
    supplierId: row.supplierId ?? row.supplier_id ?? null,
    purchaseOrderId: row.purchaseOrderId ?? row.purchase_order_id ?? null,
    damagedByUserId: row.damagedByUserId ?? row.damaged_by_user_id ?? null,
    damagedByName: row.damagedByName || row.damaged_by_name || '',
    damagedLocation: row.damagedLocation || row.damaged_location || '',
    unitCost: row.unitCost != null ? Number(row.unitCost) : null,
    controlSource: row.controlSource || row.control_source || null,
  }
}

export function formatMovementDateTime(value) {
  // Delegate to system-wide 12h AM/PM formatter
  return formatDateTimeInline(value)
}

export function shortId(id) {
  // Deprecated: prefer displayMovementRef / formatDisplayId helpers.
  if (!id) return '—'
  const s = String(id)
  return s.length > 8 ? `${s.slice(0, 8)}…` : s
}
