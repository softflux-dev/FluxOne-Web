import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { OrderDetailPanel } from '@/components/feature/orders/OrderDetailPanel'
import { OrderFilters } from '@/components/feature/orders/OrderFilters'
import { MotionReveal } from '@/components/shared/MotionReveal'
import { DemandRequestRejectDialog } from '@/components/feature/branch/demand-requests/DemandRequestRejectDialog'
import { DemandRequestsStats } from '@/components/feature/branch/demand-requests/DemandRequestsStats'
import { DemandRequestsTable } from '@/components/feature/branch/demand-requests/DemandRequestsTable'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

const EMPTY_COUNTS = { all: 0, pending: 0, approved: 0, rejected: 0 }

async function fetchStatusTotal(status) {
  const result = await apiClient.get(endpoints.orders.list, {
    page: 1,
    limit: 1,
    status: status || undefined,
  })
  if (!result.success) return 0
  return Number(result.data?.pagination?.total ?? result.pagination?.total ?? 0)
}

// Parent: BM Demand Requests tab body
export function DemandRequestsPanel() {
  const navigate = useNavigate()
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
    filters,
    updateFilters,
    setPage,
    fetchDetail,
    clearDetail,
    approveOrder,
    rejectOrder,
    printOrder,
    reload,
  } = usePurchaseOrders()

  const [counts, setCounts] = useState(EMPTY_COUNTS)
  const [detailOpen, setDetailOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)

  const refreshCounts = useCallback(async () => {
    try {
      const [all, pending, approved, rejected] = await Promise.all([
        fetchStatusTotal(''),
        fetchStatusTotal('pending'),
        fetchStatusTotal('approved'),
        fetchStatusTotal('rejected'),
      ])
      setCounts({ all, pending, approved, rejected })
    } catch {
      setCounts(EMPTY_COUNTS)
    }
  }, [])

  useEffect(() => {
    void refreshCounts()
  }, [refreshCounts, items])

  // Notification deep-link: open detail for ?highlight=
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

  function handleEdit(row) {
    if (!row?.id) return
    navigate(PATHS.branch.demandRequestEdit(row.id))
  }

  // One-click Approve — no edit required
  async function handleApprove(row) {
    if (!row?.id) return
    const result = await approveOrder(row.id)
    if (!result.success) {
      toastError(result.error || 'Approve failed')
      return
    }
    toastSuccess('Demand request approved')
    clearHighlightParam()
    void refreshCounts()
    void reload()
  }

  function handleReject(row) {
    setRejectTarget(row)
    setRejectOpen(true)
  }

  async function handleRejectConfirm(rejectionNotes) {
    if (!rejectTarget?.id) return
    const result = await rejectOrder(rejectTarget.id, rejectionNotes)
    if (!result.success) {
      toastError(result.error || 'Reject failed')
      return
    }
    toastSuccess('Demand request rejected')
    setRejectOpen(false)
    setRejectTarget(null)
    clearHighlightParam()
    void refreshCounts()
  }

  async function handlePrint(order) {
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

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.02}>
        <DemandRequestsStats
          counts={counts}
          activeStatus={filters.status || ''}
          onStatusClick={(status) => updateFilters({ status, page: 1 })}
        />
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <OrderFilters
          q={filters.q || ''}
          status={filters.status || ''}
          onSearchChange={(q) => updateFilters({ q })}
          onStatusChange={(status) => updateFilters({ status, page: 1 })}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <DemandRequestsTable
          items={items}
          loading={loading}
          mutating={mutating}
          highlightId={highlightId}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(limit) => updateFilters({ limit })}
          onView={handleView}
          onEdit={handleEdit}
          onApprove={handleApprove}
          onReject={handleReject}
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

      <DemandRequestRejectDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open)
          if (!open) setRejectTarget(null)
        }}
        order={rejectTarget}
        loading={mutating}
        onConfirm={handleRejectConfirm}
      />
    </div>
  )
}

export default DemandRequestsPanel
