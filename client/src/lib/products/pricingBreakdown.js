const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export function getPricingBreakdown(item) {
  const purchase = num(item?.purchasePrice)
  const profitPct = num(item?.profitPercent)
  const discountPct = num(item?.discountPercent)
  const taxPct = num(item?.taxPercent)

  const selling = purchase * (1 + profitPct / 100)
  const discounted = selling * (1 - discountPct / 100)
  const taxAmount = discounted * (taxPct / 100)
  const final = discounted + taxAmount

  return {
    purchase: round2(purchase),
    profitPct,
    selling: round2(selling),
    discountPct,
    discounted: round2(discounted),
    taxPct,
    taxAmount: round2(taxAmount),
    final: round2(final),
  }
}

export const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })