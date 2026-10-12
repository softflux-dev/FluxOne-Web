import { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const SelectContext = createContext(null)

function Select({ value, onValueChange, children, className }) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className={cn('relative', className)}>{children}</div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function SelectValue({ placeholder }) {
  const ctx = useContext(SelectContext)
  return <span>{ctx?.value || placeholder}</span>
}

function SelectContent({ className, children }) {
  return <div className={cn('mt-1 space-y-1', className)}>{children}</div>
}

function SelectItem({ value, children, className }) {
  const ctx = useContext(SelectContext)
  return (
    <button
      type="button"
      className={cn(
        'flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
        ctx?.value === value && 'bg-accent',
        className,
      )}
      onClick={() => ctx?.onValueChange?.(value)}
    >
      {children}
    </button>
  )
}

function NativeSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 dark:disabled:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, NativeSelect }
