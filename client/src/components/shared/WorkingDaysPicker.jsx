import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'
import { WEEK_DAY_OPTIONS } from '@/lib/validation/branchForms'

// Dropdown multi-select for Mon–Sun — default empty; user picks days one by one.
// `allowedDays` limits options (staff ⊆ branch calendar).
export function WorkingDaysPicker({
  value = [],
  onChange,
  allowedDays = null,
  className,
  disabled = false,
  placeholder = 'Select days',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = useMemo(
    () => new Set(Array.isArray(value) ? value : []),
    [value],
  )
  const allowed =
    allowedDays == null
      ? null
      : new Set((Array.isArray(allowedDays) ? allowedDays : []).map((d) => String(d).toLowerCase()))

  const options = WEEK_DAY_OPTIONS.filter((opt) => !allowed || allowed.has(opt.value))

  const selectedLabels = options
    .filter((opt) => selected.has(opt.value))
    .map((opt) => opt.fullLabel || opt.label)
  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === options.length && options.length > 0
        ? 'All days'
        : selectedLabels.join(', ')

  useEffect(() => {
    function onDocClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

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
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-60',
          !disabled && 'cursor-pointer',
          selectedLabels.length === 0 ? 'text-slate-400' : 'text-slate-900',
        )}
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 text-slate-400" />
      </button>

      {open && !disabled ? (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-white p-1 shadow-md"
        >
          {options.map((opt) => {
            const checked = selected.has(opt.value)
            const name = opt.fullLabel || opt.label
            return (
              <li key={opt.value} role="option" aria-selected={checked}>
                <button
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    checked
                      ? 'bg-slate-50 font-medium text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border',
                      checked ? 'border-transparent text-white' : 'border-slate-300 bg-white',
                    )}
                    style={checked ? { background: BRAND.purple } : undefined}
                  >
                    {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  {name}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
