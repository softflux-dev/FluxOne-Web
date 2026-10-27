import { useEffect, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ActionIconButton, RowActionButtons } from '@/components/shared/ActionIconButton'
import { MyLeaveFormDialog } from '@/components/feature/branch/staff/MyLeaveFormDialog'
import { LeaveDetailDialog } from '@/components/feature/admin/leaves/LeaveDetailDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/api/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { formatDateLine, formatDateTime } from '@/lib/formatDateTime'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { useClientPagination } from '@/hooks/useClientPagination'

function formatRange(start, end) {
  return `${formatDateLine(start)} — ${formatDateLine(end)}`
}

function toInputDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

function statusStyles(status) {
  if (status === 'cancelled' || status === 'rejected') {
    return 'bg-rose-50 text-rose-700 ring-rose-200'
  }
  if (status === 'pending') {
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  }
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

// Decided leaves expose Admin note via view action
function canViewLeave(status) {
  return status === 'approved' || status === 'rejected'
}

// BM personal leave history — pending until Admin decides
export function MyLeavesTab({ createOpen = false, onCreateOpenChange }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)

  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editReason, setEditReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchLeaves = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/leaves/me')
    setLoading(false)
    if (res.success) setLeaves(res.data || [])
  }

  useEffect(() => {
    void fetchLeaves()
  }, [])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(leaves)

  useEffect(() => {
    setPage(1)
  }, [leaves.length, setPage])

  const editDateError =
    editStart && editEnd && new Date(editStart) > new Date(editEnd)
      ? 'Start date cannot be after end date'
      : ''

  const openEdit = (row) => {
    if (row.status !== 'pending') {
      return toastError('Only pending leave requests can be edited')
    }
    setEditing(row)
    setEditStart(toInputDate(row.startDate))
    setEditEnd(toInputDate(row.endDate))
    setEditReason(row.reason || '')
  }

  const handleUpdateLeave = async () => {
    if (!editing) return
    if (!editStart || !editEnd) return toastError('Please select both dates')
    if (editDateError) return

    setMutating(true)
    const res = await apiClient.put(`/branch/leaves/me/${editing.id}`, {
      startDate: editStart,
      endDate: editEnd,
      reason: editReason,
    })
    setMutating(false)

    if (res.success) {
      toastSuccess('Leave request updated')
      setEditing(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to update leave request')
    }
  }

  const handleDeleteLeave = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/leaves/me/${deleteTarget.id}`)
    setMutating(false)

    if (res.success) {
      toastSuccess('Leave request deleted')
      setDeleteTarget(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to delete leave request')
    }
  }

  return (
    <div className="space-y-4">
      <SurfaceCard
        title="My Leave Records"
        description="Your personal leave requests and Admin decisions"
      >
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : leaves.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No leave requests yet</p>
        ) : (
          <>
            {/* Make Sure All tables are responsive */}
            <div className="space-y-3 md:hidden">
              {pageRows.map((l) => (
                <article
                  key={l.id}
                  className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600">
                        {formatRange(l.startDate, l.endDate)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Applied {formatDateTime(l.createdAt)}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">
                        {l.reason || 'Leave'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles(l.status)}`}
                      >
                        {l.status}
                      </span>
                      {l.status === 'pending' ? (
                        <RowActionButtons
                          onEdit={() => openEdit(l)}
                          onDelete={() => setDeleteTarget(l)}
                        />
                      ) : canViewLeave(l.status) ? (
                        <ActionIconButton action="view" onClick={() => setViewing(l)} />
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Make Sure All tables are responsive */}
            <div className="hidden overflow-x-auto md:block">
              <Table className="w-full min-w-[44rem] text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs text-slate-500 uppercase">
                    <TableHead className="px-3 py-2 font-medium">Leave Date Range</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Apply Date & Time</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Reason</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/50">
                      <TableCell className="px-3 py-3 whitespace-nowrap text-slate-700">
                        {formatRange(l.startDate, l.endDate)}
                      </TableCell>
                      <TableCell className="px-3 py-3 whitespace-nowrap text-slate-600">
                        <DateTimeLines value={l.createdAt} />
                      </TableCell>
                      <TableCell className="max-w-xs px-3 py-3">
                        <p className="truncate font-medium text-slate-900" title={l.reason || 'Leave'}>
                          {l.reason || 'Leave'}
                        </p>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles(l.status)}`}
                        >
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        {l.status === 'pending' ? (
                          <RowActionButtons
                            onEdit={() => openEdit(l)}
                            onDelete={() => setDeleteTarget(l)}
                          />
                        ) : canViewLeave(l.status) ? (
                          <ActionIconButton action="view" onClick={() => setViewing(l)} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <TablePagination
          page={page}
          pageCount={pageCount}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </SurfaceCard>

      <MyLeaveFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onSuccess={fetchLeaves}
      />

      {/* use reusable LeaveDetailDialog — same card pattern as Admin leave details */}
      <LeaveDetailDialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        row={viewing}
        mode="self"
      />

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>
              Update your pending leave dates or reason before Admin decides.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className={editDateError ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className={editDateError ? 'border-red-500' : ''}
                />
              </div>
            </div>
            {editDateError ? (
              <p className="text-xs font-medium text-red-500">{editDateError}</p>
            ) : null}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogCancelButton onClick={() => setEditing(null)}>Cancel</DialogCancelButton>
            <Button onClick={handleUpdateLeave} loading={mutating} variant="brand">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete leave request?"
        description={
          deleteTarget
            ? `Remove your pending request (${formatRange(deleteTarget.startDate, deleteTarget.endDate)})?`
            : ''
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleDeleteLeave}
      />
    </div>
  )
}

export default MyLeavesTab
