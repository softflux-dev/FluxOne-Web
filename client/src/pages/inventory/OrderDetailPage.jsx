import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { OrderDetailBody } from '@/components/feature/orders/OrderDetailBody'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { useOrderDetail } from '@/hooks/useOrderDetail'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

function canRecordReceival(order) {
  const status = order?.status
  if (status !== 'approved' && status !== 'partially_received') return false
  if (order?.hasRemainingQuantity === false) return false
  return true
}

function canMarkComplete(order) {
  return order?.status === 'partially_received'
}

// QA Bug 5 + rework 092A — dedicated page; receival qty edited inline in the lines table
export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    order,
    loading,
    error,
    mutating,
    refetch,
    clear,
    recordReceival,
    completeReceival,
    printOrder,
  } = useOrderDetail(id)

  // Drop cached detail on leave so a mid-flight receival cannot leave stale remaining qty
  useEffect(() => {
    return () => {
      clear()
    }
  }, [clear])

  async function handlePrint() {
    if (!order) return
    const result = await printOrder(order)
    if (!result.success) {
      toastError(result.error || 'PDF download failed')
      return
    }
    const count = result.data?.count
    if (result.data?.mode === 'invoices' && count) {
      toastSuccess(`Downloaded ${count} supplier invoice PDF${count === 1 ? '' : 's'}`)
    } else {
      toastSuccess('Order PDF downloaded')
    }
  }

  async function handleReceivalConfirm(payload) {
    if (!order?.id) return
    const result = await recordReceival(order.id, payload)
    if (!result.success) {
      toastError(result.error || 'Receival failed')
      // Slice already force-refetches on API validation failure; refresh draft from latest
      void refetch(order.id)
      return
    }
    const status = result.data?.status
    const autoCompleted = Boolean(result.receival?.autoCompleted)
    if (status === 'received' || autoCompleted) {
      toastSuccess('All quantities received — order status is now Received')
    } else {
      toastSuccess('Receival recorded — stock in linked to this order')
    }
    void refetch(order.id)
  }

  async function handleMarkComplete() {
    if (!order?.id) return
    const result = await completeReceival(order.id)
    if (!result.success) {
      toastError(result.error || 'Mark complete failed')
      return
    }
    const status = result.data?.status
    if (status && status !== 'received') {
      toastError(`Expected Received status, got “${status}”. Refresh and try again.`)
      return
    }
    toastSuccess('Order marked complete — status is now Received')
    void refetch(order.id)
  }

  const showReceival = canRecordReceival(order)
  const showComplete = canMarkComplete(order)

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Orders"
          title="Order details"
          description="Review status, company lines, invoices, and timeline"
          actions={
            <Button type="button" variant="outline" asChild>
              <Link to={PATHS.inventory.orders}>
                <ArrowLeft className="size-4" />
                Back to orders
              </Link>
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal delay={0.04}>
        <SurfaceCard className="p-4 sm:p-6">
          <OrderDetailBody
            order={order}
            loading={loading}
            error={error || ''}
            mutating={mutating}
            onRetry={() => void refetch(id)}
            receivalEnabled={showReceival}
            onSubmitReceival={handleReceivalConfirm}
            headerActions={
              order && showComplete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={mutating}
                  loading={mutating}
                  onClick={() => void handleMarkComplete()}
                >
                  <CheckCircle2 className="size-4" />
                  Mark Complete
                </Button>
              ) : null
            }
            footer={
              order ? (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button type="button" variant="outline" className="cursor-pointer" asChild>
                    <Link to={PATHS.inventory.orders}>Back</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={mutating}
                    onClick={() => void handlePrint()}
                  >
                    Download PDF
                  </Button>
                </div>
              ) : error ? (
                <div className="flex justify-center border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => navigate(PATHS.inventory.orders)}
                  >
                    Back to orders
                  </Button>
                </div>
              ) : null
            }
          />
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default OrderDetailPage
