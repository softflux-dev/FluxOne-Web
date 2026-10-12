import { EMPTY_DASH } from '@/lib/mapProduct'

//
// Discount & Offers = one promo (offer name wins; else discount %).
// Never render Discount % and Offer as two separate columns.
//
export function resolvePromoLabel(row = {}) {
  const discount = Number(row.discountPercent || 0)
  const offer = Number(row.offerPercent || 0)
  const name = String(row.offerName || '').trim()

  if (name) {
    if (offer > 0 && !name.includes('%')) return `${name} · ${offer}%`
    return name
  }
  if (offer > 0) return `${offer}% Offer`
  if (discount > 0) return `${discount}%`
  return null
}

export function PromotionColumns({ row }) {
  const label = resolvePromoLabel(row)
  if (!label) {
    return <span className="text-xs text-slate-400">{EMPTY_DASH}</span>
  }

  return (
    <span
      className="inline-flex max-w-[140px] truncate rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
      title={label}
    >
      {label}
    </span>
  )
}
