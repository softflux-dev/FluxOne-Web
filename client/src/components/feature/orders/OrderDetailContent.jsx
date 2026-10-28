import { useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { OrderTimeline } from '@/components/feature/orders/OrderTimeline'
import { OrderInvoicesSection } from '@/components/feature/orders/OrderInvoicesSection'
import { displayItemCode } from '@/lib/formatDisplayId'
import { money } from '@/lib/mapProduct'
import { OrderStatusBadge } from '@/lib/orderStatus'

// QA TC-ORDER-003A — rejected orders must show "Rejected" per line, not "Not received"
function lineReceivedLabel(line, orderStatus) {
  if (orderStatus === 'rejected') return 'Rejected'
  if (orderStatus === 'cancelled') return 'Cancelled'
  const ordered = Number(line.quantity) || 0
  const received = Number(line.receivedQuantity) || 0
  if (received <= 0) return 'Not received'
  if (received >= ordered) return 'Received'
  return 'Partial'
}

function lineReceivedClass(line, orderStatus) {
  if (orderStatus === 'rejected') return 'bg-rose-50 text-rose-800'
  if (orderStatus === 'cancelled') return 'bg-slate-100 text-slate-600'
  const ordered = Number(line.quantity) || 0
  const received = Number(line.receivedQuantity) || 0
  if (received <= 0) return 'bg-slate-100 text-slate-600'
  if (received >= ordered) return 'bg-emerald-50 text-emerald-700'
  return 'bg-orange-50 text-orange-800'
}

function CompanyLinesTable({ lines = [], orderStatus = '' }) {
  if (!lines.length) {
    return <p className="text-sm text-slate-500">No items in this company block.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <Table className="min-w-[720px] w-full text-left text-sm">
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
            <TableHead className="px-4 py-2.5">Item</TableHead>
            <TableHead className="w-24 px-4 py-2.5 text-right">Ordered</TableHead>
            <TableHead className="w-24 px-4 py-2.5 text-right">Received</TableHead>
            <TableHead className="w-28 px-4 py-2.5 text-right">Prev. price</TableHead>
            <TableHead className="w-36 whitespace-nowrap px-4 py-2.5">Line status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id || line.productId}>
              <TableCell className="px-4 py-2.5">
                <span className="font-medium text-slate-900">{line.name}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                  {displayItemCode(line)}
                </span>
              </TableCell>
              <TableCell className="px-4 py-2.5 text-right tabular-nums">{line.quantity}</TableCell>
              <TableCell className="px-4 py-2.5 text-right tabular-nums">
                {line.receivedQuantity ?? 0}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                {money(line.lastPurchasePrice)}
              </TableCell>
              <TableCell className="px-4 py-2.5 whitespace-nowrap">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${lineReceivedClass(line, orderStatus)}`}
                >
                  {lineReceivedLabel(line, orderStatus)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function buildCompanyBlocks(order) {
  const companies = Array.isArray(order.companies) ? order.companies : []
  const lines = order.lines || []
  if (companies.length > 0) return companies
  if (order.supplierId) {
    return [
      {
        supplierId: order.supplierId,
        companyName: order.companyName || 'Supplier',
        imageUrl: null,
        lines,
      },
    ]
  }
  return [{ companyName: 'Items', lines }]
}

// Shared IM page + BM dialog body — header meta, lines, invoices, timeline
export function OrderDetailContent({
  order,
  loading = false,
  showStatusInHeader = true,
  headerActions = null,
  footer = null,
}) {
  const [invoiceBusy, setInvoiceBusy] = useState(false)

  if (!order) return null

  const lines = order.lines || []
  const events = order.events || []
  const companyBlocks = buildCompanyBlocks(order)

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Order {order.orderNumber}
            </h2>
            {showStatusInHeader ? <OrderStatusBadge status={order.status} /> : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Submitted by {order.createdByName || 'Inventory Manager'}
            {order.createdAt ? (
              <>
                {' · '}
                <DateTimeLines value={order.createdAt} className="inline-flex" />
              </>
            ) : null}
          </p>
        </div>
        {headerActions ? (
          <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-slate-50/60 px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
        <span>
          Companies:{' '}
          <strong className="text-slate-900">
            {order.companiesNumber ?? companyBlocks.length}
          </strong>
        </span>
        <span>
          Items:{' '}
          <strong className="text-slate-900">{order.itemsNumber ?? lines.length}</strong>
        </span>
        {order.approvedByName ? (
          <span>
            Reviewed by: <strong className="text-slate-900">{order.approvedByName}</strong>
            {order.approvedAt ? (
              <>
                {' · '}
                <DateTimeLines value={order.approvedAt} className="inline-flex" />
              </>
            ) : null}
          </span>
        ) : null}
        {order.rejectedByName ? (
          <span>
            Rejected by: <strong className="text-slate-900">{order.rejectedByName}</strong>
            {order.rejectedAt ? (
              <>
                {' · '}
                <DateTimeLines value={order.rejectedAt} className="inline-flex" />
              </>
            ) : null}
          </span>
        ) : null}
        {order.receivedAt ? (
          <span>
            Received at:{' '}
            <DateTimeLines
              value={order.receivedAt}
              className="inline-flex font-medium text-slate-900"
            />
          </span>
        ) : null}
        {order.completedByName || order.status === 'received' ? (
          <span>
            Completed by:{' '}
            <strong className="text-slate-900">
              {order.completedByName || 'Inventory Manager'}
            </strong>
            {order.receivedAt ? (
              <>
                {' · '}
                <DateTimeLines value={order.receivedAt} className="inline-flex" />
              </>
            ) : null}
          </span>
        ) : null}
      </div>

      {order.rejectionNotes ? (
        <p className="rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-800">
          <span className="font-medium">Rejection notes:</span> {order.rejectionNotes}
        </p>
      ) : null}

      <div className="flex flex-col gap-5">
        {companyBlocks.map((company, idx) => (
          <section
            key={company.supplierId || company.id || idx}
            className="rounded-xl border border-border bg-slate-50/40 p-4 sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2.5">
              {company.imageUrl ? (
                <img
                  src={company.imageUrl}
                  alt=""
                  className="size-9 rounded-lg object-cover"
                />
              ) : null}
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                {company.companyName || 'Supplier company'}
              </h3>
            </div>
            <CompanyLinesTable lines={company.lines || []} orderStatus={order.status} />
          </section>
        ))}
      </div>

      {order.explanation ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Explanation:</span> {order.explanation}
        </p>
      ) : null}

      <OrderInvoicesSection
        order={order}
        busy={loading || invoiceBusy}
        onBusyChange={setInvoiceBusy}
      />

      <OrderTimeline events={events} className="rounded-xl border border-slate-200 bg-white p-4" />

      {footer}
    </div>
  )
}

export default OrderDetailContent
