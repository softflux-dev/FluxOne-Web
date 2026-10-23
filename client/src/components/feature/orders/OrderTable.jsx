import { CheckCircle2, ClipboardList, Eye, History, PackageCheck, Printer } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { displayOrderRef } from '@/lib/formatDisplayId'
import { OrderStatusBadge } from '@/lib/orderStatus'
import { cn } from '@/lib/utils'

function canRecordReceival(status) {
  return status === 'approved' || status === 'partially_received'
}

function canMarkComplete(status) {
  return status === 'partially_received'
}

// Icon-only row actions (Details / Receival / Complete / History / PDF)
function OrderActions({
  row,
  mutating,
  onView,
  onHistory,
  onPrint,
  onRecordReceival,
  onMarkComplete,
}) {
  return (
    <div className="flex items-center justify-start gap-0.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 cursor-pointer text-purple-700 hover:bg-purple-50 hover:text-purple-900 hover:scale-110 active:scale-95"
        title="Details"
        aria-label="Details"
        onClick={() => onView?.(row)}
      >
        <Eye className="size-4 transition-transform duration-200" />
      </Button>
      {canRecordReceival(row.status) && onRecordReceival ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={mutating}
          className="size-8 cursor-pointer text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 hover:scale-110 active:scale-95"
          title="Record Receival"
          aria-label="Record Receival"
          onClick={() => onRecordReceival?.(row)}
        >
          <PackageCheck className="size-4 transition-transform duration-200" />
        </Button>
      ) : null}
      {canMarkComplete(row.status) && onMarkComplete ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={mutating}
          className="size-8 cursor-pointer text-sky-700 hover:bg-sky-50 hover:text-sky-900 hover:scale-110 active:scale-95"
          title="Mark Complete"
          aria-label="Mark Complete"
          onClick={() => onMarkComplete?.(row)}
        >
          <CheckCircle2 className="size-4 transition-transform duration-200" />
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110 active:scale-95"
        title="Purchase history"
        aria-label="Purchase history"
        onClick={() => onHistory?.(row)}
      >
        <History className="size-4 transition-transform duration-200" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110 active:scale-95"
        title="Download invoice PDF(s)"
        aria-label="Download invoice PDF(s)"
        onClick={() => onPrint?.(row)}
      >
        <Printer className="size-4 transition-transform duration-200" />
      </Button>
    </div>
  )
}

// Purchase order list — mobile cards + desktop table
export function OrderTable({
  items = [],
  loading = false,
  mutating = false,
  highlightId = '',
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
  onHistory,
  onPrint,
  onRecordReceival,
  onMarkComplete,
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
      className={className}
      title="Orders"
      description="Your order requests — Pending until BM approval, then Record Receival"
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={ClipboardList}
          title="No purchase orders yet"
          description="Generate an order after you have suppliers and products."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className={cn(
                  'rounded-xl border border-border bg-slate-50/60 px-3 py-3',
                  highlightId === row.id && 'ring-2 ring-purple-300',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-slate-700">
                      {displayOrderRef(row)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <DateTimeLines value={row.createdAt} />
                    </p>
                  </div>
                  <OrderStatusBadge status={row.status} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {row.companiesNumber ?? 0} companies · {row.itemsNumber ?? 0} items
                </p>
                <div className="mt-3">
                  <OrderActions
                    row={row}
                    mutating={mutating}
                    onView={onView}
                    onHistory={onHistory}
                    onPrint={onPrint}
                    onRecordReceival={onRecordReceival}
                    onMarkComplete={onMarkComplete}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[640px] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs uppercase tracking-wide text-slate-400">
                  <TableHead className="px-2 py-3 font-semibold">Order ID</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Timestamp</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Companies</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Items</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Status</TableHead>
                  <TableActionsHead className="px-2 py-3 font-semibold" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'hover:bg-slate-50/80',
                      highlightId === row.id && 'bg-purple-50/60',
                    )}
                  >
                    <TableCell className="px-2 py-3 font-mono text-xs text-slate-700">
                      {displayOrderRef(row)}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <DateTimeLines value={row.createdAt} />
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-600">
                      {row.companiesNumber ?? 0}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-600">
                      {row.itemsNumber ?? 0}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <OrderStatusBadge status={row.status} />
                    </TableCell>
                    <TableActionsCell className="px-2 py-3">
                      <OrderActions
                        row={row}
                        mutating={mutating}
                        onView={onView}
                        onHistory={onHistory}
                        onPrint={onPrint}
                        onRecordReceival={onRecordReceival}
                        onMarkComplete={onMarkComplete}
                      />
                    </TableActionsCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isEmpty ? (
        <TablePagination
          page={page}
          pageCount={pageCount}
          totalItems={total}
          pageSize={pageSize}
          loading={loading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </SurfaceCard>
  )
}
