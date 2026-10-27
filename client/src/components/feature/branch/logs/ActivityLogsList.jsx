import { ScrollText } from 'lucide-react'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { Badge } from '@/components/ui/badge'
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
  activityActionLabel,
  activitySourceLabel,
  formatActivityLine,
  formatActivityRelative,
  formatActivityTime,
} from '@/lib/activityLogLabels'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { roleDisplayName } from '@/lib/nav'
import { ACTIVITY_LOGS_PAGE_SIZE } from '@/hooks/useActivityLogs'

function roleLabel(role) {
  if (!role || role === 'unknown') return '—'
  return roleDisplayName(role) || role
}

// Relative label when fresh; else date top / 12h AM/PM time bottom
function ActivityWhen({ value, className = '' }) {
  const relative = formatActivityRelative(value)
  if (relative) return <span className={className}>{relative}</span>
  return <DateTimeLines value={value} className={className} />
}

function LogMessage({ log, includeTime = true }) {
  const line = formatActivityLine(log)
  const time = formatActivityTime(log.createdAt)
  return (
    <p className="text-sm text-slate-800">
      <span className="font-medium">{line}</span>
      {includeTime ? <span className="text-slate-500"> at {time}</span> : null}
    </p>
  )
}

function MetaBadges({ log }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" className="font-medium normal-case">
        {roleLabel(log.actorRole)}
      </Badge>
      <Badge variant="outline" className="font-medium normal-case text-slate-600">
        {activitySourceLabel(log.source)}
      </Badge>
      <span className="text-xs text-slate-400">{activityActionLabel(log.action)}</span>
    </div>
  )
}

export function ActivityLogsList({
  items,
  loading,
  error,
  pagination,
  onPageChange,
  onPageSizeChange,
}) {
  if (loading && items.length === 0) {
    return <TableRowsSkeleton rows={5} />
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
        title="No activity yet"
        description="POS cashier actions and branch changes will show up here."
        compact
      />
    )
  }

  const page = pagination?.page || 1
  const pageCount = pagination?.pageCount || 1
  const total = pagination?.total ?? items.length
  const limit = pagination?.limit || ACTIVITY_LOGS_PAGE_SIZE

  return (
    <div className="space-y-1">
      {loading ? (
        <p className="mb-3 text-xs font-medium text-slate-400">Refreshing…</p>
      ) : null}

      <ResponsiveDataShell
        mobile={items.map((log) => (
          <DataCard key={log.id}>
            <LogMessage log={log} />
            <div className="mt-2">
              <MetaBadges log={log} />
            </div>
            <p className="mt-2 text-xs text-slate-400" title={log.createdAt}>
              <ActivityWhen value={log.createdAt} />
            </p>
          </DataCard>
        ))}
        desktop={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead className="w-36">Role</TableHead>
                <TableHead className="w-28">Source</TableHead>
                <TableHead className="w-40 text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <LogMessage log={log} includeTime={false} />
                      <p className="text-xs text-slate-400">{activityActionLabel(log.action)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-medium normal-case">
                      {roleLabel(log.actorRole)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium normal-case text-slate-600">
                      {activitySourceLabel(log.source)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-600" title={log.createdAt}>
                    <ActivityWhen value={log.createdAt} className="items-end" />
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
