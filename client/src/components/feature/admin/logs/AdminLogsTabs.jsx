import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'
import { ADMIN_LOG_TABS } from '@/lib/adminLogs'

// Child: category tab list — Parent: AdminLogsPage
export function AdminLogsTabs({ value, onChange, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 border-b border-border pb-px',
        className,
      )}
      role="tablist"
      aria-label="Log categories"
    >
      {ADMIN_LOG_TABS.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.id)}
            className={cn(
              'relative inline-flex cursor-pointer items-center px-3 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-3.5',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="whitespace-nowrap">{tab.label}</span>
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

export default AdminLogsTabs
