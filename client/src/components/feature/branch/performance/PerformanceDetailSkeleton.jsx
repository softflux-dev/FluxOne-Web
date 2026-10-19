import { Skeleton, KpiCardsSkeleton, ChartSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

// Layout-matched skeleton for Employee Performance Details
export function PerformanceDetailSkeleton({
  slow = false,
  onRetry,
}) {
  return (
    <div
      className="space-y-6 pb-10"
      role="status"
      aria-live="polite"
      aria-label="Loading employee performance"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="h-3 w-36 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Summary KPI cards — matches PerformanceSummaryCards grid */}
      <KpiCardsSkeleton count={4} className="sm:grid-cols-2 xl:grid-cols-4" />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <ChartSkeleton className="h-72" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-3 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border/60 p-3">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="ml-2 rounded-xl border border-border/70 bg-muted/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {slow ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Taking longer than expected…
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
            You can wait a moment longer, or retry if the request seems stuck.
          </p>
          {onRetry ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default PerformanceDetailSkeleton
