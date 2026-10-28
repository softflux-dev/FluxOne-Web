import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { money } from '@/lib/mapProduct'

// Price history for an order (last vs current unit cost).
// QA Bug 2 — "same" is not in TL; only show ↑/↓ when price actually changed.
function directionLabel(direction) {
  if (direction === 'up') return { text: '↑ up', className: 'text-red-600' }
  if (direction === 'down') return { text: '↓ down', className: 'text-emerald-600' }
  return null
}

export function PurchaseHistoryList({ open, onOpenChange, history = null }) {
  const lines = history?.lines || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Purchase history</DialogTitle>
          <DialogDescription>
            {history?.orderNumber || 'Order'} · {history?.companyName || ''}
          </DialogDescription>
        </DialogHeader>

        {!lines.length ? (
          <p className="text-sm text-slate-500">No history lines for this order.</p>
        ) : (
          <ul className="space-y-2">
            {lines.map((line) => {
              const dir = directionLabel(line.direction)
              return (
                <li
                  key={line.productId}
                  className="rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{line.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{line.itemCode}</p>
                    </div>
                    {dir ? (
                      <span className={`text-xs font-semibold ${dir.className}`}>{dir.text}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Last {money(line.lastPurchasePrice)} → Current{' '}
                    {money(line.currentPurchasePrice)} ({line.scale})
                  </p>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange?.(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
