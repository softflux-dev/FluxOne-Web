import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { TruncatedText } from '@/components/shared/TruncatedText'
import { cn } from '@/lib/utils'

// Single-select filter with search, fixed width, and 2-line option clamp
export function SearchableSelect({
  id,
  value = '',
  options = [],
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  includeEmpty = true,
  emptyLabel,
  className,
  triggerClassName,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const searchRef = useRef(null)

  const emptyOptionLabel = emptyLabel || placeholder

  const selected = useMemo(
    () => options.find((opt) => String(opt.id) === String(value)) || null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((opt) => String(opt.label || '').toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) return undefined

    function onDocClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        setQuery('')
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    // Focus search when panel opens
    requestAnimationFrame(() => searchRef.current?.focus())

    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function selectValue(next) {
    onChange?.(next)
    setOpen(false)
    setQuery('')
  }

  const displayLabel = selected?.label || emptyOptionLabel

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected?.label || undefined}
        onClick={() => {
          if (disabled) return
          setOpen((prev) => !prev)
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 dark:disabled:bg-muted',
          open && 'border-purple-300 ring-1 ring-purple-200 dark:border-[#c084c1]/50 dark:ring-[#c084c1]/20',
          triggerClassName,
        )}
      >
        <TruncatedText
          as="span"
          text={displayLabel}
          lines={1}
          className={cn(
            'block min-w-0 flex-1 text-left',
            selected
              ? 'font-medium text-slate-900 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400',
          )}
        />
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="absolute z-40 mt-1 w-full min-w-0 overflow-hidden rounded-lg border border-border bg-white shadow-lg dark:bg-popover">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-input bg-slate-50/70 py-1.5 pr-3 pl-8 text-xs outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-200 dark:bg-muted dark:focus:bg-card dark:focus:border-[#c084c1]/50 dark:focus:ring-[#c084c1]/20"
              />
            </div>
          </div>

          <ul
            role="listbox"
            aria-labelledby={id}
            className="max-h-52 overflow-y-auto py-1"
          >
            {includeEmpty ? (
              <li role="option" aria-selected={!value}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-muted',
                    !value && 'bg-purple-50/60 dark:bg-accent/60',
                  )}
                  onClick={() => selectValue('')}
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                    {!value ? (
                      <Check className="size-3.5 text-purple-700 dark:text-[#c084c1]" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 text-slate-500 dark:text-slate-400">
                    {emptyOptionLabel}
                  </span>
                </button>
              </li>
            ) : null}

            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-400">No matches</li>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.id) === String(value)
                return (
                  <li key={opt.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-muted',
                        isSelected && 'bg-purple-50/60 dark:bg-accent/60',
                      )}
                      onClick={() => selectValue(opt.id)}
                    >
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                        {isSelected ? (
                          <Check className="size-3.5 text-purple-700 dark:text-[#c084c1]" />
                        ) : null}
                      </span>
                      <TruncatedText
                        as="span"
                        text={opt.label}
                        lines={2}
                        className="block min-w-0 flex-1 text-slate-800 dark:text-slate-200"
                      />
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default SearchableSelect
