import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { OrderDetailBody } from '@/components/feature/orders/OrderDetailBody'
import { canDownloadPurchaseOrderInvoices } from '@/lib/purchaseOrderInvoiceExport'

// Override Dialog defaults (sm:max-w-lg md:max-w-xl) so item tables stay readable.
const DETAIL_DIALOG_WIDTH =
  'max-w-[min(96vw,64rem)] sm:max-w-[min(96vw,64rem)] md:max-w-[min(96vw,64rem)]'

/**
 * BM (and dialog consumers) order detail.
 * Prefer orderId — opens immediately with skeleton while detail loads (shared with IM page).
 */
export function OrderDetailPanel({
  open,
  onOpenChange,
  orderId = null,
  order = null,
  loading = false,
  error = '',
  onRetry,
  onPrint,
}) {
  const resolved = order || null
  const titleRef = resolved?.orderNumber || orderId || 'Order'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[92dvh] overflow-y-auto overscroll-contain ${DETAIL_DIALOG_WIDTH}`}
      >
        <DialogTitle className="sr-only">Order {titleRef}</DialogTitle>
        <OrderDetailBody
          order={resolved}
          loading={loading}
          error={error}
          mutating={loading && Boolean(resolved)}
          onRetry={onRetry}
          footer={
            <DialogFooter className="mt-1 flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer sm:w-auto"
                onClick={() => onOpenChange?.(false)}
              >
                Close
              </Button>
              {onPrint && resolved && !canDownloadPurchaseOrderInvoices(resolved.status) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full cursor-pointer sm:w-auto"
                  disabled={loading}
                  onClick={() => onPrint?.(resolved)}
                >
                  Download PDF
                </Button>
              ) : null}
            </DialogFooter>
          }
        />
      </DialogContent>
    </Dialog>
  )
}

export default OrderDetailPanel
