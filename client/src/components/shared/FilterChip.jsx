import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Filter pill used by product / movement category chips
export function FilterChip({ active, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-[0.97]',
        active
          ? 'border-transparent text-white shadow-sm'
          : 'border-border bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-card dark:text-slate-200 dark:hover:bg-muted',
        className,
      )}
      style={active ? { background: BRAND.purple } : undefined}
    >
      {children}
    </button>
  )
}

// Small category image or letter fallback for filter chips
export function CategoryThumb({ category }) {
  if (category?.imageUrl) {
    return (
      <img
        src={category.imageUrl}
        alt=""
        className="size-4 rounded-full object-cover"
      />
    )
  }

  return (
    <span
      className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
      style={{ background: BRAND.deep }}
    >
      {(category?.name || '?').slice(0, 1).toUpperCase()}
    </span>
  )
}
