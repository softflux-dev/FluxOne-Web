import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { displayStaffRef } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 8

//
// Collapsible employee list — shows 8, appends next 8 on scroll (previous stay).
//
export function HolidayEmployeesAccordion({
  employees = [],
  title = 'Applicable Employees',
  countLabel,
  defaultOpen = false,
  className,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) setVisibleCount(PAGE_SIZE)
  }, [open, employees])

  const total = employees.length
  const visible = employees.slice(0, visibleCount)
  const hasMore = visibleCount < total

  function handleScroll(event) {
    if (!hasMore) return
    const el = event.currentTarget
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    if (nearBottom) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, total))
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          {open ? (
            <ChevronDown className="size-4 text-slate-500" />
          ) : (
            <ChevronRight className="size-4 text-slate-500" />
          )}
          <Users className="size-3.5 text-purple-600" />
          {title}
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {countLabel ?? `${total} Employees`}
        </span>
      </button>

      {open ? (
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-2"
        >
          {total === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">No employees assigned</p>
          ) : (
            <>
              {visible.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">
                      {emp.fullName || emp.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {emp.designation || 'Staff'}
                    </p>
                  </div>
                  <p
                    className="shrink-0 font-mono text-[10px] font-semibold text-slate-500"
                    title="Staff ID"
                  >
                    {displayStaffRef(emp)}
                  </p>
                </div>
              ))}
              {hasMore ? (
                <p className="py-1.5 text-center text-[10px] text-slate-400">
                  Scroll for more ({visibleCount} of {total})
                </p>
              ) : total > PAGE_SIZE ? (
                <p className="py-1.5 text-center text-[10px] text-slate-400">
                  All {total} employees
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default HolidayEmployeesAccordion
