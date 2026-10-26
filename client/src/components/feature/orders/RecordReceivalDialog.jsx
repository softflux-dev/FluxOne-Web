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
import { Checkbox } from '@/components/ui/checkbox'
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

function ReceivalLinesTable({ rows, loading, patchRow }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <Table className="min-w-[560px] text-left text-sm">
        <TableHeader>
          <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
            <TableHead className="w-12 px-3 py-2"> </TableHead>
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
              <TableCell className="px-3 py-2">
                <Checkbox
                  checked={row.selected}
                  disabled={loading}
                  onCheckedChange={(checked) =>
                    patchRow(row.purchaseOrderItemId, { selected: Boolean(checked) })
                  }
                  aria-label={`Select ${row.name}`}
                />
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
                  min={1}
                  max={row.remaining}
                  allowEmpty={false}
                  value={row.quantity}
                  disabled={loading || !row.selected}
                  className="h-8 w-20"
                  onChange={(e) => {
                    const n = Math.trunc(Number(e.target.value) || 0)
                    const clamped = Math.min(row.remaining, Math.max(1, n))
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

// Parent: IM Record Receival — tick lines, qty ≤ remaining
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
    setRows(
      lines
        .map((line) => {
          const remaining = remainingOf(line)
          if (remaining <= 0) return null
          return {
            purchaseOrderItemId: line.id,
            name: line.name || '',
            itemCode: line.itemCode || '',
            scale: line.scale || 'unit',
            supplierId: line.supplierId || null,
            supplierCompanyName: line.supplierCompanyName || order.companyName || '—',
            lastPurchasePrice: Number(line.lastPurchasePrice ?? line.unitCost ?? 0),
            ordered: Number(line.quantity) || 0,
            already: Number(line.receivedQuantity) || 0,
            remaining,
            selected: true,
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

  const selectedLines = useMemo(
    () => rows.filter((row) => row.selected && row.quantity > 0),
    [rows],
  )

  const canSubmit = selectedLines.length > 0

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
            Tick lines that arrived this round. Quantity cannot exceed remaining.
            Stock In is written to the ledger against this Order ID.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No remaining quantities on this order. Use Mark Complete if you are finished.
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

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading}
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading || !canSubmit}
            onClick={() =>
              onConfirm?.({
                lines: selectedLines.map((row) => ({
                  purchaseOrderItemId: row.purchaseOrderItemId,
                  quantity: row.quantity,
                })),
                notes: notes.trim() || undefined,
              })
            }
          >
            {loading ? 'Recording…' : 'Record Stock In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RecordReceivalDialog
