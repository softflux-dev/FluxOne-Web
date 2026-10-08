import { EMPTY_DASH } from '@/lib/mapProduct'

export function PromotionColumns({ row }) {
  const discount = Number(row.discountPercent || 0)
  const offer = Number(row.offerPercent || 0)
  const hasAny = discount > 0 || offer > 0 || row.offerName

  if (!hasAny) {
    return <span className="text-xs text-slate-400">{EMPTY_DASH}</span>
  }

  const offerLabel = row.offerName || (offer > 0 ? `${offer}% Offer` : 'Offer')
  const showPercentSuffix = offer > 0 && !offerLabel.includes('%')

  return (
    <div className="space-y-0.5 text-xs leading-snug">
      {row.offerName || offer > 0 ? (
        <p>
          <span className="text-slate-400">Offer</span>{' '}
          <span className="font-semibold text-slate-800">
            {offerLabel}
            {showPercentSuffix ? ` · ${offer}%` : ''}
          </span>
        </p>
      ) : discount > 0 ? (
        <p>
          <span className="text-slate-400">Discount</span>{' '}
          <span className="font-semibold text-slate-800">{discount}%</span>
        </p>
      ) : null}
    </div>
  )
}
