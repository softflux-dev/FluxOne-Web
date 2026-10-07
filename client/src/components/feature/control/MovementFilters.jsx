import { CatalogCascadeFilters } from '@/components/shared/CatalogCascadeFilters'

// Control filter bar — shared cascade + dates + product type (+ ledger kind on Adjustment).
export function MovementFilters({
  q = '',
  type = '',
  categoryId = '',
  subcategoryId = '',
  productId = '',
  variantTypeId = '',
  variantValueId = '',
  ledgerKind = '',
  from = '',
  to = '',
  showLedgerKind = false,
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
      categoryId={categoryId}
      subcategoryId={subcategoryId}
      productId={productId}
      variantTypeId={variantTypeId}
      variantValueId={variantValueId}
      ledgerKind={ledgerKind}
      from={from}
      to={to}
      showDates
      showType
      showLedgerKind={showLedgerKind}
      title="Filter your inventory"
      description="Filters apply across all tabs."
      idPrefix="control"
      categories={categories}
      subcategories={subcategories}
      onSearchChange={onSearchChange}
      onChange={onChange}
      className={className}
    />
  )
}

export default MovementFilters
