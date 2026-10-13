import {
  Banknote,
  Check,
  FileText,
  Package,
  Printer,
  RotateCcw,
  CalendarDays,
} from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { TruncatedText } from '@/components/shared/TruncatedText'
import { Button } from '@/components/ui/button'
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
import { displaySaleRef } from '@/lib/formatDisplayId'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import {
  formatFilterDateRange,
  itemQtyTotal,
  itemsLabel,
  moneyOrDash,
  primaryItemName,
  saleActionStatus,
  soldLines,
  splitReturnAndChange,
} from './salesTableUtils'

// Purple Sale ID pill (SAL-INV-…)
function SaleIdBadge({ sale }) {
  return (
    <span className="inline-flex max-w-full items-center truncate rounded-md bg-purple-50 px-2 py-0.5 font-mono text-xs font-bold text-purple-800 select-all ring-1 ring-inset ring-purple-100">
      {displaySaleRef(sale)}
    </span>
  )
}

// Icon + name + “N items” (exchange lines excluded)
function SaleItemsCell({ sale }) {
  const items = soldLines(sale)
  const qty = itemQtyTotal(items)
  const name = primaryItemName(items)
  const title = items.map((i) => i.name).filter(Boolean).join(', ') || name

  return (
    <div className="flex w-full min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100">
        <Package className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <TruncatedText
          text={title}
          maxChars={10}
          className="text-sm font-semibold text-slate-800"
        />
        <p className="truncate text-xs text-slate-500">{itemsLabel(qty)}</p>
      </div>
    </div>
  )
}

function StatusPill({ sale, onRefund }) {
  const status = saleActionStatus(sale)
  const Icon =
    status.key === 'refunded' ? RotateCcw : status.key === 'change' ? Banknote : Check
  const canRefund = status.key !== 'refunded' && typeof onRefund === 'function'

  const className = cn(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
    status.className,
    canRefund && 'cursor-pointer transition-opacity hover:opacity-90',
  )

  if (canRefund) {
    return (
      <button
        type="button"
        className={className}
        title="Request refund"
        aria-label="Request refund"
        onClick={() => onRefund(sale)}
      >
        <Icon className="size-3.5 shrink-0" strokeWidth={2} />
        {status.label}
      </button>
    )
  }

  return (
    <span className={className}>
      <Icon className="size-3.5 shrink-0" strokeWidth={2} />
      {status.label}
    </span>
  )
}

function PrintButton({ sale, onPrint }) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      title="Print invoice"
      aria-label="Print invoice"
      onClick={() => onPrint?.(sale)}
    >
      <Printer className="size-4" />
    </Button>
  )
}

function ReturnCell({ sale, money }) {
  const { refunded, returnAmount } = splitReturnAndChange(sale)
  if (!refunded || returnAmount <= 0) {
    return <span className="text-slate-400">—</span>
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-slate-700">{money(returnAmount, sale.currency)}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-100">
        <RotateCcw className="size-2.5" />
        Refund
      </span>
    </div>
  )
}

function ChangeCell({ sale, money }) {
  const { changeAmount } = splitReturnAndChange(sale)
  if (changeAmount <= 0) return <span className="text-slate-400">—</span>
  return <span className="text-slate-700">{money(changeAmount, sale.currency)}</span>
}

function SaleMobileCard({ sale, index, money, onRefund, onPrint }) {
  const tax = sale.tax_amount ?? sale.taxAmount
  const discount = sale.discount_amount ?? sale.discountAmount
  const cur = sale.currency
  // Zero amounts → "—" (nothing), not PKR 0
  const finalLabel = moneyOrDash(money, sale.finalAmount, cur)
  const paidLabel = moneyOrDash(money, sale.paidAmount, cur)
  const taxLabel = moneyOrDash(money, tax, cur)
  const discountLabel = moneyOrDash(money, discount, cur)

  return (
    <DataCard>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-slate-400">#{index}</p>
          <SaleIdBadge sale={sale} />
          <div className="pt-0.5 text-slate-600">
            <DateTimeLines value={sale.soldAt} />
          </div>
        </div>
        <StatusPill sale={sale} onRefund={onRefund} />
      </div>

      <div className="mt-3">
        <SaleItemsCell sale={sale} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-400">Final</span>
          <p className="font-bold text-slate-900">{finalLabel}</p>
        </div>
        <div>
          <span className="text-slate-400">Paid</span>
          <p className="font-semibold text-slate-700">{paidLabel}</p>
        </div>
        <div>
          <span className="text-slate-400">Tax</span>
          <p className="text-slate-600">{taxLabel}</p>
        </div>
        <div>
          <span className="text-slate-400">Discount</span>
          <p className="text-slate-600">{discountLabel}</p>
        </div>
        <div>
          <span className="text-slate-400">Return</span>
          <div className="mt-0.5">
            <ReturnCell sale={sale} money={money} />
          </div>
        </div>
        <div>
          <span className="text-slate-400">Change</span>
          <p className="mt-0.5">
            <ChangeCell sale={sale} money={money} />
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <PrintButton sale={sale} onPrint={onPrint} />
      </div>
    </DataCard>
  )
}

// Branch sales list — matches Transactions card layout (no Exchange column).
export function SalesTable({
  items = [],
  loading = false,
  page = 1,
  pageCount = 1,
  total = 0,
  pageSize = 8,
  onPageChange,
  onPageSizeChange,
  onRefund,
  onPrint,
  filterFrom = '',
  filterTo = '',
  className,
}) {
  const { format, currency: tenantCurrency } = useCurrency()
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const money = (val, cur) => format(val, cur || tenantCurrency)
  const rangeLabel = formatFilterDateRange(filterFrom, filterTo)
  const rowOffset = Math.max(0, (page - 1) * pageSize)

  const titleNode = (
    <span className="flex items-center gap-2.5">
      {/* <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100">
        <FileText className="size-4" strokeWidth={1.75} />
      </span> */}
      <span>Sales Transactions</span>
    </span>
  )

  const rangeAction = rangeLabel ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs">
      <CalendarDays className="size-3.5 text-slate-400" />
      {rangeLabel}
    </span>
  ) : null

  return (
    <SurfaceCard
      className={cn('min-h-[400px]', className)}
      title={titleNode}
      description="POS and register transactions history"
      actions={rangeAction}
    >
      {loading ? (
        <TableRowsSkeleton rows={6} />
      ) : isEmpty ? (
        <EmptyState
          icon={FileText}
          title="No transactions found"
          description="POS and register sales for this branch will show up here."
        />
      ) : (
        <ResponsiveDataShell
          mobile={list.map((sale, i) => (
            <SaleMobileCard
              key={sale.id}
              sale={sale}
              index={rowOffset + i + 1}
              money={money}
              onRefund={onRefund}
              onPrint={onPrint}
            />
          ))}
          desktop={
            <Table className="table-fixed min-w-[72rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[9rem]">Sale ID</TableHead>
                  <TableHead className="w-[7.5rem]">Date &amp; Time</TableHead>
                  <TableHead className="w-[12rem]">Sale Items</TableHead>
                  <TableHead className="w-[6.5rem]">Tax</TableHead>
                  <TableHead className="w-[6.5rem]">Discount</TableHead>
                  <TableHead className="w-[6.5rem]">Final</TableHead>
                  <TableHead className="w-[6.5rem]">Paid</TableHead>
                  <TableHead className="w-[7rem]">Return</TableHead>
                  <TableHead className="w-[6.5rem]">Change</TableHead>
                  <TableHead className="w-[14rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((sale) => {
                  const tax = sale.tax_amount ?? sale.taxAmount
                  const discount = sale.discount_amount ?? sale.discountAmount
                  const cur = sale.currency
                  // Zero → "—" so refunded / empty tax-discount don't show PKR 0
                  const taxLabel = moneyOrDash(money, tax, cur)
                  const discountLabel = moneyOrDash(money, discount, cur)
                  const finalLabel = moneyOrDash(money, sale.finalAmount, cur)
                  const paidLabel = moneyOrDash(money, sale.paidAmount, cur)
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="overflow-hidden">
                        <SaleIdBadge sale={sale} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">
                        <DateTimeLines value={sale.soldAt} className="whitespace-nowrap" />
                      </TableCell>
                      <TableCell className="max-w-[12rem] overflow-hidden">
                        <SaleItemsCell sale={sale} />
                      </TableCell>
                      <TableCell
                        className="max-w-[6.5rem] truncate whitespace-nowrap text-slate-600"
                        title={taxLabel}
                      >
                        {taxLabel}
                      </TableCell>
                      <TableCell
                        className="max-w-[6.5rem] truncate whitespace-nowrap text-slate-600"
                        title={discountLabel}
                      >
                        {discountLabel}
                      </TableCell>
                      <TableCell
                        className="max-w-[6.5rem] truncate whitespace-nowrap font-bold text-slate-900"
                        title={finalLabel}
                      >
                        {finalLabel}
                      </TableCell>
                      <TableCell
                        className="max-w-[6.5rem] truncate whitespace-nowrap text-slate-600"
                        title={paidLabel}
                      >
                        {paidLabel}
                      </TableCell>
                      <TableCell className="overflow-hidden">
                        <ReturnCell sale={sale} money={money} />
                      </TableCell>
                      <TableCell className="truncate whitespace-nowrap">
                        <ChangeCell sale={sale} money={money} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusPill sale={sale} onRefund={onRefund} />
                          <PrintButton sale={sale} onPrint={onPrint} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          }
        />
      )}

      {!isEmpty || loading ? (
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

export default SalesTable
