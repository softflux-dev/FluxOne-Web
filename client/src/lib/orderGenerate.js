import { PRODUCT_TYPES, formatVariantParts } from '@/lib/mapProduct'

export function newCompanyBlockKey() {
  return `co-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function emptyOrderFilters() {
  return {
    categoryId: '',
    subcategoryId: '',
    productType: '',
    productId: '',
    variantTypeId: '',
    variantValueId: '',
  }
}

export function emptyCompanyBlock() {
  return {
    key: newCompanyBlockKey(),
    supplierId: '',
    filters: emptyOrderFilters(),
    lines: [],
  }
}

export function prevPurchasePrice(product) {
  const last = Number(product?.lastPurchasePrice ?? 0)
  if (Number.isFinite(last) && last > 0) return last
  return Number(product?.purchasePrice ?? 0) || 0
}

export function orderableDisplayName(product) {
  if (!product) return '—'
  const parts = formatVariantParts(product.parts || [])
  if (parts) return `${product.name} — ${parts}`
  if (product.variantLabel) return `${product.name} — ${product.variantLabel}`
  return product.name || '—'
}

export function categoryPathLabel(product, categoryById = new Map()) {
  const cat = categoryById.get(product?.categoryId)
  const sub = categoryById.get(product?.subcategoryId)
  if (cat?.name && sub?.name) return `${cat.name} / ${sub.name}`
  if (cat?.name) return cat.name
  if (sub?.name) return sub.name
  return '—'
}

// Orderable SKUs only: normal singles + variant child SKUs (never bundles / variant parents)
export function isOrderableSku(product) {
  if (!product || product.status === 'inactive') return false
  if (product.type === PRODUCT_TYPES.BUNDLE) return false
  if (product.type === PRODUCT_TYPES.VARIANT) return false
  return product.type === PRODUCT_TYPES.SINGLE
}

export function isNormalProduct(product) {
  return isOrderableSku(product) && !product.parentId
}

export function isVariantChild(product) {
  return isOrderableSku(product) && Boolean(product.parentId)
}

export function buildOrderLineFromProduct(product, categoryById) {
  const price = prevPurchasePrice(product)
  return {
    productId: product.id,
    name: orderableDisplayName(product),
    itemCode: product.itemCode || '',
    categoryPath: categoryPathLabel(product, categoryById),
    scale: product.scale || 'unit',
    quantity: 1,
    unitCost: price,
    lastPurchasePrice: price,
  }
}

export function summarizeBlocks(blocks = []) {
  const companies = blocks.filter((b) => b.supplierId).length
  const itemLines = blocks.reduce((sum, b) => sum + (b.lines?.length || 0), 0)
  const totalUnits = blocks.reduce(
    (sum, b) => sum + (b.lines || []).reduce((s, line) => s + (Number(line.quantity) || 0), 0),
    0,
  )
  return { companies, itemLines, totalUnits }
}
