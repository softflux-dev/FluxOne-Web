import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from '@/lib/tablePagination'
import { cn } from '@/lib/utils'

//
// Sticky pin widths (px) — left pins stack from left; right pins stack from right.
// Tune here once; every table using TableSticky* / convenience wrappers stays aligned.
//
export const TABLE_PIN = {
  select: 44,
  identity: 240,
  status: 112,
  // Fits print + add-stock + edit + block + delete icon cluster
  actions: 200,
}

// Opaque + !important so thead [&_th]:bg-slate-200/80 cannot make pins translucent
const STICKY_HEAD_BG = '!bg-slate-200 dark:!bg-muted'
const STICKY_CELL_BG =
  '!bg-white group-hover:!bg-slate-50 dark:!bg-card dark:group-hover:!bg-muted'

//
// Single horizontal scroll host — use this (not nested overflow) so sticky pins work.
// Pair with <Table scroll={false}>.
//
function TableScroll({ className, children, ...props }) {
  return (
    <div className={cn('relative w-full overflow-x-auto', className)} {...props}>
      {children}
    </div>
  )
}

//
// scroll=true (default): wraps <table> in overflow-auto (legacy pages).
// scroll=false: bare <table> — parent should be TableScroll for sticky columns.
//
function Table({ className, scroll = true, ...props }) {
  const table = (
    <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
  )
  if (!scroll) return table
  return <div className="relative w-full overflow-auto">{table}</div>
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
  return (
    <tr
      className={cn('group border-b transition-colors hover:bg-muted/50', className)}
      {...props}
    />
  )
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

//
// Generic sticky th/td — edge + offset (px from that edge). Reuse across all wide tables.
// Example left stack: select offset=0, identity offset=TABLE_PIN.select
// Example right stack: actions offset=0, status offset=TABLE_PIN.actions
//
function TableStickyHead({
  edge = 'left',
  offset = 0,
  zIndex = 3,
  className,
  style,
  ...props
}) {
  const pin = edge === 'right' ? { right: offset } : { left: offset }
  // Edge shadow separates pinned cols from scrolling middle
  const edgeShadow =
    edge === 'right'
      ? 'shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.12)]'
      : offset > 0
        ? 'shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)]'
        : ''
  return (
    <TableHead
      className={cn('sticky whitespace-nowrap', STICKY_HEAD_BG, edgeShadow, className)}
      style={{ ...pin, zIndex, ...style }}
      {...props}
    />
  )
}

function TableStickyCell({
  edge = 'left',
  offset = 0,
  zIndex = 2,
  className,
  style,
  ...props
}) {
  const pin = edge === 'right' ? { right: offset } : { left: offset }
  const edgeShadow =
    edge === 'right'
      ? 'shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.12)]'
      : offset > 0
        ? 'shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)]'
        : ''
  return (
    <TableCell
      className={cn('sticky', STICKY_CELL_BG, edgeShadow, className)}
      style={{ ...pin, zIndex, ...style }}
      {...props}
    />
  )
}

// Group label spanning sub-columns (Prices, Last purchase, …)
function TableGroupHead({ colSpan = 1, className, children, ...props }) {
  return (
    <TableHead
      colSpan={colSpan}
      className={cn(
        'h-9 px-2 py-2 text-center text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </TableHead>
  )
}

// Second-row sub-header under a TableGroupHead
function TableSubHead({ className, children, ...props }) {
  return (
    <TableHead
      className={cn(
        'h-9 px-2 py-2 text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase text-slate-500',
        className,
      )}
      {...props}
    >
      {children}
    </TableHead>
  )
}

// Left pin: checkbox column
function TableSelectHead({
  sticky = false,
  width = TABLE_PIN.select,
  className,
  children,
  ...props
}) {
  const Comp = sticky ? TableStickyHead : TableHead
  const stickyProps = sticky ? { edge: 'left', offset: 0, zIndex: 4 } : {}
  return (
    <Comp
      className={cn('w-10 px-2 py-3', className)}
      style={sticky ? { width, minWidth: width, maxWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

function TableSelectCell({
  sticky = false,
  width = TABLE_PIN.select,
  className,
  children,
  ...props
}) {
  const Comp = sticky ? TableStickyCell : TableCell
  const stickyProps = sticky ? { edge: 'left', offset: 0, zIndex: 3 } : {}
  return (
    <Comp
      className={cn('px-2 py-3', className)}
      style={sticky ? { width, minWidth: width, maxWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

// Left pin: image + name (sits after select)
function TableIdentityHead({
  sticky = false,
  offset = TABLE_PIN.select,
  width = TABLE_PIN.identity,
  className,
  children = 'Name',
  ...props
}) {
  const Comp = sticky ? TableStickyHead : TableHead
  const stickyProps = sticky ? { edge: 'left', offset, zIndex: 4 } : {}
  return (
    <Comp
      className={cn('px-2 py-3 font-semibold', className)}
      style={sticky ? { width, minWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

function TableIdentityCell({
  sticky = false,
  offset = TABLE_PIN.select,
  width = TABLE_PIN.identity,
  className,
  children,
  ...props
}) {
  const Comp = sticky ? TableStickyCell : TableCell
  const stickyProps = sticky ? { edge: 'left', offset, zIndex: 3 } : {}
  return (
    <Comp
      className={cn('px-2 py-3', className)}
      style={sticky ? { width, minWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

// Right pin: status (sits left of actions — offset = actions width)
function TableStatusHead({
  sticky = false,
  offset = TABLE_PIN.actions,
  width = TABLE_PIN.status,
  className,
  children = 'Status',
  ...props
}) {
  const Comp = sticky ? TableStickyHead : TableHead
  const stickyProps = sticky ? { edge: 'right', offset, zIndex: 4 } : {}
  return (
    <Comp
      className={cn('px-2 py-3 font-semibold whitespace-nowrap', className)}
      style={sticky ? { width, minWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

function TableStatusCell({
  sticky = false,
  offset = TABLE_PIN.actions,
  width = TABLE_PIN.status,
  className,
  children,
  ...props
}) {
  const Comp = sticky ? TableStickyCell : TableCell
  const stickyProps = sticky ? { edge: 'right', offset, zIndex: 3 } : {}
  return (
    <Comp
      className={cn('px-2 py-3', className)}
      style={sticky ? { width, minWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

// Right pin: actions (flush to right edge)
function TableActionsHead({
  className,
  sticky = false,
  width = TABLE_PIN.actions,
  children = 'Actions',
  ...props
}) {
  const Comp = sticky ? TableStickyHead : TableHead
  const stickyProps = sticky ? { edge: 'right', offset: 0, zIndex: 4 } : {}
  return (
    <Comp
      className={cn('w-[1%] whitespace-nowrap px-2 py-3 text-left font-semibold', className)}
      style={sticky ? { width, minWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

function TableActionsCell({
  className,
  sticky = false,
  width = TABLE_PIN.actions,
  children,
  ...props
}) {
  const Comp = sticky ? TableStickyCell : TableCell
  const stickyProps = sticky ? { edge: 'right', offset: 0, zIndex: 3 } : {}
  return (
    <Comp
      className={cn('w-[1%] whitespace-nowrap px-2 py-3 text-left', className)}
      style={sticky ? { width, minWidth: width } : undefined}
      {...stickyProps}
      {...props}
    >
      <div className="inline-flex items-center justify-start gap-2.5">{children}</div>
    </Comp>
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
  TableScroll,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableStickyHead,
  TableStickyCell,
  TableGroupHead,
  TableSubHead,
  TableSelectHead,
  TableSelectCell,
  TableIdentityHead,
  TableIdentityCell,
  TableStatusHead,
  TableStatusCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
  TablePagination as Pagination,
}
