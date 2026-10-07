import { Package } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Shared ledger history — mobile cards + desktop table (Phase 3 row menu via renderRowActions)
export function MovementHistoryTable({
  title,
  description,
  actions = null,
  items = [],
  loading = false,
  pagination,
  columns = [],
  onPageChange,
  onPageSizeChange,
  renderRowActions,
  emptyTitle = 'No movements yet',
  emptyHint = 'Add a movement or adjust filters.',
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = Math.max(1, pagination?.pageCount || 1)
  const total = pagination?.total ?? list.length
  const pageSize = pagination?.limit || 8
  const showActions = Boolean(renderRowActions)

  return (
    <SurfaceCard className={className} title={title} description={description} actions={actions}>
      {loading ? (
        <TableRowsSkeleton rows={6} />
      ) : isEmpty ? (
        <EmptyState icon={Package} title={emptyTitle} description={emptyHint} />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
              >
                <div className="space-y-2.5">
                  {columns.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                        {col.label}
                      </p>
                      <div className="mt-0.5 text-sm text-slate-800">{col.render(row)}</div>
                    </div>
                  ))}
                </div>
                {showActions ? (
                  <div className="mt-3 flex justify-start border-t border-border pt-2">
                    {renderRowActions(row)}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block -mx-1 px-1 sm:mx-0 sm:px-0">
            <Table className="min-w-[720px] text-left text-sm md:min-w-[880px]">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-400 uppercase">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn('px-2 py-2 font-semibold', col.className)}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  {showActions ? (
                    <TableHead className="px-2 py-2 font-semibold">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/80">
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn('px-2 py-3 align-middle', col.className)}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                    {showActions ? (
                      <TableCell className="px-2 py-3">{renderRowActions(row)}</TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            loading={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </SurfaceCard>
  )
}

export default MovementHistoryTable
