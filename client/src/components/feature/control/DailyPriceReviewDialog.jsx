import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { displayItemCode } from '@/lib/formatDisplayId'
import { toastError, toastSuccess } from '@/lib/toast'

// Override Dialog defaults (md:max-w-xl) so price columns stay visible.
const DIALOG_WIDTH =
  'max-w-[min(96vw,56rem)] sm:max-w-[min(96vw,56rem)] md:max-w-[min(96vw,56rem)]'

// Daily Price Updates — compact table, per-row purple Save (Figma-style)
export function DailyPriceReviewDialog({ open, onOpenChange, onChanged }) {
  const [items, setItems] = useState([])
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      const res = await apiClient.get(endpoints.control.dailyPrices)
      if (cancelled) return
      const list = res.success && Array.isArray(res.data?.items) ? res.data.items : []
      setItems(list)
      const next = {}
      for (const row of list) {
        next[row.id] = {
          purchasePrice: row.purchasePrice != null ? String(row.purchasePrice) : '',
          sellingPrice: row.sellingPrice != null ? String(row.sellingPrice) : '',
        }
      }
      setDrafts(next)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  function patchDraft(id, key, value) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }))
  }

  async function handleSaveRow(row) {
    const draft = drafts[row.id] || {}
    const purchasePrice = Math.trunc(Number(draft.purchasePrice))
    const sellingPrice = Math.trunc(Number(draft.sellingPrice))
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      toastError('Enter a valid purchase price')
      return
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      toastError('Enter a valid selling price')
      return
    }
    setSavingId(row.id)
    try {
      const res = await apiClient.patch(endpoints.control.dailyPrice(row.id), {
        purchasePrice,
        sellingPrice,
      })
      if (!res.success) {
        toastError(res.error || 'Save failed')
        return
      }
      setItems((prev) => prev.filter((item) => item.id !== row.id))
      toastSuccess('Price updated')
      onChanged?.()
    } finally {
      setSavingId(null)
    }
  }

  const count = items.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_WIDTH}>
        <DialogHeader>
          <DialogTitle>Daily Price Updates</DialogTitle>
          <DialogDescription>
            Review and save each item&apos;s prices. The banner clears when all items are up to
            date.
          </DialogDescription>
        </DialogHeader>

        {!loading && count > 0 ? (
          <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {count} pending update{count === 1 ? '' : 's'}
          </p>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
        ) : count === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No products need daily price updates right now. Enable &quot;Daily price change&quot;
            on a product to include it here.
          </p>
        ) : (
          <>
            {/* Mobile: compact stacked rows */}
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto md:hidden">
              {items.map((row) => {
                const draft = drafts[row.id] || { purchasePrice: '', sellingPrice: '' }
                const scaleLabel = row.variantLabel || row.scale || ''
                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-border bg-white px-3 py-3"
                  >
                    <div className="mb-3 flex min-w-0 items-center gap-2.5">
                      <ProductImageCell src={row.imageUrl} name={row.name} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{row.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {[
                            scaleLabel,
                            displayItemCode({ itemCode: row.itemCode, productId: row.id }),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[11px] font-medium text-slate-500">Purchase</span>
                        <WholeNumberInput
                          min={0}
                          className="h-9 tabular-nums"
                          value={draft.purchasePrice}
                          onChange={(e) => patchDraft(row.id, 'purchasePrice', e.target.value)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-medium text-slate-500">Selling</span>
                        <WholeNumberInput
                          min={0}
                          className="h-9 tabular-nums"
                          value={draft.sellingPrice}
                          onChange={(e) => patchDraft(row.id, 'sellingPrice', e.target.value)}
                        />
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="brand"
                      className="mt-3 w-full"
                      style={{ background: BRAND.purple }}
                      disabled={savingId === row.id}
                      onClick={() => void handleSaveRow(row)}
                    >
                      <Check className="size-4" />
                      {savingId === row.id ? 'Saving…' : 'Save'}
                    </Button>
                  </li>
                )
              })}
            </ul>

            {/* Desktop: dense table like Thresholds / Alerts */}
            <div className="hidden max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-xl border border-border md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 z-[1] bg-slate-50 text-[11px] tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="w-[40%] px-3 py-2.5 font-semibold">Item / variant</th>
                    <th className="w-[20%] px-3 py-2.5 font-semibold">Purchase</th>
                    <th className="w-[20%] px-3 py-2.5 font-semibold">Selling</th>
                    <th className="w-[20%] px-3 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const draft = drafts[row.id] || { purchasePrice: '', sellingPrice: '' }
                    const scaleLabel = row.variantLabel || row.scale || ''
                    return (
                      <tr key={row.id} className="border-t border-border bg-white">
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <ProductImageCell src={row.imageUrl} name={row.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900" title={row.name}>
                                {row.name}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {[
                                  scaleLabel,
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
                        <td className="px-3 py-2.5 align-middle">
                          <WholeNumberInput
                            min={0}
                            aria-label={`Purchase price for ${row.name}`}
                            className="h-9 w-full max-w-[8.5rem] tabular-nums"
                            value={draft.purchasePrice}
                            onChange={(e) =>
                              patchDraft(row.id, 'purchasePrice', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <WholeNumberInput
                            min={0}
                            aria-label={`Selling price for ${row.name}`}
                            className="h-9 w-full max-w-[8.5rem] tabular-nums"
                            value={draft.sellingPrice}
                            onChange={(e) =>
                              patchDraft(row.id, 'sellingPrice', e.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <Button
                            type="button"
                            variant="brand"
                            size="sm"
                            className="h-9"
                            style={{ background: BRAND.purple }}
                            disabled={savingId === row.id}
                            onClick={() => void handleSaveRow(row)}
                          >
                            <Check className="size-4" />
                            {savingId === row.id ? 'Saving…' : 'Save'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DailyPriceReviewDialog
