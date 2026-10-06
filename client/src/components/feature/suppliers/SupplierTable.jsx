import { Building2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
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
import { BRAND } from '@/lib/constants'
import { displaySupplierRef } from '@/lib/formatDisplayId'

function SupplierAvatar({ row }) {
  if (row.imageUrl) {
    return <img src={row.imageUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
  }
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
    >
      {(row.companyName || '?').slice(0, 1).toUpperCase()}
    </div>
  )
}

// clean and optimized code — CRUD icons; Status capsule is display-only
function SupplierRowActions({
  row,
  onView,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  statusLoading,
}) {
  const active = row.isActive !== false
  return (
    <RowActionButtons
      onView={() => onView?.(row)}
      onEdit={() => onEdit?.(row)}
      onBlock={() => onDeactivate?.(row)}
      onUnblock={() => onActivate?.(row)}
      isActive={active}
      onDelete={() => onDelete?.(row)}
      viewLabel={`View ${row.companyName || 'supplier'}`}
      editLabel={`Edit ${row.companyName || 'supplier'}`}
      blockLabel={`Deactivate ${row.companyName || 'supplier'}`}
      unblockLabel={`Activate ${row.companyName || 'supplier'}`}
      deleteLabel={`Delete ${row.companyName || 'supplier'}`}
      disabled={statusLoading}
    />
  )
}

// Supplier list — mobile cards + desktop table (no Signature column; view in details)
export function SupplierTable({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  statusUpdatingId = null,
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
      title="Supplier list"
      description="Companies you purchase from"
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={Building2}
          title="No suppliers yet"
          description="Add a supplier before generating purchase orders."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <SupplierAvatar row={row} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.companyName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400" title={row.id}>
                          {displaySupplierRef(row)}
                        </p>
                      </div>
                      <ProductStatusToggle
                        status={row.isActive === false ? 'inactive' : 'active'}
                        loading={statusUpdatingId === row.id}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{row.companyPhone || '—'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.representativeName || '—'}
                      {row.representativePhone ? ` · ${row.representativePhone}` : ''}
                    </p>
                    {row.location ? (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{row.location}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.taxPaid
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        Tax {row.taxPaid ? 'Yes' : 'No'}
                      </span>
                      <SupplierRowActions
                        row={row}
                        onView={onView}
                        onEdit={onEdit}
                        onDeactivate={onDeactivate}
                        onActivate={onActivate}
                        onDelete={onDelete}
                        statusLoading={statusUpdatingId === row.id}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block -mx-1 px-1 sm:mx-0 sm:px-0">
            <Table className="min-w-[720px] text-left text-sm lg:min-w-[960px]">
              <TableHeader>
                <TableRow className="text-xs uppercase tracking-wide text-slate-400">
                  <TableHead className="px-2 py-3 font-semibold">Image</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Supplier ID</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Company</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Company phone</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Representative</TableHead>
                  <TableHead className="hidden px-2 py-3 font-semibold lg:table-cell">Location</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Tax paid</TableHead>
                  <TableHead className="hidden px-2 py-3 font-semibold xl:table-cell">Reg / Bank</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Status</TableHead>
                  <TableActionsHead className="px-2 py-3 font-semibold" sticky />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id} className="group align-top hover:bg-slate-50/80">
                    <TableCell className="px-2 py-3">
                      <SupplierAvatar row={row} />
                    </TableCell>
                    <TableCell className="px-2 py-3 font-mono text-xs text-slate-600" title={row.id}>
                      {displaySupplierRef(row)}
                    </TableCell>
                    <TableCell className="px-2 py-3 font-medium text-slate-800">
                      {row.companyName}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-600">
                      {row.companyPhone || '—'}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-600">
                      <span className="block font-medium">{row.representativeName || '—'}</span>
                      <span className="block text-xs text-slate-400">
                        {row.representativePhone || '—'}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {row.representativeEmail || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-2 py-3 text-slate-600 lg:table-cell">
                      {row.location || '—'}
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.taxPaid
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.taxPaid ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-2 py-3 text-xs text-slate-500 xl:table-cell">
                      <span className="block">{row.registrationNumber || '—'}</span>
                      <span className="block font-mono">{row.bankAccountNumber || '—'}</span>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <ProductStatusToggle
                        status={row.isActive === false ? 'inactive' : 'active'}
                        loading={statusUpdatingId === row.id}
                      />
                    </TableCell>
                    <TableActionsCell sticky>
                      <SupplierRowActions
                        row={row}
                        onView={onView}
                        onEdit={onEdit}
                        onDeactivate={onDeactivate}
                        onActivate={onActivate}
                        onDelete={onDelete}
                        statusLoading={statusUpdatingId === row.id}
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
