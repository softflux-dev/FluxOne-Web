import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { LEDGER_KIND_OPTIONS } from '@/lib/controlTabs'
import { deriveVariantAxes } from '@/lib/variantAxes'
import {
  fetchControlProductDetail,
  fetchControlProductOptions,
} from '@/hooks/useInventoryControl'
import { cn } from '@/lib/utils'

// Labeled select — always visible; disable until cascade unlocks it.
function FilterSelect({
  id,
  label,
  value,
  disabled = false,
  placeholder,
  options = [],
  onChange,
  className,
  includeEmpty = true,
}) {
  return (
    <div className={cn('w-full space-y-1.5 sm:w-44 lg:w-48', className)}>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {includeEmpty ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

const DEFAULT_TYPE_OPTIONS = [
  { id: PRODUCT_TYPES.SINGLE, label: 'Single Item' },
  { id: PRODUCT_TYPES.BUNDLE, label: 'Bundle' },
  { id: PRODUCT_TYPES.VARIANT, label: 'Variant' },
]

const DEFAULT_STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
]

// Shared catalog cascade — Search → Category → Sub → Product → Variant type/value.
// Optional slots: dates, single date, product type, status, ledger kind.
export function CatalogCascadeFilters({
  q = '',
  type = '',
  status = '',
  categoryId = '',
  subcategoryId = '',
  productId = '',
  variantTypeId = '',
  variantValueId = '',
  ledgerKind = '',
  from = '',
  to = '',
  dateValue = '',
  categories = [],
  subcategories = [],
  showSearch = true,
  showDates = false,
  showDate = false,
  showType = false,
  showStatus = false,
  showLedgerKind = false,
  title = 'Filter your inventory',
  description = null,
  idPrefix = 'catalog',
  searchPlaceholder = 'Search name, code, barcode…',
  typeOptions = DEFAULT_TYPE_OPTIONS,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  onSearchChange,
  onDateChange,
  onChange,
  onReset,
  className,
  extraFilters = null,
}) {
  const [products, setProducts] = useState([])
  const [variantOptions, setVariantOptions] = useState([])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  )

  const isVariantProduct = selectedProduct?.type === PRODUCT_TYPES.VARIANT
  const hasSubcategories = Boolean(categoryId) && subcategories.length > 0
  const subEnabled = hasSubcategories
  const productEnabled =
    Boolean(categoryId) && (!hasSubcategories || Boolean(subcategoryId))

  const variantAxes = useMemo(
    () => deriveVariantAxes(variantOptions),
    [variantOptions],
  )

  const selectedTypeValues = useMemo(() => {
    const axis = variantAxes.find((t) => t.id === variantTypeId)
    return axis?.values || []
  }, [variantAxes, variantTypeId])

  const variantTypeEnabled =
    Boolean(productId) && isVariantProduct && variantAxes.length > 0
  const variantValueEnabled =
    variantTypeEnabled && Boolean(variantTypeId) && selectedTypeValues.length > 0

  const hasActiveFilters = Boolean(
    q ||
      type ||
      (showStatus && status && status !== 'active') ||
      categoryId ||
      subcategoryId ||
      productId ||
      variantTypeId ||
      variantValueId ||
      ledgerKind ||
      from ||
      to ||
      dateValue,
  )

  // Load products when category / subcategory cascade is ready.
  useEffect(() => {
    let cancelled = false

    if (!productEnabled) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setProducts([])
        if (productId || variantTypeId || variantValueId) {
          onChange?.({
            productId: '',
            variantTypeId: '',
            variantValueId: '',
          })
        }
      })
      return () => {
        cancelled = true
      }
    }

    void fetchControlProductOptions({
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      limit: 100,
    }).then((res) => {
      if (cancelled) return
      const items = res.success ? res.items : []
      setProducts(items)
      if (productId && !items.some((p) => p.id === productId)) {
        onChange?.({
          productId: '',
          variantTypeId: '',
          variantValueId: '',
        })
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cascade-driven reload
  }, [categoryId, subcategoryId, productEnabled])

  // Load variant axes when a variant parent is selected.
  useEffect(() => {
    let cancelled = false

    if (!productId) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setVariantOptions([])
        if (variantTypeId || variantValueId) {
          onChange?.({ variantTypeId: '', variantValueId: '' })
        }
      })
      return () => {
        cancelled = true
      }
    }

    if (!selectedProduct) {
      return () => {
        cancelled = true
      }
    }

    if (!isVariantProduct) {
      void Promise.resolve().then(() => {
        if (cancelled) return
        setVariantOptions([])
        if (variantTypeId || variantValueId) {
          onChange?.({ variantTypeId: '', variantValueId: '' })
        }
      })
      return () => {
        cancelled = true
      }
    }

    void fetchControlProductDetail(productId).then((res) => {
      if (cancelled) return
      if (!res.success) {
        setVariantOptions([])
        return
      }
      const variants = Array.isArray(res.data?.variants) ? res.data.variants : []
      setVariantOptions(variants)
      const axes = deriveVariantAxes(variants)
      const typeOk = !variantTypeId || axes.some((t) => t.id === variantTypeId)
      const values = axes.find((t) => t.id === variantTypeId)?.values || []
      const valueOk = !variantValueId || values.some((v) => v.id === variantValueId)
      if (!typeOk || !valueOk) {
        onChange?.({
          ...(typeOk ? {} : { variantTypeId: '', variantValueId: '' }),
          ...(typeOk && !valueOk ? { variantValueId: '' } : {}),
        })
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tied to selected product
  }, [productId, isVariantProduct, selectedProduct])

  function patch(next) {
    onChange?.(next)
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
      return
    }
    onSearchChange?.('')
    onDateChange?.('')
    onChange?.({
      q: '',
      type: '',
      status: showStatus ? 'active' : undefined,
      categoryId: '',
      subcategoryId: '',
      productId: '',
      variantTypeId: '',
      variantValueId: '',
      ledgerKind: '',
      from: '',
      to: '',
      scale: '',
    })
  }

  const categoryOptions = categories.map((cat) => ({ id: cat.id, label: cat.name }))
  const subcategoryOptions = subcategories.map((sub) => ({ id: sub.id, label: sub.name }))
  const productOptions = products.map((product) => ({
    id: product.id,
    label: product.itemCode ? `${product.name} (${product.itemCode})` : product.name,
  }))
  const typeAxisOptions = variantAxes.map((axis) => ({ id: axis.id, label: axis.name }))
  const valueAxisOptions = selectedTypeValues.map((value) => ({
    id: value.id,
    label: value.name,
  }))

  const subPlaceholder = !categoryId
    ? 'Select category first'
    : !hasSubcategories
      ? 'No sub-categories'
      : 'All Sub-categories'

  const productPlaceholder = !categoryId
    ? 'Select category first'
    : hasSubcategories && !subcategoryId
      ? 'Select sub-category first'
      : 'All Products'

  const variantTypePlaceholder = !productId
    ? 'Select product first'
    : !isVariantProduct
      ? 'Not a variant product'
      : variantAxes.length === 0
        ? 'No variant types'
        : 'All variant types'

  const variantValuePlaceholder = !variantTypeId
    ? 'Select variant type first'
    : selectedTypeValues.length === 0
      ? 'No values'
      : 'All values'

  return (
    <div className={cn('space-y-4', className)}>
      <SurfaceCard padding="compact" title={title} description={description}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
            {showSearch ? (
              <div className="min-w-0 flex-1 space-y-1.5 basis-full sm:basis-64">
                <Label htmlFor={`${idPrefix}-search`}>Search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id={`${idPrefix}-search`}
                    value={q}
                    placeholder={searchPlaceholder}
                    className="pl-9"
                    onChange={(event) => onSearchChange?.(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <FilterSelect
              id={`${idPrefix}-category`}
              label="Category"
              value={categoryId}
              placeholder="All Categories"
              options={categoryOptions}
              onChange={(next) =>
                patch({
                  categoryId: next,
                  subcategoryId: '',
                  productId: '',
                  variantTypeId: '',
                  variantValueId: '',
                })
              }
            />

            <FilterSelect
              id={`${idPrefix}-subcategory`}
              label="Sub-category"
              value={subcategoryId}
              disabled={!subEnabled}
              placeholder={subPlaceholder}
              options={subcategoryOptions}
              onChange={(next) =>
                patch({
                  subcategoryId: next,
                  productId: '',
                  variantTypeId: '',
                  variantValueId: '',
                })
              }
            />

            <FilterSelect
              id={`${idPrefix}-product`}
              label="Product"
              value={productId}
              disabled={!productEnabled}
              placeholder={productPlaceholder}
              options={productOptions}
              className="sm:w-48 lg:w-52"
              onChange={(next) =>
                patch({
                  productId: next,
                  variantTypeId: '',
                  variantValueId: '',
                })
              }
            />

            <FilterSelect
              id={`${idPrefix}-variant-type`}
              label="Variant type"
              value={variantTypeId}
              disabled={!variantTypeEnabled}
              placeholder={variantTypePlaceholder}
              options={typeAxisOptions}
              onChange={(next) =>
                patch({
                  variantTypeId: next,
                  variantValueId: '',
                })
              }
            />

            <FilterSelect
              id={`${idPrefix}-variant-value`}
              label="Variant value"
              value={variantValueId}
              disabled={!variantValueEnabled}
              placeholder={variantValuePlaceholder}
              options={valueAxisOptions}
              onChange={(next) => patch({ variantValueId: next })}
            />

            {showLedgerKind ? (
              <FilterSelect
                id={`${idPrefix}-ledger-kind`}
                label="Ledger kind"
                value={ledgerKind}
                placeholder="All types"
                options={LEDGER_KIND_OPTIONS.map((opt) => ({
                  id: opt.id,
                  label: opt.label,
                }))}
                className="sm:w-40"
                onChange={(next) => patch({ ledgerKind: next })}
              />
            ) : null}

            {showDates ? (
              <>
                <div className="w-full space-y-1.5 sm:w-36">
                  <Label htmlFor={`${idPrefix}-from`}>From</Label>
                  <Input
                    id={`${idPrefix}-from`}
                    type="date"
                    value={from}
                    onChange={(event) => patch({ from: event.target.value })}
                  />
                </div>
                <div className="w-full space-y-1.5 sm:w-36">
                  <Label htmlFor={`${idPrefix}-to`}>To</Label>
                  <Input
                    id={`${idPrefix}-to`}
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => patch({ to: event.target.value })}
                  />
                </div>
              </>
            ) : null}

            {showDate ? (
              <div className="w-full space-y-1.5 sm:w-40">
                <Label htmlFor={`${idPrefix}-date`}>Date</Label>
                <Input
                  id={`${idPrefix}-date`}
                  type="date"
                  value={dateValue}
                  onChange={(e) => onDateChange?.(e.target.value)}
                />
              </div>
            ) : null}

            {showType ? (
              <FilterSelect
                id={`${idPrefix}-type`}
                label="Type"
                value={type}
                placeholder="All Types"
                className="sm:w-36"
                options={typeOptions}
                onChange={(next) => patch({ type: next })}
              />
            ) : null}

            {showStatus ? (
              <FilterSelect
                id={`${idPrefix}-status`}
                label="Status"
                value={status || 'active'}
                includeEmpty={false}
                className="sm:w-36"
                options={statusOptions}
                onChange={(next) => patch({ status: next })}
              />
            ) : null}

            {extraFilters}

            <div className="shrink-0 pb-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasActiveFilters}
                className="h-9 cursor-pointer px-3 text-xs text-slate-600 hover:text-slate-900 border-slate-200 disabled:cursor-not-allowed"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}

export default CatalogCascadeFilters
