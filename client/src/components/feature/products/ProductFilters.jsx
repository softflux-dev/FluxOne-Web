import { CatalogCascadeFilters } from '@/components/shared/CatalogCascadeFilters'

// Products filter bar — same cascade as Control, plus Status (no ledger dates).
export function ProductFilters({
  q = '',
  type = '',
  status = 'active',
  categoryId = '',
  subcategoryId = '',
  productId = '',
  variantTypeId = '',
  variantValueId = '',
  categories = [],
  subcategories = [],
  onSearchChange,
  onChange,
  className,
}) {
  return (
    <CatalogCascadeFilters
      q={q}
      type={type}
      status={status}
      categoryId={categoryId}
      subcategoryId={subcategoryId}
      productId={productId}
      variantTypeId={variantTypeId}
      variantValueId={variantValueId}
      showType
      showStatus
      title="Filter your inventory"
      description="Narrow the product catalog by category, product, and status."
      idPrefix="product"
      searchPlaceholder="Search name, code, barcode…"
      categories={categories}
      subcategories={subcategories}
      onSearchChange={onSearchChange}
      onChange={onChange}
      className={className}
    />
  )
}

export default ProductFilters
