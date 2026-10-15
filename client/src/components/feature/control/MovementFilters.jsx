import { CatalogCascadeFilters } from '@/components/shared/CatalogCascadeFilters'
import { LEDGER_KIND_OPTIONS } from '@/lib/controlTabs'

// Control filter bar — shared cascade + dates + product type (+ ledger kind on Adj/Out).
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
  ledgerKindOptions = LEDGER_KIND_OPTIONS,
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
      ledgerKindOptions={ledgerKindOptions}
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
