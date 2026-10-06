import { Plus } from 'lucide-react'
import { MotionReveal } from '@/components/shared/MotionReveal'
import { SearchStatusFilters } from '@/components/shared/SearchStatusFilters'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { cn } from '@/lib/utils'

//
// Shared shell: pill tabs (parents / children) + primary CTA + optional filters + table slot.
//
export function ParentChildManagementLayout({
  activeTab = 'parents',
  onTabChange,
  parentTabLabel = 'Parents',
  childTabLabel = 'Children',
  parentCount = 0,
  childCount = 0,

  primaryActionLabel = 'Add',
  onPrimaryAction,
  primaryActionDisabled = false,

  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  status = 'all',
  onStatusChange,
  statusOptions,

  parentFilterId = 'all',
  onParentFilterChange,
  parentFilterOptions = [],
  showParentFilter = false,
  parentFilterLabel = 'Filter by parent',

  children,
  className,
}) {
  const isParents = activeTab === 'parents'

  return (
    <div className={cn('space-y-4 sm:space-y-5', className)}>
      <MotionReveal delay={0.02}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex w-fit rounded-full bg-slate-100/90 p-1 ring-1 ring-border"
            role="tablist"
            aria-label="Parent and child views"
          >
            <TabPill
              active={isParents}
              onClick={() => onTabChange?.('parents')}
              label={`${parentTabLabel} (${parentCount})`}
            />
            <TabPill
              active={!isParents}
              onClick={() => onTabChange?.('children')}
              label={`${childTabLabel} (${childCount})`}
            />
          </div>

          <Button
            type="button"
            variant="brand"
            className="w-full cursor-pointer sm:w-auto"
            disabled={primaryActionDisabled}
            onClick={onPrimaryAction}
          >
            <Plus className="size-4" />
            {primaryActionLabel}
          </Button>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.03}>
        <SearchStatusFilters
          q={search}
          status={status}
          searchPlaceholder={searchPlaceholder}
          statusOptions={statusOptions}
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange}
        >
          {showParentFilter && !isParents && parentFilterOptions.length ? (
            <div className="w-full space-y-1.5 sm:w-52">
              <Label htmlFor="parent-child-filter">{parentFilterLabel}</Label>
              <NativeSelect
                id="parent-child-filter"
                value={parentFilterId}
                onChange={(event) => onParentFilterChange?.(event.target.value)}
              >
                {parentFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
        </SearchStatusFilters>
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <SurfaceCard padding="none" className="overflow-hidden">
          {children}
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

function TabPill({ active, label, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-border'
          : 'text-slate-500 hover:text-slate-800',
      )}
    >
      {label}
    </button>
  )
}

export default ParentChildManagementLayout
