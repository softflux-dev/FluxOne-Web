import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Trash2, Calendar, Search } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { HolidayScheduleFormDialog } from '@/components/feature/branch/staff/HolidayScheduleFormDialog'
import { HolidayEmployeesAccordion } from '@/components/feature/branch/staff/HolidayEmployeesAccordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { toastError, toastSuccess } from '@/lib/toast'
import { formatDateLine } from '@/lib/formatDateTime'
import { useClientPagination } from '@/hooks/useClientPagination'

function formatDateRange(startDate, endDate) {
  if (!startDate) return '—'
  const s = formatDateLine(startDate)
  const e = endDate ? formatDateLine(endDate) : s
  return `${s} – ${e}`
}

function calculateCalendarDays(startDate, endDate) {
  if (!startDate) return 0
  const s = new Date(startDate)
  const e = new Date(endDate || startDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  if (s > e) return 0
  return Math.max(1, Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

export function StaffHolidaysTab({
  designations = [],
  staff = [],
  createOpen = false,
  onCreateOpenChange,
}) {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [allStaff, setAllStaff] = useState(staff)
  const [allDesignations, setAllDesignations] = useState(designations)

  const [editOpen, setEditOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState(null)
  const [viewingTarget, setViewingTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    if (staff?.length > 0) {
      setAllStaff(staff)
      return
    }
    void apiClient
      .get(endpoints.branch.staff.list, { limit: 500, status: 'active' })
      .then((res) => {
        if (res.success && res.data) setAllStaff(res.data.items || res.data || [])
      })
  }, [staff])

  useEffect(() => {
    if (designations?.length > 0) {
      setAllDesignations(designations)
      return
    }
    void apiClient.get(endpoints.branch.designations.list, { limit: 200 }).then((res) => {
      if (res.success && res.data) {
        setAllDesignations(res.data.items || res.data || [])
      }
    })
  }, [designations])

  const fetchHolidays = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/holidays')
    setLoading(false)
    if (res.success) setHolidays(res.data || [])
    else toastError(res.error || 'Failed to load holidays')
  }

  useEffect(() => {
    void fetchHolidays()
  }, [])

  const filteredHolidays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return holidays
    return holidays.filter((h) => String(h.name || '').toLowerCase().includes(q))
  }, [holidays, searchQuery])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(filteredHolidays)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, setPage])

  function handleOpenEdit(holiday) {
    setEditingHoliday(holiday)
    setEditOpen(true)
  }

  async function handleDeleteHoliday() {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/holidays/${deleteTarget.id}`)
    setMutating(false)
    if (res.success) {
      toastSuccess('Holiday schedule deleted')
      setDeleteTarget(null)
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to delete holiday schedule')
    }
  }

  // Resolve employee list for details accordion (all staff or assigned subset).
  const viewingEmployees = useMemo(() => {
    if (!viewingTarget) return []
    if (viewingTarget.isAllEmployees) {
      return allStaff.map((s) => ({
        id: s.id,
        fullName: s.fullName || s.name,
        designation: s.designation || 'Staff',
      }))
    }
    if (viewingTarget.assignedEmployees?.length) return viewingTarget.assignedEmployees
    const idSet = new Set(viewingTarget.employeeIds || [])
    return allStaff
      .filter((s) => idSet.has(s.id))
      .map((s) => ({
        id: s.id,
        fullName: s.fullName || s.name,
        designation: s.designation || 'Staff',
      }))
  }, [viewingTarget, allStaff])

  const viewingCountLabel = viewingTarget?.isAllEmployees
    ? `All Employees (${viewingEmployees.length})`
    : `${viewingEmployees.length} Employees`

  return (
    <div className="space-y-4">
      <SurfaceCard
        title="Holiday Schedule"
        description="Branch holiday calendars and scheduled store closures"
      >
        <div className="mb-4 max-w-sm">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by holiday name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading holiday schedules…</p>
        ) : filteredHolidays.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-purple-50 text-purple-700">
              <Calendar className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">No holiday schedules found</p>
            <p className="mt-1 text-xs text-slate-500">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Click "Add Holidays" above to schedule a new holiday.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {pageRows.map((h) => {
                const days =
                  h.noOfDays ||
                  calculateCalendarDays(h.startDate || h.holidayDate, h.endDate)
                const employeeCount = h.isAllEmployees
                  ? h.noOfEmployees || h.totalActiveStaff || allStaff.length
                  : h.noOfEmployees || h.employeeIds?.length || 0

                return (
                  <article
                    key={h.id}
                    className="rounded-xl border border-border bg-white p-4 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{h.name}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {formatDateRange(h.startDate || h.holidayDate, h.endDate)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          h.status === 'active'
                            ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
                            : 'border-slate-200 bg-slate-50 font-semibold text-slate-600'
                        }
                      >
                        {h.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                      <div>
                        <span className="text-slate-400">No. of Days:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {days} {days === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Employees:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {h.isAllEmployees ? `All (${employeeCount})` : employeeCount}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingTarget(h)}
                        className="cursor-pointer text-slate-600 hover:text-slate-900"
                      >
                        <Eye className="mr-1 size-3.5" /> View
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(h)}
                        className="cursor-pointer text-slate-600 hover:text-slate-900"
                      >
                        <Pencil className="mr-1 size-3.5" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(h)}
                        className="cursor-pointer text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="mr-1 size-3.5" /> Delete
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs text-slate-600 uppercase">
                    <TableHead className="px-4 py-3 font-semibold">Holiday Name</TableHead>
                    <TableHead className="px-4 py-3 font-semibold">Date Range</TableHead>
                    <TableHead className="px-4 py-3 text-center font-semibold">
                      No. of Days
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center font-semibold">
                      Applicable Employees
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center font-semibold">Status</TableHead>
                    <TableHead className="px-4 py-3 text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((h) => {
                    const days =
                      h.noOfDays ||
                      calculateCalendarDays(h.startDate || h.holidayDate, h.endDate)
                    const employeeCount = h.isAllEmployees
                      ? h.noOfEmployees || h.totalActiveStaff || allStaff.length
                      : h.noOfEmployees || h.employeeIds?.length || 0

                    return (
                      <TableRow key={h.id} className="transition-colors hover:bg-slate-50/70">
                        <TableCell className="px-4 py-3.5 font-bold text-slate-900">
                          {h.name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-700">
                          {formatDateRange(h.startDate || h.holidayDate, h.endDate)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center font-semibold text-slate-800">
                          {days}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center font-semibold text-slate-800">
                          {h.isAllEmployees ? `All (${employeeCount})` : employeeCount}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-center">
                          <Badge
                            variant="outline"
                            className={
                              h.status === 'active'
                                ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
                                : 'border-slate-200 bg-slate-50 font-semibold text-slate-600'
                            }
                          >
                            {h.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="View details"
                              onClick={() => setViewingTarget(h)}
                              className="size-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Edit holiday"
                              onClick={() => handleOpenEdit(h)}
                              className="size-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Delete holiday"
                              onClick={() => setDeleteTarget(h)}
                              className="size-8 cursor-pointer text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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

      {/* Add Holiday — dedicated create modal */}
      <HolidayScheduleFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        mode="create"
        staff={allStaff}
        designations={allDesignations}
        onSaved={fetchHolidays}
      />

      {/* Edit Holiday — dedicated edit modal */}
      <HolidayScheduleFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditingHoliday(null)
        }}
        mode="edit"
        initial={editingHoliday}
        staff={allStaff}
        designations={allDesignations}
        onSaved={fetchHolidays}
      />

      {/* Details — no eye icon / no subtitle; employees accordion + infinite scroll */}
      <Dialog
        open={Boolean(viewingTarget)}
        onOpenChange={(open) => !open && setViewingTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Holiday Schedule Details
            </DialogTitle>
          </DialogHeader>

          {viewingTarget ? (
            <div className="space-y-4 pt-1">
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-slate-500">Holiday Name:</span>
                  <span className="text-right font-bold text-slate-900">
                    {viewingTarget.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-500">Date Range:</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateRange(
                      viewingTarget.startDate || viewingTarget.holidayDate,
                      viewingTarget.endDate,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-500">No. of Calendar Days:</span>
                  <span className="font-bold text-slate-800">
                    {viewingTarget.noOfDays ||
                      calculateCalendarDays(
                        viewingTarget.startDate || viewingTarget.holidayDate,
                        viewingTarget.endDate,
                      )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-500">Status:</span>
                  <Badge
                    variant="outline"
                    className={
                      viewingTarget.status === 'active'
                        ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-700'
                        : 'border-slate-200 bg-slate-50 font-semibold text-slate-600'
                    }
                  >
                    {viewingTarget.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <HolidayEmployeesAccordion
                employees={viewingEmployees}
                countLabel={viewingCountLabel}
                defaultOpen={false}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="brand"
                  onClick={() => setViewingTarget(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Holiday Schedule?"
        description={
          deleteTarget
            ? `Are you sure you want to delete “${deleteTarget.name}” (${formatDateRange(
                deleteTarget.startDate || deleteTarget.holidayDate,
                deleteTarget.endDate,
              )})? Corresponding holiday attendance marks will be cleared.`
            : ''
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleDeleteHoliday}
      />
    </div>
  )
}

export default StaffHolidaysTab
