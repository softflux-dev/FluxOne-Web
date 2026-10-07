import { Plus } from 'lucide-react'
import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { MovementRowMenu } from '@/components/feature/control/MovementRowMenu'
import { Button } from '@/components/ui/button'
import { controlColumnsForTab } from '@/lib/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export function AdjustmentTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onAddAdjustment,
  onViewDetails,
  className,
}) {
  return (
    <MovementHistoryTable
      title="Adjustment history"
      description="Manual corrections, damaged, expired, and other stock movements"
      actions={
        <Button type="button" variant="brand" onClick={onAddAdjustment}>
          <Plus className="size-4" />
          Add adjustment
        </Button>
      }
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.ADJUSTMENT)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      renderRowActions={(row) => (
        <MovementRowMenu
          row={row}
          tab={MOVEMENT_TYPES.ADJUSTMENT}
          onViewDetails={onViewDetails}
        />
      )}
      emptyTitle="No adjustments"
      emptyHint="Create an adjustment with a required reason."
      className={className}
    />
  )
}
