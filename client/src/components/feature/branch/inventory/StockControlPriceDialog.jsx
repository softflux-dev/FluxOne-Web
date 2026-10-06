import { useEffect, useState } from 'react'
import { Check, Info, Package, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

function RuleCard({ active, tone, title, body }) {
  const amber = tone === 'amber'
  return (
    <div
      className={cn(
        'flex h-full gap-2.5 rounded-xl border p-3',
        amber ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950',
        active && (amber ? 'ring-2 ring-amber-300' : 'ring-2 ring-emerald-400'),
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
          amber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
        )}
      >
        {amber ? <Package className="size-3.5" /> : <Check className="size-3.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-5">{title}</p>
        <p className="mt-1 text-xs leading-5">{body}</p>
      </div>
    </div>
  )
}

// Branch Manager sets whether a new sell price hits all stock or only the new lot.
export function StockControlPriceDialog({ open, onOpenChange }) {
  const [updateAllStock, setUpdateAllStock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const res = await apiClient.get(endpoints.branch.priceRule)
      if (cancelled) return
      setLoading(false)
      if (res.success) setUpdateAllStock(Boolean(res.data?.updateAllStock))
      else toastError(res.error || 'Could not load stock price settings')
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  async function handleSave() {
    setSaving(true)
    const res = await apiClient.patch(endpoints.branch.priceRule, { updateAllStock })
    setSaving(false)
    if (!res.success) {
      toastError(res.error || 'Could not save settings')
      return
    }
    toastSuccess(updateAllStock ? 'New prices now update all stock' : 'Old stock keeps its price until it sells out')
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-xl">
        <DialogHeader className="mb-3">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-purple-700" />
            Stock Control Price
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-purple-50 px-3 py-2.5 text-purple-950">
            <Info className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5">
                Choose how the new price should apply when new stock is added.
              </p>
              <p className="text-xs leading-5 text-purple-800/80">
                This setting applies to products and bundles.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3 py-3">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-semibold leading-5 text-slate-900">Apply new price to all stock</p>
              <p className="text-xs leading-5 text-slate-500">
                When ON, the new price updates both existing and new stock immediately.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={updateAllStock}
              aria-label={updateAllStock ? 'Update all stock on' : 'Update all stock off'}
              disabled={loading || saving}
              onClick={() => setUpdateAllStock((value) => !value)}
              className={cn(
                'relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                updateAllStock ? 'bg-emerald-500' : 'bg-slate-300',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none absolute text-[10px] font-bold tracking-wide',
                  updateAllStock ? 'left-1.5 text-white' : 'right-1.5 text-slate-600',
                )}
              >
                {updateAllStock ? 'ON' : 'OFF'}
              </span>
              <span
                className={cn(
                  'pointer-events-none absolute top-1 size-6 rounded-full bg-white shadow transition-[left] duration-200',
                  updateAllStock ? 'left-7' : 'left-1',
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
            <RuleCard
              tone="amber"
              active={!updateAllStock}
              title="OFF — Keep Old Stock Price"
              body="Existing stock keeps its current price until sold out. The new price applies to new stock afterward."
            />
            <RuleCard
              tone="green"
              active={updateAllStock}
              title="ON — Update All Stock"
              body="The new price applies immediately to both existing and newly added stock."
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-800">Example</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200">
                  <p className="text-[11px] text-slate-400">Old stock</p>
                  <p className="text-xs font-semibold text-slate-800">10 units @ Rs. 500</p>
                </div>
                <span className="text-sm font-semibold text-slate-400">+</span>
                <div className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200">
                  <p className="text-[11px] text-slate-400">New stock</p>
                  <p className="text-xs font-semibold text-slate-800">20 units @ Rs. 550</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs leading-5 text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">OFF</span>
                  {' '}First 10 @ Rs. 500, then 20 @ Rs. 550
                </p>
                <p>
                  <span className="font-semibold text-slate-800">ON</span>
                  {' '}All 30 units @ Rs. 550
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 sm:mt-4">
          <DialogCancelButton disabled={saving} />
          <Button type="button" variant="brand" disabled={loading || saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
