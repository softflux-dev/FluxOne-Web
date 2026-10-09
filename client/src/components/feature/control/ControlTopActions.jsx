import {
  Bell,
  ClipboardList,
  Download,
  Plus,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Primary header CTAs — By Order Demand + Add Stock In (Figma header row)
export function ControlPrimaryAction({
  onAddStockIn,
  onOrderDemand,
  className,
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onOrderDemand ? (
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          style={{ color: BRAND.deep }}
          onClick={() => onOrderDemand?.()}
        >
          <ClipboardList className="size-4" />
          By Order Demand
        </Button>
      ) : null}
      <Button
        type="button"
        variant="brand"
        onClick={() => onAddStockIn?.()}
      >
        <Plus className="size-4" />
        Add Stock In
      </Button>
    </div>
  )
}

export function ControlSecondaryActions({
  alertCount = 0,
  onStockAlerts,
  onExport,
  onImport,
  exportLoading = false,
  className,
}) {
  const badge = Number(alertCount) || 0

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        className="relative cursor-pointer"
        style={{ color: BRAND.deep }}
        onClick={() => onStockAlerts?.()}
      >
        <Bell className="size-4" />
        Stock Alerts
        {badge > 0 ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        style={{ color: BRAND.deep }}
        disabled={exportLoading}
        onClick={() => onExport?.()}
      >
        <Download className="size-4" />
        {exportLoading ? 'Exporting…' : 'Export'}
      </Button>

      {/* <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        style={{ color: BRAND.deep }}
        onClick={() => onImport?.()}
      >
        <Upload className="size-4" />
        Import
      </Button> */}
    </div>
  )
}

/** Combined chrome: primary + secondary (used when not splitting into PageHeader). */
export function ControlTopActions({
  alertCount = 0,
  onStockAlerts,
  onExport,
  onImport,
  exportLoading = false,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-stretch gap-3 sm:items-end', className)}>
      <ControlSecondaryActions
        alertCount={alertCount}
        onStockAlerts={onStockAlerts}
        onExport={onExport}
        onImport={onImport}
        exportLoading={exportLoading}
      />
    </div>
  )
}

export default ControlTopActions
