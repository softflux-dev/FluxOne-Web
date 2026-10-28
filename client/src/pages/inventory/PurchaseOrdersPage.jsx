import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { OrderFilters } from '@/components/feature/orders/OrderFilters'
import { OrderTable } from '@/components/feature/orders/OrderTable'
import { PurchaseHistoryList } from '@/components/feature/orders/PurchaseHistoryList'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight') || ''
  const openedHighlightRef = useRef(null)

  const {
    items,
    pagination,
    loading,
    error,
    history,
    filters,
    updateFilters,
    setPage,
    fetchHistory,
    printOrder,
  } = usePurchaseOrders()

  const [historyOpen, setHistoryOpen] = useState(false)

  // Legacy notification deep-link → dedicated detail page (QA Bug 5)
  useEffect(() => {
    if (!highlightId || openedHighlightRef.current === highlightId) return
    openedHighlightRef.current = highlightId
    const next = new URLSearchParams(searchParams)
    next.delete('highlight')
    setSearchParams(next, { replace: true })
    navigate(PATHS.inventory.ordersDetail(highlightId), { replace: true })
  }, [highlightId, navigate, searchParams, setSearchParams])

  function handleView(row) {
    navigate(PATHS.inventory.ordersDetail(row.id))
  }

  async function handleHistory(row) {
    const result = await fetchHistory(row.id)
    if (result.success) setHistoryOpen(true)
    else toastError(result.error || 'Failed to load history')
  }

  async function handlePrint(row) {
    const result = await printOrder(row)
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

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Orders"
          description="Order requests to your Branch Manager — open View for details, receival, and completion"
          actions={
            <Button type="button" variant="brand" asChild>
              <Link to={PATHS.inventory.ordersGenerate}>
                <Plus className="size-4" />
                Generate order
              </Link>
            </Button>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <OrderFilters
          q={filters.q || ''}
          status={filters.status || ''}
          onSearchChange={(q) => updateFilters({ q })}
          onStatusChange={(status) => updateFilters({ status, page: 1 })}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <OrderTable
          items={items}
          loading={loading}
          highlightId={highlightId}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(limit) => updateFilters({ limit })}
          onView={handleView}
          onHistory={handleHistory}
          onPrint={handlePrint}
        />
      </MotionReveal>

      <PurchaseHistoryList
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={history}
      />
    </div>
  )
}

export default PurchaseOrdersPage
