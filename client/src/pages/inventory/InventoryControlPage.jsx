import { useState } from 'react'
import { AddStockInDialog } from '@/components/feature/control/AddStockInDialog'
import { AdjustmentDialog } from '@/components/feature/control/AdjustmentDialog'
import { AdjustmentTable } from '@/components/feature/control/AdjustmentTable'
import { ControlDailyPriceBanner } from '@/components/feature/control/ControlDailyPriceBanner'
import { ControlKpiCards } from '@/components/feature/control/ControlKpiCards'
import { ControlPriceRuleBanner } from '@/components/feature/control/ControlPriceRuleBanner'
import { ControlSecondaryActions } from '@/components/feature/control/ControlTopActions'
import { DailyPriceReviewDialog } from '@/components/feature/control/DailyPriceReviewDialog'
import { ControlLowStockBanner } from '@/components/feature/control/ControlLowStock'
import { ImportControlDialog } from '@/components/feature/control/ImportControlDialog'
import { InventoryControlTabs } from '@/components/feature/control/InventoryControlTabs'
import { MovementFilters } from '@/components/feature/control/MovementFilters'
import { OrderDemandDialog } from '@/components/feature/control/OrderDemandDialog'
import { StockAlertsDialog } from '@/components/feature/control/StockAlertsDialog'
import { StockInTable } from '@/components/feature/control/StockInTable'
import { StockOutTable } from '@/components/feature/control/StockOutTable'
import { ThresholdTable } from '@/components/feature/control/ThresholdTable'
import { UpdateThresholdDialog } from '@/components/feature/control/UpdateThresholdDialog'
import { ViewMovementDetailsDialog } from '@/components/feature/control/ViewMovementDetailsDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useInventoryControl } from '@/hooks/useInventoryControl'
import { downloadControlExport } from '@/lib/controlCsv'
import { CONTROL_UI_TAB } from '@/lib/controlTabs'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { useAppSelector } from '@/rtk/hooks'
import { buildListQuery } from '@/rtk/features/control/controlSlice'

function asProductRow(row) {
  if (!row) return null
  return {
    ...row,
    productId: row.productId || row.id,
    productName: row.productName || row.name,
  }
}

const TABS_WITH_IMPORT = new Set([MOVEMENT_TYPES.IN, MOVEMENT_TYPES.ADJUSTMENT])

export function InventoryControlPage() {
  const [tab, setTab] = useState(MOVEMENT_TYPES.IN)

  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    catalog,
    selectedCategorySubs,
    summary,
    summaryLoading,
    updateFilters,
    setPage,
    createStockIn,
    createMovementForType,
    stockInFromOrder,
    reloadSummary,
    reload,
    globalFilters,
  } = useInventoryControl(tab)

  const stockInMutating = useAppSelector(
    (state) => state.control.byType?.[MOVEMENT_TYPES.IN]?.mutating || false,
  )

  const { localQ, setLocalQ, onSearchChange } = useDebouncedSearch(
    updateFilters,
    filters.q || '',
  )

  const [addStockInOpen, setAddStockInOpen] = useState(false)
  const [updateStockRow, setUpdateStockRow] = useState(null)
  const [orderOpen, setOrderOpen] = useState(false)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [thresholdTarget, setThresholdTarget] = useState(null)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [detailsTab, setDetailsTab] = useState(tab)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [dailyPriceOpen, setDailyPriceOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [productActionLoading, setProductActionLoading] = useState(false)

  function handleTabChange(nextTab) {
    if (nextTab === tab) return
    setAdjustmentOpen(false)
    setOrderOpen(false)
    setUpdateStockRow(null)
    setThresholdTarget(null)
    setDetailsTarget(null)
    setTab(nextTab)
  }

  function handleFilterChange(patch) {
    if (patch.q !== undefined) setLocalQ(patch.q)
    updateFilters(patch)
  }

  async function handleStockInCreate(payload) {
    const result = await createStockIn(payload)
    if (result.success) {
      setAddStockInOpen(false)
      setUpdateStockRow(null)
      toastSuccess('Saved')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  async function handleUpdateStockFromRow(payload) {
    const line = payload.lines?.[0]
    if (!line) return { success: false, error: 'Missing line' }

    const stockResult = await createStockIn(payload)
    if (!stockResult.success) {
      toastError(stockResult.error || 'Stock update failed')
      return stockResult
    }

    const productPatch = {}
    if (line.sellingPrice != null) productPatch.sellingPrice = Number(line.sellingPrice)
    if (line.unitCost != null) productPatch.purchasePrice = Number(line.unitCost)

    if (Object.keys(productPatch).length > 0) {
      const patchRes = await apiClient.patch(
        endpoints.products.update(line.productId),
        productPatch,
      )
      if (!patchRes.success) {
        const message = String(patchRes.error || '')
        if (/utilized|previous stock/i.test(message)) {
          toastSuccess('Stock added. Existing units keep their price until they sell out.')
        } else {
          toastError(message || 'Stock added, but price update failed')
        }
      }
    }

    setUpdateStockRow(null)
    toastSuccess('Stock updated')
    void reloadSummary?.()
    return { success: true }
  }

  async function handleAdjustmentSubmit(payload) {
    if (payload.kind === 'stock_in') {
      return handleStockInCreate(payload)
    }
    const result = await createMovementForType(payload.movementType, payload.body)
    if (result.success) {
      setAdjustmentOpen(false)
      toastSuccess('Saved')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  async function handleReceiveOrder(purchaseOrderId) {
    const result = await stockInFromOrder(purchaseOrderId)
    if (result.success) toastSuccess('Purchase order received into stock')
    else toastError(result.error || 'Receive failed')
    return result
  }

  async function handleThresholdSubmit(payload) {
    setProductActionLoading(true)
    try {
      const result = await apiClient.patch(endpoints.products.update(payload.productId), {
        reorderPoint: payload.reorderPoint,
      })
      if (!result.success) {
        toastError(result.error || 'Threshold update failed')
        return { success: false, error: result.error }
      }
      setThresholdTarget(null)
      toastSuccess('Threshold updated')
      void reloadSummary?.()
      void reload?.()
      return { success: true }
    } finally {
      setProductActionLoading(false)
    }
  }

  async function handleExport() {
    if (tab === CONTROL_UI_TAB.THRESHOLDS) {
      toastInfo('Export is not available on Manage Threshold')
      return
    }
    setExportLoading(true)
    try {
      const query = {
        ...buildListQuery(globalFilters, { page: 1, limit: 1 }),
        movementType: tab,
      }
      delete query.page
      delete query.limit
      const result = await apiClient.get(endpoints.control.export, query)
      if (!result.success) {
        toastError(result.error || 'Export failed')
        return
      }
      const rows = Array.isArray(result.data?.rows) ? result.data.rows : []
      if (!rows.length) {
        toastInfo('No rows to export for this tab and filters')
        return
      }
      downloadControlExport(rows, tab)
      toastSuccess(`Exported ${rows.length} row(s)`)
    } catch (err) {
      toastError(err?.message || 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  // async function handleImport(rows) {
  //   if (!TABS_WITH_IMPORT.has(tab)) {
  //     return { success: false, error: 'Import is not available for this tab' }
  //   }
  //   setImportLoading(true)
  //   try {
  //     const result = await apiClient.post(endpoints.control.import, {
  //       movementType: tab,
  //       rows,
  //     })
  //     if (!result.success) {
  //       return { success: false, error: result.error || 'Import failed' }
  //     }
  //     const data = result.data || {}
  //     const imported = Number(data.imported) || 0
  //     if (imported > 0) {
  //       toastSuccess(`Imported ${imported} row(s)`)
  //       void reloadSummary?.()
  //       void reload?.()
  //     }
  //     return { success: imported > 0, error: imported ? null : 'No rows imported' }
  //   } finally {
  //     setImportLoading(false)
  //   }
  // }

  function openDetails(row) {
    setDetailsTab(row?.movementType || tab)
    setDetailsTarget(row)
  }

  const tabCounts = summary?.tabCounts || null
  const alertCount = Number(summary?.alertCount) || 0
  const dailyPricePendingCount = Number(summary?.dailyPricePendingCount) || 0
  const priceGateOn = Boolean(summary?.priceRequiresStockUtilized)

  return (
    <div className="space-y-6">
      <MotionHeader>
        <div className="space-y-3">
          <PageHeader
            title="Inventory Control"
            description="Every movement, accounted for. Keep your stock in balance."
            actions={
              <ControlSecondaryActions
                onExport={handleExport}
                onImport={() => {
                  if (!TABS_WITH_IMPORT.has(tab)) {
                    toastInfo('Import is available on Stock In and Adjustment tabs')
                    return
                  }
                  setImportOpen(true)
                }}
                exportLoading={exportLoading}
              />
            }
          />
        </div>
      </MotionHeader>

      <ControlPriceRuleBanner active={priceGateOn} />

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.02}>
        <ControlKpiCards
          summary={summary}
          loading={summaryLoading && !summary}
          onAttentionClick={() => setAlertsOpen(true)}
        />
      </MotionReveal>

      <MotionReveal delay={0.03}>
        <div className="space-y-3">
          <ControlDailyPriceBanner
            pendingCount={dailyPricePendingCount}
            onReview={() => setDailyPriceOpen(true)}
          />
          <ControlLowStockBanner
            alertCount={alertCount}
            onViewItems={() => setAlertsOpen(true)}
          />
        </div>
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <MovementFilters
          q={localQ}
          type={filters.type || ''}
          categoryId={filters.categoryId || ''}
          subcategoryId={filters.subcategoryId || ''}
          productId={filters.productId || ''}
          variantTypeId={filters.variantTypeId || ''}
          variantValueId={filters.variantValueId || ''}
          ledgerKind={filters.ledgerKind || ''}
          from={filters.from || ''}
          to={filters.to || ''}
          showLedgerKind={tab === MOVEMENT_TYPES.ADJUSTMENT}
          categories={catalog.parents || []}
          subcategories={selectedCategorySubs || []}
          onSearchChange={onSearchChange}
          onChange={handleFilterChange}
        />
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <InventoryControlTabs value={tab} onChange={handleTabChange} counts={tabCounts} />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        {tab === MOVEMENT_TYPES.IN ? (
          <StockInTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onAddStock={() => setAddStockInOpen(true)}
            onOrderDemand={() => setOrderOpen(true)}
            onUpdateStock={(row) => setUpdateStockRow(row)}
            onViewDetails={openDetails}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.OUT ? (
          <StockOutTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.ADJUSTMENT ? (
          <AdjustmentTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onAddAdjustment={() => setAdjustmentOpen(true)}
            onViewDetails={openDetails}
          />
        ) : null}
        {tab === CONTROL_UI_TAB.THRESHOLDS ? (
          <ThresholdTable
            items={items}
            loading={loading}
            onEdit={(row) => setThresholdTarget(asProductRow(row))}
          />
        ) : null}
      </MotionReveal>

      <AddStockInDialog
        open={addStockInOpen}
        onOpenChange={setAddStockInOpen}
        catalog={catalog}
        loading={stockInMutating}
        onSubmit={handleStockInCreate}
      />

      <AddStockInDialog
        open={Boolean(updateStockRow)}
        onOpenChange={(open) => {
          if (!open) setUpdateStockRow(null)
        }}
        mode="update"
        seedRow={updateStockRow}
        catalog={catalog}
        loading={stockInMutating}
        onSubmit={handleUpdateStockFromRow}
      />

      <OrderDemandDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        loading={stockInMutating}
        onReceive={handleReceiveOrder}
      />

      <AdjustmentDialog
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        catalog={catalog}
        loading={mutating}
        onSubmit={handleAdjustmentSubmit}
      />

      <UpdateThresholdDialog
        open={Boolean(thresholdTarget)}
        onOpenChange={(open) => {
          if (!open) setThresholdTarget(null)
        }}
        row={thresholdTarget}
        loading={productActionLoading}
        onSubmit={handleThresholdSubmit}
      />

      <ViewMovementDetailsDialog
        open={Boolean(detailsTarget)}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null)
        }}
        row={detailsTarget}
        tab={detailsTab}
      />

      <StockAlertsDialog
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        onAddStock={(row) => setUpdateStockRow(asProductRow(row))}
        onEditThreshold={(row) => setThresholdTarget(asProductRow(row))}
        onChanged={() => void reloadSummary?.()}
      />

      <DailyPriceReviewDialog
        open={dailyPriceOpen}
        onOpenChange={setDailyPriceOpen}
        onChanged={() => void reloadSummary?.()}
      />

      {/* <ImportControlDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        movementType={tab}
        loading={importLoading}
        onSubmit={handleImport}
      /> */}
    </div>
  )
}

export default InventoryControlPage
