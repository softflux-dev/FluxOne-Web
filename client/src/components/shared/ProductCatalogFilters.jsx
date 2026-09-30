import { useMemo } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * Reusable catalog cascade filters for Sales / Inventory / other roles.
 * Flow: Category → Sub-category → Product → Variant (only if product has variants) → Clear Filters
 */
export function ProductCatalogFilters({
  // Search (optional)
  showSearch = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchId = 'catalog-search',

  // Optional date (Sales)
  showDate = false,
  dateValue = '',
  onDateChange,
  dateId = 'catalog-date',

  // Cascade values
  categoryId = '',
  subcategoryId = '',
  productId = '',
  variantId = '',

  // Catalog data
  categories = [],
  products = [],

  // Toggles
  showProduct = true,
  showVariant = true,

  // Callbacks — onChange receives a partial patch; parent merges + cascades resets
  onChange,
  onClear,
  className,
  extraFilters = null,
}) {
  const topCategories = useMemo(
    () => (Array.isArray(categories) ? categories.filter((c) => !c.parentId) : []),
    [categories],
  )

  const subcategoryOptions = useMemo(() => {
    if (!categoryId) return []
    return (Array.isArray(categories) ? categories : []).filter(
      (c) => c.parentId === categoryId,
    )
  }, [categories, categoryId])

  // Parent / standalone products for the Product dropdown (scoped by cat / sub)
  const productOptions = useMemo(() => {
    const list = Array.isArray(products) ? products : []
    return list.filter((p) => {
      if (p.parentId) return false
      if (categoryId && p.categoryId !== categoryId) return false
      if (subcategoryId && p.subcategoryId !== subcategoryId) return false
      return true
    })
  }, [products, categoryId, subcategoryId])

  // Variant children of selected product (if any)
  const variantOptions = useMemo(() => {
    if (!productId || !showVariant) return []
    const selected = productOptions.find((p) => p.id === productId)
    if (Array.isArray(selected?.variants) && selected.variants.length > 0) {
      return selected.variants.map((v) => ({
        id: v.id,
        label: v.label || v.variantLabel || v.name || 'Variant',
      }))
    }
    // Fallback: child products with parentId === productId
    return (Array.isArray(products) ? products : [])
      .filter((p) => p.parentId === productId)
      .map((p) => ({
        id: p.id,
        label: p.variantLabel || p.name || 'Variant',
      }))
  }, [products, productOptions, productId, showVariant])

  const showVariantSelect = showVariant && variantOptions.length > 0

  const hasActiveFilters = Boolean(
    searchValue ||
      dateValue ||
      categoryId ||
      subcategoryId ||
      productId ||
      variantId,
  )

  function patch(next) {
    onChange?.(next)
  }

  function handleClear() {
    if (onClear) {
      onClear()
      return
    }
    onSearchChange?.('')
    onDateChange?.('')
    patch({
      categoryId: '',
      subcategoryId: '',
      productId: '',
      variantId: '',
    })
  }

  return (
    <SurfaceCard padding="compact" className={cn(className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        {showSearch ? (
          <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[12rem]">
            <Label htmlFor={searchId}>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id={searchId}
                value={searchValue}
                placeholder={searchPlaceholder}
                className="pl-9"
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          </div>
        ) : null}

        {showDate ? (
          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor={dateId}>Date</Label>
            <Input
              id={dateId}
              type="date"
              value={dateValue}
              onChange={(e) => onDateChange?.(e.target.value)}
            />
          </div>
        ) : null}

        <div className="w-full space-y-1.5 sm:w-40 lg:w-44">
          <Label htmlFor={`${searchId}-category`}>Category</Label>
          <NativeSelect
            id={`${searchId}-category`}
            value={categoryId}
            onChange={(e) =>
              patch({
                categoryId: e.target.value,
                subcategoryId: '',
                productId: '',
                variantId: '',
              })
            }
          >
            <option value="">All Categories</option>
            {topCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="w-full space-y-1.5 sm:w-40 lg:w-44">
          <Label htmlFor={`${searchId}-subcategory`}>Sub Category</Label>
          <NativeSelect
            id={`${searchId}-subcategory`}
            value={subcategoryId}
            disabled={!categoryId || subcategoryOptions.length === 0}
            onChange={(e) =>
              patch({
                subcategoryId: e.target.value,
                productId: '',
                variantId: '',
              })
            }
          >
            <option value="">
              {!categoryId
                ? 'All Sub Categories'
                : subcategoryOptions.length === 0
                  ? 'No Sub Categories'
                  : 'All Sub Categories'}
            </option>
            {subcategoryOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {showProduct ? (
          <div className="w-full space-y-1.5 sm:w-44 lg:w-48">
            <Label htmlFor={`${searchId}-product`}>Product</Label>
            <NativeSelect
              id={`${searchId}-product`}
              value={productId}
              onChange={(e) =>
                patch({
                  productId: e.target.value,
                  variantId: '',
                })
              }
            >
              <option value="">All Products</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}

        {showVariantSelect ? (
          <div className="w-full space-y-1.5 sm:w-40 lg:w-44">
            <Label htmlFor={`${searchId}-variant`}>Variant</Label>
            <NativeSelect
              id={`${searchId}-variant`}
              value={variantId}
              onChange={(e) => patch({ variantId: e.target.value })}
            >
              <option value="">All Variants</option>
              {variantOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}

        {extraFilters}

        {hasActiveFilters ? (
          <div className="shrink-0 pb-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-9 cursor-pointer px-3 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Clear Filters
            </Button>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  )
}

export default ProductCatalogFilters
