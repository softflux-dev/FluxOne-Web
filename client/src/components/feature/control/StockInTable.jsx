import { ClipboardList, Plus } from 'lucide-react'
import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { MovementRowMenu } from '@/components/feature/control/MovementRowMenu'
import { Button } from '@/components/ui/button'
import { controlColumnsForTab } from '@/lib/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export function StockInTable({
  items,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onAddStock,
  onOrderDemand,
  onUpdateStock,
  onViewDetails,
  className,
}) {
  const headerActions = (
    <>
      {onOrderDemand ? (
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onOrderDemand}>
          <ClipboardList className="size-4" />
          By Order Demand
        </Button>
      ) : null}
      <Button type="button" variant="brand" onClick={onAddStock}>
        <Plus className="size-4" />
        Add Stock
      </Button>
    </>
  )

  return (
    <MovementHistoryTable
      title="Stock in history"
      description="Inbound ledger movements for this company"
      actions={headerActions}
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.IN)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      renderRowActions={(row) => (
        <MovementRowMenu
          row={row}
          tab={MOVEMENT_TYPES.IN}
          onUpdateStock={onUpdateStock}
          onViewDetails={onViewDetails}
        />
      )}
      emptyTitle="No stock-in records"
      emptyHint="Add stock manually or receive an approved purchase order."
      className={className}
    />
  )
}
