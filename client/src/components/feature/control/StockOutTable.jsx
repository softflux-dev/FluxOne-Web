import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { controlColumnsForTab } from '@/lib/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

// Stock out is read-only — no row actions.
export function StockOutTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  className,
}) {
  return (
    <MovementHistoryTable
      title="Stock out history"
      description="Outgoing stock recorded automatically when items are sold"
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.OUT)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyTitle="No stock-out records"
      emptyHint="Sales stock-out records appear here automatically."
      className={className}
    />
  )
}
