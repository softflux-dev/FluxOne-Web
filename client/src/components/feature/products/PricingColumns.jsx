import { money, PRODUCT_TYPES } from '@/lib/mapProduct'

export function PricingColumns({ row }) {
  const isVariantParent = row.type === PRODUCT_TYPES.VARIANT
  const dash = '—'

  return (
    <div className="space-y-0.5 text-xs leading-snug">
      <p>
        <span className="text-slate-400">Purchase</span>{' '}
        <span className="font-semibold text-slate-800">
          {isVariantParent ? dash : money(row.purchasePrice)}
        </span>
      </p>
      <p>
        <span className="text-slate-400">Selling</span>{' '}
        <span className="font-semibold text-slate-800">
          {isVariantParent ? dash : money(row.sellingPrice)}
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
          {isVariantParent ? dash : money(row.finalPrice)}
        </span>
      </p>
    </div>
  )
}
