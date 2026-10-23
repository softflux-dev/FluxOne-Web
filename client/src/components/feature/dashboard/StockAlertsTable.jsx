import { memo } from 'react'
import { Bell } from 'lucide-react'
import { StockLegend } from '@/components/feature/dashboard/StockLegend'
import { StockStatusDot } from '@/components/feature/dashboard/StockStatusDot'
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
import { sourceLabel, STOCK_STATUS_META } from '@/lib/mapInventoryDashboard'
import { referenceFromUuid } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

function displayAlertId(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'ALT') : '—'
}

function StatusBadge({ status }) {
  const meta = STOCK_STATUS_META[status] || STOCK_STATUS_META.green
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        meta.bg,
        meta.text,
        meta.ring,
      )}
    >
      <StockStatusDot status={status} size="sm" className="ring-0" />
      {meta.label}
    </span>
  )
}

function StockAlertsTableComponent({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  highlightId = '',
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = Math.max(1, pagination?.pageCount || 1)
  const total = pagination?.total ?? list.length
  const pageSize = pagination?.limit || 8

  return (
    <SurfaceCard
      id="stock-alerts-panel"
      className={cn(
        'cursor-pointer transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(65,34,131,0.1)]',
        highlightId && 'ring-2 ring-purple-300',
        className,
      )}
      title="Stock Alerts & Requests"
      description="Alert or Request from branch manager — add stock via Control → Stock In, or Generate Order"
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={Bell}
          title="No alerts right now"
          description="Branch manager alerts and requests will appear here when raised."
          compact
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 overflow-hidden md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className={cn(
                  'cursor-pointer rounded-xl border border-border bg-slate-50/60 px-3 py-3 transition-colors hover:bg-white hover:shadow-sm',
                  highlightId === row.id && 'ring-2 ring-purple-300 bg-purple-50/50',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">{displayAlertId(row)}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">
                    Remaining Number{' '}
                    <span className="font-bold text-slate-900">{row.remainingNumber}</span>
                  </span>
                  <span className="truncate text-slate-500">{sourceLabel(row.source)}</span>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table — TL columns */}
          <div className="hidden overflow-hidden md:block">
            <Table className="w-full table-fixed text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                  <TableHead className="w-[16%] px-2 py-3 font-semibold">Id</TableHead>
                  <TableHead className="w-[26%] px-2 py-3 font-semibold">Name</TableHead>
                  <TableHead className="w-[16%] px-2 py-3 font-semibold">Remaining Number</TableHead>
                  <TableHead className="w-[14%] px-2 py-3 font-semibold">Status</TableHead>
                  <TableHead className="w-[28%] px-2 py-3 font-semibold">
                    Alert or Request from branch manager
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'cursor-pointer hover:bg-slate-50/80',
                      highlightId === row.id && 'bg-purple-50/70',
                    )}
                  >
                    <TableCell
                      className="truncate px-2 py-3 font-mono text-xs text-slate-500"
                      title={displayAlertId(row)}
                    >
                      {displayAlertId(row)}
                    </TableCell>
                    <TableCell className="truncate px-2 py-3 font-medium text-slate-900" title={row.name}>
                      {row.name}
                    </TableCell>
                    <TableCell className="px-2 py-3 tabular-nums text-slate-800">
                      {row.remainingNumber}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell
                      className="truncate px-2 py-3 text-slate-600"
                      title={sourceLabel(row.source)}
                    >
                      {sourceLabel(row.source)}
                    </TableCell>
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

          {/* Bottom hint — color meaning */}
          <div className="mt-4 border-t border-border pt-3">
            <StockLegend />
          </div>
        </>
      )}
    </SurfaceCard>
  )
}

export const StockAlertsTable = memo(StockAlertsTableComponent)
