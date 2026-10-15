// Shared variant SKU label helpers (BM shelf + IM catalog).

/** Capsule label from parts or fallback variantLabel, e.g. "20g – Classic". */
export function variantSkuLabel(sku) {
  const parts = Array.isArray(sku?.parts) ? sku.parts : []
  const values = parts
    .map((part) => String(part.valueName || part.value_name || '').trim())
    .filter(Boolean)
  if (values.length) return values.join(' \u2013 ')
  return String(sku?.variantLabel || sku?.label || sku?.name || 'Variant').trim()
}

/** Request / display title: "Oreo Original — 40g". */
export function parentVariantTitle(parentName, sku) {
  const parent = String(parentName || '').trim() || 'Product'
  const variant = variantSkuLabel(sku)
  return `${parent} \u2014 ${variant}`
}
