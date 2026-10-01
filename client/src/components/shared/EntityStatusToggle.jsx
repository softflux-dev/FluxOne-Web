import { cn } from '@/lib/utils'

// True when status string or boolean represents an active/open entity.
export function isEntityActive(value) {
  if (typeof value === 'boolean') return value
  const status = String(value || '').toLowerCase()
  return status !== 'inactive' && status !== 'blocked' && status !== 'close'
}

//
// Unified Open / Close (Active / Inactive) pill used across staff, products, suppliers.
// interactive=false → display-only capsule (not a CTA; no click / hover lift).
// onChange receives the next boolean (true = activate) when interactive.
//
export function EntityStatusToggle({
  active,
  status,
  loading = false,
  onChange,
  className,
  interactive = true,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  activeTitle = 'Click to deactivate',
  inactiveTitle = 'Click to activate',
  inactiveTone = 'neutral',
}) {
  const isActive = active != null ? Boolean(active) : isEntityActive(status)
  const inactiveIsDanger = inactiveTone === 'danger'
  const label = `${isActive ? activeLabel : inactiveLabel}${loading ? '…' : ''}`

  const toneClass = isActive
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
    : inactiveIsDanger
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : 'bg-slate-100 text-slate-600 ring-slate-200'

  const dotColor = isActive ? '#22c55e' : inactiveIsDanger ? '#e11d48' : '#94a3b8'

  // clean and optimized code — status is showcase-only when interactive is false
  if (!interactive) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
          toneClass,
          loading ? 'opacity-60' : null,
          className,
        )}
        title={label}
        aria-label={label}
      >
        <span className="mr-1.5 size-1.5 rounded-full" style={{ background: dotColor }} />
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => onChange?.(!isActive)}
      className={cn(
        'inline-flex cursor-pointer items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:brightness-[1.03] active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
        isActive
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-100 hover:bg-emerald-100'
          : inactiveIsDanger
            ? 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100'
            : 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200/80',
        className,
      )}
      title={isActive ? activeTitle : inactiveTitle}
    >
      <span className="mr-1.5 size-1.5 rounded-full" style={{ background: dotColor }} />
      {label}
    </button>
  )
}
