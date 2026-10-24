import { ScrollText } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from '@/components/ui/table'
import {
  ADMIN_LOGS_PAGE_SIZE,
  adminLogCategoryBadgeClass,
  adminLogCategoryLabel,
  formatAdminLogTimestamp,
} from '@/lib/adminLogs'
import { roleDisplayName } from '@/lib/nav'

function roleLabel(role) {
  if (!role || role === 'unknown') return '—'
  if (role === 'branch_admin') return 'Local Admin'
  return roleDisplayName(role) || role
}

function CategoryBadge({ category }) {
  return (
    <Badge
      variant="outline"
      className={`font-medium normal-case ${adminLogCategoryBadgeClass(category)}`}
    >
      {adminLogCategoryLabel(category)}
    </Badge>
  )
}

// Child: log table + selection — Parent: AdminLogsPage
export function AdminLogsTable({
  items,
  loading,
  error,
  pagination,
  isRowSelected,
  onToggleRow,
  allVisibleSelected = false,
  someVisibleSelected = false,
  onToggleAllMatching,
  onPageChange,
  onPageSizeChange,
}) {
  const page = pagination?.page || 1
  const pageCount = pagination?.pageCount || 1
  const total = pagination?.total ?? items.length
  const limit = pagination?.limit || ADMIN_LOGS_PAGE_SIZE

  if (loading && items.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading logs…</p>
  }

  if (error && items.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Could not load logs"
        description={error}
        compact
      />
    )
  }

  if (!loading && items.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No activity found for the selected filters."
        description="Try clearing filters or widening the date range."
        compact
      />
    )
  }

  const startIndex = (page - 1) * limit

  return (
    <div className="space-y-1">
      {loading ? (
        <p className="mb-3 text-xs font-medium text-slate-400">Refreshing…</p>
      ) : null}

      <ResponsiveDataShell
        mobile={items.map((row, i) => (
          <DataCard key={row.id}>
            <div className="flex items-start gap-2">
              <Checkbox
                checked={isRowSelected?.(row.id)}
                onChange={() => onToggleRow?.(row.id)}
                aria-label={`Select log ${startIndex + i + 1}`}
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs text-slate-400">{formatAdminLogTimestamp(row.createdAt)}</p>
                <p className="text-sm font-medium text-slate-800">{row.message}</p>
                <div className="flex flex-wrap gap-1.5">
                  <CategoryBadge category={row.category} />
                  <Badge variant="secondary" className="font-medium normal-case">
                    {roleLabel(row.actorRole)}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {row.branchName || '—'} · {row.actorName || '—'}
                </p>
                {row.affectedItem ? (
                  <p className="text-xs text-slate-500">Item: {row.affectedItem}</p>
                ) : null}
              </div>
            </div>
          </DataCard>
        ))}
        desktop={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected
                    }}
                    onChange={() => onToggleAllMatching?.(!allVisibleSelected)}
                    aria-label="Select all matching filtered rows"
                  />
                </TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-44">Timestamp</TableHead>
                <TableHead className="w-32">Branch</TableHead>
                <TableHead className="w-36">Actor</TableHead>
                <TableHead className="w-32">Role</TableHead>
                <TableHead className="w-36">Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="w-40">Affected Item</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={isRowSelected?.(row.id)}
                      onChange={() => onToggleRow?.(row.id)}
                      aria-label={`Select row ${startIndex + i + 1}`}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums text-slate-500">
                    {startIndex + i + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {formatAdminLogTimestamp(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{row.branchName || '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{row.actorName || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium normal-case">
                      {roleLabel(row.actorRole)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={row.category} />
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-slate-800">
                    {row.message || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {row.affectedItem || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      />

      <TablePagination
        page={page}
        pageCount={pageCount}
        totalItems={total}
        pageSize={limit}
        loading={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}

export default AdminLogsTable
