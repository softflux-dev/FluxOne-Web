/**
 * Shared pricing helpers (mirror of server/src/utils/pricing.util.js).
 *
 * - Cost-based: Admin Tax & Profit table / CSV / PDF export
 * - Selling-based: IM catalog shelf price (when computed in JS)
 */

/** Auto selling price from purchase + profit % (whole currency units). */
export function sellingFromPurchase(purchase, profitPercent) {
  const p = Number(purchase) || 0
  const r = Number(profitPercent) || 0
  return Math.round(p * (1 + r / 100))
}

/**
 * Admin Tax & Profit “Final Price”:
 * (cost + cost×profit%) + tax on that subtotal.
 */
export function finalPriceFromCost(cost, profitPercent, taxPercent) {
  const c = Number(cost) || 0
  const profitPct = Number(profitPercent) || 0
  const taxPct = Number(taxPercent) || 0
  const profitAmount = (c * profitPct) / 100
  const subTotal = c + profitAmount
  const taxAmount = (subTotal * taxPct) / 100
  return Math.round((subTotal + taxAmount) * 100) / 100
}

/**
 * IM / POS shelf final:
 * selling × (1 − discount%) × (1 + tax%), rounded to whole units.
 */
export function finalPriceFromSelling(selling, discountPercent, taxPercent) {
  const s = Number(selling) || 0
  const d = Number(discountPercent) || 0
  const t = Number(taxPercent) || 0
  return Math.round(s * (1 - d / 100) * (1 + t / 100))
}
