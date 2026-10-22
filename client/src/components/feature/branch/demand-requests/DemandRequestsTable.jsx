import { ClipboardList } from 'lucide-react'
import { ActionIconButton } from '@/components/shared/ActionIconButton'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
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
import { displayOrderRef } from '@/lib/formatDisplayId'
import { OrderStatusBadge } from '@/lib/orderStatus'
import { cn } from '@/lib/utils'

// Child: View · Edit · Approve · Reject (Approve is one-click — no edit required)
function DemandRequestActions({ row, mutating, onView, onEdit, onApprove, onReject }) {
  const pending = row.status === 'pending'
  return (
    <div className="inline-flex items-center gap-0.5">
      <ActionIconButton action="view" label="View" onClick={() => onView?.(row)} />
      {pending ? (
        <>
          <ActionIconButton
            action="edit"
            label="Edit"
            disabled={mutating}
            onClick={() => onEdit?.(row)}
          />
          <ActionIconButton
            action="approve"
            label="Approve"
            disabled={mutating}
            onClick={() => onApprove?.(row)}
          />
          <ActionIconButton
            action="reject"
            label="Reject"
            disabled={mutating}
            onClick={() => onReject?.(row)}
          />
        </>
      ) : null}
    </div>
  )
}

// Parent: BM Demand Requests list
export function DemandRequestsTable({
  items = [],
  loading = false,
  mutating = false,
  highlightId = '',
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onApprove,
  onReject,
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
      title="Demand Requests"
      description="Order requests from Inventory Managers awaiting your review"
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={ClipboardList}
          title="No demand requests"
          description="When an Inventory Manager submits a generate-order request, it appears here."
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
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                      {row.createdByName || 'Inventory Manager'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      <DateTimeLines value={row.createdAt} />
                    </p>
                  </div>
                  <OrderStatusBadge status={row.status} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {row.companiesNumber ?? 0} companies · {row.itemsNumber ?? 0} items
                </p>
                <div className="mt-3">
                  <DemandRequestActions
                    row={row}
                    mutating={mutating}
                    onView={onView}
                    onEdit={onEdit}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[720px] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs uppercase tracking-wide text-slate-400">
                  <TableHead className="px-2 py-3 font-semibold">Order ID</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Timestamp</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">IM</TableHead>
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
                    <TableCell className="px-2 py-3 font-medium text-slate-800">
                      {row.createdByName || '—'}
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
                      <DemandRequestActions
                        row={row}
                        mutating={mutating}
                        onView={onView}
                        onEdit={onEdit}
                        onApprove={onApprove}
                        onReject={onReject}
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

export default DemandRequestsTable
