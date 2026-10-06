import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddStockInDialog } from '@/components/feature/control/AddStockInDialog'
import { AdjustmentDialog } from '@/components/feature/control/AdjustmentDialog'
import { AdjustmentTable } from '@/components/feature/control/AdjustmentTable'
import { ControlDailyPriceBanner } from '@/components/feature/control/ControlDailyPriceBanner'
import { ControlKpiCards } from '@/components/feature/control/ControlKpiCards'
import { ControlPriceRuleBanner } from '@/components/feature/control/ControlPriceRuleBanner'
import {
  ControlPrimaryAction,
  ControlSecondaryActions,
} from '@/components/feature/control/ControlTopActions'
import { DailyPriceReviewDialog } from '@/components/feature/control/DailyPriceReviewDialog'
import { DamagedDialog } from '@/components/feature/control/DamagedDialog'
import { DamagedTable } from '@/components/feature/control/DamagedTable'
import { ExpiredTable } from '@/components/feature/control/ExpiredTable'
import { ImportControlDialog } from '@/components/feature/control/ImportControlDialog'
import { InventoryControlTabs } from '@/components/feature/control/InventoryControlTabs'
import { ManageThresholdsDialog } from '@/components/feature/control/ManageThresholdsDialog'
import { MovementFilters } from '@/components/feature/control/MovementFilters'
import { OrderDemandDialog } from '@/components/feature/control/OrderDemandDialog'
import { OthersDialog } from '@/components/feature/control/OthersDialog'
import { OthersTable } from '@/components/feature/control/OthersTable'
import { StockAlertsDialog } from '@/components/feature/control/StockAlertsDialog'
import { StockInTable } from '@/components/feature/control/StockInTable'
import { StockOutTable } from '@/components/feature/control/StockOutTable'
import { UpdatePriceDialog } from '@/components/feature/control/UpdatePriceDialog'
import { UpdateStockDialog } from '@/components/feature/control/UpdateStockDialog'
import { UpdateThresholdDialog } from '@/components/feature/control/UpdateThresholdDialog'
import { ViewMovementDetailsDialog } from '@/components/feature/control/ViewMovementDetailsDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useInventoryControl } from '@/hooks/useInventoryControl'
import { downloadControlExport } from '@/lib/controlCsv'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import { useAppSelector } from '@/rtk/hooks'
import { buildListQuery } from '@/rtk/features/control/controlSlice'

// Map alert / threshold product rows into movement-row shape for Phase 3 dialogs.
function asProductRow(row) {
  if (!row) return null
  return {
    ...row,
    productId: row.productId || row.id,
    productName: row.productName || row.name,
  }
}

// Tabs that expose an "Add …" CTA (Stock Out / Expired are history-only).
const TABS_WITH_ADD = new Set([
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.DAMAGED,
  MOVEMENT_TYPES.OTHER,
])

const TABS_WITH_EDIT = new Set([
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.DAMAGED,
  MOVEMENT_TYPES.OTHER,
])

// Matches server HISTORY_ONLY_DELETE — log removed, on-hand unchanged.
const HISTORY_ONLY_DELETE = new Set([
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.DAMAGED,
])

function deleteConfirmCopy(tab, row) {
  const name = row?.productName || 'item'
  if (HISTORY_ONLY_DELETE.has(tab)) {
    return `Remove this ${tab} record for ${name}? On-hand stock stays unchanged. Record a new adjustment if the count needs correcting.`
  }
  return `Remove this ${tab} entry for ${name}? On-hand stock will be reversed.`
}

const TABS_WITH_IMPORT = new Set([
  MOVEMENT_TYPES.IN,
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.DAMAGED,
  MOVEMENT_TYPES.OTHER,
])

const ADD_LABEL = {
  [MOVEMENT_TYPES.ADJUSTMENT]: 'Add adjustment',
  [MOVEMENT_TYPES.DAMAGED]: 'Add damaged',
  [MOVEMENT_TYPES.OTHER]: 'Add other',
}

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
    createMovement,
    createStockIn,
    updateMovement,
    deleteMovement,
    stockInFromOrder,
    reloadSummary,
    reload,
    globalFilters,
  } = useInventoryControl(tab)

  // Stock-in dialog may run while another tab is active — track IN bucket mutating.
  const stockInMutating = useAppSelector(
    (state) => state.control.byType?.[MOVEMENT_TYPES.IN]?.mutating || false,
  )

  const { localQ, setLocalQ, onSearchChange } = useDebouncedSearch(
    updateFilters,
    filters.q || '',
  )

  const [addStockInOpen, setAddStockInOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [thresholdsOpen, setThresholdsOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [dailyPriceOpen, setDailyPriceOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)

  // Phase 3 row-action targets
  const [updateStockTarget, setUpdateStockTarget] = useState(null)
  const [thresholdTarget, setThresholdTarget] = useState(null)
  const [priceTarget, setPriceTarget] = useState(null)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [productActionLoading, setProductActionLoading] = useState(false)

  const canAdd = TABS_WITH_ADD.has(tab)
  const canEdit = TABS_WITH_EDIT.has(tab)
  const slowHint = useSlowLoadingHint(loading)

  function clearRowTargets() {
    setUpdateStockTarget(null)
    setThresholdTarget(null)
    setPriceTarget(null)
    setDetailsTarget(null)
  }

  function handleTabChange(nextTab) {
    if (nextTab === tab) return
    setAddOpen(false)
    setOrderOpen(false)
    setEditTarget(null)
    setDeleteTarget(null)
    clearRowTargets()
    setTab(nextTab)
  }

  function handleFilterChange(patch) {
    if (patch.q !== undefined) setLocalQ(patch.q)
    updateFilters(patch)
  }

  async function handleCreate(payload) {
    const result = await createMovement(payload)
    if (result.success) toastSuccess('Saved')
    else toastError(result.error || 'Save failed')
    return result
  }

  async function handleStockInCreate(payload) {
    const result = await createStockIn(payload)
    if (result.success) {
      setAddStockInOpen(false)
      toastSuccess('Saved')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  async function handleUpdate(payload) {
    if (!editTarget?.id) return { success: false, error: 'Nothing to edit' }
    const result = await updateMovement(editTarget.id, payload)
    if (result.success) {
      setEditTarget(null)
      toastSuccess('Updated')
    } else {
      toastError(result.error || 'Update failed')
    }
    return result
  }

  async function handleConfirmDelete() {
    if (!deleteTarget?.id) return
    const result = await deleteMovement(deleteTarget.id)
    if (result.success) {
      setDeleteTarget(null)
      toastSuccess('Deleted')
    } else {
      toastError(result.error || 'Delete failed')
    }
  }

  async function handleReceiveOrder(purchaseOrderId) {
    const result = await stockInFromOrder(purchaseOrderId)
    if (result.success) toastSuccess('Purchase order received into stock')
    else toastError(result.error || 'Receive failed')
    return result
  }

  // Row: Update Stock → stock-in line + optional product price/tax patch
  async function handleUpdateStockSubmit(payload) {
    const unitCost =
      payload.unitCost == null || Number.isNaN(Number(payload.unitCost))
        ? undefined
        : Math.round(Number(payload.unitCost))

    const stockResult = await createStockIn({
      lines: [
        {
          productId: payload.productId,
          scale: payload.scale || 'unit',
          quantity: payload.quantity,
          unitCost,
          sellingPrice:
            payload.sellingPrice == null || Number.isNaN(Number(payload.sellingPrice))
              ? undefined
              : Number(payload.sellingPrice),
          reason: payload.reason || payload.notes || undefined,
        },
      ],
    })
    if (!stockResult.success) {
      toastError(stockResult.error || 'Stock update failed')
      return stockResult
    }

    const productPatch = {}
    if (payload.sellingPrice != null && !Number.isNaN(Number(payload.sellingPrice))) {
      productPatch.sellingPrice = Number(payload.sellingPrice)
    }
    if (payload.unitCost != null && !Number.isNaN(Number(payload.unitCost))) {
      productPatch.purchasePrice = Number(payload.unitCost)
    }
    if (Array.isArray(payload.taxIds)) {
      productPatch.taxIds = payload.taxIds
    }
    if (Object.keys(productPatch).length > 0) {
      const patchRes = await apiClient.patch(
        endpoints.products.update(payload.productId),
        productPatch,
      )
      if (!patchRes.success) {
        const message = String(patchRes.error || '')
        const keptOldPrice = /utilized|previous stock/i.test(message)
        if (keptOldPrice) {
          toastSuccess('Stock added. Existing units keep their price until they sell out.')
        } else {
          toastError(message || 'Stock added, but price/tax update failed')
        }
        setUpdateStockTarget(null)
        return { success: true }
      }
    }

    setUpdateStockTarget(null)
    toastSuccess('Stock updated')
    void reloadSummary?.()
    return { success: true }
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
      return { success: true }
    } finally {
      setProductActionLoading(false)
    }
  }

  async function handlePriceSubmit(payload) {
    setProductActionLoading(true)
    try {
      const result = await apiClient.patch(endpoints.products.update(payload.productId), {
        purchasePrice: payload.purchasePrice,
        sellingPrice: payload.sellingPrice,
      })
      if (!result.success) {
        toastError(result.error || 'Price update failed')
        return { success: false, error: result.error }
      }
      setPriceTarget(null)
      toastSuccess('Price updated')
      return { success: true }
    } finally {
      setProductActionLoading(false)
    }
  }

  async function handleExport() {
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

  async function handleImport(rows) {
    if (!TABS_WITH_IMPORT.has(tab)) {
      return { success: false, error: 'Import is not available for this tab' }
    }
    setImportLoading(true)
    try {
      const result = await apiClient.post(endpoints.control.import, {
        movementType: tab,
        rows,
      })
      if (!result.success) {
        return { success: false, error: result.error || 'Import failed' }
      }
      const data = result.data || {}
      const imported = Number(data.imported) || 0
      const failed = Number(data.failed) || 0
      if (imported > 0) {
        toastSuccess(`Imported ${imported} row(s)${failed ? ` · ${failed} failed` : ''}`)
        void reloadSummary?.()
        void reload?.()
      } else if (failed > 0) {
        const first = data.errors?.[0]
        return {
          success: false,
          error: first
            ? `Row ${first.row}: ${first.error}`
            : `Import failed for ${failed} row(s)`,
        }
      } else {
        return { success: false, error: 'No rows imported' }
      }
      if (failed > 0 && imported > 0) {
        const first = data.errors?.[0]
        toastInfo(first ? `Some rows failed — e.g. row ${first.row}: ${first.error}` : `${failed} row(s) failed`)
      }
      return { success: true }
    } finally {
      setImportLoading(false)
    }
  }

  const rowActionProps = {
    onUpdateThreshold: setThresholdTarget,
    onUpdatePrice: setPriceTarget,
    onViewDetails: setDetailsTarget,
  }

  const addLabel = ADD_LABEL[tab] || 'Add'

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
              <ControlPrimaryAction
                onAddStockIn={() => setAddStockInOpen(true)}
                onOrderDemand={() => setOrderOpen(true)}
              />
            }
          />
          {/* Secondary chrome — below primary CTAs (Figma) */}
          <ControlSecondaryActions
            alertCount={alertCount}
            onManageThresholds={() => setThresholdsOpen(true)}
            onStockAlerts={() => setAlertsOpen(true)}
            onExport={handleExport}
            onImport={() => {
              if (!TABS_WITH_IMPORT.has(tab)) {
                toastInfo('Import is available on Stock In, Adjustment, Damaged, and Others')
                return
              }
              setImportOpen(true)
            }}
            exportLoading={exportLoading}
          />
        </div>
      </MotionHeader>

      <ControlPriceRuleBanner active={priceGateOn} />

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      {/* <SlowLoadingBanner show={slowHint} /> */}

      <MotionReveal delay={0.02}>
        <ControlKpiCards
          summary={summary}
          loading={summaryLoading && !summary}
          onAttentionClick={() => setAlertsOpen(true)}
        />
      </MotionReveal>

      <MotionReveal delay={0.03}>
        <ControlDailyPriceBanner
          pendingCount={dailyPricePendingCount}
          onReview={() => setDailyPriceOpen(true)}
        />
      </MotionReveal>

      {/* Global filters — shared across tabs via RTK globalFilters */}
      <MotionReveal delay={0.04}>
        <MovementFilters
          q={localQ}
          type={filters.type || ''}
          categoryId={filters.categoryId || ''}
          subcategoryId={filters.subcategoryId || ''}
          productId={filters.productId || ''}
          variantId={filters.variantId || ''}
          variantTypeId={filters.variantTypeId || ''}
          variantValueId={filters.variantValueId || ''}
          from={filters.from || ''}
          to={filters.to || ''}
          categories={catalog.parents || []}
          subcategories={selectedCategorySubs || []}
          onSearchChange={onSearchChange}
          onChange={handleFilterChange}
        />
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InventoryControlTabs
            value={tab}
            onChange={handleTabChange}
            counts={tabCounts}
            className="min-w-0 flex-1"
          />
          {canAdd ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                {addLabel}
              </Button>
            </div>
          ) : null}
        </div>
      </MotionReveal>

      {tab === MOVEMENT_TYPES.EXPIRED ? (
        <p className="rounded-xl border border-dashed border-border bg-slate-50/80 px-3 py-2 text-sm text-slate-600">
          Expired stock is processed automatically from stock-in lots past their expiry date. Set an
          expiry when adding stock.
        </p>
      ) : null}

      <MotionReveal delay={0.08}>
        {tab === MOVEMENT_TYPES.IN ? (
          <StockInTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onUpdateStock={setUpdateStockTarget}
            {...rowActionProps}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.OUT ? (
          <StockOutTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            {...rowActionProps}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.ADJUSTMENT ? (
          <AdjustmentTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            {...rowActionProps}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.DAMAGED ? (
          <DamagedTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            {...rowActionProps}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.EXPIRED ? (
          <ExpiredTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            {...rowActionProps}
          />
        ) : null}
        {tab === MOVEMENT_TYPES.OTHER ? (
          <OthersTable
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
            {...rowActionProps}
          />
        ) : null}
      </MotionReveal>

      {/* Global Add Stock In — always available from top actions */}
      <AddStockInDialog
        open={addStockInOpen}
        onOpenChange={setAddStockInOpen}
        catalog={catalog}
        loading={stockInMutating || (mutating && tab === MOVEMENT_TYPES.IN)}
        onSubmit={handleStockInCreate}
      />

      <OrderDemandDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        loading={stockInMutating}
        onReceive={handleReceiveOrder}
      />

      {tab === MOVEMENT_TYPES.ADJUSTMENT ? (
        <>
          <AdjustmentDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            mode="create"
            catalog={catalog}
            loading={mutating}
            onSubmit={handleCreate}
          />
          <AdjustmentDialog
            open={Boolean(editTarget)}
            onOpenChange={(open) => {
              if (!open) setEditTarget(null)
            }}
            mode="edit"
            initial={editTarget}
            catalog={catalog}
            loading={mutating}
            onSubmit={handleUpdate}
          />
        </>
      ) : null}

      {tab === MOVEMENT_TYPES.DAMAGED ? (
        <>
          <DamagedDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            mode="create"
            catalog={catalog}
            loading={mutating}
            onSubmit={handleCreate}
          />
          <DamagedDialog
            open={Boolean(editTarget)}
            onOpenChange={(open) => {
              if (!open) setEditTarget(null)
            }}
            mode="edit"
            initial={editTarget}
            catalog={catalog}
            loading={mutating}
            onSubmit={handleUpdate}
          />
        </>
      ) : null}

      {tab === MOVEMENT_TYPES.OTHER ? (
        <>
          <OthersDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            mode="create"
            catalog={catalog}
            loading={mutating}
            onSubmit={handleCreate}
          />
          <OthersDialog
            open={Boolean(editTarget)}
            onOpenChange={(open) => {
              if (!open) setEditTarget(null)
            }}
            mode="edit"
            initial={editTarget}
            catalog={catalog}
            loading={mutating}
            onSubmit={handleUpdate}
          />
        </>
      ) : null}

      {canEdit ? (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title="Delete this record?"
          description={deleteTarget ? deleteConfirmCopy(tab, deleteTarget) : undefined}
          confirmLabel="Delete"
          loading={mutating}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {/* Phase 3 — row action dialogs */}
      <UpdateStockDialog
        open={Boolean(updateStockTarget)}
        onOpenChange={(open) => {
          if (!open) setUpdateStockTarget(null)
        }}
        row={updateStockTarget}
        loading={stockInMutating}
        onSubmit={handleUpdateStockSubmit}
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
      <UpdatePriceDialog
        open={Boolean(priceTarget)}
        onOpenChange={(open) => {
          if (!open) setPriceTarget(null)
        }}
        row={priceTarget}
        loading={productActionLoading}
        onSubmit={handlePriceSubmit}
      />
      <ViewMovementDetailsDialog
        open={Boolean(detailsTarget)}
        onOpenChange={(open) => {
          if (!open) setDetailsTarget(null)
        }}
        row={detailsTarget}
        tab={tab}
      />

      {/* Phase 4 — thresholds / alerts / daily prices */}
      <ManageThresholdsDialog
        open={thresholdsOpen}
        onOpenChange={setThresholdsOpen}
        catalog={catalog}
        onChanged={() => void reloadSummary?.()}
      />
      <StockAlertsDialog
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        onAddStock={(row) => setUpdateStockTarget(asProductRow(row))}
        onEditThreshold={(row) => setThresholdTarget(asProductRow(row))}
        onChanged={() => void reloadSummary?.()}
      />
      <DailyPriceReviewDialog
        open={dailyPriceOpen}
        onOpenChange={setDailyPriceOpen}
        onChanged={() => void reloadSummary?.()}
      />

      <ImportControlDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        movementType={tab}
        loading={importLoading}
        onSubmit={handleImport}
      />
    </div>
  )
}

export default InventoryControlPage
