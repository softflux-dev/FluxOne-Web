import { useMemo } from 'react'
import { Package, Printer, PackagePlus, Trash2 } from 'lucide-react'
import { BarcodeCell } from '@/components/feature/products/BarcodeCell'
import { PricingColumns } from '@/components/feature/products/PricingColumns'
import { ProductImageCell, ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
import { PromotionColumns } from '@/components/feature/products/PromotionColumns'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { isEntityActive } from '@/components/shared/EntityStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { EMPTY_DASH, formatInventoryStock, money, PRODUCT_TYPES } from '@/lib/mapProduct'
import { displayItemCode } from '@/lib/formatDisplayId'
import { BRAND } from '@/lib/constants'

// Print / Add Stock / Edit / Deactivate|Activate / Delete for one catalog row
function ProductRowActions({
  row,
  onPrintBarcode,
  onAddStock,
  onEdit,
  onBlock,
  onUnblock,
  onDelete,
  statusLoading,
}) {
  const isVariantParent = row.type === PRODUCT_TYPES.VARIANT
  const open = isEntityActive(row.status)

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        title="Download barcode PDF"
        aria-label="Download barcode PDF"
        onClick={() => onPrintBarcode?.(row)}
      >
        <Printer className="size-4" />
      </Button>
      {!isVariantParent ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 cursor-pointer text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
          title="Add stock"
          aria-label="Add stock"
          onClick={() => onAddStock?.(row)}
        >
          <PackagePlus className="size-4" />
        </Button>
      ) : null}
      {/* Reuse shared CRUD icons; Ban opens Active/Inactive confirm */}
      <RowActionButtons
        onEdit={() => onEdit?.(row)}
        onBlock={() => onBlock?.(row)}
        onUnblock={() => onUnblock?.(row)}
        isActive={open}
        onDelete={() => onDelete?.(row)}
        editLabel="Edit product"
        blockLabel="Deactivate product"
        unblockLabel="Activate product"
        deleteLabel="Delete product"
        disabled={statusLoading}
      />
    </>
  )
}

function parentPriceDash(row, value) {
  // Variant parent: no own price — child SKUs hold the data.
  if (row.type === PRODUCT_TYPES.VARIANT) return EMPTY_DASH
  return money(value)
}

function InventoryStockCell({ row, onViewVariants, className = '' }) {
  // Variant parent qty is always 0 — open SKU breakdown modal instead
  if (row.type === PRODUCT_TYPES.VARIANT) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold ${className}`.trim()}
        style={{ color: BRAND.purple, borderColor: BRAND.purple }}
        onClick={() => onViewVariants?.(row)}
        aria-label={`View variants for ${row.name || 'product'}`}
      >
        View
      </Button>
    )
  }
  const stock = formatInventoryStock(row.quantity, row.reorderPoint, row.scale)
  return (
    <span
      className={`text-xs font-medium whitespace-nowrap ${stock.className} ${className}`.trim()}
      title={stock.display}
    >
      {stock.display}
    </span>
  )
}

export function ProductTable({
  items = [],
  loading = false,
  pagination,
  statusUpdatingId = null,
  selectedIds = [],
  onSelectedIdsChange,
  bulkDeleting = false,
  onBulkDelete,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onAddStock,
  onPrintBarcode,
  onBlock,
  onUnblock,
  onDelete,
  onViewVariants,
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = Math.max(1, pagination?.pageCount || 1)
  const total = pagination?.total ?? list.length
  const pageSize = pagination?.limit || 8

  const pageIds = useMemo(() => list.map((row) => row.id).filter(Boolean), [list])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedOnPage = pageIds.filter((id) => selectedSet.has(id))
  const allPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected
  const selectionCount = selectedIds.length

  function toggleOne(id) {
    if (!id || !onSelectedIdsChange) return
    if (selectedSet.has(id)) {
      onSelectedIdsChange(selectedIds.filter((entry) => entry !== id))
    } else {
      onSelectedIdsChange([...selectedIds, id])
    }
  }

  function toggleAllPage() {
    if (!onSelectedIdsChange) return
    if (allPageSelected) {
      onSelectedIdsChange(selectedIds.filter((id) => !pageIds.includes(id)))
      return
    }
    const merged = new Set(selectedIds)
    for (const id of pageIds) merged.add(id)
    onSelectedIdsChange([...merged])
  }

  const catalogActions =
    selectionCount > 0 ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-600 sm:text-sm">
          {selectionCount} selected
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={bulkDeleting}
          onClick={() => onSelectedIdsChange?.([])}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="cursor-pointer"
          disabled={bulkDeleting || !onBulkDelete}
          onClick={() => onBulkDelete?.()}
        >
          <Trash2 className="size-4" />
          {bulkDeleting ? 'Deleting…' : 'Delete selected'}
        </Button>
      </div>
    ) : null

  return (
    <SurfaceCard
      className={className}
      title="Product catalog"
      description="Single items & bundles for this company"
      actions={catalogActions}
    >
      {loading ? (
        <TableRowsSkeleton rows={6} />
      ) : isEmpty ? (
        <EmptyState
          icon={Package}
          title="No product available"
          description="Try another category or type, or add an item / bundle to get started."
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
              <Checkbox
                checked={allPageSelected}
                ref={(el) => {
                  if (el) el.indeterminate = somePageSelected
                }}
                onChange={toggleAllPage}
                aria-label="Select all products on this page"
              />
              <span className="text-xs text-slate-500">Select all on page</span>
            </div>
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selectedSet.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select ${row.name || 'product'}`}
                  />
                  <ProductImageCell src={row.imageUrl} name={row.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{displayItemCode(row)}</p>
                      </div>
                      <ProductStatusToggle
                        status={row.status}
                        loading={statusUpdatingId === row.id}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.scale} · {row.type}
                    </p>
                    <div className="mt-2">
                      <PricingColumns row={row} />
                    </div>
                    <div className="mt-2 space-y-1 text-xs leading-snug text-slate-600">
                      <p>
                        <span className="text-slate-400">Last purchase</span>{' '}
                        {parentPriceDash(row, row.lastPurchasePrice)}
                        {row.lastPurchaseVendorName ? ` · ${row.lastPurchaseVendorName}` : ''}
                      </p>
                      <p>
                        <span className="text-slate-400">Current purchase</span>{' '}
                        {parentPriceDash(row, row.purchasePrice)}
                        {row.currentPurchaseVendorName
                          ? ` · ${row.currentPurchaseVendorName}`
                          : ''}
                      </p>
                      <p>
                        <span className="text-slate-400">Last selling</span>{' '}
                        {parentPriceDash(row, row.lastSellingPrice)}
                      </p>
                      <p>
                        <span className="text-slate-400">Current selling</span>{' '}
                        {parentPriceDash(row, row.sellingPrice)}
                      </p>
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-400">Inventory stock</span>{' '}
                        <InventoryStockCell row={row} onViewVariants={onViewVariants} />
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <ProductRowActions
                        row={row}
                        onPrintBarcode={onPrintBarcode}
                        onAddStock={onAddStock}
                        onEdit={onEdit}
                        onBlock={onBlock}
                        onUnblock={onUnblock}
                        onDelete={onDelete}
                        statusLoading={statusUpdatingId === row.id}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[1280px] text-left text-sm">
              <TableHeader>
                <TableRow className="text-[11px] tracking-wide text-slate-500 uppercase">
                  <TableHead className="w-10 px-2 py-3">
                    <Checkbox
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected
                      }}
                      onChange={toggleAllPage}
                      aria-label="Select all products on this page"
                    />
                  </TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Name</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Scale</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Item code</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Barcode</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Prices</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Discount & offers</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">
                    Last / Current purchase
                  </TableHead>
                  <TableHead className="px-2 py-3 font-semibold">
                    Last / Current selling
                  </TableHead>
                  <TableHead className="px-2 py-3 font-semibold whitespace-nowrap">
                    Inventory Stock
                  </TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Status</TableHead>
                  <TableActionsHead className="px-2 py-3 font-semibold">Action</TableActionsHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/80">
                    <TableCell className="px-2 py-3">
                      <Checkbox
                        checked={selectedSet.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.name || 'product'}`}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <ProductImageCell src={row.imageUrl} name={row.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900" title={row.name}>
                            {row.name}
                          </p>
                          <p className="text-[11px] capitalize text-slate-400">{row.type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-700">{row.scale}</TableCell>
                    <TableCell className="px-2 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {displayItemCode(row)}
                    </TableCell>
                    <TableCell className="max-w-[140px] px-2 py-3 whitespace-nowrap">
                      <BarcodeCell value={row.barcode} />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <PricingColumns row={row} />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <PromotionColumns row={row} />
                    </TableCell>
                    <TableCell className="px-2 py-3 text-xs leading-snug">
                      <p>
                        <span className="text-slate-400">Last</span>{' '}
                        <span className="font-medium">{parentPriceDash(row, row.lastPurchasePrice)}</span>
                      </p>
                      <p
                        className="truncate text-slate-600"
                        title={row.lastPurchaseVendorName || undefined}
                      >
                        {row.lastPurchaseVendorName || EMPTY_DASH}
                      </p>
                      <p className="mt-1.5">
                        <span className="text-slate-400">Current</span>{' '}
                        <span className="font-medium">{parentPriceDash(row, row.purchasePrice)}</span>
                      </p>
                      <p
                        className="truncate text-slate-600"
                        title={row.currentPurchaseVendorName || undefined}
                      >
                        {row.currentPurchaseVendorName || EMPTY_DASH}
                      </p>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-xs leading-snug text-slate-600">
                      <p>
                        <span className="text-slate-400">Last</span>{' '}
                        <span className="font-medium text-slate-800">
                          {parentPriceDash(row, row.lastSellingPrice)}
                        </span>
                      </p>
                      <p className="mt-1">
                        <span className="text-slate-400">Current</span>{' '}
                        <span className="font-medium text-slate-800">
                          {parentPriceDash(row, row.sellingPrice)}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <InventoryStockCell row={row} onViewVariants={onViewVariants} />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <ProductStatusToggle
                        status={row.status}
                        loading={statusUpdatingId === row.id}
                      />
                    </TableCell>
                    <TableActionsCell>
                      <ProductRowActions
                        row={row}
                        onPrintBarcode={onPrintBarcode}
                        onAddStock={onAddStock}
                        onEdit={onEdit}
                        onBlock={onBlock}
                        onUnblock={onUnblock}
                        onDelete={onDelete}
                        statusLoading={statusUpdatingId === row.id}
                      />
                    </TableActionsCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            loading={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </SurfaceCard>
  )
}
