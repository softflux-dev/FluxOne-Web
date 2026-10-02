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
import { StaffScheduleFields } from '@/components/feature/branch/staff/StaffScheduleFields'
import { StaffHardwareAssignFields } from '@/components/feature/branch/staff/StaffHardwareAssignFields'
import {
  defaultStaffWorkingDays,
  getBranchHoursSoftWarning,
  isStaffScheduleReadyForHardware,
  STAFF_FIELD_ORDER,
  validateStaffFormFields,
} from '@/lib/validation/staffSchedule'
import { normalizeWorkingDays } from '@/lib/validation/branchForms'
import { hardwareModeForRole, HARDWARE_MODES } from '@/lib/validation/hardwarePolicy'
import {
  formatSlotKey,
  HARDWARE_SLOT_UNAVAILABLE_MSG,
  isHardwareSlotConflictMessage,
  parseSlotKey,
  slotWithinEmployeeShift,
} from '@/lib/validation/hardwareSlots'
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
  hardwareSlotKey: 'staff-hardware-slot',
}

const EMPTY_FORM = {
  email: '',
  password: '',
  fullName: '',
  role: 'inventory_manager',
  workingDays: [],
  hardwareType: '',
  hardwareDeviceId: '',
  hardwareSlotKey: '',
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

function clearHardwareFields(prev) {
  if (!prev.hardwareDeviceId && !prev.hardwareSlotKey) return prev
  return { ...prev, hardwareDeviceId: '', hardwareSlotKey: '' }
}

// Add / Edit staff modal for Branch Manager.
// Flow: details → schedule → (gate) → role-aware hardware.
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
  const [hardwareSearch, setHardwareSearch] = useState('')
  // Bump to force availability reload after concurrent 409 (QA G4).
  const [availabilityTick, setAvailabilityTick] = useState(0)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const scheduleReady = isStaffScheduleReadyForHardware(form)

  // Hydrate form + branch calendar when dialog opens
  useEffect(() => {
    if (!open) return
    resetErrors()
    setAvailabilityTick(0)
    setHardwareSearch('')

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
          hardwareSlotKey: formatSlotKey(
            timeInputValue(initialStaff.hardwareAllocationStart),
            timeInputValue(initialStaff.hardwareAllocationEnd),
          ),
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

  // Schedule gate: incomplete schedule clears any hardware selection (QA A4 / E1–E2).
  useEffect(() => {
    if (!open) return
    if (scheduleReady) return
    setForm((prev) => clearHardwareFields(prev))
    setHardwareOptions([])
  }, [open, scheduleReady, form.workingDays, form.scheduleStart, form.scheduleEnd])

  // When schedule changes with a selection, drop slots that no longer fit the shift.
  useEffect(() => {
    if (!open || !scheduleReady) return
    setForm((prev) => {
      if (!prev.hardwareDeviceId) return prev
      if (!prev.hardwareSlotKey) return prev
      const slot = parseSlotKey(prev.hardwareSlotKey)
      if (
        slot.start &&
        slot.end &&
        !slotWithinEmployeeShift(slot.start, slot.end, prev.scheduleStart, prev.scheduleEnd)
      ) {
        // Force BM to re-pick — do not silently keep an invalid allocation.
        return { ...prev, hardwareDeviceId: '', hardwareSlotKey: '' }
      }
      return prev
    })
  }, [open, scheduleReady, form.scheduleStart, form.scheduleEnd, form.workingDays])

  // Reload free hardware only after schedule is valid (schedule-first gate)
  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadHardwareOptions() {
      // Gate: do not query availability until days + shift are ready
      if (!scheduleReady) {
        setHardwareOptions([])
        setHardwareLoading(false)
        return
      }

      setHardwareLoading(true)
      const days = normalizeWorkingDays(form.workingDays)
      const roleMode = hardwareModeForRole(form.role)
      const usesBoard =
        roleMode === HARDWARE_MODES.EXCLUSIVE || roleMode === HARDWARE_MODES.SHARED

      const params = {
        scheduleStart: form.scheduleStart,
        scheduleEnd: form.scheduleEnd,
        workingDays: days.join(','),
      }
      if (usesBoard) {
        params.includeBusy = true
        params.forRole = form.role
      }
      if (form.hardwareType) params.type = form.hardwareType
      if (hardwareSearch.trim()) params.q = hardwareSearch.trim()
      if (isEdit && initialStaff?.id) params.excludeStaffId = initialStaff.id

      const res = await apiClient.get(endpoints.branch.resources.hardware.list, params)
      if (cancelled) return

      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || []
        setHardwareOptions(list)
        setForm((prev) => {
          if (!prev.hardwareDeviceId) return prev
          const device = list.find((hw) => hw.id === prev.hardwareDeviceId)
          // Device gone / filtered out → clear
          if (!device) return clearHardwareFields(prev)

          const freeSlots = Array.isArray(device.freeSlots) ? device.freeSlots : []
          const selectable =
            device.available ||
            device.availability === 'partial' ||
            freeSlots.length > 0

          // Device no longer free for this schedule → clear (force reassign)
          if (!selectable) return clearHardwareFields(prev)

          if (prev.hardwareSlotKey) {
            const slotStillValid = freeSlots.some(
              (s) => formatSlotKey(s.start, s.end) === prev.hardwareSlotKey,
            )
            if (!slotStillValid) {
              // Keep device only if a single unambiguous slot remains; else clear both.
              if (freeSlots.length === 1) {
                return {
                  ...prev,
                  hardwareSlotKey: formatSlotKey(freeSlots[0].start, freeSlots[0].end),
                }
              }
              return clearHardwareFields(prev)
            }
          }
          return prev
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
    scheduleReady,
    form.hardwareType,
    form.scheduleStart,
    form.scheduleEnd,
    form.workingDays,
    form.role,
    hardwareSearch,
    isEdit,
    initialStaff?.id,
    availabilityTick,
  ])

  function pickDefaultSlot(device) {
    const slots = Array.isArray(device?.freeSlots) ? device.freeSlots : []
    if (!slots.length) return ''
    const full = formatSlotKey(form.scheduleStart, form.scheduleEnd)
    const match = slots.find((s) => formatSlotKey(s.start, s.end) === full)
    if (match) return formatSlotKey(match.start, match.end)
    if (slots.length === 1) return formatSlotKey(slots[0].start, slots[0].end)
    return ''
  }

  function handleSelectDevice(device) {
    if (!device?.id) return
    const slotKey = pickDefaultSlot(device)
    setForm((prev) => ({
      ...prev,
      hardwareDeviceId: device.id,
      hardwareSlotKey: slotKey,
    }))
    clearField('hardwareDeviceId')
    clearField('hardwareSlotKey')
  }

  function handleSelectSlot(device, slot) {
    if (!device?.id || !slot) return
    setForm((prev) => ({
      ...prev,
      hardwareDeviceId: device.id,
      hardwareSlotKey: formatSlotKey(slot.start, slot.end),
    }))
    clearField('hardwareSlotKey')
  }

  function clearHardwareSelection() {
    setForm((prev) => clearHardwareFields(prev))
  }

  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    clearField(field)
  }

  function handleRoleChange(role) {
    setForm((prev) => ({
      ...prev,
      role,
      // Role mode change invalidates prior device choice
      hardwareDeviceId: '',
      hardwareSlotKey: '',
    }))
    clearField('role')
    clearField('hardwareDeviceId')
    clearField('hardwareSlotKey')
  }

  function refreshAvailabilityBoard() {
    setAvailabilityTick((n) => n + 1)
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

    if (form.hardwareDeviceId && form.role === 'cashier') {
      const device = hardwareOptions.find((d) => d.id === form.hardwareDeviceId)
      const slots = device?.freeSlots || []
      let slotKey = form.hardwareSlotKey
      if (!slotKey) {
        const fallbackKey = pickDefaultSlot(device)
        if (fallbackKey) slotKey = fallbackKey
      }
      const needsExplicitSlot =
        device?.availability === 'partial' || (slots.length > 1 && !slotKey)
      if (needsExplicitSlot && !slotKey) {
        errors.hardwareSlotKey = 'Select an available hardware time slot'
      }
      if (!slotKey && slots.length === 0) {
        errors.hardwareDeviceId = 'Selected hardware is not available for this schedule'
      }
    }

    if (form.hardwareDeviceId && hardwareModeForRole(form.role) === HARDWARE_MODES.EXCLUSIVE) {
      const device = hardwareOptions.find((d) => d.id === form.hardwareDeviceId)
      if (device && !device.available) {
        errors.hardwareDeviceId = 'This device is not available for exclusive assignment'
      }
    }

    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, STAFF_FIELD_ORDER)
      return
    }

    let slot = parseSlotKey(form.hardwareSlotKey)
    if (form.hardwareDeviceId && !slot.start) {
      const device = hardwareOptions.find((d) => d.id === form.hardwareDeviceId)
      const fallbackKey = pickDefaultSlot(device)
      if (fallbackKey) slot = parseSlotKey(fallbackKey)
    }

    // Cashier with device must always send allocation bounds (server enforces too).
    const allocationStart = form.hardwareDeviceId
      ? slot.start || (form.role === 'cashier' ? '' : form.scheduleStart)
      : undefined
    const allocationEnd = form.hardwareDeviceId
      ? slot.end || (form.role === 'cashier' ? '' : form.scheduleEnd)
      : undefined

    if (form.hardwareDeviceId && form.role === 'cashier' && (!allocationStart || !allocationEnd)) {
      applyErrors(
        { hardwareSlotKey: 'Select an available hardware time slot' },
        FIELD_IDS,
        STAFF_FIELD_ORDER,
      )
      return
    }

    // IM exclusive: persist full shift window when no sub-slot was picked.
    const finalAllocStart =
      form.hardwareDeviceId && form.role === 'inventory_manager'
        ? form.scheduleStart
        : allocationStart
    const finalAllocEnd =
      form.hardwareDeviceId && form.role === 'inventory_manager'
        ? form.scheduleEnd
        : allocationEnd

    resetErrors()
    try {
      const result = await onSubmit?.({
        ...form,
        workingDays: normalizeWorkingDays(form.workingDays),
        hardwareAllocationStart: finalAllocStart,
        hardwareAllocationEnd: finalAllocEnd,
      })
      if (result && result.success === false) {
        const message = result.error || 'Save failed. Please try again.'
        setFormError(message)
        // Concurrent slot taken → surface message and drop stale free slots (QA G3–G4).
        if (isHardwareSlotConflictMessage(message)) {
          setForm((prev) => clearHardwareFields(prev))
          refreshAvailabilityBoard()
          setFormError(HARDWARE_SLOT_UNAVAILABLE_MSG)
        }
        return
      }
      onOpenChange?.(false)
    } catch (err) {
      const message = err?.message || 'Save failed. Please try again.'
      setFormError(message)
      if (isHardwareSlotConflictMessage(message)) {
        setForm((prev) => clearHardwareFields(prev))
        refreshAvailabilityBoard()
        setFormError(HARDWARE_SLOT_UNAVAILABLE_MSG)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(form)}>
      <DialogContent className="sm:max-w-2xl">
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
                onChange={(e) => handleRoleChange(e.target.value)}
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

            <StaffScheduleFields
              form={form}
              branchHours={branchHours}
              hoursWarning={hoursWarning}
              fieldErrors={fieldErrors}
              onPatch={patch}
              ids={{
                workingDays: FIELD_IDS.workingDays,
                scheduleStart: FIELD_IDS.scheduleStart,
                scheduleEnd: FIELD_IDS.scheduleEnd,
                scheduleBreakStart: FIELD_IDS.scheduleBreakStart,
                scheduleBreakEnd: FIELD_IDS.scheduleBreakEnd,
              }}
            />

            <StaffHardwareAssignFields
              role={form.role}
              hardwareType={form.hardwareType}
              hardwareDeviceId={form.hardwareDeviceId}
              hardwareOptions={hardwareOptions}
              hardwareLoading={hardwareLoading}
              scheduleReady={scheduleReady}
              hardwareSearch={hardwareSearch}
              selectedSlotKey={form.hardwareSlotKey}
              fieldErrors={fieldErrors}
              onSearchChange={setHardwareSearch}
              onTypeChange={(type) => {
                setForm((prev) => ({
                  ...prev,
                  hardwareType: type,
                  hardwareDeviceId: '',
                  hardwareSlotKey: '',
                }))
                clearField('hardwareType')
                clearField('hardwareDeviceId')
                clearField('hardwareSlotKey')
              }}
              onDeviceChange={(id) => patch('hardwareDeviceId', id)}
              onSelectDevice={handleSelectDevice}
              onSelectSlot={handleSelectSlot}
              onClearSelection={clearHardwareSelection}
              ids={{
                hardwareType: FIELD_IDS.hardwareType,
                hardwareDeviceId: FIELD_IDS.hardwareDeviceId,
              }}
            />

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
