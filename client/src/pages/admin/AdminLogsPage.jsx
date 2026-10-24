import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { AdminLogsTabs } from '@/components/feature/admin/logs/AdminLogsTabs'
import { AdminLogsFilters } from '@/components/feature/admin/logs/AdminLogsFilters'
import { AdminLogsTable } from '@/components/feature/admin/logs/AdminLogsTable'
import { AdminLogsExportBar } from '@/components/feature/admin/logs/AdminLogsExportBar'
import { useAdminLogs } from '@/hooks/useAdminLogs'
import { ADMIN_LOG_CATEGORY_LABELS } from '@/lib/adminLogs'
import { exportAdminLogsSelection } from '@/lib/adminLogsExport'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

// Parent: owns tab/filters/selection/fetch — Children: Tabs, Filters, Table, ExportBar
export function AdminLogsPage() {
  const {
    items,
    pagination,
    filters,
    loading,
    error,
    updateFilters,
    clearFilters,
    setPage,
    setTab,
    fetchAllMatching,
  } = useAdminLogs()

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [deselectedIds, setDeselectedIds] = useState(() => new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [branchesById, setBranchesById] = useState({})

  useEffect(() => {
    let cancelled = false
    async function loadBranches() {
      const res = await apiClient.get(endpoints.admin.branches.list, { page: 1, limit: 100 })
      if (cancelled || !res.success) return
      const rows = res.data?.items || res.data || []
      const map = {}
      for (const b of rows) {
        if (b?.id) map[b.id] = b.name || b.id
      }
      setBranchesById(map)
    }
    void loadBranches()
    return () => {
      cancelled = true
    }
  }, [])

  // Drop selection when filters / page / tab change (export scope is filter-bound)
  useEffect(() => {
    setSelectedIds(new Set())
    setDeselectedIds(new Set())
    setSelectAllMatching(false)
    setExportError(null)
  }, [
    filters.tab,
    filters.from,
    filters.to,
    filters.branchId,
    filters.actorRole,
    filters.actorUserId,
    filters.categories,
    filters.action,
    filters.actions,
    filters.entityId,
    filters.productType,
    filters.variantTypeId,
    filters.supplierId,
    filters.orderStatus,
    filters.settingCategory,
    filters.q,
  ])

  const selectedCount = useMemo(() => {
    if (selectAllMatching) {
      const total = pagination?.total ?? 0
      return Math.max(0, total - deselectedIds.size)
    }
    return selectedIds.size
  }, [selectAllMatching, pagination?.total, deselectedIds.size, selectedIds.size])

  const isRowSelected = useCallback(
    (id) => {
      if (selectAllMatching) return !deselectedIds.has(id)
      return selectedIds.has(id)
    },
    [selectAllMatching, deselectedIds, selectedIds],
  )

  const toggleRow = useCallback(
    (id) => {
      if (selectAllMatching) {
        setDeselectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        return
      }
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [selectAllMatching],
  )

  const toggleAllMatching = useCallback(
    (selectAll) => {
      if (selectAll) {
        setSelectAllMatching(true)
        setSelectedIds(new Set())
        setDeselectedIds(new Set())
      } else {
        setSelectAllMatching(false)
        setSelectedIds(new Set())
        setDeselectedIds(new Set())
      }
    },
    [],
  )

  const allVisibleSelected =
    items.length > 0 && items.every((row) => isRowSelected(row.id))
  const someVisibleSelected = items.some((row) => isRowSelected(row.id))

  const handleExport = useCallback(async () => {
    if (selectedCount <= 0 || exporting) return
    setExporting(true)
    setExportError(null)
    try {
      let rows = []
      if (selectAllMatching) {
        rows = await fetchAllMatching({ excludeIds: deselectedIds })
      } else {
        rows = await fetchAllMatching({ includeIds: selectedIds })
      }
      exportAdminLogsSelection({ rows, filters, branchesById })
    } catch (err) {
      setExportError(err?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }, [
    selectedCount,
    exporting,
    selectAllMatching,
    fetchAllMatching,
    deselectedIds,
    selectedIds,
    filters,
    branchesById,
  ])

  const tabLabel =
    filters.tab === 'all'
      ? 'All Activity'
      : ADMIN_LOG_CATEGORY_LABELS[filters.tab] || 'Logs'

  const exportDisabled = loading || selectedCount <= 0 || exporting

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Audit trail"
          title="Logs"
          description="Read-only company-wide activity. Filter, select rows, and export to Excel."
        />
      </MotionHeader>

      <MotionReveal delay={0.02}>
        <AdminLogsTabs value={filters.tab} onChange={setTab} />
      </MotionReveal>

      <MotionReveal delay={0.03}>
        <AdminLogsFilters
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
        />
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <SurfaceCard
          title={tabLabel}
          description="Newest first. Snapshot at load — change filters to refresh."
          actions={
            <AdminLogsExportBar
              selectedCount={selectedCount}
              disabled={exportDisabled}
              loading={exporting}
              onExport={handleExport}
            />
          }
        >
          {exportError ? (
            <p className="mb-3 text-xs font-medium text-red-600">{exportError}</p>
          ) : null}
          <AdminLogsTable
            items={items}
            loading={loading}
            error={error}
            pagination={pagination}
            isRowSelected={isRowSelected}
            onToggleRow={toggleRow}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
            onToggleAllMatching={toggleAllMatching}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
          />
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default AdminLogsPage
