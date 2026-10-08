import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Reusable From / To date range (UX standard for filters & dashboards).
 * Same-day range allowed; optional max (e.g. today) blocks future dates.
 */
export function DateRangeFields({
  from = '',
  to = '',
  onChange,
  max,
  min,
  idPrefix = 'date-range',
  className,
  compact = false,
  showIcon = true,
}) {
  function patch(next) {
    onChange?.(next)
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-sm sm:text-sm',
          className,
        )}
      >
        {showIcon ? <Calendar className="size-4 shrink-0 text-purple-700" /> : null}
        <label className="inline-flex items-center gap-1.5">
          <span className="shrink-0 font-medium text-slate-500">From</span>
          <input
            type="date"
            value={from}
            min={min || undefined}
            max={to || max || undefined}
            onChange={(e) => patch({ from: e.target.value, to })}
            className="min-w-0 border-0 bg-transparent font-semibold text-slate-900 outline-none"
          />
        </label>
        <span className="text-slate-300">–</span>
        <label className="inline-flex items-center gap-1.5">
          <span className="shrink-0 font-medium text-slate-500">To</span>
          <input
            type="date"
            value={to}
            min={from || min || undefined}
            max={max || undefined}
            onChange={(e) => patch({ from, to: e.target.value })}
            className="min-w-0 border-0 bg-transparent font-semibold text-slate-900 outline-none"
          />
        </label>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      <div className="w-full space-y-1.5 sm:w-36">
        <Label htmlFor={`${idPrefix}-from`}>From</Label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={from}
          min={min || undefined}
          max={to || max || undefined}
          onChange={(e) => patch({ from: e.target.value, to })}
        />
      </div>
      <div className="w-full space-y-1.5 sm:w-36">
        <Label htmlFor={`${idPrefix}-to`}>To</Label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={to}
          min={from || min || undefined}
          max={max || undefined}
          onChange={(e) => patch({ from, to: e.target.value })}
        />
      </div>
    </div>
  )
}

export default DateRangeFields
