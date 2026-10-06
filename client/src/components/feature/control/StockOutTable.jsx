import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { MovementRowMenu } from '@/components/feature/control/MovementRowMenu'
import { controlColumnsForTab } from '@/lib/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export function StockOutTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onUpdateThreshold,
  onUpdatePrice,
  onViewDetails,
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
      renderRowActions={(row) => (
        <MovementRowMenu
          row={row}
          tab={MOVEMENT_TYPES.OUT}
          onUpdateThreshold={onUpdateThreshold}
          onUpdatePrice={onUpdatePrice}
          onViewDetails={onViewDetails}
        />
      )}
      emptyTitle="No stock-out records"
      emptyHint="Sales stock-out records appear here automatically."
      className={className}
    />
  )
}
