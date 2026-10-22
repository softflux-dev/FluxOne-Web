import { SearchStatusFilters } from '@/components/shared/SearchStatusFilters'

// TL order-request statuses (Demand Requests + IM Orders)
const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

// Reusable SearchStatusFilters — same layout as Supplier / Products
export function OrderFilters({
  q = '',
  status = '',
  onSearchChange,
  onStatusChange,
  className,
}) {
  return (
    <SearchStatusFilters
      className={className}
      q={q}
      status={status}
      searchPlaceholder="Search by order number or company…"
      statusOptions={ORDER_STATUS_OPTIONS}
      onSearchChange={onSearchChange}
      onStatusChange={onStatusChange}
    />
  )
}

export default OrderFilters
