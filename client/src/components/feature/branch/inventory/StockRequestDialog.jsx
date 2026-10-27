import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { BRAND } from '@/lib/constants'
import { formatMoney } from '@/lib/currency'
import { displayItemCode } from '@/lib/formatDisplayId'
import { formatShelfQuantity, suggestRestockQty } from '@/lib/shelfStockStatus'
import { toastError, toastSuccess } from '@/lib/toast'
import { apiClient } from '@/api/api'

function resolveProductPrice(prod) {
  if (!prod) return null
  const price = Number(prod.finalPrice ?? prod.sellingPrice ?? 0)
  return Number.isFinite(price) && price > 0 ? price : null
}

/**
 * Legacy BM→IM shelf replenishment dialog (POST /branch/stock-requests).
 * Inventory Monitoring "Stock Request" no longer uses this — it opens Demand Requests
 * (IM→BM order flow). Keep for any remaining callers of the stock-requests API.
 */
export function StockRequestDialog({ open, target, onOpenChange, onSent }) {
  const [requiredQty, setRequiredQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !target) return
    setRequiredQty(suggestRestockQty(target.quantity, target.reorderPoint))
  }, [open, target?.id, target?.quantity, target?.reorderPoint])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!target?.id) return

    const qty = Math.floor(Number(requiredQty))
    if (!Number.isFinite(qty) || qty < 1) {
      toastError('Required quantity must be a whole number of at least 1')
      return
    }

    setSubmitting(true)
    const res = await apiClient.post('/branch/stock-requests', {
      productId: target.id,
      kind: 'request',
      remainingQuantity: qty,
    })
    setSubmitting(false)

    if (!res.success) {
      toastError(res.error || 'Failed to send stock request')
      return
    }

    toastSuccess('Stock request sent to Inventory Management successfully')
    onOpenChange?.(false)
    onSent?.(res.data)
  }

  const stock = formatShelfQuantity(target?.quantity, target?.scale || 'pcs')
  const price = resolveProductPrice(target)
  const skuCode = target ? displayItemCode(target) : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange?.(false)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Stock Request</DialogTitle>
          <DialogDescription>
            Request replenishment from Inventory Management for this shelf item.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-slate-500">Product</span>
                <span className="text-right font-medium text-slate-900">{target.name}</span>
              </div>
              {skuCode && skuCode !== '—' ? (
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-slate-500">SKU</span>
                  <span className="text-right font-mono text-xs text-slate-700">{skuCode}</span>
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-slate-500">Current Stock</span>
                <span className="text-right font-mono font-medium text-slate-900">
                  {stock.display}
                </span>
              </div>
              {price != null ? (
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-slate-500">Product Price</span>
                  <span className="text-right font-medium text-slate-900">{formatMoney(price)}</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-qty">Required Quantity</Label>
              <WholeNumberInput
                id="request-qty"
                min={1}
                value={requiredQty}
                onChange={(e) => setRequiredQty(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>

            <DialogFooter>
              <DialogCancelButton disabled={submitting} className="w-full sm:w-auto" />
              <Button
                type="submit"
                loading={submitting}
                className="w-full text-white sm:w-auto"
                style={{ backgroundColor: BRAND.purple }}
              >
                Send Request
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default StockRequestDialog
