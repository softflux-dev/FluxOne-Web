import { SearchStatusFilters } from '@/components/shared/SearchStatusFilters'

const SUPPLIER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
]

// Debounced search + status — shared SearchStatusFilters pattern
export function SupplierFilters({
  q = '',
  active = 'active',
  onSearchChange,
  onActiveChange,
  className,
}) {
  return (
    <SearchStatusFilters
      className={className}
      q={q}
      status={active}
      searchPlaceholder="Search by company name or ID (SUP-…)"
      statusOptions={SUPPLIER_STATUS_OPTIONS}
      onSearchChange={onSearchChange}
      onStatusChange={onActiveChange}
    />
  )
}
