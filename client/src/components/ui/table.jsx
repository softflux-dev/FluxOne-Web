import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from '@/lib/tablePagination'
import { cn } from '@/lib/utils'

function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

// Contrasting header band (TC-table header row colour-22a) — applies system-wide
function TableHeader({ className, ...props }) {
  return (
    <thead
      className={cn(
        '[&_tr]:border-b [&_tr]:bg-slate-200/80 [&_tr]:hover:bg-slate-200/80 [&_th]:bg-slate-200/80 dark:[&_tr]:bg-muted dark:[&_tr]:hover:bg-muted dark:[&_th]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableFooter({ className, ...props }) {
  return <tfoot className={cn('border-t bg-muted/50 font-medium', className)} {...props} />
}

function TableRow({ className, ...props }) {
  return <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
}

function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-12 bg-slate-200/80 px-4 text-left align-middle font-semibold text-slate-600 dark:bg-muted dark:text-slate-300',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }) {
  return <td className={cn('p-4 align-middle', className)} {...props} />
}

function TableCaption({ className, ...props }) {
  return <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
}

// Actions column — shrink-to-fit + text-left (header & body align with other columns)
function TableActionsHead({ className, sticky = false, children = 'Actions', ...props }) {
  return (
    <TableHead
      className={cn(
        'w-[1%] whitespace-nowrap px-2 py-3 text-left',
        sticky && 'sticky right-0 z-[1]',
        className,
      )}
      {...props}
    >
      {children}
    </TableHead>
  )
}

function TableActionsCell({ className, sticky = false, children, ...props }) {
  return (
    <TableCell
      className={cn(
        'w-[1%] whitespace-nowrap px-2 py-3 text-left',
        sticky &&
          'sticky right-0 z-[1] bg-white group-hover:bg-slate-50/80 dark:bg-card dark:group-hover:bg-muted/80',
        className,
      )}
      {...props}
    >
      <div className="inline-flex items-center justify-start gap-2.5">{children}</div>
    </TableCell>
  )
}

/**
 * QA pagination bar: "Rows per page" · "1–8 of N" · Prev / Next.
 * Callers must reset to page 1 inside onPageSizeChange (single update / no double fetch).
 */
function TablePagination({
  page = 1,
  pageCount = 1,
  totalItems,
  pageSize = TABLE_PAGE_SIZE,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  loading = false,
  onPageChange,
  onPageSizeChange,
  className,
  alwaysShow = false,
  showPageSize = true,
}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeCount = Math.max(1, Number(pageCount) || 1)
  const safeSize = Math.max(1, Number(pageSize) || TABLE_PAGE_SIZE)
  const total =
    totalItems === undefined || totalItems === null
      ? null
      : Math.max(0, Number(totalItems) || 0)

  const hasItems = total == null ? safeCount > 1 : total > 0
  if (!alwaysShow && !hasItems) return null

  const from = total === 0 || total == null ? 0 : (safePage - 1) * safeSize + 1
  const to = total == null ? 0 : Math.min(safePage * safeSize, total)
  const rangeLabel =
    total == null
      ? `Page ${safePage} of ${safeCount}`
      : total === 0
        ? `0 of 0`
        : `${from}–${to} of ${total}`

  const options = Array.from(
    new Set([...(pageSizeOptions || TABLE_PAGE_SIZE_OPTIONS), safeSize]),
  ).sort((a, b) => a - b)

  const handlePageSizeChange = (event) => {
    const next = Math.max(1, Number(event.target.value) || TABLE_PAGE_SIZE)
    onPageSizeChange?.(next)
  }

  return (
    <div
      className={cn(
        'mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
        {showPageSize && onPageSizeChange ? (
          <label className="inline-flex items-center gap-2">
            <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">
              Rows per page:
            </span>
            <NativeSelect
              aria-label="Rows per page"
              className="h-8 w-auto min-w-[3.5rem] cursor-pointer py-1 pl-2 pr-7 text-xs"
              value={String(safeSize)}
              disabled={loading}
              onChange={handlePageSizeChange}
            >
              {options.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        <span className="tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
          {rangeLabel}
        </span>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 cursor-pointer px-2.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-muted"
          disabled={safePage <= 1 || loading}
          onClick={() => onPageChange?.(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4 mr-0.5" />
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 cursor-pointer px-2.5 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-muted"
          disabled={safePage >= safeCount || loading}
          onClick={() => onPageChange?.(safePage + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-4 ml-0.5" />
        </Button>
      </div>
    </div>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
  TablePagination as Pagination,
}
