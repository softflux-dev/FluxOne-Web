import { EMPTY_DASH, money, PRODUCT_TYPES } from '@/lib/mapProduct'

//
// Shared price display helpers for catalog rows.
// Variant parents have no own price — child SKUs hold the data.
//

export function priceOrDash(row, value) {
  if (row?.type === PRODUCT_TYPES.VARIANT) return EMPTY_DASH
  return money(value)
}

// Compact stacked block (mobile cards)
export function PricingColumns({ row }) {
  const isVariantParent = row.type === PRODUCT_TYPES.VARIANT

  return (
    <div className="space-y-0.5 text-xs leading-snug">
      <p>
        <span className="text-slate-400">Purchase</span>{' '}
        <span className="font-semibold text-slate-800">
          {isVariantParent ? EMPTY_DASH : money(row.purchasePrice)}
        </span>
      </p>
      <p>
        <span className="text-slate-400">Selling</span>{' '}
        <span className="font-semibold text-slate-800">
          {isVariantParent ? EMPTY_DASH : money(row.sellingPrice)}
        </span>
      </p>
      <p>
        <span className="text-slate-400">Tax</span>{' '}
        <span className="font-medium text-slate-700">{Number(row.taxPercent || 0)}%</span>
        {row.taxNames?.length ? (
          <span className="text-slate-400"> ({row.taxNames.join(', ')})</span>
        ) : null}
      </p>
      <p>
        <span className="text-slate-400">Final</span>{' '}
        <span className="font-bold text-slate-900">
          {isVariantParent ? EMPTY_DASH : money(row.finalPrice)}
        </span>
      </p>
    </div>
  )
}
