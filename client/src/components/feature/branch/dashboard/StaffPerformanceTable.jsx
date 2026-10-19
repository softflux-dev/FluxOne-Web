import { Users } from 'lucide-react'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { UserAvatar } from '@/components/shared/UserAvatar'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { useClientPagination } from '@/hooks/useClientPagination'
import { displayStaffRef } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  on_break: 'bg-amber-50 text-amber-700 ring-amber-200',
  offline: 'bg-slate-100 text-slate-600 ring-slate-200',
}

function statusLabel(status) {
  if (status === 'inactive') return 'Inactive'
  if (status === 'on_break') return 'On break'
  if (status === 'offline') return 'Offline'
  return 'Active'
}

function scoreValue(person) {
  return Number(person.rating ?? person.points ?? 0)
}

function formatScore(person) {
  return `${scoreValue(person).toFixed(2)}%`
}

export function StaffPerformanceTable({ staff = [], className }) {
  const list = Array.isArray(staff) ? staff : []
  const { page, setPage, pageSize, setPageSize, pageCount, total, slice } =
    useClientPagination(list)

  const isEmpty = list.length === 0

  return (
    <SurfaceCard
      className={cn('flex h-full flex-col justify-between', className)}
      bodyClassName="flex flex-1 flex-col justify-between"
      title="Staff List"
      description="Name, staff ID, status & score rating"
    >
      {isEmpty ? (
        <EmptyState
          icon={Users}
          title="No staff available"
          description="Staff assigned to this branch will appear here once loaded from the API."
          className="flex-1 py-12"
        />
      ) : (
        <div className="flex flex-1 flex-col justify-between">
          <ResponsiveDataShell
            mobile={slice.map((person) => (
              <DataCard key={person.id}>
                <div className="flex items-start gap-3">
                  <UserAvatar name={person.name} imageUrl={person.image} className="size-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{person.name}</p>
                        <p className="truncate text-xs text-slate-500">{person.role || 'Staff'}</p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                          STATUS_STYLES[person.status] || STATUS_STYLES.offline,
                        )}
                      >
                        {statusLabel(person.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        title={person.id || undefined}
                        className="font-mono text-[11px] font-bold whitespace-nowrap text-purple-800 select-all"
                      >
                        {displayStaffRef(person)}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{formatScore(person)}</p>
                    </div>
                  </div>
                </div>
              </DataCard>
            ))}
            desktop={
              <Table className="min-w-[32rem] text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                    <TableHead className="px-2 py-2.5 font-medium">Name</TableHead>
                    <TableHead className="px-2 py-2.5 font-medium">Staff ID</TableHead>
                    <TableHead className="px-2 py-2.5 font-medium">Status</TableHead>
                    <TableHead className="px-2 py-2.5 font-medium">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.map((person) => (
                    <TableRow key={person.id} className="hover:bg-slate-50/80">
                      <TableCell className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={person.name}
                            imageUrl={person.image}
                            className="size-9"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{person.name}</p>
                            <p className="truncate text-xs text-slate-500">{person.role || 'Staff'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <span
                          title={person.id || undefined}
                          className="font-mono text-xs font-bold text-purple-800 select-all"
                        >
                          {displayStaffRef(person)}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                            STATUS_STYLES[person.status] || STATUS_STYLES.offline,
                          )}
                        >
                          {statusLabel(person.status)}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-3 font-semibold text-slate-900">
                        {formatScore(person)}
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
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </SurfaceCard>
  )
}
