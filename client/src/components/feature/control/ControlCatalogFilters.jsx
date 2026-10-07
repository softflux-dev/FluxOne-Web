import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { deriveVariantAxes } from '@/lib/variantAxes'
import {
  fetchControlProductDetail,
  fetchControlProductOptions,
} from '@/hooks/useInventoryControl'
import { cn } from '@/lib/utils'

function FilterSelect({
  id,
  label,
  value,
  disabled = false,
  placeholder,
  options = [],
  onChange,
  className,
}) {
  return (
    <div className={cn('w-full space-y-1.5 sm:w-44', className)}>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

// Shared product cascade for Control dialogs — Search → Category → Sub → Product → Variant axes.
export function ControlCatalogFilters({
  catalog,
  filters,
  onChange,
  showSearch = true,
  showType = true,
  className,
}) {
  const parents = catalog?.parents || []
  const childrenByParent = catalog?.childrenByParent

  const [products, setProducts] = useState([])
  const [variantOptions, setVariantOptions] = useState([])

  const {
    q = '',
    categoryId = '',
    subcategoryId = '',
    productId = '',
    variantTypeId = '',
    variantValueId = '',
    type = '',
  } = filters || {}

  const subs = useMemo(() => {
    if (!categoryId || !childrenByParent?.get) return []
    return childrenByParent.get(categoryId) || []
  }, [categoryId, childrenByParent])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  )

  const isVariantProduct = selectedProduct?.type === PRODUCT_TYPES.VARIANT
  const hasSubcategories = Boolean(categoryId) && subs.length > 0
  const subEnabled = hasSubcategories
  const productEnabled =
    Boolean(categoryId) && (!hasSubcategories || Boolean(subcategoryId))

  const variantAxes = useMemo(() => deriveVariantAxes(variantOptions), [variantOptions])
  const selectedTypeValues = useMemo(() => {
    const axis = variantAxes.find((t) => t.id === variantTypeId)
    return axis?.values || []
  }, [variantAxes, variantTypeId])

  const variantTypeEnabled = Boolean(productId) && isVariantProduct && variantAxes.length > 0
  const variantValueEnabled =
    variantTypeEnabled && Boolean(variantTypeId) && selectedTypeValues.length > 0

  function patch(next) {
    onChange?.({ ...filters, ...next })
  }

  useEffect(() => {
    let cancelled = false
    if (!productEnabled) {
      setProducts([])
      return () => {
        cancelled = true
      }
    }
    void fetchControlProductOptions({
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      q: q || undefined,
      limit: 100,
    }).then((res) => {
      if (cancelled) return
      setProducts(res.success ? res.items : [])
    })
    return () => {
      cancelled = true
    }
  }, [categoryId, subcategoryId, q, productEnabled])

  useEffect(() => {
    let cancelled = false
    if (!productId || !isVariantProduct) {
      setVariantOptions([])
      return () => {
        cancelled = true
      }
    }
    void fetchControlProductDetail(productId).then((res) => {
      if (cancelled) return
      const variants = res.success && Array.isArray(res.data?.variants) ? res.data.variants : []
      setVariantOptions(variants)
    })
    return () => {
      cancelled = true
    }
  }, [productId, isVariantProduct])

  const categoryOptions = parents.map((cat) => ({ id: cat.id, label: cat.name }))
  const subcategoryOptions = subs.map((sub) => ({ id: sub.id, label: sub.name }))
  const productOptions = products.map((product) => ({
    id: product.id,
    label: product.itemCode ? `${product.name} (${product.itemCode})` : product.name,
  }))
  const typeAxisOptions = variantAxes.map((axis) => ({ id: axis.id, label: axis.name }))
  const valueAxisOptions = selectedTypeValues.map((value) => ({
    id: value.id,
    label: value.name,
  }))

  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end', className)}>
      {showSearch ? (
        <div className="min-w-0 flex-1 basis-full sm:basis-56 space-y-1.5">
          <Label htmlFor="ctrl-cat-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="ctrl-cat-search"
              value={q}
              placeholder="Search name, code…"
              className="pl-9"
              onChange={(event) => patch({ q: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      <FilterSelect
        id="ctrl-cat-category"
        label="Category"
        value={categoryId}
        placeholder="All categories"
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
        id="ctrl-cat-sub"
        label="Sub category"
        value={subcategoryId}
        disabled={!subEnabled}
        placeholder={!categoryId ? 'Select category' : !hasSubcategories ? 'No sub-categories' : 'All'}
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
        id="ctrl-cat-product"
        label="Product"
        value={productId}
        disabled={!productEnabled && !categoryId}
        placeholder="All products"
        options={productOptions}
        onChange={(next) =>
          patch({
            productId: next,
            variantTypeId: '',
            variantValueId: '',
          })
        }
      />

      <FilterSelect
        id="ctrl-cat-vtype"
        label="Variant type"
        value={variantTypeId}
        disabled={!variantTypeEnabled}
        placeholder="All types"
        options={typeAxisOptions}
        onChange={(next) => patch({ variantTypeId: next, variantValueId: '' })}
      />

      <FilterSelect
        id="ctrl-cat-vvalue"
        label="Variant value"
        value={variantValueId}
        disabled={!variantValueEnabled}
        placeholder="All values"
        options={valueAxisOptions}
        onChange={(next) => patch({ variantValueId: next })}
      />

      {showType ? (
        <FilterSelect
          id="ctrl-cat-type"
          label="Type"
          value={type}
          placeholder="All types"
          className="sm:w-36"
          options={[
            { id: PRODUCT_TYPES.SINGLE, label: 'Single' },
            { id: PRODUCT_TYPES.BUNDLE, label: 'Bundle' },
            { id: PRODUCT_TYPES.VARIANT, label: 'Variant' },
          ]}
          onChange={(next) => patch({ type: next })}
        />
      ) : null}
    </div>
  )
}

export default ControlCatalogFilters
