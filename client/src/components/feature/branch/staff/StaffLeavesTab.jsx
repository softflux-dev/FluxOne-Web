import { useEffect, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { LeaveFormDialog } from '@/components/feature/branch/staff/LeaveFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import {
  isLeaveDecision,
  LeaveDecisionSelect,
  LEAVE_DECISION_UNSET,
} from '@/components/shared/LeaveDecisionSelect'
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
import { apiClient } from '@/api/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { formatDateLine } from '@/lib/formatDateTime'
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
    return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
  if (status === 'pending') {
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  }
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

export function StaffLeavesTab({
  designations = [],
  staff = [],
  createOpen = false,
  onCreateOpenChange,
}) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [listDesignation, setListDesignation] = useState('')

  // Edit modal state
  const [editing, setEditing] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editReason, setEditReason] = useState('')
  const [editStatus, setEditStatus] = useState(LEAVE_DECISION_UNSET)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchLeaves = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/leaves', {
      designationId: listDesignation || undefined,
    })
    setLoading(false)
    if (res.success) setLeaves(res.data || [])
  }

  useEffect(() => {
    void fetchLeaves()
  }, [listDesignation])

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
  }, [listDesignation, leaves.length, setPage])

  const editDateError =
    editStart && editEnd && new Date(editStart) > new Date(editEnd)
      ? 'Start date cannot be after end date'
      : ''

  const openEdit = (row) => {
    setEditing(row)
    setEditStart(toInputDate(row.startDate))
    setEditEnd(toInputDate(row.endDate))
    setEditReason(row.reason || '')
    // Pending → placeholder until BM picks Approved / Rejected
    setEditStatus(isLeaveDecision(row.status) ? row.status : LEAVE_DECISION_UNSET)
  }

  const canSaveEdit =
    Boolean(editStart && editEnd) && !editDateError && isLeaveDecision(editStatus)

  const handleUpdateLeave = async () => {
    if (!editing) return
    if (!editStart || !editEnd) return toastError('Please select both dates')
    if (editDateError) return
    if (!isLeaveDecision(editStatus)) {
      return toastError('Select Approved or Rejected before saving')
    }
    setMutating(true)
    const res = await apiClient.put(`/branch/leaves/${editing.id}`, {
      startDate: editStart,
      endDate: editEnd,
      reason: editReason,
      status: editStatus,
    })
    setMutating(false)
    if (res.success) {
      toastSuccess('Leave updated')
      setEditing(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to update leave')
    }
  }

  const handleDeleteLeave = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/leaves/${deleteTarget.id}`)
    setMutating(false)
    if (res.success) {
      toastSuccess('Leave deleted')
      setDeleteTarget(null)
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to delete leave')
    }
  }

  return (
    <div className="space-y-4">
      <SurfaceCard
        title="Staff Leave Records"
        description="Leaves you appoint for branch employees (auto-approved)"
      >
        <div className="mb-4 max-w-xs">
          <Label className="mb-1.5 block text-xs text-slate-500">Filter by Designation</Label>
          <NativeSelect
            value={listDesignation}
            onChange={(e) => setListDesignation(e.target.value)}
          >
            <option value="">All Designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
        ) : leaves.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No active leave records found</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {pageRows.map((l) => (
                <article
                  key={l.id}
                  className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {l.fullName || 'Employee'}
                      </p>
                      <p className="text-[11px] text-slate-500">{l.designation || '—'}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatRange(l.startDate, l.endDate)}
                      </p>
                      <p className="mt-1 truncate text-xs italic text-slate-500">
                        {l.reason || 'Leave'}
                      </p>
                    </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles(l.status)}`}
                        >
                          {l.status}
                        </span>
                        <RowActionButtons
                          onEdit={() => openEdit(l)}
                          onDelete={() => setDeleteTarget(l)}
                        />
                      </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="w-full min-w-[40rem] text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs text-slate-500 uppercase">
                    <TableHead className="px-3 py-2 font-medium">Employee</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Designation</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Leave Dates</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Reason</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/50">
                      <TableCell className="px-3 py-3 font-semibold text-slate-900">
                        {l.fullName || 'Employee'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-slate-600">
                        {l.designation || '—'}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-slate-600">
                        {formatRange(l.startDate, l.endDate)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate px-3 py-3 italic text-slate-700">
                        {l.reason || 'Leave'}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles(l.status)}`}
                        >
                          {l.status}
                        </span>
                      </TableCell>
                        <TableCell className="px-3 py-3">
                          <RowActionButtons
                            onEdit={() => openEdit(l)}
                            onDelete={() => setDeleteTarget(l)}
                          />
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

      {/* Create — driven by page header “Add Leaves” CTA */}
      <LeaveFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        designations={designations}
        staff={staff}
        onSuccess={fetchLeaves}
      />

      {/* Edit leave */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave</DialogTitle>
            <DialogDescription>
              Update leave for {editing?.fullName || 'employee'}.
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
            {editDateError ? <p className="text-xs font-medium text-red-500">{editDateError}</p> : null}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <LeaveDecisionSelect value={editStatus} onChange={setEditStatus} />
            </div>
          </div>
          <DialogFooter>
            <DialogCancelButton onClick={() => setEditing(null)}>Cancel</DialogCancelButton>
            <Button
              onClick={handleUpdateLeave}
              disabled={mutating || !canSaveEdit}
              variant="brand"
              title={
                !isLeaveDecision(editStatus)
                  ? 'Select Approved or Rejected before saving'
                  : undefined
              }
            >
              {mutating ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete leave?"
        description={
          deleteTarget
            ? `Remove leave for ${deleteTarget.fullName} (${formatRange(deleteTarget.startDate, deleteTarget.endDate)}) and clear related leave attendance.`
            : ''
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleDeleteLeave}
      />
    </div>
  )
}

export default StaffLeavesTab
