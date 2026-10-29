import { useEffect, useMemo, useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
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

function remainingOf(line) {
  return Math.max(0, Number(line.quantity) - Number(line.receivedQuantity || 0))
}

function LineStatusPill({ line, orderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${lineReceivedClass(line, orderStatus)}`}
    >
      {lineReceivedLabel(line, orderStatus)}
    </span>
  )
}

// Read-only lines (BM popup + completed/pending IM orders)
function CompanyLinesTable({ lines = [], orderStatus = '' }) {
  if (!lines.length) {
    return <p className="text-sm text-slate-500">No items in this company block.</p>
  }

  return (
    <>
      {/* Mobile cards — no horizontal scroll */}
      <ul className="space-y-2 md:hidden">
        {lines.map((line) => (
          <li
            key={line.id || line.productId}
            className="rounded-xl border border-border bg-white px-3 py-3"
          >
            <p className="font-medium text-slate-900">{line.name}</p>
            <p className="font-mono text-[11px] text-slate-400">{displayItemCode(line)}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <span>
                Ordered: <strong className="text-slate-900">{line.quantity}</strong>
              </span>
              <span>
                Received: <strong className="text-slate-900">{line.receivedQuantity ?? 0}</strong>
              </span>
              <span>
                Prev. price: <strong className="text-slate-900">{money(line.lastPurchasePrice)}</strong>
              </span>
              <span className="flex items-center">
                <LineStatusPill line={line} orderStatus={orderStatus} />
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-white md:block">
        <Table className="w-full table-fixed text-left text-sm">
          <TableHeader>
            <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
              <TableHead className="px-3 py-2.5 sm:px-4">Item</TableHead>
              <TableHead className="w-20 px-2 py-2.5 text-right sm:w-24 sm:px-4">Ordered</TableHead>
              <TableHead className="w-20 px-2 py-2.5 text-right sm:w-24 sm:px-4">Received</TableHead>
              <TableHead className="w-24 px-2 py-2.5 text-right sm:w-28 sm:px-4">Prev. price</TableHead>
              <TableHead className="w-28 px-2 py-2.5 sm:w-36 sm:px-4">Line status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id || line.productId}>
                <TableCell className="px-3 py-2.5 sm:px-4">
                  <span className="font-medium text-slate-900">{line.name}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                    {displayItemCode(line)}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-2.5 text-right tabular-nums sm:px-4">
                  {line.quantity}
                </TableCell>
                <TableCell className="px-2 py-2.5 text-right tabular-nums sm:px-4">
                  {line.receivedQuantity ?? 0}
                </TableCell>
                <TableCell className="px-2 py-2.5 text-right tabular-nums text-slate-600 sm:px-4">
                  {money(line.lastPurchasePrice)}
                </TableCell>
                <TableCell className="px-2 py-2.5 whitespace-nowrap sm:px-4">
                  <LineStatusPill line={line} orderStatus={orderStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

// QA rework 092A option 2 — edit receive-now qty inline (no Record Receival modal button)
function ReceivalEditableTable({
  lines = [],
  orderStatus = '',
  draftById = {},
  loading = false,
  onPatch,
}) {
  if (!lines.length) {
    return <p className="text-sm text-slate-500">No items in this company block.</p>
  }

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {lines.map((line) => {
          const remaining = remainingOf(line)
          const already = Number(line.receivedQuantity) || 0
          const draft = draftById[line.id]
          const receiveNow = draft?.quantity ?? (remaining > 0 ? remaining : 0)
          const editable = remaining > 0
          return (
            <li
              key={line.id || line.productId}
              className="rounded-xl border border-border bg-white px-3 py-3"
            >
              <p className="font-medium text-slate-900">{line.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{displayItemCode(line)}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>
                  Ordered: <strong className="text-slate-900">{line.quantity}</strong>
                </span>
                <span>
                  Already: <strong className="text-slate-900">{already}</strong>
                </span>
                <span>
                  Remaining: <strong className="text-slate-900">{remaining}</strong>
                </span>
                <span>
                  Prev.: <strong className="text-slate-900">{money(line.lastPurchasePrice)}</strong>
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Label className="text-xs text-slate-500">Receive now</Label>
                {editable ? (
                  <WholeNumberInput
                    min={0}
                    max={remaining}
                    allowEmpty
                    value={receiveNow}
                    disabled={loading}
                    className="h-8 w-24"
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '' || raw == null) {
                        onPatch?.(line.id, '')
                        return
                      }
                      const n = Math.trunc(Number(raw) || 0)
                      onPatch?.(line.id, Math.min(remaining, Math.max(0, n)))
                    }}
                  />
                ) : (
                  <span className="text-sm tabular-nums text-slate-500">0</span>
                )}
              </div>
              <div className="mt-2">
                <LineStatusPill line={line} orderStatus={orderStatus} />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="hidden rounded-xl border border-border bg-white md:block">
        <Table className="w-full table-fixed text-left text-sm">
          <TableHeader>
            <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
              <TableHead className="px-3 py-2.5">Item</TableHead>
              <TableHead className="w-16 px-2 py-2.5 text-right">Ordered</TableHead>
              <TableHead className="w-16 px-2 py-2.5 text-right">Already</TableHead>
              <TableHead className="w-24 px-2 py-2.5 text-right">Receive now</TableHead>
              <TableHead className="w-20 px-2 py-2.5 text-right">Prev. price</TableHead>
              <TableHead className="w-28 px-2 py-2.5">Line status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const remaining = remainingOf(line)
              const already = Number(line.receivedQuantity) || 0
              const draft = draftById[line.id]
              const receiveNow = draft?.quantity ?? (remaining > 0 ? remaining : 0)
              const editable = remaining > 0
              return (
                <TableRow key={line.id || line.productId}>
                  <TableCell className="px-3 py-2.5">
                    <span className="font-medium text-slate-900">{line.name}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                      {displayItemCode(line)}
                    </span>
                    {editable ? (
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        Remaining {remaining}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-right tabular-nums">{line.quantity}</TableCell>
                  <TableCell className="px-2 py-2.5 text-right tabular-nums">{already}</TableCell>
                  <TableCell className="px-2 py-2.5 text-right">
                    {editable ? (
                      <WholeNumberInput
                        min={0}
                        max={remaining}
                        allowEmpty
                        value={receiveNow}
                        disabled={loading}
                        className="ml-auto h-8 w-20"
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '' || raw == null) {
                            onPatch?.(line.id, '')
                            return
                          }
                          const n = Math.trunc(Number(raw) || 0)
                          onPatch?.(line.id, Math.min(remaining, Math.max(0, n)))
                        }}
                      />
                    ) : (
                      <span className="tabular-nums text-slate-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-right tabular-nums text-slate-600">
                    {money(line.lastPurchasePrice)}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 whitespace-nowrap">
                    <LineStatusPill line={line} orderStatus={orderStatus} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
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

function buildReceivalDraft(order) {
  const map = {}
  for (const line of order?.lines || []) {
    if (!line?.id) continue
    const remaining = remainingOf(line)
    if (remaining <= 0) continue
    map[line.id] = { quantity: remaining }
  }
  return map
}

// Shared IM page + BM dialog body — header meta, lines, invoices, timeline
export function OrderDetailContent({
  order,
  loading = false,
  showStatusInHeader = true,
  headerActions = null,
  footer = null,
  // QA 092A — inline receival on IM detail page only
  receivalEnabled = false,
  onSubmitReceival,
}) {
  const [invoiceBusy, setInvoiceBusy] = useState(false)
  const [draftById, setDraftById] = useState({})
  const [notes, setNotes] = useState('')

  // Rebuild draft whenever server lines/remaining change (incl. force-refetch after race)
  const receivalSyncKey = useMemo(() => {
    if (!order?.id || !receivalEnabled) return ''
    const parts = (order.lines || []).map(
      (line) => `${line.id}:${line.quantity}:${line.receivedQuantity ?? 0}`,
    )
    return `${order.id}|${order.status}|${parts.join(',')}`
  }, [order, receivalEnabled])

  useEffect(() => {
    if (!order || !receivalEnabled) {
      setDraftById({})
      setNotes('')
      return
    }
    setDraftById(buildReceivalDraft(order))
    setNotes('')
  }, [receivalSyncKey, order, receivalEnabled])

  const linesToReceive = useMemo(() => {
    return Object.entries(draftById)
      .map(([id, row]) => {
        const qty = Number(row?.quantity)
        if (!Number.isFinite(qty) || qty <= 0) return null
        return { purchaseOrderItemId: id, quantity: qty }
      })
      .filter(Boolean)
  }, [draftById])

  const canSubmitReceival = linesToReceive.length > 0

  function patchReceival(lineId, quantity) {
    setDraftById((prev) => ({
      ...prev,
      [lineId]: { quantity },
    }))
  }

  if (!order) return null

  const lines = order.lines || []
  const events = order.events || []
  const companyBlocks = buildCompanyBlocks(order)
  const hasRemainingDraft = Object.keys(draftById).length > 0

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

      {receivalEnabled ? (
        <p className="rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm text-violet-900">
          Enter <strong>Receive now</strong> quantities in the table (0 skips a line). Then click{' '}
          <strong>Record Stock In</strong> below — no separate receival dialog.
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
            {receivalEnabled ? (
              <ReceivalEditableTable
                lines={company.lines || []}
                orderStatus={order.status}
                draftById={draftById}
                loading={loading}
                onPatch={patchReceival}
              />
            ) : (
              <CompanyLinesTable lines={company.lines || []} orderStatus={order.status} />
            )}
          </section>
        ))}
      </div>

      {receivalEnabled && hasRemainingDraft ? (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4">
          <div className="space-y-1.5">
            <Label htmlFor="inline-receival-notes">Notes (optional)</Label>
            <Textarea
              id="inline-receival-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery batch, invoice ref, etc."
              className="min-h-20"
              maxLength={2000}
              disabled={loading}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="brand"
              className="cursor-pointer"
              loading={loading}
              disabled={!canSubmitReceival || loading}
              onClick={() =>
                onSubmitReceival?.({
                  lines: linesToReceive,
                  notes: notes.trim() || undefined,
                })
              }
            >
              Record Stock In
            </Button>
            <p className="self-center text-xs text-slate-500">
              {canSubmitReceival
                ? `${linesToReceive.length} line(s) will be stocked in`
                : 'Set at least one Receive now quantity above 0'}
            </p>
          </div>
        </div>
      ) : null}

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
