export const PRODUCT_TYPES = {
  SINGLE: 'single',
  BUNDLE: 'bundle',
  VARIANT: 'variant',
}

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  // @deprecated
  OPEN: 'active',
  // @deprecated
  CLOSE: 'inactive',
}

export const SCALE_OPTIONS = ['unit', 'kg', 'g', 'liter', 'ml', 'pack', 'box', 'dozen']

// Matches products.reorder_point DEFAULT 10 in schema.
export const DEFAULT_REORDER_POINT = 10

// Dynamic inventory stock indicator from live qty + product reorder point.
export function getInventoryStockStatus(quantity, reorderPoint = DEFAULT_REORDER_POINT) {
  const qty = Number(quantity ?? 0)
  const point = Number(
    reorderPoint == null || reorderPoint === '' ? DEFAULT_REORDER_POINT : reorderPoint,
  )

  if (qty <= 0) {
    return {
      quantity: qty,
      key: 'out',
      label: 'Out of Stock',
      className: 'text-rose-700',
    }
  }
  if (qty <= point) {
    return {
      quantity: qty,
      key: 'low',
      label: 'Low Stock',
      className: 'text-amber-700',
    }
  }
  return {
    quantity: qty,
    key: 'in',
    label: 'In Stock',
    className: 'text-emerald-700',
  }
}

// e.g. "125 units — In Stock" / "8 pack — Low Stock"
export function formatInventoryStock(quantity, reorderPoint, scale = 'unit') {
  const status = getInventoryStockStatus(quantity, reorderPoint)
  const unitLabel = !scale || scale === 'unit' ? 'units' : scale
  return {
    ...status,
    display: `${status.quantity} ${unitLabel} — ${status.label}`,
  }
}

// Zod rejects empty strings on optional UUID fields.
// Use undefined so JSON.stringify / apiClient omit them.
export function asOptionalUuid(value) {
  if (value == null || value === '') return undefined
  return String(value)
}

// Drop blanks so taxIds: [""] never hits the API.
export function cleanUuidList(ids) {
  if (!Array.isArray(ids)) return []
  return ids.map((id) => asOptionalUuid(id)).filter(Boolean)
}

export function mapProduct(row = {}) {
  return {
    id: row.id,
    name: row.name || '',
    itemCode: row.itemCode || row.item_code || '',
    barcode: row.barcode || '',
    type: row.type || PRODUCT_TYPES.SINGLE,
    scale: row.scale || 'unit',
    quantity: Number(row.quantity ?? 0),
    reorderPoint: Number(
      row.reorderPoint ?? row.reorder_point ?? DEFAULT_REORDER_POINT,
    ),
    status:
      row.status === PRODUCT_STATUS.INACTIVE || row.status === 'close'
        ? PRODUCT_STATUS.INACTIVE
        : PRODUCT_STATUS.ACTIVE,
    imageUrl: row.imageUrl || row.image_url || null,
    description: row.description || '',
    categoryId: row.categoryId ?? row.category_id ?? null,
    subcategoryId: row.subcategoryId ?? row.subcategory_id ?? null,
    parentId: row.parentId ?? row.parent_id ?? null,
    creationBatchId: row.creationBatchId ?? row.creation_batch_id ?? null,
    variantLabel: row.variantLabel ?? row.variant_label ?? null,
    dailyPriceChange: Boolean(row.dailyPriceChange ?? row.daily_price_change),
    purchasePrice: Number(row.purchasePrice ?? row.purchase_price ?? 0),
    sellingPrice: Number(row.sellingPrice ?? row.selling_price ?? 0),
    discountPercent: Number(row.discountPercent ?? row.discount_percent ?? 0),
    offerId: row.offerId ?? row.offer_id ?? null,
    offerName: row.offerName ?? row.offer_name ?? '',
    offerPercent: Number(row.offerPercent ?? row.offer_percent ?? 0),
    lastPurchasePrice: Number(row.lastPurchasePrice ?? row.last_purchase_price ?? 0),
    lastSellingPrice: Number(row.lastSellingPrice ?? row.last_selling_price ?? 0),
    lastPurchaseVendorName: row.lastPurchaseVendorName ?? row.last_purchase_vendor_name ?? '',
    currentPurchaseVendorName:
      row.currentPurchaseVendorName ?? row.current_purchase_vendor_name ?? '',
    taxPercent: Number(row.taxPercent ?? row.tax_percent ?? 0),
    taxNames: Array.isArray(row.taxNames) ? row.taxNames : row.tax_names || [],
    taxIds: Array.isArray(row.taxIds) ? row.taxIds : row.tax_ids || [],
    finalPrice: Number(row.finalPrice ?? row.final_price ?? row.sellingPrice ?? 0),
    bundleItems: Array.isArray(row.bundleItems)
      ? row.bundleItems
      : Array.isArray(row.bundle_items)
        ? row.bundle_items
        : [],
    variants: Array.isArray(row.variants) ? row.variants : [],
  }
}

export function mapCategory(row = {}) {
  return {
    id: row.id,
    parentId: row.parentId ?? row.parent_id ?? null,
    name: row.name || '',
    imageUrl: row.imageUrl || row.image_url || null,
    isActive: row.isActive ?? row.is_active ?? true,
  }
}

export function isCategoryActive(row) {
  return row?.isActive !== false
}

// Filter dropdowns — active parents/subcategories only (unless page loads inactive on purpose).
export function filterActiveCategories(rows = []) {
  return (rows || []).filter(isCategoryActive)
}

export function splitCategories(rows = []) {
  const list = rows.map(mapCategory)
  const parents = list.filter((row) => !row.parentId)
  const childrenByParent = new Map()
  for (const row of list) {
    if (!row.parentId) continue
    const bucket = childrenByParent.get(row.parentId) || []
    bucket.push(row)
    childrenByParent.set(row.parentId, bucket)
  }
  return { parents, childrenByParent, all: list }
}

export function money(value) {
  if (value === null || value === undefined || value === '') return '—'
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

// For PATCH: preserve explicit null to clear nullable FK columns.
// Empty string / undefined → omit (no change).
export function asNullableUuid(value) {
  if (value === null) return null
  if (value === undefined || value === '') return undefined
  return String(value)
}

// Match a catalog tax row to the tenant default tax %.
export function taxIdsForDefaultRate(taxes = [], defaultTaxPercent = 0) {
  const rate = Number(defaultTaxPercent) || 0
  if (rate <= 0) return []
  const match = (taxes || []).find((tax) => Number(tax.ratePercent ?? tax.rate_percent) === rate)
  return match?.id ? [match.id] : []
}

// Build JSON body or FormData when an image file is present.
export function buildProductPayload(fields, { withConfirmed = true } = {}) {
  // Never send categoryId: "" — Zod uuid() → 422 Invalid uuid
  const categoryId = asOptionalUuid(fields.categoryId)
  const taxIds = cleanUuidList(fields.taxIds)
  // Include taxIds only when the caller set the key (incl. [] = explicit tax-exempt).
  // Omit entirely on create so the server applies tenants.default_tax_percent.
  const hasTaxIdsKey = Object.prototype.hasOwnProperty.call(fields, 'taxIds')
  const base = {
    name: String(fields.name || '').trim(),
    ...(categoryId ? { categoryId } : {}),
    subcategoryId: asOptionalUuid(fields.subcategoryId),
    type: fields.type || PRODUCT_TYPES.SINGLE,
    scale: fields.scale || 'unit',
    description: fields.description?.trim() || undefined,
    purchasePrice: Number(fields.purchasePrice ?? 0),
    sellingPrice: Number(fields.sellingPrice ?? 0),
    ...(hasTaxIdsKey ? { taxIds } : {}),
    // Optional override; omit → server uses tenant default profit %
    ...(fields.profitPercent !== undefined &&
    fields.profitPercent !== null &&
    fields.profitPercent !== ''
      ? { profitPercent: Number(fields.profitPercent) }
      : {}),
    offerId: asOptionalUuid(fields.offerId),
    discountPercent:
      fields.discountPercent === '' || fields.discountPercent == null
        ? undefined
        : Number(fields.discountPercent),
    ...(fields.itemCode || fields.sku
      ? { itemCode: String(fields.itemCode || fields.sku).trim() }
      : {}),
    ...(fields.barcode ? { barcode: String(fields.barcode).trim() } : {}),
    ...(fields.reorderPoint !== undefined && fields.reorderPoint !== ''
      ? { reorderPoint: Number(fields.reorderPoint) }
      : {}),
    ...(fields.dailyPriceChange !== undefined
      ? { dailyPriceChange: Boolean(fields.dailyPriceChange) }
      : {}),
    ...(fields.status ? { status: fields.status } : {}),
    bundleItems: Array.isArray(fields.bundleItems)
      ? fields.bundleItems
          .map((row) => ({
            itemId: asOptionalUuid(row.itemId),
            quantity: Number(row.quantity),
          }))
          .filter((row) => row.itemId)
      : undefined,
    variants: Array.isArray(fields.variants) ? fields.variants : undefined,
    // Finished bundle count / opening stock
    ...(fields.type === PRODUCT_TYPES.BUNDLE ||
    fields.type === PRODUCT_TYPES.VARIANT ||
    fields.quantity != null
      ? {
          quantity:
            fields.quantity === '' || fields.quantity == null
              ? undefined
              : Number(fields.quantity),
        }
      : {}),
  }
  if (withConfirmed) base.confirmed = true

  if (fields.image instanceof File && fields.image.size > 0) {
    const form = new FormData()
    Object.entries(base).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      if (Array.isArray(value)) {
        // Multipart: send JSON string for arrays (server zod may fail — prefer JSON create then PATCH image)
        form.append(key, JSON.stringify(value))
      } else {
        form.append(key, String(value))
      }
    })
    form.append('image', fields.image)
    return form
  }

  return base
}

// PATCH body — always sends category/subcategory keys so null can clear subcategory_id.
export function buildProductUpdatePayload(fields) {
  const categoryId = asOptionalUuid(fields.categoryId)
  const subcategoryRaw = fields.subcategoryId
  const subcategoryId =
    subcategoryRaw === null || subcategoryRaw === undefined || subcategoryRaw === ''
      ? null
      : String(subcategoryRaw)

  const base = {
    name: String(fields.name || '').trim(),
    ...(categoryId ? { categoryId } : {}),
    subcategoryId,
    type: fields.type || PRODUCT_TYPES.SINGLE,
    scale: fields.scale || 'unit',
    description: fields.description?.trim() || undefined,
    purchasePrice: Number(fields.purchasePrice ?? 0),
    sellingPrice: Number(fields.sellingPrice ?? 0),
    taxIds: cleanUuidList(fields.taxIds),
    offerId: asOptionalUuid(fields.offerId),
    discountPercent:
      fields.discountPercent === '' || fields.discountPercent == null
        ? undefined
        : Number(fields.discountPercent),
    ...(fields.itemCode || fields.sku
      ? { itemCode: String(fields.itemCode || fields.sku).trim() }
      : {}),
    ...(fields.barcode ? { barcode: String(fields.barcode).trim() } : {}),
    ...(fields.reorderPoint !== undefined && fields.reorderPoint !== ''
      ? { reorderPoint: Number(fields.reorderPoint) }
      : {}),
    ...(fields.dailyPriceChange !== undefined
      ? { dailyPriceChange: Boolean(fields.dailyPriceChange) }
      : {}),
    ...(fields.status ? { status: fields.status } : {}),
    bundleItems: Array.isArray(fields.bundleItems)
      ? fields.bundleItems
          .map((row) => ({
            itemId: asOptionalUuid(row.itemId),
            quantity: Number(row.quantity),
          }))
          .filter((row) => row.itemId)
      : undefined,
    variants: Array.isArray(fields.variants) ? fields.variants : undefined,
    // Bundle finished qty only — singles/variants ignore quantity on update
    ...(fields.type === PRODUCT_TYPES.BUNDLE && fields.quantity != null
      ? {
          quantity:
            fields.quantity === '' || fields.quantity == null
              ? undefined
              : Number(fields.quantity),
        }
      : {}),
  }

  return base
}

// Prefer JSON create/update (arrays validate). If image present, follow with image-only PATCH.
export function splitProductWrite(fields, { withConfirmed = true } = {}) {
  const image = fields.image instanceof File && fields.image.size > 0 ? fields.image : null
  const json = withConfirmed
    ? buildProductPayload({ ...fields, image: null }, { withConfirmed })
    : buildProductUpdatePayload({ ...fields, image: null })
  return { json, image }
}

// @deprecated use productCsv.js — kept for older imports
export { productsToCsv, downloadTextFile } from '@/lib/productCsv'

