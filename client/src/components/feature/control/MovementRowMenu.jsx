import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CONTROL_UI_TAB } from '@/lib/controlTabs'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { cn } from '@/lib/utils'

// Row ⋯ menu — tab-aware actions for Control history tables.
export function MovementRowMenu({
  row,
  tab,
  onUpdateStock,
  onViewDetails,
  onEditThreshold,
  className,
}) {
  const canUpdateStock = tab === MOVEMENT_TYPES.IN && Boolean(onUpdateStock)
  const canViewDetails =
    (tab === MOVEMENT_TYPES.IN || tab === MOVEMENT_TYPES.ADJUSTMENT) && Boolean(onViewDetails)
  const canEditThreshold = tab === CONTROL_UI_TAB.THRESHOLDS && Boolean(onEditThreshold)

  if (!canUpdateStock && !canViewDetails && !canEditThreshold) {
    return <span className="text-xs text-slate-400">—</span>
  }

  return (
    <div className={cn('relative inline-flex', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <MoreVertical className="size-4" />
          <span className="sr-only">Row actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {canUpdateStock ? (
            <DropdownMenuItem onClick={() => onUpdateStock?.(row)}>
              Update stock
            </DropdownMenuItem>
          ) : null}
          {canViewDetails ? (
            <DropdownMenuItem onClick={() => onViewDetails?.(row)}>
              View details & history
            </DropdownMenuItem>
          ) : null}
          {canEditThreshold ? (
            <DropdownMenuItem onClick={() => onEditThreshold?.(row)}>Edit</DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default MovementRowMenu
