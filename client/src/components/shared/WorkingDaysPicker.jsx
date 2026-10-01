import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'
import { WEEK_DAY_OPTIONS } from '@/lib/validation/branchForms'

// Chip multi-select for Mon–Sun working days (TaxMultiSelect-style).
// `allowedDays` limits which chips appear (staff ⊆ branch calendar).
export function WorkingDaysPicker({
  value = [],
  onChange,
  allowedDays = null,
  className,
  disabled = false,
}) {
  const selected = new Set(Array.isArray(value) ? value : [])
  const allowed =
    allowedDays == null
      ? null
      : new Set((Array.isArray(allowedDays) ? allowedDays : []).map((d) => String(d).toLowerCase()))

  const options = WEEK_DAY_OPTIONS.filter((opt) => !allowed || allowed.has(opt.value))

  function toggle(day) {
    if (disabled) return
    const next = new Set(selected)
    if (next.has(day)) next.delete(day)
    else next.add(day)
    // Preserve week order
    onChange?.(WEEK_DAY_OPTIONS.map((o) => o.value).filter((d) => next.has(d)))
  }

  if (!options.length) {
    return (
      <p className="text-xs text-slate-400">
        No working days configured for this branch. Ask an admin to set the branch calendar.
      </p>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((opt) => {
        const active = selected.has(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.value)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              disabled && 'cursor-not-allowed opacity-60',
              active
                ? 'border-transparent text-white'
                : 'border-border bg-white text-slate-700 hover:bg-slate-50',
            )}
            style={active ? { background: BRAND.purple } : undefined}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
