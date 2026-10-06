import { cn } from '@/lib/utils'

// Base pulse block for loading placeholders.
export function Skeleton({ className }) {
  return <div className={cn('skeleton-block rounded-xl', className)} aria-hidden />
}

// Card-style rows for tables/lists while data loads.
export function TableRowsSkeleton({ rows = 6, className }) {
  return (
    <div
      className={cn('space-y-3 py-2', className)}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/80 p-3 shadow-sm"
        >
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36 max-w-full" />
            <Skeleton className="h-3 w-52 max-w-full" />
          </div>
          <Skeleton className="hidden h-8 w-14 rounded-lg sm:block" />
          <Skeleton className="hidden h-8 w-8 rounded-lg md:block" />
        </div>
      ))}
    </div>
  )
}

export function KpiCardsSkeleton({ count = 3, className }) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-3', className)}
      role="status"
      aria-label="Loading KPIs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-white px-6 py-8 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }) {
  return (
    <div
      className={cn('flex h-[280px] flex-col items-center justify-center gap-4', className)}
      role="status"
      aria-label="Loading chart"
    >
      <Skeleton className="size-40 rounded-full" />
      <div className="w-full max-w-xs space-y-2 px-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mx-auto h-3 w-48 max-w-full" />
        <Skeleton className="mx-auto h-3 w-32 max-w-full" />
      </div>
      <p className="text-xs text-slate-400">Loading chart…</p>
    </div>
  )
}
