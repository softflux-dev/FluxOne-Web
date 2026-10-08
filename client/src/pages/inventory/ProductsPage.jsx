import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpFromLine, Ban, Camera, Plus } from 'lucide-react'
import { ImportItemsDialog } from '@/components/feature/products/ImportItemsDialog'
import { PrintBarcodeDialog } from '@/components/feature/products/PrintBarcodeDialog'
import { ProductFilters } from '@/components/feature/products/ProductFilters'
import { ProductTable } from '@/components/feature/products/ProductTable'
import { ScanItemDialog } from '@/components/feature/products/ScanItemDialog'
import { VariantSkusDialog } from '@/components/feature/products/VariantSkusDialog'
import { AddStockInDialog } from '@/components/feature/control/AddStockInDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useAppDispatch } from '@/rtk/hooks'
import { asResult } from '@/rtk/asResult'
import { createMovement as createMovementThunk } from '@/rtk/features/control/controlSlice'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { useProducts } from '@/hooks/useProducts'
import { BRAND } from '@/lib/constants'
import { PRODUCT_STATUS, PRODUCT_TYPES } from '@/lib/mapProduct'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

export function ProductsPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    catalog,
    selectedCategorySubs,
    updateFilters,
    setPage,
    setProductStatus,
    deleteProduct,
    fetchProductDeleteInfo,
    importProducts,
    scanBarcode,
    fetchProductDetail,
    fetchBarcodePng,
    exportCsv,
    reload,
  } = useProducts()

  const { localQ, onSearchChange } = useDebouncedSearch(updateFilters)

  const [importOpen, setImportOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [printTarget, setPrintTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteInfo, setDeleteInfo] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Add Stock → Stock In dialog, pre-seeded with the catalog row
  const [stockOpen, setStockOpen] = useState(false)
  const [stockProduct, setStockProduct] = useState(null)
  const [stockSaving, setStockSaving] = useState(false)

  // Variant parent → View opens per-SKU stock / pricing modal
  const [variantsTarget, setVariantsTarget] = useState(null)

  const activeParents = (catalog.parents || []).filter((row) => row.isActive !== false)
  const activeSubs = (selectedCategorySubs || []).filter((row) => row.isActive !== false)

  // Drop selection when list filters / page change
  useEffect(() => {
    setSelectedIds([])
  }, [
    filters.page,
    filters.limit,
    filters.q,
    filters.type,
    filters.status,
    filters.categoryId,
    filters.subcategoryId,
    filters.productId,
    filters.variantTypeId,
    filters.variantValueId,
  ])

  // Bundle → Edit Bundle page; items → Edit Item page
  function handleEdit(row) {
    if (!row?.id) return
    if (row.type === PRODUCT_TYPES.BUNDLE) {
      navigate(PATHS.inventory.bundlesEdit(row.id))
      return
    }
    navigate(PATHS.inventory.productsEdit(row.id))
  }

  function handleAddStock(row) {
    if (!row?.id) return
    setStockProduct(row)
    setStockOpen(true)
  }

  async function handleStockInSubmit(body) {
    setStockSaving(true)
    try {
      const result = await asResult(
        dispatch(
          createMovementThunk({ movementType: MOVEMENT_TYPES.IN, body }),
        ).unwrap(),
      )
      if (result.success) {
        toastSuccess('Stock added')
        void reload()
      } else {
        toastError(result.error || 'Stock-in failed')
      }
      return result
    } finally {
      setStockSaving(false)
    }
  }

  async function applyProductStatus(row, status) {
    if (!row?.id) return
    setStatusUpdatingId(row.id)
    try {
      const result = await setProductStatus(row.id, status)
      if (!result.success) toastError(result.error || 'Status update failed')
      else
        toastSuccess(
          status === PRODUCT_STATUS.INACTIVE ? 'Product deactivated' : 'Product activated',
        )
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function handleStatusChange(row, status) {
    if (!row?.id || row.status === status) return
    if (status === PRODUCT_STATUS.INACTIVE) {
      setStatusTarget(row)
      return
    }
    void applyProductStatus(row, status)
  }

  async function handleConfirmDeactivate() {
    if (!statusTarget?.id) return
    await applyProductStatus(statusTarget, PRODUCT_STATUS.INACTIVE)
    setStatusTarget(null)
  }

  async function openDelete(row) {
    if (!row?.id) return
    setDeleteTarget(row)
    setDeleteInfo(null)
    setDeleteLoading(true)
    try {
      const result = await fetchProductDeleteInfo(row.id)
      if (result.success) setDeleteInfo(result.data)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleDeactivateFromDelete() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await deleteProduct({ id: deleteTarget.id, permanent: false })
      if (result.success) {
        toastSuccess('Product deactivated')
        setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id))
        setDeleteTarget(null)
        setDeleteInfo(null)
      } else {
        toastError(result.error || 'Deactivate failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handlePermanentDelete() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await deleteProduct({ id: deleteTarget.id, permanent: true })
      if (result.success) {
        toastSuccess('Product permanently deleted')
        setDeleteTarget(null)
        setDeleteInfo(null)
        setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id))
      } else {
        toastError(result.error || 'Permanent delete failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleBulkDeactivate() {
    if (!selectedIds.length) return
    setBulkDeleting(true)
    try {
      let ok = 0
      let failed = 0
      for (const id of selectedIds) {
        const result = await apiClient.delete(endpoints.products.remove(id))
        if (result.success) ok += 1
        else failed += 1
      }
      setSelectedIds([])
      setBulkDeleteOpen(false)
      void reload()
      if (ok && !failed) toastSuccess(`Deactivated ${ok} product${ok === 1 ? '' : 's'}`)
      else if (ok && failed) toastSuccess(`Deactivated ${ok}; ${failed} failed`)
      else toastError('Could not deactivate selected products')
    } finally {
      setBulkDeleting(false)
    }
  }

  const deleteIsActive =
    deleteTarget?.status !== PRODUCT_STATUS.INACTIVE && deleteTarget?.status !== 'close'
  const canPermanentDelete = Boolean(deleteInfo?.canPermanentDelete)

  async function handleExport() {
    const result = await exportCsv()
    if (result.success) toastSuccess(`Exported ${result.data.exported} products (CSV)`)
    else toastError(result.error || 'Export failed')
  }

  async function handleImport(rows) {
    const result = await importProducts(rows)
    if (result.success) {
      const imported = result.data?.imported ?? rows.length
      const failed = result.data?.failed || 0
      toastSuccess(
        failed
          ? `Imported ${imported}; ${failed} row(s) skipped`
          : `Imported ${imported} products`,
      )
      if (failed && result.data?.errors?.[0]) {
        toastError(result.data.errors[0])
      }
    } else {
      toastError(result.error || 'Import failed')
    }
    return result
  }

  async function handleScanOpenProduct(found) {
    if (!found?.id) return
    // Scan may return single or bundle — reuse edit split
    handleEdit({ id: found.id, type: found.type || PRODUCT_TYPES.SINGLE })
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Product Management"
          description="Browse like POS — search, pick a category, then subcategory (if any), then manage items"
          actions={
            <>
              <Button
                type="button"
                variant="brand"
                onClick={() => navigate(PATHS.inventory.productsNew)}
              >
                <Plus className="size-4" />
                Add Item
              </Button>
              <Button
                type="button"
                variant="brand"
                onClick={() => navigate(PATHS.inventory.bundles)}
              >
                <Plus className="size-4" />
                Bundle
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                style={{ color: BRAND.deep }}
                onClick={() => setImportOpen(true)}
              >
                <ArrowUpFromLine className="size-4" />
                Import
              </Button>
              <ExportCsvButton
                onClick={handleExport}
                disabled={mutating}
                label="Export"
                title="Export products to CSV"
              />
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                style={{ color: BRAND.deep }}
                onClick={() => setScanOpen(true)}
              >
                <Camera className="size-4" />
                Scan
              </Button>
            </>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <ProductFilters
          q={localQ}
          type={filters.type || ''}
          status={filters.status || 'active'}
          categoryId={filters.categoryId || ''}
          subcategoryId={filters.subcategoryId || ''}
          productId={filters.productId || ''}
          variantTypeId={filters.variantTypeId || ''}
          variantValueId={filters.variantValueId || ''}
          categories={activeParents}
          subcategories={activeSubs}
          onSearchChange={onSearchChange}
          onChange={updateFilters}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <ProductTable
          items={items}
          loading={loading}
          pagination={pagination}
          statusUpdatingId={statusUpdatingId}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          bulkDeleting={bulkDeleting}
          onBulkDelete={() => setBulkDeleteOpen(true)}
          onPageChange={setPage}
          onPageSizeChange={(limit) => updateFilters({ limit })}
          onEdit={handleEdit}
          onAddStock={handleAddStock}
          onPrintBarcode={setPrintTarget}
          onBlock={(row) => handleStatusChange(row, PRODUCT_STATUS.INACTIVE)}
          onUnblock={(row) => handleStatusChange(row, PRODUCT_STATUS.ACTIVE)}
          onDelete={openDelete}
          onViewVariants={setVariantsTarget}
        />
      </MotionReveal>

      <VariantSkusDialog
        open={Boolean(variantsTarget)}
        onOpenChange={(open) => {
          if (!open) setVariantsTarget(null)
        }}
        product={variantsTarget}
        fetchProductDetail={fetchProductDetail}
      />

      <AddStockInDialog
        open={stockOpen}
        onOpenChange={(open) => {
          setStockOpen(open)
          if (!open) setStockProduct(null)
        }}
        catalog={catalog}
        loading={stockSaving}
        onSubmit={handleStockInSubmit}
        initialProduct={stockProduct}
      />

      <ImportItemsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        loading={mutating}
        onSubmit={handleImport}
      />

      <ScanItemDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        loading={mutating}
        onScan={scanBarcode}
        onOpenProduct={handleScanOpenProduct}
      />

      <PrintBarcodeDialog
        open={Boolean(printTarget)}
        onOpenChange={(open) => {
          if (!open) setPrintTarget(null)
        }}
        product={printTarget}
        fetchBarcodePng={fetchBarcodePng}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        title="Deactivate product?"
        description={
          statusTarget
            ? statusTarget.type === PRODUCT_TYPES.BUNDLE
              ? `${statusTarget.name || 'This bundle'} will be inactive. Remaining bundle stock is dissolved and returned to component items.`
              : `${statusTarget.name || 'This product'} will be inactive (hidden from active lists and POS sync). You can activate it again later.`
            : undefined
        }
        confirmLabel="Deactivate"
        variant="warning"
        icon={Ban}
        loading={mutating}
        onConfirm={handleConfirmDeactivate}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDeleting) setBulkDeleteOpen(false)
        }}
        title="Delete selected products?"
        description={
          selectedIds.length
            ? `${selectedIds.length} selected product${selectedIds.length === 1 ? '' : 's'} will be deactivated (hidden from active lists and POS sync). You can activate them again later. Permanent delete stays per-product.`
            : undefined
        }
        confirmLabel="Deactivate selected"
        loading={bulkDeleting}
        onConfirm={handleBulkDeactivate}
      />

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteInfo(null)
          }
        }}
        entityName={deleteTarget?.name}
        description={
          deleteTarget
            ? deleteIsActive
              ? `${deleteTarget.name || 'This product'} can be deactivated (keeps history) or permanently removed when eligible.`
              : `${deleteTarget.name || 'This product'} is inactive. ${
                  canPermanentDelete
                    ? 'You can permanently remove it from the catalog.'
                    : 'It cannot be permanently deleted because it has linked records or stock.'
                }`
            : null
        }
        softLabel="Deactivate"
        softHint="Hides from active lists and POS sync. You can activate it again later."
        hardLabel="Permanently delete"
        showSoftAction={deleteIsActive}
        canHardDelete={canPermanentDelete}
        hardDisabledReason={
          deleteInfo?.reason ||
          'Linked stock or purchase history blocks permanent delete. Deactivate instead.'
        }
        loading={deleteLoading || mutating}
        onSoftDelete={handleDeactivateFromDelete}
        onHardDelete={handlePermanentDelete}
      />
    </div>
  )
}

export default ProductsPage
