import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'
import { CONTROL_UI_TAB } from '@/lib/controlTabs'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'

export const CONTROL_TABS = [
  { id: CONTROL_UI_TAB.IN, label: 'Stock In', icon: ArrowDownToLine },
  { id: CONTROL_UI_TAB.OUT, label: 'Stock Out', icon: ArrowUpFromLine },
  { id: CONTROL_UI_TAB.ADJUSTMENT, label: 'Adjustment', icon: Scale },
  { id: CONTROL_UI_TAB.THRESHOLDS, label: 'Manage Threshold', icon: Settings2 },
]

// Control tabs — count badges from summary API.
export function InventoryControlTabs({
  value,
  onChange,
  counts = null,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 border-b border-slate-200 pb-px',
        className,
      )}
      role="tablist"
    >
      {CONTROL_TABS.map((tab) => {
        const active = value === tab.id
        const count =
          tab.id === CONTROL_UI_TAB.THRESHOLDS
            ? counts?.thresholds
            : counts?.[tab.id]
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              'relative inline-flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-4',
              active
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-800',
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            <span>{tab.label}</span>
            {count != null ? (
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                  active
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-100 text-slate-600',
                )}
              >
                {Number(count).toLocaleString()}
              </span>
            ) : null}
            {active ? (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                style={{ background: BRAND.purple }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export default InventoryControlTabs
