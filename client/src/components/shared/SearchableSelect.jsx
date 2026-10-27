import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { TruncatedText } from '@/components/shared/TruncatedText'
import { cn } from '@/lib/utils'

// Combobox select — type in the field to filter; list opens below (image-2 pattern)
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
  emptyMessage = 'No options available',
  className,
  triggerClassName,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

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
        inputRef.current?.blur()
      }
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openPanel() {
    if (disabled) return
    setOpen(true)
    setQuery('')
  }

  function selectValue(next) {
    onChange?.(next)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const showEmptyOption =
    includeEmpty && (!query.trim() || emptyOptionLabel.toLowerCase().includes(query.trim().toLowerCase()))

  const hasVisibleOptions = showEmptyOption || filtered.length > 0

  // Closed: selected label. Open: live query (placeholder shows selection / search hint).
  const inputDisplay = open ? query : selected?.label || ''
  const inputPlaceholder = open
    ? selected?.label || searchPlaceholder || placeholder
    : placeholder

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-slate-50/80 px-3 text-sm',
          'focus-within:border-purple-300 focus-within:bg-white focus-within:ring-1 focus-within:ring-purple-200',
          'dark:bg-muted dark:focus-within:bg-card dark:focus-within:border-[#c084c1]/50 dark:focus-within:ring-[#c084c1]/20',
          disabled && 'cursor-not-allowed opacity-60',
          open && 'border-purple-300 bg-white ring-1 ring-purple-200 dark:border-[#c084c1]/50 dark:ring-[#c084c1]/20',
          triggerClassName,
        )}
      >
        <Search className="pointer-events-none size-4 shrink-0 text-slate-400" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? `${id}-listbox` : undefined}
          aria-autocomplete="list"
          disabled={disabled}
          autoComplete="off"
          value={inputDisplay}
          placeholder={inputPlaceholder}
          title={selected?.label || undefined}
          onFocus={openPanel}
          onClick={openPanel}
          onChange={(event) => {
            if (disabled) return
            setQuery(event.target.value)
            if (!open) setOpen(true)
          }}
          className={cn(
            'min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400',
            selected && !open
              ? 'font-medium text-slate-900 dark:text-slate-100'
              : 'text-slate-800 dark:text-slate-200',
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? 'Close options' : 'Open options'}
          className="shrink-0 text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed"
          onMouseDown={(event) => {
            // Keep focus on input; toggle panel without stealing click-outside
            event.preventDefault()
            if (disabled) return
            if (open) {
              setOpen(false)
              setQuery('')
            } else {
              openPanel()
              inputRef.current?.focus()
            }
          }}
        >
          <ChevronDown
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-labelledby={id}
          className="absolute z-50 mt-1 max-h-52 w-full min-w-0 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-lg dark:bg-popover"
        >
          {!hasVisibleOptions ? (
            <li className="px-3 py-3 text-sm text-slate-400">{emptyMessage}</li>
          ) : (
            <>
              {showEmptyOption ? (
                <li role="option" aria-selected={!value}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-muted',
                      !value && 'bg-purple-50/60 dark:bg-accent/60',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
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

              {filtered.map((opt) => {
                const isSelected = String(opt.id) === String(value)
                return (
                  <li key={opt.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-muted',
                        isSelected && 'bg-purple-50/60 dark:bg-accent/60',
                      )}
                      onMouseDown={(event) => event.preventDefault()}
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
              })}
            </>
          )}
        </ul>
      ) : null}
    </div>
  )
}

export default SearchableSelect
