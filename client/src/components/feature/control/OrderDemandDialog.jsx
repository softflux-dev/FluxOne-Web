import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import {
  fetchApprovedPurchaseOrders,
  fetchPurchaseOrderDetail,
} from '@/hooks/useInventoryControl'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

// Legacy full-PO receive — superseded by Orders → Record Receival (TL §6.1).
// Control UI no longer surfaces this; API path kept for compatibility.

export function OrderDemandDialog({ open, onOpenChange, loading = false, onReceive }) {
  const [orders, setOrders] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loadingList, setLoadingList] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!open) return
    setLoadError(null)
    setActionError(null)
    setDetail(null)
    setConfirmTarget(null)
    setLoadingList(true)
    void (async () => {
      const result = await fetchApprovedPurchaseOrders()
      if (result.success) setOrders(result.items)
      else {
        setOrders([])
        setLoadError(result.error || 'Failed to load approved orders')
      }
      setLoadingList(false)
    })()
  }, [open])

  async function openDetail(order) {
    setDetailLoading(true)
    setActionError(null)
    const result = await fetchPurchaseOrderDetail(order.id)
    if (result.success) setDetail(result.data)
    else setActionError(result.error || 'Failed to load order detail')
    setDetailLoading(false)
  }

  async function handleConfirmReceive() {
    if (!confirmTarget?.id) return
    setActionError(null)
    const result = await onReceive?.(confirmTarget.id)
    if (result?.success) {
      setConfirmTarget(null)
      setDetail(null)
      setOrders((prev) => prev.filter((o) => o.id !== confirmTarget.id))
    } else if (result?.error) {
      setActionError(result.error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock in by order demand</DialogTitle>
            <DialogDescription>
              Approved purchase orders ready to receive into stock.
            </DialogDescription>
          </DialogHeader>

          {loadingList ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : loadError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
          ) : !orders.length ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-slate-500">
              No approved purchase orders waiting for stock-in.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-slate-50/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {order.orderNumber || order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {order.companyName || '—'}
                      {order.representativeName ? ` · ${order.representativeName}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.itemsNumber || order.lines?.length || 0} item line(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      disabled={detailLoading}
                      onClick={() => openDetail(order)}
                    >
                      Details
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer text-white"
                      style={{ background: BRAND.purple }}
                      disabled={loading}
                      onClick={() => setConfirmTarget(order)}
                    >
                      Receive
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {detail ? (
            <div className="rounded-xl border border-border bg-white px-3 py-3">
              <p className="mb-2 text-sm font-semibold text-slate-800">
                {detail.orderNumber} lines
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-slate-600">
                {(detail.lines || []).map((line, idx) => (
                  <li key={line.id || idx} className="flex justify-between gap-2">
                    <span className="truncate">
                      {line.name || line.itemCode || line.productId}
                    </span>
                    <span className="shrink-0 font-medium">
                      {line.quantity} {line.scale}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {actionError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
          ) : null}

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

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(next) => {
          if (!next) setConfirmTarget(null)
        }}
        title="Receive purchase order into stock?"
        description={
          confirmTarget
            ? `This will stock-in all lines from ${confirmTarget.orderNumber || 'this order'} and mark it received.`
            : undefined
        }
        confirmLabel="Receive stock"
        variant="default"
        loading={loading}
        onConfirm={handleConfirmReceive}
      />
    </>
  )
}
