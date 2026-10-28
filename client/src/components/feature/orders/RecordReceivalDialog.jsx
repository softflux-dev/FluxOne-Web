import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { displayItemCode, displayOrderRef } from '@/lib/formatDisplayId'
import { money } from '@/lib/mapProduct'

function remainingOf(line) {
  return Math.max(0, Number(line.quantity) - Number(line.receivedQuantity || 0))
}

// Group remaining receival rows by supplier — same viewing flow as OrderDetailPanel
function groupReceivalBySupplier(order, rows) {
  const companies = Array.isArray(order?.companies) ? order.companies : []

  if (companies.length > 0) {
    return companies
      .map((company) => {
        const companyName = company.companyName || 'Supplier'
        const supplierId = company.supplierId ?? null
        const companyRows = rows.filter((row) => {
          if (supplierId && row.supplierId) return row.supplierId === supplierId
          return row.supplierCompanyName === companyName
        })
        return {
          key: supplierId || companyName,
          supplierId,
          companyName,
          imageUrl: company.imageUrl || null,
          rows: companyRows,
        }
      })
      .filter((block) => block.rows.length > 0)
  }

  // Fallback when order has no companies[] — group flat lines by supplier
  const map = new Map()
  for (const row of rows) {
    const key = row.supplierId || row.supplierCompanyName || '—'
    if (!map.has(key)) {
      map.set(key, {
        key,
        supplierId: row.supplierId || null,
        companyName: row.supplierCompanyName || 'Supplier',
        imageUrl: null,
        rows: [],
      })
    }
    map.get(key).rows.push(row)
  }
  return [...map.values()]
}

// QA TC-ORDER RECEVAL-93A — Serial No. instead of non-functional checkboxes
function ReceivalLinesTable({ rows, loading, patchRow }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <Table className="min-w-[560px] text-left text-sm">
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
            <TableHead className="w-14 px-3 py-2">S. No.</TableHead>
            <TableHead className="px-3 py-2">Item</TableHead>
            <TableHead className="px-3 py-2">Ordered</TableHead>
            <TableHead className="px-3 py-2">Already</TableHead>
            <TableHead className="px-3 py-2">Remaining</TableHead>
            <TableHead className="px-3 py-2">Prev. price</TableHead>
            <TableHead className="px-3 py-2">Receive now</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.purchaseOrderItemId}>
              <TableCell className="px-3 py-2 tabular-nums text-slate-500">
                {row.serialNo}
              </TableCell>
              <TableCell className="px-3 py-2">
                <span className="font-medium text-slate-900">{row.name}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                  {displayItemCode(row)}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2 text-slate-600">{row.ordered}</TableCell>
              <TableCell className="px-3 py-2 text-slate-600">{row.already}</TableCell>
              <TableCell className="px-3 py-2 font-medium text-slate-800">
                {row.remaining}
              </TableCell>
              <TableCell className="px-3 py-2 text-slate-600">
                {money(row.lastPurchasePrice)}
              </TableCell>
              <TableCell className="px-3 py-2">
                <WholeNumberInput
                  min={0}
                  max={row.remaining}
                  allowEmpty
                  value={row.quantity}
                  disabled={loading}
                  className="h-8 w-20"
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '' || raw == null) {
                      patchRow(row.purchaseOrderItemId, { quantity: '' })
                      return
                    }
                    const n = Math.trunc(Number(raw) || 0)
                    const clamped = Math.min(row.remaining, Math.max(0, n))
                    patchRow(row.purchaseOrderItemId, { quantity: clamped })
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Parent: IM Record Receival — enter qty per line (0 = skip this round)
export function RecordReceivalDialog({
  open,
  onOpenChange,
  order = null,
  loading = false,
  onConfirm,
}) {
  const [rows, setRows] = useState([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open || !order) return
    const lines = Array.isArray(order.lines) ? order.lines : []
    setNotes('')
    let serial = 0
    setRows(
      lines
        .map((line) => {
          const remaining = remainingOf(line)
          if (remaining <= 0) return null
          serial += 1
          return {
            purchaseOrderItemId: line.id,
            serialNo: serial,
            name: line.name || '',
            itemCode: line.itemCode || '',
            scale: line.scale || 'unit',
            supplierId: line.supplierId || null,
            supplierCompanyName: line.supplierCompanyName || order.companyName || '—',
            lastPurchasePrice: Number(line.lastPurchasePrice ?? line.unitCost ?? 0),
            ordered: Number(line.quantity) || 0,
            already: Number(line.receivedQuantity) || 0,
            remaining,
            quantity: remaining,
          }
        })
        .filter(Boolean),
    )
  }, [open, order])

  // use reusable grouping — mirror OrderDetailPanel companyBlocks
  const companyBlocks = useMemo(
    () => (order ? groupReceivalBySupplier(order, rows) : []),
    [order, rows],
  )

  // Lines with Receive now > 0 are included in this stock-in round
  const linesToReceive = useMemo(
    () =>
      rows.filter((row) => {
        const qty = Number(row.quantity)
        return Number.isFinite(qty) && qty > 0
      }),
    [rows],
  )

  const canSubmit = linesToReceive.length > 0

  function patchRow(id, patch) {
    setRows((prev) =>
      prev.map((row) => (row.purchaseOrderItemId === id ? { ...row, ...patch } : row)),
    )
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Receival · {displayOrderRef(order)}</DialogTitle>
          <DialogDescription>
            Enter received quantity for this round (set 0 to skip a line). Quantity cannot exceed
            remaining. Stock In is written to the ledger against this Order ID.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No remaining quantities on this order.
            {order.status === 'partially_received'
              ? ' Use Mark Complete to finalize the order as Received.'
              : ' Record Stock In is unavailable.'}
          </p>
        ) : (
          <div className="space-y-4">
            {companyBlocks.map((company) => (
              <section
                key={company.key}
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
                    {company.companyName}
                  </h3>
                </div>
                <ReceivalLinesTable
                  rows={company.rows}
                  loading={loading}
                  patchRow={patchRow}
                />
              </section>
            ))}
          </div>
        )}

        {rows.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="receival-notes">Notes (optional)</Label>
            <Textarea
              id="receival-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery batch, invoice ref, etc."
              className="min-h-20"
              maxLength={2000}
              disabled={loading}
            />
          </div>
        ) : null}

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading}
            onClick={() => onOpenChange?.(false)}
          >
            {rows.length === 0 ? 'Close' : 'Cancel'}
          </Button>
          {rows.length > 0 ? (
            <Button
              type="button"
              variant="brand"
              className="w-full cursor-pointer sm:w-auto"
              loading={loading}
              disabled={!canSubmit}
              onClick={() =>
                onConfirm?.({
                  lines: linesToReceive.map((row) => ({
                    purchaseOrderItemId: row.purchaseOrderItemId,
                    quantity: Number(row.quantity),
                  })),
                  notes: notes.trim() || undefined,
                })
              }
            >
              Record Stock In
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RecordReceivalDialog
