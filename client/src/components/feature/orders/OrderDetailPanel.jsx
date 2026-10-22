import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { displayItemCode } from '@/lib/formatDisplayId'
import { money } from '@/lib/mapProduct'
import { OrderStatusBadge } from '@/lib/orderStatus'

function lineReceivedLabel(line) {
  const ordered = Number(line.quantity) || 0
  const received = Number(line.receivedQuantity) || 0
  if (received <= 0) return 'Not received'
  if (received >= ordered) return 'Received'
  return 'Partial'
}

function lineReceivedClass(line) {
  const ordered = Number(line.quantity) || 0
  const received = Number(line.receivedQuantity) || 0
  if (received <= 0) return 'bg-slate-100 text-slate-600'
  if (received >= ordered) return 'bg-emerald-50 text-emerald-700'
  return 'bg-orange-50 text-orange-800'
}

function CompanyLinesTable({ lines = [] }) {
  if (!lines.length) {
    return <p className="text-sm text-slate-500">No items in this company block.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <Table className="min-w-[560px] text-left text-sm">
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
            <TableHead className="px-3 py-2">Item</TableHead>
            <TableHead className="px-3 py-2">Ordered</TableHead>
            <TableHead className="px-3 py-2">Received</TableHead>
            <TableHead className="px-3 py-2">Prev. price</TableHead>
            <TableHead className="px-3 py-2">Line status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id || line.productId}>
              <TableCell className="px-3 py-2">
                <span className="font-medium">{line.name}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                  {displayItemCode(line)}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2">{line.quantity}</TableCell>
              <TableCell className="px-3 py-2">{line.receivedQuantity ?? 0}</TableCell>
              <TableCell className="px-3 py-2 text-slate-500">
                {money(line.lastPurchasePrice)}
              </TableCell>
              <TableCell className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${lineReceivedClass(line)}`}
                >
                  {lineReceivedLabel(line)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Shared IM/BM read-only order detail + TL §8 timeline
export function OrderDetailPanel({
  open,
  onOpenChange,
  order = null,
  loading = false,
  onPrint,
}) {
  if (!order) return null

  const companies = Array.isArray(order.companies) ? order.companies : []
  const lines = order.lines || []
  const events = order.events || []
  const companyBlocks =
    companies.length > 0
      ? companies
      : order.supplierId
        ? [
            {
              supplierId: order.supplierId,
              companyName: order.companyName || 'Supplier',
              imageUrl: null,
              lines,
            },
          ]
        : [{ companyName: 'Items', lines }]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Order {order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            Submitted by {order.createdByName || 'Inventory Manager'}
            {order.createdAt ? (
              <>
                {' · '}
                <DateTimeLines value={order.createdAt} className="inline-flex" />
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-xl border border-border bg-slate-50/60 px-3 py-2 text-xs text-slate-600 sm:grid-cols-2">
          <span>
            Companies:{' '}
            <strong className="text-slate-900">{order.companiesNumber ?? companyBlocks.length}</strong>
          </span>
          <span>
            Items: <strong className="text-slate-900">{order.itemsNumber ?? lines.length}</strong>
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
              <DateTimeLines value={order.receivedAt} className="inline-flex font-medium text-slate-900" />
            </span>
          ) : null}
        </div>

        {order.rejectionNotes ? (
          <p className="rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-sm text-rose-800">
            <span className="font-medium">Rejection notes:</span> {order.rejectionNotes}
          </p>
        ) : null}

        <div className="space-y-4">
          {companyBlocks.map((company, idx) => (
            <section
              key={company.supplierId || company.id || idx}
              className="rounded-xl border border-border bg-slate-50/40 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                {company.imageUrl ? (
                  <img
                    src={company.imageUrl}
                    alt=""
                    className="size-8 rounded-lg object-cover"
                  />
                ) : null}
                <h3 className="text-sm font-semibold text-slate-900">
                  {company.companyName || 'Supplier company'}
                </h3>
              </div>
              <CompanyLinesTable lines={company.lines || []} />
            </section>
          ))}
        </div>

        {order.explanation ? (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">Explanation:</span> {order.explanation}
          </p>
        ) : null}

        <OrderTimeline events={events} />

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            onClick={() => onOpenChange?.(false)}
          >
            Close
          </Button>
          {onPrint ? (
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              disabled={loading}
              onClick={() => onPrint?.(order)}
            >
              Download PDF
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrderDetailPanel
