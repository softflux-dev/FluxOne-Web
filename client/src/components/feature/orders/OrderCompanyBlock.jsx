import { useEffect, useMemo, useState } from 'react'
import { Building2, Trash2 } from 'lucide-react'
import { OrderCatalogueResults } from '@/components/feature/orders/OrderCatalogueResults'
import { OrderItemFilters } from '@/components/feature/orders/OrderItemFilters'
import { OrderLinesTable } from '@/components/feature/orders/OrderLinesTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchableSelect } from '@/components/shared/SearchableSelect'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/lib/constants'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import {
  buildOrderLineFromProduct,
  emptyOrderFilters,
  isNormalProduct,
  isOrderableSku,
  isVariantChild,
} from '@/lib/orderGenerate'
import { deriveVariantAxes } from '@/lib/variantAxes'
import {
  fetchControlProductDetail,
  fetchControlProductOptions,
} from '@/hooks/useInventoryControl'
import { cn } from '@/lib/utils'

// Parent: one supplier company block — filters, catalogue, lines
export function OrderCompanyBlock({
  index = 0,
  block,
  suppliers = [],
  catalog,
  categoryById,
  usedSupplierIds = new Set(),
  canRemove = true,
  onChange,
  onRemove,
  className,
}) {
  const [catalogue, setCatalogue] = useState([])
  const [productChoices, setProductChoices] = useState([])
  const [variantChildren, setVariantChildren] = useState([])
  const [loadingCatalogue, setLoadingCatalogue] = useState(false)

  const filters = block.filters || emptyOrderFilters()
  const lines = block.lines || []
  // Mandatory sequence — catalogue locked until a supplier company is selected
  const supplierReady = Boolean(block.supplierId)
  const addedIds = useMemo(() => new Set(lines.map((line) => line.productId)), [lines])

  const parents = catalog?.parents || []
  const childrenByParent = catalog?.childrenByParent

  const subcategoryOptions = useMemo(() => {
    if (!filters.categoryId || !childrenByParent?.get) return []
    return (childrenByParent.get(filters.categoryId) || []).map((sub) => ({
      id: sub.id,
      label: sub.name,
    }))
  }, [filters.categoryId, childrenByParent])

  const categoryOptions = useMemo(
    () => parents.map((cat) => ({ id: cat.id, label: cat.name })),
    [parents],
  )

  const supplierOptions = useMemo(
    () =>
      suppliers
        .filter((s) => s.id === block.supplierId || !usedSupplierIds.has(s.id))
        .map((s) => ({ id: s.id, label: s.companyName || 'Supplier' })),
    [suppliers, block.supplierId, usedSupplierIds],
  )

  const selectedSupplier = suppliers.find((s) => s.id === block.supplierId)

  const variantAxes = useMemo(() => deriveVariantAxes(variantChildren), [variantChildren])
  const selectedTypeValues = useMemo(() => {
    const axis = variantAxes.find((t) => t.id === filters.variantTypeId)
    return axis?.values || []
  }, [variantAxes, filters.variantTypeId])

  const productOptions = useMemo(() => {
    return productChoices.map((p) => ({
      id: p.id,
      label: p.itemCode ? `${p.name} (${p.itemCode})` : p.name,
    }))
  }, [productChoices])

  function patchBlock(next) {
    onChange?.({ ...block, ...next })
  }

  function patchFilters(nextFilters) {
    patchBlock({ filters: nextFilters })
  }

  // Load product dropdown options for step 4 — only after supplier is selected
  useEffect(() => {
    let cancelled = false
    if (!supplierReady) {
      setProductChoices([])
      return () => {
        cancelled = true
      }
    }

    const type =
      filters.productType === PRODUCT_TYPES.VARIANT
        ? PRODUCT_TYPES.VARIANT
        : filters.productType === PRODUCT_TYPES.SINGLE
          ? PRODUCT_TYPES.SINGLE
          : undefined

    void (async () => {
      const result = await fetchControlProductOptions({
        categoryId: filters.categoryId || undefined,
        subcategoryId: filters.subcategoryId || undefined,
        limit: 100,
      })
      if (cancelled) return
      let rows = result.success ? result.items : []
      if (type === PRODUCT_TYPES.VARIANT) {
        rows = rows.filter((p) => p.type === PRODUCT_TYPES.VARIANT)
      } else if (type === PRODUCT_TYPES.SINGLE) {
        rows = rows.filter((p) => isNormalProduct(p))
      } else {
        rows = rows.filter(
          (p) => p.type === PRODUCT_TYPES.VARIANT || isNormalProduct(p),
        )
      }
      setProductChoices(rows)
    })()

    return () => {
      cancelled = true
    }
  }, [supplierReady, filters.categoryId, filters.subcategoryId, filters.productType])

  // Load variant children when a variant parent is selected
  useEffect(() => {
    let cancelled = false
    if (!supplierReady) {
      setVariantChildren([])
      return () => {
        cancelled = true
      }
    }

    const parent = productChoices.find((p) => p.id === filters.productId)
    const needsChildren = parent?.type === PRODUCT_TYPES.VARIANT

    if (!needsChildren) {
      setVariantChildren([])
      return () => {
        cancelled = true
      }
    }

    void fetchControlProductDetail(filters.productId).then((res) => {
      if (cancelled) return
      const variants =
        res.success && Array.isArray(res.data?.variants) ? res.data.variants : []
      setVariantChildren(variants.filter((v) => isOrderableSku(v)))
    })

    return () => {
      cancelled = true
    }
  }, [supplierReady, filters.productId, productChoices])

  // Build catalogue result rows — skipped until supplier is selected
  useEffect(() => {
    let cancelled = false
    if (!supplierReady) {
      setCatalogue([])
      setLoadingCatalogue(false)
      return () => {
        cancelled = true
      }
    }

    setLoadingCatalogue(true)

    void (async () => {
      try {
        if (filters.productType === PRODUCT_TYPES.VARIANT && filters.productId) {
          let rows = variantChildren
          if (filters.variantTypeId || filters.variantValueId) {
            rows = rows.filter((child) => {
              const parts = child.parts || []
              if (filters.variantTypeId) {
                const hasType = parts.some(
                  (part) =>
                    (part.variantTypeId || part.typeId) === filters.variantTypeId,
                )
                if (!hasType) return false
              }
              if (filters.variantValueId) {
                const hasValue = parts.some(
                  (part) =>
                    (part.variantValueId || part.valueId) === filters.variantValueId,
                )
                if (!hasValue) return false
              }
              return true
            })
          }
          if (!cancelled) setCatalogue(rows)
          return
        }

        const result = await fetchControlProductOptions({
          categoryId: filters.categoryId || undefined,
          subcategoryId: filters.subcategoryId || undefined,
          limit: 100,
        })
        if (cancelled) return
        let rows = (result.success ? result.items : []).filter(isOrderableSku)

        if (filters.productType === PRODUCT_TYPES.SINGLE) {
          rows = rows.filter(isNormalProduct)
        } else if (filters.productType === PRODUCT_TYPES.VARIANT) {
          rows = rows.filter(isVariantChild)
        }

        if (filters.productId) {
          const selected = productChoices.find((p) => p.id === filters.productId)
          if (selected?.type === PRODUCT_TYPES.VARIANT) {
            rows = rows.filter((p) => p.parentId === filters.productId)
          } else {
            rows = rows.filter((p) => p.id === filters.productId)
          }
        }

        setCatalogue(rows)
      } finally {
        if (!cancelled) setLoadingCatalogue(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    supplierReady,
    filters.categoryId,
    filters.subcategoryId,
    filters.productType,
    filters.productId,
    filters.variantTypeId,
    filters.variantValueId,
    variantChildren,
    productChoices,
  ])

  function handleSupplierChange(nextSupplierId) {
    // Clearing supplier resets catalogue state so no orphan lines sit under 0 companies
    if (!nextSupplierId) {
      patchBlock({
        supplierId: '',
        filters: emptyOrderFilters(),
        lines: [],
      })
      return
    }
    patchBlock({ supplierId: nextSupplierId })
  }

  function handleAdd(product) {
    if (addedIds.has(product.id)) return
    const line = buildOrderLineFromProduct(product, categoryById)
    patchBlock({ lines: [...lines, line] })
  }

  function handleQty(productId, quantity) {
    patchBlock({
      lines: lines.map((line) =>
        line.productId === productId ? { ...line, quantity } : line,
      ),
    })
  }

  function handleRemoveLine(productId) {
    patchBlock({ lines: lines.filter((line) => line.productId !== productId) })
  }

  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5',
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Company Block {index + 1}
            </p>
            <p className="truncate text-base font-semibold text-slate-900">
              {selectedSupplier?.companyName || 'Select a supplier'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          {/* Combobox supplier — type in field filters list (shared SearchableSelect) */}
          <div className="min-w-[14rem] flex-1 space-y-1.5 sm:max-w-xs">
            <Label htmlFor={`supplier-${block.key}`} className="text-xs text-slate-500">
              Supplier company <span className="text-rose-500">*</span>
            </Label>
            <SearchableSelect
              id={`supplier-${block.key}`}
              value={block.supplierId}
              options={supplierOptions}
              placeholder="Select supplier"
              searchPlaceholder="Search supplier…"
              emptyLabel="Select supplier"
              emptyMessage="No suppliers found"
              includeEmpty
              onChange={(nextId) => handleSupplierChange(nextId || '')}
            />
            {!suppliers.length ? (
              <p className="text-xs text-amber-700">
                No active suppliers — add one under Supplier Management first.
              </p>
            ) : null}
          </div>

          <span className="mb-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800">
            {lines.length} item{lines.length === 1 ? '' : 's'}
          </span>
          {canRemove ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="mb-0.5 size-8 text-rose-600 hover:bg-rose-50"
              aria-label={`Remove company block ${index + 1}`}
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {/* use reusable EmptyState — hide catalogue until supplier is selected */}
      {!supplierReady ? (
        <EmptyState
          icon={Building2}
          title="Please select a supplier to view and add products"
          description="Search, filters, and the product catalogue stay locked until a supplier company is selected."
          compact
        />
      ) : (
        <>
          <OrderItemFilters
            filters={filters}
            categoryOptions={categoryOptions}
            subcategoryOptions={subcategoryOptions}
            productOptions={productOptions}
            variantTypeOptions={variantAxes.map((axis) => ({ id: axis.id, label: axis.name }))}
            variantValueOptions={selectedTypeValues.map((value) => ({
              id: value.id,
              label: value.name,
            }))}
            onChange={patchFilters}
            onClear={() => patchFilters(emptyOrderFilters())}
          />

          <OrderCatalogueResults
            items={catalogue}
            addedProductIds={addedIds}
            loading={loadingCatalogue}
            onAdd={handleAdd}
          />

          <OrderLinesTable
            lines={lines}
            onQuantityChange={handleQty}
            onRemove={handleRemoveLine}
          />
        </>
      )}
    </section>
  )
}

export default OrderCompanyBlock
