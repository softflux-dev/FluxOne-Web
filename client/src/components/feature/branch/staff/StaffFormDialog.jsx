import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { FieldError } from '@/components/shared/FieldError'
import { TimePicker } from '@/components/shared/TimePicker'
import { WorkingDaysPicker } from '@/components/shared/WorkingDaysPicker'
import { formatClockTime } from '@/lib/formatDateTime'
import {
  defaultStaffWorkingDays,
  getBranchHoursSoftWarning,
  STAFF_FIELD_ORDER,
  validateStaffFormFields,
} from '@/lib/validation/staffSchedule'
import {
  HARDWARE_TYPE_OPTIONS,
  formatWorkingDaysShort,
  normalizeWorkingDays,
} from '@/lib/validation/branchForms'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const FIELD_IDS = {
  email: 'staff-email',
  password: 'staff-password',
  fullName: 'staff-name',
  role: 'staff-role',
  workingDays: 'staff-working-days',
  scheduleStart: 'staff-start',
  scheduleEnd: 'staff-end',
  scheduleBreakStart: 'staff-break-start',
  scheduleBreakEnd: 'staff-break-end',
  hardwareType: 'staff-hardware-type',
  hardwareDeviceId: 'staff-hardware',
}

const EMPTY_FORM = {
  email: '',
  password: '',
  fullName: '',
  role: 'inventory_manager',
  workingDays: [],
  hardwareType: '',
  hardwareDeviceId: '',
  scheduleStart: '',
  scheduleBreakStart: '',
  scheduleBreakEnd: '',
  scheduleEnd: '',
  image: null,
}

const STAFF_ROLES = [
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'website_manager', label: 'Website Manager' },
  { value: 'production_staff', label: 'Production Staff' },
  { value: 'delivery_staff', label: 'Delivery Staff' },
]

function timeInputValue(value) {
  if (!value) return ''
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

function resolveRole(initialStaff) {
  const allowed = STAFF_ROLES.map((r) => r.value)
  if (allowed.includes(initialStaff?.role)) return initialStaff.role
  const designation = String(initialStaff?.designation || '').toLowerCase()
  if (designation.includes('website')) return 'website_manager'
  if (designation.includes('delivery')) return 'delivery_staff'
  if (designation.includes('production')) return 'production_staff'
  if (designation.includes('cashier')) return 'cashier'
  return 'inventory_manager'
}

function emptyBranchContext() {
  return { openingTime: '', closingTime: '', workingDays: [] }
}

// Add / Edit staff modal for Branch Manager.
// Does not send branchId — server scopes from JWT.
// System role drives designation automatically (no custom designation picker).
export function StaffFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialStaff = null,
  onSubmit,
  loading = false,
}) {
  const isEdit = mode === 'edit'
  const [branchHours, setBranchHours] = useState(emptyBranchContext)
  const hoursWarning = getBranchHoursSoftWarning(branchHours)
  const [form, setForm] = useState(EMPTY_FORM)
  const [hardwareOptions, setHardwareOptions] = useState([])
  const [hardwareLoading, setHardwareLoading] = useState(false)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  // Hydrate form + branch calendar when dialog opens
  useEffect(() => {
    if (!open) return
    resetErrors()

    async function bootstrap() {
      setHardwareOptions([])
      let nextBranch = emptyBranchContext()
      const meRes = await apiClient.get(endpoints.auth.me)
      if (meRes.success && meRes.data) {
        const branchDays = normalizeWorkingDays(meRes.data.workingDays)
        nextBranch = {
          openingTime: timeInputValue(meRes.data.openingTime),
          closingTime: timeInputValue(meRes.data.closingTime),
          workingDays: branchDays,
        }
      }
      setBranchHours(nextBranch)

      if (isEdit && initialStaff) {
        const staffDays = normalizeWorkingDays(initialStaff.workingDays)
        const nextForm = {
          email: initialStaff.email || '',
          password: '',
          fullName: initialStaff.fullName || '',
          role: resolveRole(initialStaff),
          workingDays: staffDays.length
            ? staffDays
            : defaultStaffWorkingDays(nextBranch.workingDays),
          hardwareType: initialStaff.hardwareType || '',
          hardwareDeviceId: initialStaff.hardwareDeviceId || '',
          scheduleStart: timeInputValue(initialStaff.scheduleStart),
          scheduleBreakStart: timeInputValue(initialStaff.scheduleBreakStart),
          scheduleBreakEnd: timeInputValue(initialStaff.scheduleBreakEnd),
          scheduleEnd: timeInputValue(initialStaff.scheduleEnd),
          image: null,
        }
        setForm(nextForm)
        captureBaseline(nextForm)
      } else {
        const nextForm = {
          ...EMPTY_FORM,
          workingDays: defaultStaffWorkingDays(nextBranch.workingDays),
        }
        setForm(nextForm)
        captureBaseline(nextForm)
      }
    }

    void bootstrap()
  }, [open, isEdit, initialStaff, captureBaseline, resetErrors])

  // Reload free hardware when type / shift / working days change
  useEffect(() => {
    if (!open) return

    const hasShift =
      Boolean(String(form.scheduleStart || '').trim()) &&
      Boolean(String(form.scheduleEnd || '').trim())
    const days = normalizeWorkingDays(form.workingDays)
    const canQueryAvailability = hasShift && days.length > 0

    let cancelled = false

    async function loadHardwareOptions() {
      setHardwareLoading(true)
      const params = {}
      if (form.hardwareType) params.type = form.hardwareType
      if (canQueryAvailability) {
        params.scheduleStart = form.scheduleStart
        params.scheduleEnd = form.scheduleEnd
        // Comma list — toQuery stringifies arrays as "mon,tue"
        params.workingDays = days.join(',')
        if (isEdit && initialStaff?.id) params.excludeStaffId = initialStaff.id
      }

      const res = await apiClient.get(endpoints.branch.resources.hardware.list, params)
      if (cancelled) return

      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || []
        setHardwareOptions(list)
        // Drop selection only when availability filter is active and device no longer free
        setForm((prev) => {
          if (!prev.hardwareDeviceId) return prev
          const stillThere = list.some((hw) => hw.id === prev.hardwareDeviceId)
          if (stillThere) return prev
          if (!canQueryAvailability) return prev
          return { ...prev, hardwareDeviceId: '' }
        })
      } else {
        setHardwareOptions([])
      }
      setHardwareLoading(false)
    }

    void loadHardwareOptions()
    return () => {
      cancelled = true
    }
  }, [
    open,
    form.hardwareType,
    form.scheduleStart,
    form.scheduleEnd,
    form.workingDays,
    isEdit,
    initialStaff?.id,
  ])

  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearField(field)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    let hours = branchHours
    const meRes = await apiClient.get(endpoints.auth.me)
    if (meRes.success && meRes.data) {
      const branchDays = normalizeWorkingDays(meRes.data.workingDays)
      hours = {
        openingTime: timeInputValue(meRes.data.openingTime),
        closingTime: timeInputValue(meRes.data.closingTime),
        workingDays: branchDays,
      }
      setBranchHours(hours)
    }

    const errors = validateStaffFormFields(form, { isEdit, branchHours: hours })
    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, STAFF_FIELD_ORDER)
      return
    }

    resetErrors()
    try {
      const result = await onSubmit?.({
        ...form,
        workingDays: normalizeWorkingDays(form.workingDays),
      })
      if (result && result.success === false) {
        // Surface hardware conflict (409) and other server messages
        setFormError(result.error || 'Save failed. Please try again.')
        return
      }
      onOpenChange?.(false)
    } catch (err) {
      setFormError(err?.message || 'Save failed. Please try again.')
    }
  }

  const branchDaysLabel = formatWorkingDaysShort(branchHours.workingDays)
  const hasShiftWindow =
    Boolean(String(form.scheduleStart || '').trim()) &&
    Boolean(String(form.scheduleEnd || '').trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(form)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update branch staff details. Leave password blank to keep the current one.'
              : 'Create branch staff for this location only (Inventory Manager, Cashier, Website Manager, and more).'}
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {formError}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-email">ID (login)</Label>
              <Input
                id="staff-email"
                autoComplete="off"
                placeholder="e.g. im.wah01"
                value={form.email}
                onChange={(e) => patch('email', e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                className={fieldErrorClass(fieldErrors.email)}
              />
              <FieldError message={fieldErrors.email} />
              <p className="text-xs text-slate-500">Used with password at login (maps to API email).</p>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-password">
                Password {isEdit ? <span className="font-normal text-slate-400">(optional)</span> : null}
              </Label>
              <Input
                id="staff-password"
                type="password"
                autoComplete="new-password"
                placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 8 characters'}
                value={form.password}
                onChange={(e) => patch('password', e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                className={fieldErrorClass(fieldErrors.password)}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={form.fullName}
                placeholder="Full name"
                onChange={(e) => patch('fullName', e.target.value)}
                aria-invalid={Boolean(fieldErrors.fullName)}
                className={fieldErrorClass(fieldErrors.fullName)}
              />
              <FieldError message={fieldErrors.fullName} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="staff-role">System Role</Label>
              <NativeSelect
                id="staff-role"
                value={form.role}
                onChange={(e) => patch('role', e.target.value)}
                aria-invalid={Boolean(fieldErrors.role)}
                className={fieldErrorClass(fieldErrors.role)}
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={fieldErrors.role} />
              {form.role === 'inventory_manager' ? (
                <p className="text-xs text-slate-500">
                  Only one Inventory Manager is allowed per branch.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label id="staff-working-days">Working days *</Label>
              <WorkingDaysPicker
                value={form.workingDays}
                allowedDays={branchHours.workingDays}
                onChange={(days) => patch('workingDays', days)}
              />
              <FieldError message={fieldErrors.workingDays} />
              {branchDaysLabel ? (
                <p className="text-xs text-slate-500">
                  Branch calendar: {branchDaysLabel}. Staff days must stay within it.
                </p>
              ) : null}
            </div>

            {hoursWarning ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100 sm:col-span-2">
                {hoursWarning}
              </p>
            ) : branchHours.openingTime && branchHours.closingTime ? (
              <p className="text-xs text-slate-500 sm:col-span-2">
                Branch hours: {formatClockTime(branchHours.openingTime)} –{' '}
                {formatClockTime(branchHours.closingTime)}. Shift must fall
                inside this window.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="staff-start">Start Time</Label>
              <TimePicker
                id="staff-start"
                value={form.scheduleStart}
                onChange={(e) => patch('scheduleStart', e.target.value)}
                className={fieldErrorClass(fieldErrors.scheduleStart)}
              />
              <FieldError message={fieldErrors.scheduleStart} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-end">End Time</Label>
              <TimePicker
                id="staff-end"
                value={form.scheduleEnd}
                onChange={(e) => patch('scheduleEnd', e.target.value)}
                className={fieldErrorClass(fieldErrors.scheduleEnd)}
              />
              <FieldError message={fieldErrors.scheduleEnd} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-break-start">Break from</Label>
              <TimePicker
                id="staff-break-start"
                value={form.scheduleBreakStart}
                onChange={(e) => patch('scheduleBreakStart', e.target.value)}
                className={fieldErrorClass(fieldErrors.scheduleBreakStart)}
              />
              <FieldError message={fieldErrors.scheduleBreakStart} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-break-end">Break to</Label>
              <TimePicker
                id="staff-break-end"
                value={form.scheduleBreakEnd}
                onChange={(e) => patch('scheduleBreakEnd', e.target.value)}
                className={fieldErrorClass(fieldErrors.scheduleBreakEnd)}
              />
              <FieldError message={fieldErrors.scheduleBreakEnd} />
            </div>

            {/* Hardware type + device — after shift / working days for availability */}
            <div className="space-y-1.5">
              <Label htmlFor="staff-hardware-type">Hardware type</Label>
              <NativeSelect
                id="staff-hardware-type"
                value={form.hardwareType || ''}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    hardwareType: e.target.value,
                    hardwareDeviceId: '',
                  }))
                  clearField('hardwareType')
                  clearField('hardwareDeviceId')
                }}
              >
                <option value="">All types</option>
                {HARDWARE_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-hardware">Hardware</Label>
              <NativeSelect
                id="staff-hardware"
                value={form.hardwareDeviceId || ''}
                onChange={(e) => patch('hardwareDeviceId', e.target.value)}
                disabled={hardwareLoading}
                aria-invalid={Boolean(fieldErrors.hardwareDeviceId)}
                className={fieldErrorClass(fieldErrors.hardwareDeviceId)}
              >
                <option value="">No hardware assigned</option>
                {hardwareOptions.map((hw) => (
                  <option key={hw.id} value={hw.id}>
                    {hw.name}
                    {hw.code ? ` (${hw.code})` : ''}
                    {hw.type ? ` · ${hw.type}` : ''}
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={fieldErrors.hardwareDeviceId} />
              {hardwareLoading ? (
                <p className="text-xs text-slate-500">Checking device availability…</p>
              ) : !hasShiftWindow || !normalizeWorkingDays(form.workingDays).length ? (
                <p className="text-xs text-slate-500">
                  Set working days and shift start/end to filter free devices for that slot.
                </p>
              ) : hardwareOptions.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No free devices for this type / slot. Adjust days, shift, or type — or leave
                  unassigned.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Showing devices free for the selected days and shift
                  {isEdit ? ' (current assignment kept if still free)' : ''}.
                </p>
              )}
            </div>

            <ImageUploadField
              id="staff-image"
              label="Photo"
              optionalLabel="(optional)"
              value={form.image}
              existingImageUrl={isEdit ? initialStaff?.imageUrl : null}
              onChange={(file) => patch('image', file)}
            />
          </div>

          <DialogFooter>
            <DialogCancelButton
              disabled={loading}
              className="w-full sm:w-auto"
            />
            <Button
              type="submit"
              disabled={loading}
              variant="brand"
              className="w-full sm:w-auto"
            >
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
