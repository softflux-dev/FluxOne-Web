import { ArrowRight, Package } from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Low stock banner — sits under the Daily Price banner; hidden when nothing is below threshold.
// "View items" opens the same Stock Alerts modal the old header button used.
export function ControlLowStockBanner({ alertCount = 0, onViewItems, className }) {
  const count = Number(alertCount) || 0
  if (count <= 0) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-sm text-red-950">
        <Package className="size-4 shrink-0 text-red-600" />
        <span>
          <span className="font-semibold tracking-wide">Low stock alert.</span>{' '}
          {count} item{count === 1 ? ' is' : 's are'} below their threshold. Take action to
          avoid stock-out.
        </span>
      </p>
      <button
        type="button"
        onClick={() => onViewItems?.()}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold hover:underline"
        style={{ color: BRAND.purple }}
      >
        View items
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}

export default ControlLowStockBanner