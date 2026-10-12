import { useMemo } from 'react'
import { Package, Printer, PackagePlus, Trash2 } from 'lucide-react'
import { BarcodeCell } from '@/components/feature/products/BarcodeCell'
import { priceOrDash, PricingColumns } from '@/components/feature/products/PricingColumns'
import { ProductImageCell, ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
import { PromotionColumns } from '@/components/feature/products/PromotionColumns'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { TruncatedText } from '@/components/shared/TruncatedText'
import { isEntityActive } from '@/components/shared/EntityStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableScroll,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableGroupHead,
  TableSubHead,
  TableSelectHead,
  TableSelectCell,
  TableIdentityHead,
  TableIdentityCell,
  TableStatusHead,
  TableStatusCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
  TABLE_PIN,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { EMPTY_DASH, formatInventoryStock, PRODUCT_TYPES } from '@/lib/mapProduct'
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

//
// Single / Bundle → qty + status label; Variant parent → View (SKU modal).
// Scale is not its own column — only used as the unit label inside stock text.
//
function InventoryStockCell({ row, onViewVariants, className = '' }) {
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

function VendorCell({ name }) {
  const label = name || EMPTY_DASH
  return (
    <span className="block max-w-[120px] truncate text-xs text-slate-600" title={name || undefined}>
      {label}
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

  const selectAllCheckbox = (
    <Checkbox
      checked={allPageSelected}
      ref={(el) => {
        if (el) el.indeterminate = somePageSelected
      }}
      onChange={toggleAllPage}
      aria-label="Select all products on this page"
    />
  )

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
          {/* Mobile cards — Scale is not shown as its own field */}
          <div className="space-y-3 md:hidden">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
              {selectAllCheckbox}
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
                        <TruncatedText
                          text={row.name}
                          lines={2}
                          className="text-sm font-semibold text-slate-900"
                        />
                        <p className="font-mono text-[11px] text-slate-400">{displayItemCode(row)}</p>
                        <p className="text-[11px] capitalize text-slate-400">{row.type}</p>
                      </div>
                      <ProductStatusToggle
                        status={row.status}
                        loading={statusUpdatingId === row.id}
                      />
                    </div>
                    <div className="mt-2">
                      <PricingColumns row={row} />
                    </div>
                    <div className="mt-2">
                      <PromotionColumns row={row} />
                    </div>
                    <div className="mt-2 space-y-1 text-xs leading-snug text-slate-600">
                      <p>
                        <span className="text-slate-400">Last purchase</span>{' '}
                        {priceOrDash(row, row.lastPurchasePrice)}
                        {row.lastPurchaseVendorName ? ` · ${row.lastPurchaseVendorName}` : ''}
                      </p>
                      <p>
                        <span className="text-slate-400">Current purchase</span>{' '}
                        {priceOrDash(row, row.purchasePrice)}
                        {row.currentPurchaseVendorName
                          ? ` · ${row.currentPurchaseVendorName}`
                          : ''}
                      </p>
                      <p>
                        <span className="text-slate-400">Last selling</span>{' '}
                        {priceOrDash(row, row.lastSellingPrice)}
                      </p>
                      <p>
                        <span className="text-slate-400">Current selling</span>{' '}
                        {priceOrDash(row, row.sellingPrice)}
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

          {/*
            Desktop pins: Select + Image (left), Actions (right).
            Select / Image / Item code / Barcode / Actions share one vertical line (rowSpan 2).
            Prices + purchase groups keep their 2-tier header (unchanged pattern).
          */}
          <div className="hidden md:block">
            <TableScroll className="rounded-lg">
              <Table
                scroll={false}
                className="min-w-[1980px] table-fixed border-separate border-spacing-0 text-left text-sm"
              >
                <colgroup>
                  {/* Left pins */}
                  <col style={{ width: TABLE_PIN.select }} />
                  <col style={{ width: TABLE_PIN.identity }} />
                  {/* Scrollable middle — widths sized so long labels do not collide */}
                  <col style={{ width: 108 }} />
                  <col style={{ width: 120 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 148 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 118 }} />
                  <col style={{ width: 128 }} />
                  <col style={{ width: 128 }} />
                  <col style={{ width: TABLE_PIN.status }} />
                  {/* Right pin */}
                  <col style={{ width: TABLE_PIN.actions }} />
                </colgroup>

                <TableHeader>
                  {/*
                    Row 1 — single-line pins + groups.
                    rowSpan={2} on Select/Image/Item code/Barcode/Actions = one shared baseline.
                  */}
                  <TableRow className="text-[11px] tracking-wide text-slate-500 uppercase">
                    <TableSelectHead sticky rowSpan={2} className="align-middle">
                      {selectAllCheckbox}
                    </TableSelectHead>
                    <TableIdentityHead sticky rowSpan={2} className="align-middle">
                      Image
                    </TableIdentityHead>
                    <TableHead rowSpan={2} className="px-2 py-2 align-middle font-semibold whitespace-nowrap">
                      Item code
                    </TableHead>
                    <TableHead rowSpan={2} className="px-2 py-2 align-middle font-semibold whitespace-nowrap">
                      Barcode
                    </TableHead>
                    <TableGroupHead colSpan={4}>Prices (Rs)</TableGroupHead>
                    <TableHead
                      rowSpan={2}
                      className="px-2 py-2 align-middle font-semibold leading-tight whitespace-normal"
                    >
                      Discount & Offers
                    </TableHead>
                    <TableGroupHead colSpan={2}>Last purchase</TableGroupHead>
                    <TableGroupHead colSpan={2}>Current purchase</TableGroupHead>
                    <TableHead
                      rowSpan={2}
                      className="px-2 py-2 align-middle font-semibold leading-tight whitespace-normal"
                    >
                      Last selling
                    </TableHead>
                    <TableHead
                      rowSpan={2}
                      className="px-2 py-2 align-middle font-semibold leading-tight whitespace-normal"
                    >
                      Current selling
                    </TableHead>
                    <TableHead
                      rowSpan={2}
                      className="px-2 py-2 align-middle font-semibold leading-tight whitespace-normal"
                    >
                      Inventory stock
                    </TableHead>
                    <TableStatusHead rowSpan={2} className="align-middle" />
                    <TableActionsHead sticky rowSpan={2} className="align-middle">
                      Action
                    </TableActionsHead>
                  </TableRow>

                  {/* Row 2 — only subheads under Prices / Last purchase / Current purchase */}
                  <TableRow className="text-[10px] tracking-wide text-slate-500 uppercase">
                    <TableSubHead>Purchase</TableSubHead>
                    <TableSubHead>Selling</TableSubHead>
                    <TableSubHead>Tax %</TableSubHead>
                    <TableSubHead>Final Price</TableSubHead>
                    <TableSubHead>Price</TableSubHead>
                    <TableSubHead>Vendor</TableSubHead>
                    <TableSubHead>Price</TableSubHead>
                    <TableSubHead>Vendor</TableSubHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {list.map((row) => (
                    <TableRow key={row.id} className="hover:bg-slate-50">
                      {/* Left sticky */}
                      <TableSelectCell sticky>
                        <Checkbox
                          checked={selectedSet.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          aria-label={`Select ${row.name || 'product'}`}
                        />
                      </TableSelectCell>
                      <TableIdentityCell sticky>
                        <div
                          className="flex items-center gap-2 overflow-hidden"
                          style={{ width: TABLE_PIN.identity - 16 }}
                        >
                          <div className="shrink-0">
                            <ProductImageCell src={row.imageUrl} name={row.name} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <TruncatedText
                              text={row.name}
                              lines={2}
                              className="font-medium text-slate-900"
                            />
                            <p className="text-[11px] capitalize text-slate-400">{row.type}</p>
                          </div>
                        </div>
                      </TableIdentityCell>

                      {/* Scrollable center (includes Status) */}
                      <TableCell className="px-2 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {displayItemCode(row)}
                      </TableCell>
                      <TableCell className="px-2 py-3 whitespace-nowrap">
                        <BarcodeCell value={row.barcode} />
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs tabular-nums text-slate-800 whitespace-nowrap">
                        {priceOrDash(row, row.purchasePrice)}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs tabular-nums text-slate-800 whitespace-nowrap">
                        {priceOrDash(row, row.sellingPrice)}
                      </TableCell>
                      <TableCell className="px-2 py-3 whitespace-nowrap">
                        <span className="inline-flex rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-800">
                          {Number(row.taxPercent || 0)}%
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs font-bold tabular-nums text-slate-900 whitespace-nowrap">
                        {priceOrDash(row, row.finalPrice)}
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <PromotionColumns row={row} />
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs tabular-nums font-medium text-slate-800 whitespace-nowrap">
                        {priceOrDash(row, row.lastPurchasePrice)}
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <VendorCell name={row.lastPurchaseVendorName} />
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs tabular-nums font-medium text-slate-800 whitespace-nowrap">
                        {priceOrDash(row, row.purchasePrice)}
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <VendorCell name={row.currentPurchaseVendorName} />
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs tabular-nums font-medium text-slate-800 whitespace-nowrap">
                        {priceOrDash(row, row.lastSellingPrice)}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-xs tabular-nums font-medium text-slate-800 whitespace-nowrap">
                        {priceOrDash(row, row.sellingPrice)}
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <InventoryStockCell row={row} onViewVariants={onViewVariants} />
                      </TableCell>
                      <TableStatusCell>
                        <ProductStatusToggle
                          status={row.status}
                          loading={statusUpdatingId === row.id}
                        />
                      </TableStatusCell>

                      {/* Right sticky — Actions only */}
                      <TableActionsCell sticky>
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
            </TableScroll>
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
