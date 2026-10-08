import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Custom select that opens *below* the trigger with a fixed max height + scroll.
 * Prefer over native <select> inside modals (OS often flips the list upward).
 */
export function DownwardSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  className,
  buttonClassName,
  listClassName,
  emptyLabel = 'No options',
  'aria-invalid': ariaInvalid,
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  const selected = options.find((opt) => String(opt.value) === String(value))

  useEffect(() => {
    if (!open) return undefined
    function onDocPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={ariaInvalid || undefined}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
          buttonClassName,
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-white py-1 shadow-md',
            listClassName,
          )}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">{emptyLabel}</li>
          ) : (
            options.map((opt) => {
              const active = String(opt.value) === String(value)
              return (
                <li key={String(opt.value)}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      'flex w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
                      active && 'bg-purple-50 font-medium text-purple-900',
                    )}
                    onClick={() => {
                      onChange?.(opt.value)
                      setOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default DownwardSelect
