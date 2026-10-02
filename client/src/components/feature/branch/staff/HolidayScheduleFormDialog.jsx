import { useEffect, useMemo, useState } from 'react'
import { Briefcase } from 'lucide-react'
import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { toastError, toastSuccess } from '@/lib/toast'
import { apiClient } from '@/api/api'

function calculateCalendarDays(startDate, endDate) {
  if (!startDate) return 0
  const s = new Date(startDate)
  const e = new Date(endDate || startDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  if (s > e) return 0
  return Math.max(1, Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

function toInputDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

//
// Dedicated Add / Edit holiday schedule modal (no header icon).
//
export function HolidayScheduleFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initial = null,
  staff = [],
  designations = [],
  onSaved,
}) {
  const isEdit = mode === 'edit'

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isAllEmployees, setIsAllEmployees] = useState(true)
  const [employeeIds, setEmployeeIds] = useState([])
  const [status, setStatus] = useState('active')
  const [staffSearch, setStaffSearch] = useState('')
  const [staffDesignation, setStaffDesignation] = useState('')
  const [mutating, setMutating] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isEdit && initial) {
      setName(initial.name || '')
      setStartDate(toInputDate(initial.startDate || initial.holidayDate))
      setEndDate(toInputDate(initial.endDate || initial.startDate || initial.holidayDate))
      setIsAllEmployees(initial.isAllEmployees !== false)
      setEmployeeIds(initial.employeeIds || [])
      setStatus(initial.status || 'active')
    } else {
      setName('')
      setStartDate('')
      setEndDate('')
      setIsAllEmployees(true)
      setEmployeeIds([])
      setStatus('active')
    }
    setStaffSearch('')
    setStaffDesignation('')
  }, [open, isEdit, initial])

  const dateError =
    startDate && endDate && new Date(startDate) > new Date(endDate)
      ? 'Start date cannot be after end date'
      : ''

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      if (staffDesignation && member.designationId !== staffDesignation) return false
      if (staffSearch.trim()) {
        const q = staffSearch.trim().toLowerCase()
        const nameHit = String(member.fullName || member.name || '')
          .toLowerCase()
          .includes(q)
        const desigHit = String(member.designation || '')
          .toLowerCase()
          .includes(q)
        if (!nameHit && !desigHit) return false
      }
      return true
    })
  }, [staff, staffDesignation, staffSearch])

  function toggleEmployee(empId) {
    setEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    )
  }

  function selectAllFiltered() {
    const ids = filteredStaff.map((s) => s.id)
    const allSelected = ids.every((id) => employeeIds.includes(id))
    if (allSelected) {
      setEmployeeIds((prev) => prev.filter((id) => !ids.includes(id)))
      return
    }
    setEmployeeIds((prev) => {
      const next = [...prev]
      ids.forEach((id) => {
        if (!next.includes(id)) next.push(id)
      })
      return next
    })
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!name.trim()) return toastError('Holiday name is required')
    if (!startDate) return toastError('Start date is required')
    if (!endDate) return toastError('End date is required')
    if (dateError) return toastError(dateError)
    if (!isAllEmployees && employeeIds.length === 0) {
      return toastError('Please select at least one employee or choose "All Employees"')
    }

    setMutating(true)
    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      isAllEmployees,
      employeeIds: isAllEmployees ? [] : employeeIds,
      status,
    }

    const res =
      isEdit && initial?.id
        ? await apiClient.put(`/branch/holidays/${initial.id}`, payload)
        : await apiClient.post('/branch/holidays', payload)

    setMutating(false)
    if (res.success) {
      toastSuccess(isEdit ? 'Holiday schedule updated' : 'Holiday schedule created')
      onOpenChange?.(false)
      onSaved?.()
    } else {
      toastError(res.error || 'Failed to save holiday schedule')
    }
  }

  const dayCount =
    startDate && endDate && !dateError ? calculateCalendarDays(startDate, endDate) : 0

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={Boolean(name || startDate || endDate || employeeIds.length)}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Holiday Schedule' : 'Add Holiday Schedule'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update holiday schedule details and employee assignments.'
              : 'Configure holiday details, date range, and employee assignments.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor={`holiday-name-${mode}`} className="text-xs font-semibold">
              Holiday Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`holiday-name-${mode}`}
              placeholder="e.g. Saudi National Day, Eid Holidays"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`holiday-start-${mode}`} className="text-xs font-semibold">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`holiday-start-${mode}`}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`holiday-end-${mode}`} className="text-xs font-semibold">
                End Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`holiday-end-${mode}`}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`holiday-days-${mode}`} className="text-xs font-semibold">
                No. of Days
              </Label>
              <Input
                id={`holiday-days-${mode}`}
                type="text"
                readOnly
                disabled
                value={
                  dayCount
                    ? `${dayCount} ${dayCount === 1 ? 'day' : 'days'}`
                    : '—'
                }
                className="cursor-not-allowed bg-slate-50 font-medium text-slate-700"
              />
            </div>
          </div>

          {dateError ? (
            <p className="text-xs font-medium text-red-600">{dateError}</p>
          ) : null}

          <div className="space-y-2 border-t border-slate-100 pt-1">
            <Label className="text-xs font-semibold">
              Applicable Employees <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all ${
                  isAllEmployees
                    ? 'border-purple-600 bg-purple-50/50 font-semibold text-purple-950 shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name={`empScope-${mode}`}
                  checked={isAllEmployees}
                  onChange={() => setIsAllEmployees(true)}
                  className="size-4 text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <div>All Employees</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    {staff.length} active staff
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all ${
                  !isAllEmployees
                    ? 'border-purple-600 bg-purple-50/50 font-semibold text-purple-950 shadow-xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name={`empScope-${mode}`}
                  checked={!isAllEmployees}
                  onChange={() => setIsAllEmployees(false)}
                  className="size-4 text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <div>Specific Employees</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    {employeeIds.length} selected
                  </div>
                </div>
              </label>
            </div>
          </div>

          {!isAllEmployees ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Search employee or designation…"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="h-8 bg-white text-xs"
                />
                <NativeSelect
                  value={staffDesignation}
                  onChange={(e) => setStaffDesignation(e.target.value)}
                  className="h-8 bg-white text-xs"
                >
                  <option value="">All Designations</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 pt-1 text-xs">
                <span className="font-semibold text-slate-600">
                  Staff List ({filteredStaff.length})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="h-6 cursor-pointer px-2 text-xs text-purple-700 hover:bg-purple-100/60"
                >
                  {filteredStaff.every((s) => employeeIds.includes(s.id))
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>

              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                {filteredStaff.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No employees match your filter
                  </p>
                ) : (
                  filteredStaff.map((member) => {
                    const isChecked = employeeIds.includes(member.id)
                    return (
                      <label
                        key={member.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2 transition-colors ${
                          isChecked
                            ? 'border-purple-200 bg-purple-50/70'
                            : 'border-slate-100 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEmployee(member.id)}
                          className="mt-0.5 size-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {member.fullName || member.name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                            <Briefcase className="size-3 text-slate-400" />
                            {member.designation || 'Staff'}
                          </p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={`holiday-status-${mode}`} className="text-xs font-semibold">
              Status
            </Label>
            <NativeSelect
              id={`holiday-status-${mode}`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
          </div>

          <DialogFooter className="pt-2">
            <DialogCancelButton onClick={() => onOpenChange?.(false)} disabled={mutating}>
              Cancel
            </DialogCancelButton>
            <Button type="submit" disabled={mutating} variant="brand">
              {mutating ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Holiday'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default HolidayScheduleFormDialog
