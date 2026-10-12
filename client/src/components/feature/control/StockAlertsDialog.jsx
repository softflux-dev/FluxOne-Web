import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { displayItemCode } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

const STATUS_META = {
  low: { label: 'Low stock', className: 'bg-amber-50 text-amber-700' },
  out: { label: 'Out of stock', className: 'bg-red-50 text-red-700' },
  in: { label: 'In stock', className: 'bg-emerald-50 text-emerald-700' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.low
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        meta.className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {meta.label}
    </span>
  )
}

// Override Dialog defaults (md:max-w-xl) so Status / Actions stay in view.
const DIALOG_WIDTH =
  'max-w-[min(96vw,72rem)] sm:max-w-[min(96vw,72rem)] md:max-w-[min(96vw,72rem)]'

// Stock Alerts — Figma Global-StockAlert compact table
export function StockAlertsDialog({
  open,
  onOpenChange,
  onEditThreshold,
  onChanged,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadAlerts() {
    setLoading(true)
    const res = await apiClient.get(endpoints.control.alerts)
    const list = res.success && Array.isArray(res.data?.items) ? res.data.items : []
    setItems(list)
    setLoading(false)
    onChanged?.(list.length)
  }

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      await loadAlerts()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const count = items.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_WIDTH}>
        <DialogHeader>
          <DialogTitle>Stock Alerts</DialogTitle>
          <DialogDescription>
            {count > 0
              ? `${count} item${count === 1 ? '' : 's'} need attention. Alerts resolve automatically when stock is replenished.`
              : 'No items currently need attention.'}
          </DialogDescription>
        </DialogHeader>

        <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {count} active alerts
        </p>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
        ) : count === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            All clear — no low or out-of-stock alerts.
          </p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto overflow-x-hidden rounded-xl border border-border">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-slate-50 text-[11px] tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="w-[30%] px-3 py-2.5 font-semibold">Item / variant</th>
                  <th className="w-[18%] px-3 py-2.5 font-semibold">Category</th>
                  <th className="w-[12%] px-3 py-2.5 font-semibold">Current stock</th>
                  <th className="w-[10%] px-3 py-2.5 font-semibold">Threshold</th>
                  <th className="w-[16%] px-3 py-2.5 font-semibold">Status</th>
                  <th className="w-[14%] px-3 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-border bg-white">
                    <td className="px-3 py-3 align-middle">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ProductImageCell src={row.imageUrl} name={row.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900" title={row.name}>
                            {row.name}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {[
                              row.variantLabel || row.scale,
                              displayItemCode({
                                itemCode: row.itemCode,
                                productId: row.id,
                              }),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <p className="truncate text-slate-800" title={row.categoryName || ''}>
                        {row.categoryName || '—'}
                      </p>
                      {row.subcategoryName ? (
                        <p className="truncate text-xs text-slate-400">{row.subcategoryName}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-middle font-semibold tabular-nums text-slate-900">
                      {row.quantity}
                    </td>
                    <td className="px-3 py-3 align-middle tabular-nums text-slate-600">
                      {row.reorderPoint}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <StatusBadge status={row.stockStatus} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {/* Threshold only — add-stock (+) removed for cleaner actions */}
                      <button
                        type="button"
                        className="cursor-pointer text-sm font-semibold whitespace-nowrap hover:underline"
                        style={{ color: BRAND.purple }}
                        onClick={() => {
                          onOpenChange?.(false)
                          onEditThreshold?.(row)
                        }}
                      >
                        Threshold
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default StockAlertsDialog
