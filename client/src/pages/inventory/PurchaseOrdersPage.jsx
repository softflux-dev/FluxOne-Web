import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { OrderDetailPanel } from '@/components/feature/orders/OrderDetailPanel'
import { OrderFilters } from '@/components/feature/orders/OrderFilters'
import { OrderTable } from '@/components/feature/orders/OrderTable'
import { PurchaseHistoryList } from '@/components/feature/orders/PurchaseHistoryList'
import { RecordReceivalDialog } from '@/components/feature/orders/RecordReceivalDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

export function PurchaseOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight') || ''
  const openedHighlightRef = useRef(null)

  const {
    items,
    pagination,
    loading,
    mutating,
    error,
    selected,
    history,
    filters,
    updateFilters,
    setPage,
    fetchDetail,
    fetchHistory,
    clearDetail,
    recordReceival,
    completeReceival,
    printOrder,
  } = usePurchaseOrders()

  const [detailOpen, setDetailOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [receivalOpen, setReceivalOpen] = useState(false)

  // Notification deep-link: /inventory/orders?highlight=
  useEffect(() => {
    if (!highlightId || openedHighlightRef.current === highlightId) return
    openedHighlightRef.current = highlightId
    void (async () => {
      const result = await fetchDetail(highlightId)
      if (result.success) setDetailOpen(true)
      else toastError(result.error || 'Failed to open highlighted order')
    })()
  }, [highlightId, fetchDetail])

  function clearHighlightParam() {
    if (!highlightId) return
    const next = new URLSearchParams(searchParams)
    next.delete('highlight')
    setSearchParams(next, { replace: true })
  }

  async function handleView(row) {
    const result = await fetchDetail(row.id)
    if (result.success) setDetailOpen(true)
    else toastError(result.error || 'Failed to load detail')
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

  async function handleRecordReceival(row) {
    const result = await fetchDetail(row.id)
    if (result.success) setReceivalOpen(true)
    else toastError(result.error || 'Failed to load order for receival')
  }

  async function handleReceivalConfirm(payload) {
    if (!selected?.id) return
    const result = await recordReceival(selected.id, payload)
    if (!result.success) {
      toastError(result.error || 'Receival failed')
      return
    }
    toastSuccess('Receival recorded — stock in linked to this order')
    setReceivalOpen(false)
    clearHighlightParam()
  }

  async function handleMarkComplete(row) {
    const result = await completeReceival(row.id)
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
    clearHighlightParam()
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Orders"
          description="Order requests to your Branch Manager — Pending until approved, then Record Receival / Mark Complete"
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
          mutating={mutating}
          highlightId={highlightId}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(limit) => updateFilters({ limit })}
          onView={handleView}
          onHistory={handleHistory}
          onPrint={handlePrint}
          onRecordReceival={handleRecordReceival}
          onMarkComplete={handleMarkComplete}
        />
      </MotionReveal>

      <OrderDetailPanel
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            clearDetail()
            clearHighlightParam()
          }
        }}
        order={selected}
        loading={mutating}
        onPrint={handlePrint}
      />

      <RecordReceivalDialog
        open={receivalOpen}
        onOpenChange={(open) => {
          setReceivalOpen(open)
          if (!open) clearDetail()
        }}
        order={selected}
        loading={mutating}
        onConfirm={handleReceivalConfirm}
      />

      <PurchaseHistoryList
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={history}
      />
    </div>
  )
}

export default PurchaseOrdersPage
