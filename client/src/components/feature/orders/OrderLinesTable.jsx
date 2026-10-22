import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { money } from '@/lib/mapProduct'
import { cn } from '@/lib/utils'

function QtyStepper({ value, onChange, disabled }) {
  const qty = Math.max(1, Number(value) || 1)

  function setQty(next) {
    const n = Math.max(1, Math.trunc(Number(next) || 1))
    onChange?.(n)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8 shrink-0"
        disabled={disabled || qty <= 1}
        onClick={() => setQty(qty - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </Button>
      <WholeNumberInput
        min={1}
        allowEmpty={false}
        value={qty}
        disabled={disabled}
        className="h-8 w-16 text-center"
        onChange={(e) => setQty(e.target.value)}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8 shrink-0"
        disabled={disabled}
        onClick={() => setQty(qty + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}

// Child: required-quantity lines for one company block
export function OrderLinesTable({
  lines = [],
  onQuantityChange,
  onRemove,
  className,
}) {
  if (!lines.length) {
    return (
      <p className={cn('rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500', className)}>
        No items yet — use filters above and click Add.
      </p>
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
      <Table className="min-w-[640px] text-left text-sm">
        <TableHeader>
          <TableRow className="text-xs uppercase tracking-wide text-slate-400">
            <TableHead className="px-3 py-3 font-semibold">Item Name</TableHead>
            <TableHead className="px-3 py-3 font-semibold">Category / Sub Category</TableHead>
            <TableHead className="px-3 py-3 font-semibold">Previous Purchase Price</TableHead>
            <TableHead className="px-3 py-3 font-semibold">Required Quantity</TableHead>
            <TableHead className="px-3 py-3 font-semibold">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.productId} className="align-middle">
              <TableCell className="px-3 py-3">
                <span className="block font-medium text-slate-900">{line.name}</span>
                {line.itemCode ? (
                  <span className="font-mono text-[11px] text-purple-700">{line.itemCode}</span>
                ) : null}
              </TableCell>
              <TableCell className="px-3 py-3 text-slate-600">{line.categoryPath || '—'}</TableCell>
              <TableCell className="px-3 py-3">
                <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  Rs {money(line.lastPurchasePrice ?? line.unitCost)}
                </span>
              </TableCell>
              <TableCell className="px-3 py-3">
                <QtyStepper
                  value={line.quantity}
                  onChange={(qty) => onQuantityChange?.(line.productId, qty)}
                />
              </TableCell>
              <TableCell className="px-3 py-3">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-rose-600 hover:bg-rose-50"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => onRemove?.(line.productId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default OrderLinesTable
