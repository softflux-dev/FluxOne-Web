import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { displayItemCode } from '@/lib/formatDisplayId'
import { formatDateTimeInline } from '@/lib/formatDateTime'
import { mapStockMovement, MOVEMENT_TYPES } from '@/lib/mapStockMovement'

const LIST_PATH = {
  [MOVEMENT_TYPES.IN]: endpoints.control.stockIn,
  [MOVEMENT_TYPES.OUT]: endpoints.control.stockOut,
  // Unified adjustment history (includes damaged / expired / other)
  [MOVEMENT_TYPES.ADJUSTMENT]: endpoints.control.adjustmentLedger,
  [MOVEMENT_TYPES.DAMAGED]: endpoints.control.adjustmentLedger,
  [MOVEMENT_TYPES.EXPIRED]: endpoints.control.adjustmentLedger,
  [MOVEMENT_TYPES.OTHER]: endpoints.control.adjustmentLedger,
}

function DetailRow({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value || '—'}</p>
    </div>
  )
}

// Read-only movement details + recent history for the same product
export function ViewMovementDetailsDialog({ open, onOpenChange, row = null, tab }) {
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!open || !row?.productId) return undefined
    const historyTab = row?.movementType || tab
    const path = LIST_PATH[historyTab] || endpoints.control.stockIn
    let cancelled = false

    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoadingHistory(true)
      try {
        const res = await apiClient.get(path, {
          productId: row.productId,
          page: 1,
          limit: 20,
        })
        if (cancelled) return
        const items = Array.isArray(res?.data?.items) ? res.data.items : []
        setHistory(items.map(mapStockMovement))
      } catch {
        if (!cancelled) setHistory([])
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, row?.productId, row?.movementType, tab])

  const shownHistory = open && row?.productId ? history : []

  const categoryLine = [row?.categoryName, row?.subcategoryName].filter(Boolean).join(' / ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Movement details</DialogTitle>
          <DialogDescription>
            {displayItemCode({
              itemCode: row?.itemCode,
              productId: row?.productId,
            })}{' '}
            · {row?.productName || 'Record'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow
            label="Item-ID"
            value={displayItemCode({
              itemCode: row?.itemCode,
              productId: row?.productId,
            })}
          />
          <DetailRow label="Product name" value={row?.productName} />
          <DetailRow label="Category" value={categoryLine || '—'} />
          <DetailRow
            label="Variant / Scale"
            value={row?.variantLabel || row?.scale}
          />
          <DetailRow
            label="Item type"
            value={row?.type ? String(row.type) : null}
          />
          <DetailRow
            label="Barcode"
            value={row?.barcode || null}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Date · Time
            </p>
            <div className="mt-0.5">
              <DateTimeLines value={row?.createdAt} />
            </div>
          </div>
          <DetailRow label="Quantity" value={String(row?.quantity ?? '—')} />
          <DetailRow label="Company" value={row?.companyName} />
          <div className="min-w-0 sm:col-span-2">
            <DetailRow label="Notes / Reason" value={row?.notes || row?.reason} />
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-semibold text-slate-900">Stock history</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Recent ledger rows for this product on the current tab.
          </p>
          {loadingHistory ? (
            <p className="mt-3 text-sm text-slate-500">Loading history…</p>
          ) : shownHistory.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No history rows found.</p>
          ) : (
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {shownHistory.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-slate-50/80 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">
                      {displayItemCode({
                        itemCode: item.itemCode,
                        productId: item.productId,
                      })}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateTimeInline(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-800">
                    Qty {item.quantity}
                    {item.notes || item.reason
                      ? ` · ${item.notes || item.reason}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ViewMovementDetailsDialog
