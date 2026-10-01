import { MonitorOff, Users } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityStatusToggle, isEntityActive } from '@/components/shared/EntityStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionsHead,
  TableActionsCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { displayStaffRef } from '@/lib/formatDisplayId'
import { formatDateTime, formatClockTime } from '@/lib/formatDateTime'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { formatWorkingDaysShort } from '@/lib/validation/branchForms'
import { BRAND } from '@/lib/constants'

// Joining Date/Time — date top / 12h AM/PM time bottom in tables
function formatJoinedDateTime(value) {
  return formatDateTime(value)
}

function formatTime(value) {
  return formatClockTime(value) || '—'
}

function designationLabel(row) {
  if (row?.designation) return row.designation
  if (row?.role === 'inventory_manager') return 'Inventory Manager'
  if (row?.role === 'cashier') return 'Cashier'
  if (row?.role === 'website_manager') return 'Website Manager'
  if (row?.role === 'production_staff') return 'Production Staff'
  if (row?.role === 'delivery_staff') return 'Delivery Staff'
  return '—'
}

function ScheduleBlock({ row }) {
  return (
    <>
      <span className="whitespace-nowrap">
        {formatTime(row.scheduleStart)} – {formatTime(row.scheduleEnd)}
      </span>
      {row.scheduleBreakStart || row.scheduleBreakEnd ? (
        <span className="mt-0.5 block text-slate-400">
          Break {formatTime(row.scheduleBreakStart)}
          {row.scheduleBreakEnd ? ` – ${formatTime(row.scheduleBreakEnd)}` : ''}
        </span>
      ) : null}
      {Array.isArray(row.workingDays) && row.workingDays.length ? (
        <span className="mt-0.5 block text-slate-400">
          {formatWorkingDaysShort(row.workingDays)}
        </span>
      ) : null}
    </>
  )
}

// clean and optimized code — device profile for Assigned hardware column
function AssignedHardwareCell({ row }) {
  const hasHardware = Boolean(row.hardwareName || row.hardwareCode || row.hardwareDeviceId)
  if (!hasHardware) {
    return (
      <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 ring-1 ring-border">
          <MonitorOff className="size-4" />
        </span>
        <span>Not Assigned</span>
      </div>
    )
  }

  // Allocated slot from API (shift + working days) when present
  const slotLabel = row.hardwareAllocatedSlot || null

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      {row.hardwareImageUrl ? (
        <img
          src={row.hardwareImageUrl}
          alt=""
          className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-border"
        />
      ) : (
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
          style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
        >
          {(row.hardwareName || 'HW').slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {row.hardwareName || 'Hardware'}
        </p>
        <p className="truncate font-mono text-[11px] text-slate-500">
          {row.hardwareCode || '—'}
          {row.hardwareType ? ` · ${row.hardwareType}` : ''}
        </p>
        {slotLabel ? (
          <p className="mt-0.5 text-[11px] text-slate-400">Allocated: {slotLabel}</p>
        ) : null}
      </div>
    </div>
  )
}

// Status actions — Ban / Unlock; labels match Active / Inactive filter + badge
function StaffRowActions({ row, onEdit, onDelete, onBlock, onUnblock, statusLoading }) {
  const active = isEntityActive(row.status)
  return (
    <RowActionButtons
      onEdit={() => onEdit?.(row)}
      onBlock={() => onBlock?.(row)}
      onUnblock={() => onUnblock?.(row)}
      isActive={active}
      onDelete={() => onDelete?.(row)}
      editLabel={`Edit ${row.fullName || 'staff'}`}
      blockLabel={`Set ${row.fullName || 'staff'} inactive`}
      unblockLabel={`Set ${row.fullName || 'staff'} active`}
      deleteLabel={`Delete ${row.fullName || 'staff'}`}
      disabled={statusLoading}
    />
  )
}

// Active / Inactive capsule — matches Status filter; Ban/Unlock in Actions
function StaffStatusBadge({ row, loading }) {
  return (
    <EntityStatusToggle
      status={row.status}
      loading={loading}
      interactive={false}
      activeLabel="Active"
      inactiveLabel="Inactive"
      inactiveTone="danger"
    />
  )
}

// Branch staff table: Staff ID | Name | Joining Date/Time | Designation | Scheduling | Assigned hardware | Status | Actions
export function StaffTable({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onBlock,
  onUnblock,
  statusUpdatingId = null,
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = pagination?.pageCount || 1
  const pageSize = pagination?.limit || 8
  const totalItems = pagination?.total ?? list.length

  // Standard pagination below the table (tc-Resources-02q)
  const paginationBar =
    !loading && totalItems > 0 ? (
      <TablePagination
        page={page}
        pageCount={pageCount}
        totalItems={totalItems}
        pageSize={pageSize}
        loading={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        alwaysShow
      />
    ) : null

  return (
    <SurfaceCard
      className={className}
      title="Team roster"
      description="Branch staff roles for this location"
    >

      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={Users}
          title="No staff available"
          description="Add an Inventory Manager or Cashier to get started."
          compact
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {list.map((row) => {
              const staffId = displayStaffRef(row)
              const joinedAt = formatJoinedDateTime(row.joiningDate || row.createdAt)
              return (
                <article
                  key={row.id || staffId}
                  className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={row.fullName}
                      imageUrl={row.imageUrl}
                      className="size-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {row.fullName || '—'}
                          </p>
                          <p
                            title={row.id || undefined}
                            className="truncate font-mono text-[11px] font-semibold text-purple-800"
                          >
                            {staffId}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {row.email || '—'}
                          </p>
                        </div>
                        <StaffStatusBadge
                          row={row}
                          loading={statusUpdatingId === row.id}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{designationLabel(row)}</p>
                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p>Joined {joinedAt}</p>
                        <p className="text-slate-600">
                          <ScheduleBlock row={row} />
                        </p>
                        <div className="pt-1">
                          <AssignedHardwareCell row={row} />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <StaffRowActions
                          row={row}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onBlock={onBlock}
                          onUnblock={onUnblock}
                          statusLoading={statusUpdatingId === row.id}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Desktop table — Doc v4 column order */}
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[56rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                  <TableHead className="px-2 py-2.5 font-medium">Staff ID</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Name</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Joining Date/Time</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Designation</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Scheduling</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Assigned hardware</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Status</TableHead>
                  <TableActionsHead className="px-2 py-2.5 font-medium" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => {
                  const staffId = displayStaffRef(row)
                  return (
                    <TableRow key={row.id || staffId} className="hover:bg-slate-50/80">
                      <TableCell className="px-2 py-3 align-middle">
                        <span
                          title={row.id || undefined}
                          className="font-mono text-xs font-bold text-purple-800 select-all"
                        >
                          {staffId}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            name={row.fullName}
                            imageUrl={row.imageUrl}
                            className="size-9 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {row.fullName || '—'}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              {row.email || '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle whitespace-nowrap text-slate-600">
                        <DateTimeLines value={row.joiningDate || row.createdAt} />
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle text-slate-700">
                        {designationLabel(row)}
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle text-xs text-slate-600">
                        <ScheduleBlock row={row} />
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle text-slate-600">
                        <AssignedHardwareCell row={row} />
                      </TableCell>
                      <TableCell className="px-2 py-3 align-middle">
                        <StaffStatusBadge
                          row={row}
                          loading={statusUpdatingId === row.id}
                        />
                      </TableCell>
                      <TableActionsCell>
                        <StaffRowActions
                          row={row}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onBlock={onBlock}
                          onUnblock={onUnblock}
                          statusLoading={statusUpdatingId === row.id}
                        />
                      </TableActionsCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {paginationBar}
    </SurfaceCard>
  )
}
