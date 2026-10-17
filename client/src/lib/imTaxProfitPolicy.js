/**
 * IM Tax & Profit policy helpers (QA TC-004s).
 * // as per company code policy — IM may only apply or exempt Admin default tax;
 * // profit % is Admin-owned (defaults on create / bulk on Tax & Profit page).
 */

/** Normalize tenant default tax % to a whole number 0–100. */
export function normalizeDefaultTaxPercent(defaultTaxPercent) {
  const rate = Math.round(Number(defaultTaxPercent) || 0)
  if (!Number.isFinite(rate) || rate < 0) return 0
  return Math.min(100, rate)
}

/**
 * Build inventory create/update tax fields from the Apply Default Tax checkbox.
 * - apply + default > 0 → { taxPercent: default } (server find-or-creates)
 * - apply + default 0, or unchecked → { taxIds: [] } (explicit exempt)
 * Never includes profitPercent.
 */
export function buildImTaxPayload({ applyDefaultTax, defaultTaxPercent }) {
  const rate = normalizeDefaultTaxPercent(defaultTaxPercent)
  if (applyDefaultTax && rate > 0) {
    return { taxPercent: rate }
  }
  return { taxIds: [] }
}

/**
 * Hydrate Apply Default Tax checkbox from an existing product/bundle.
 * True when the product has any linked tax or a positive effective tax %.
 */
export function resolveApplyDefaultTaxFromProduct(product) {
  if (!product) return false
  const taxPercent = Number(product.taxPercent ?? product.tax_percent ?? 0)
  if (Number.isFinite(taxPercent) && taxPercent > 0) return true
  const taxIds = product.taxIds ?? product.tax_ids
  return Array.isArray(taxIds) && taxIds.length > 0
}

/**
 * Initial checkbox state for create forms once catalog defaults load.
 * Checked when Admin default tax % is greater than zero.
 */
export function resolveInitialApplyDefaultTax(defaultTaxPercent) {
  return normalizeDefaultTaxPercent(defaultTaxPercent) > 0
}
