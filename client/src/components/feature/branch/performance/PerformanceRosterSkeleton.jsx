import { Skeleton, TableRowsSkeleton } from '@/components/ui/skeleton'
import { SurfaceCard } from '@/components/shared/SurfaceCard'

// Roster / filters / table skeleton for Performance Monitoring (tc-bm-performance-02a)
export function PerformanceRosterSkeleton({ rows = 6, slow = false, onRetry }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading performance roster">
      <div className="flex gap-2 border-b border-border pb-3">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <SurfaceCard title="Staff Scores & Performance Evaluation">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="hidden items-end sm:flex">
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        <TableRowsSkeleton rows={rows} />

        {slow ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Taking longer than expected…
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-semibold text-amber-900 underline dark:text-amber-100"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  )
}

export default PerformanceRosterSkeleton
