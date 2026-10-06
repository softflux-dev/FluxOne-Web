import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { FieldError } from '@/components/shared/FieldError'
import { HARDWARE_TYPE_OPTIONS } from '@/lib/validation/branchForms'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import {
  HARDWARE_MODES,
  hardwareModeForRole,
  hardwareModeHint,
} from '@/lib/validation/hardwarePolicy'
import { HardwareAvailabilityBoard } from '@/components/feature/branch/staff/HardwareAvailabilityBoard'

// Role-aware hardware UI: board + slots (IM/Cashier) or simple optional dropdown (phase-2).
export function StaffHardwareAssignFields({
  role,
  hardwareType,
  hardwareDeviceId,
  hardwareOptions = [],
  hardwareLoading = false,
  scheduleReady = false,
  hardwareSearch = '',
  selectedSlotKey = '',
  fieldErrors = {},
  onTypeChange,
  onDeviceChange,
  onSearchChange,
  onSelectDevice,
  onSelectSlot,
  onClearSelection,
  onUnavailable,
  ids = {
    hardwareType: 'staff-hardware-type',
    hardwareDeviceId: 'staff-hardware',
  },
}) {
  const mode = hardwareModeForRole(role)
  const hint = hardwareModeHint(role)
  const useAvailabilityBoard =
    mode === HARDWARE_MODES.EXCLUSIVE || mode === HARDWARE_MODES.SHARED

  return (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <p className="text-xs text-slate-500">{hint}</p>
        {mode === HARDWARE_MODES.EXCLUSIVE ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
            Exclusive lock: once assigned to Inventory Manager, this device cannot be used by
            cashiers or any other role.
          </p>
        ) : null}
        {mode === HARDWARE_MODES.SHARED ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
            Shared by shift: pick a device, then choose an available time slot within the
            employee shift.
          </p>
        ) : null}
      </div>

      {useAvailabilityBoard ? (
        <>
          <HardwareAvailabilityBoard
            role={role}
            devices={hardwareOptions}
            loading={hardwareLoading}
            scheduleReady={scheduleReady}
            search={hardwareSearch}
            hardwareType={hardwareType}
            selectedDeviceId={hardwareDeviceId}
            selectedSlotKey={selectedSlotKey}
            onSearchChange={onSearchChange}
            onTypeChange={onTypeChange}
            onSelectDevice={onSelectDevice}
            onSelectSlot={onSelectSlot}
            onClearSelection={onClearSelection}
            onUnavailable={onUnavailable}
          />
          <FieldError message={fieldErrors.hardwareDeviceId} />
          <FieldError message={fieldErrors.hardwareSlotKey} />
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={ids.hardwareType}>Hardware type</Label>
            <NativeSelect
              id={ids.hardwareType}
              value={hardwareType || ''}
              disabled={!scheduleReady}
              onChange={(e) => onTypeChange?.(e.target.value)}
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
            <Label htmlFor={ids.hardwareDeviceId}>Hardware</Label>
            <NativeSelect
              id={ids.hardwareDeviceId}
              value={hardwareDeviceId || ''}
              onChange={(e) => onDeviceChange?.(e.target.value)}
              disabled={hardwareLoading || !scheduleReady}
              aria-invalid={Boolean(fieldErrors.hardwareDeviceId)}
              className={fieldErrorClass(fieldErrors.hardwareDeviceId)}
            >
              <option value="">No hardware assigned</option>
              {hardwareOptions.map((hw) => (
                <option key={hw.id} value={hw.id}>
                  {hw.name}
                  {hw.code ? ` (${hw.code})` : ''}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={fieldErrors.hardwareDeviceId} />
          </div>
        </>
      )}
    </>
  )
}
