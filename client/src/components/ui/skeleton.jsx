import { cn } from '@/lib/utils'

// Base pulse block for loading placeholders.
export function Skeleton({ className, style }) {
  return (
    <div className={cn('skeleton-block rounded-xl', className)} style={style} aria-hidden />
  )
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
      className={cn(
        'grid grid-cols-1 gap-4',
        count >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3',
        className,
      )}
      role="status"
      aria-label="Loading KPIs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm"
        >
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
      className={cn(
        'flex h-[280px] flex-col justify-end gap-3 rounded-xl border border-border/50 bg-muted/20 p-4',
        className,
      )}
      role="status"
      aria-label="Loading chart"
    >
      {/* Shimmer bars that approximate a line/bar chart area */}
      <div className="flex flex-1 items-end gap-2 px-2">
        {[40, 55, 35, 70, 48, 82, 60, 45].map((h, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between gap-2 px-1">
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-10" />
      </div>
    </div>
  )
}
