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

function NativeSelect({ className, children, style, ...props }) {   // CHANGE 1: Add `style` 
  return (
    <select
      className={cn(
        // CHANGE 2: `px-3` remove; `appearance-none bg-no-repeat pl-3 pr-9` attach
        'flex h-10 w-full appearance-none rounded-md border border-input bg-background bg-no-repeat py-2 pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 dark:disabled:bg-muted',
        className,
      )}
      // CHANGE 3: custom arrow and its position 
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem 1rem',
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, NativeSelect }
