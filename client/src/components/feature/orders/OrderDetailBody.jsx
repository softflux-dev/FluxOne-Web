import { OrderDetailContent } from '@/components/feature/orders/OrderDetailContent'
import { Button } from '@/components/ui/button'
import { TableRowsSkeleton } from '@/components/ui/skeleton'

/**
 * Shared order-detail body for IM page + BM dialog.
 * Shows skeleton while loading, then OrderDetailContent.
 */
export function OrderDetailBody({
  order = null,
  loading = false,
  error = '',
  mutating = false,
  headerActions = null,
  footer = null,
  onRetry,
  emptyLabel = 'Order not found.',
}) {
  if (loading && !order) {
    return <TableRowsSkeleton rows={6} className="py-2" />
  }

  if (error && !order) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        {onRetry ? (
          <Button type="button" variant="outline" className="cursor-pointer" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    )
  }

  if (!order) {
    return <p className="py-6 text-center text-sm text-slate-500">{emptyLabel}</p>
  }

  return (
    <OrderDetailContent
      order={order}
      loading={mutating || loading}
      headerActions={headerActions}
      footer={footer}
    />
  )
}

export default OrderDetailBody
