import { CatalogCascadeFilters } from '@/components/shared/CatalogCascadeFilters'

/**
 * Branch / role catalog filters — shared cascade (no Variant combo).
 * Flow: Search → Category → Sub → Product → Variant type → Variant value → Reset
 */
export function ProductCatalogFilters({
  showSearch = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchId = 'catalog-search',

  showDate = false,
  dateValue = '',
  onDateChange,
  dateId = 'catalog-date',

  // Preferred UX: From / To range (maps to CatalogCascadeFilters showDates).
  showDates = false,
  from = '',
  to = '',

  categoryId = '',
  subcategoryId = '',
  productId = '',
  variantTypeId = '',
  variantValueId = '',

  categories = [],

  onChange,
  onClear,
  className,
  extraFilters = null,
  title = 'Filter your inventory',
  description = null,
}) {
  // Subcategories derived from flat category list (rows with parentId).
  const topCategories = Array.isArray(categories)
    ? categories.filter((c) => !c.parentId)
    : []
  const subcategories = categoryId
    ? (Array.isArray(categories) ? categories : []).filter(
        (c) => c.parentId === categoryId,
      )
    : []

  function handleReset() {
    if (onClear) {
      onClear()
      return
    }
    onSearchChange?.('')
    onDateChange?.('')
    onChange?.({
      categoryId: '',
      subcategoryId: '',
      productId: '',
      variantTypeId: '',
      variantValueId: '',
      from: '',
      to: '',
    })
  }

  return (
    <CatalogCascadeFilters
      q={searchValue}
      categoryId={categoryId}
      subcategoryId={subcategoryId}
      productId={productId}
      variantTypeId={variantTypeId}
      variantValueId={variantValueId}
      from={from}
      to={to}
      dateValue={dateValue}
      showSearch={showSearch}
      showDates={showDates}
      showDate={showDate && !showDates}
      title={title}
      description={description}
      idPrefix={searchId || dateId || 'catalog'}
      searchPlaceholder={searchPlaceholder}
      categories={topCategories}
      subcategories={subcategories}
      onSearchChange={onSearchChange}
      onDateChange={onDateChange}
      onChange={onChange}
      onReset={handleReset}
      className={className}
      extraFilters={extraFilters}
    />
  )
}

export default ProductCatalogFilters
