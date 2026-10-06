import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { HARDWARE_TYPE_OPTIONS } from '@/lib/validation/branchForms'
import { formatSlotKey, formatSlotLabel } from '@/lib/validation/hardwareSlots'
import { formatClockTime } from '@/lib/formatDateTime'
import { HARDWARE_MODES, hardwareModeForRole } from '@/lib/validation/hardwarePolicy'

function availabilityLabel(device) {
  switch (device.availability) {
    case 'available':
      return 'Available'
    case 'partial':
      return 'Partial'
    case 'fully_occupied':
      return 'Not available'
    case 'locked_exclusive':
      return 'Locked'
    default:
      return device.available ? 'Available' : 'Not available'
  }
}

function badgeClass(device) {
  if (device.availability === 'available') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-100'
  }
  if (device.availability === 'partial') {
    return 'bg-amber-50 text-amber-800 ring-amber-100'
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

// Branch hardware list with search/type filter + slot selection (Cashier) or exclusive pick (IM).
export function HardwareAvailabilityBoard({
  role,
  devices = [],
  loading = false,
  scheduleReady = false,
  search = '',
  hardwareType = '',
  selectedDeviceId = '',
  selectedSlotKey = '',
  onSearchChange,
  onTypeChange,
  onSelectDevice,
  onSelectSlot,
  onClearSelection,
}) {
  const mode = hardwareModeForRole(role)
  const showSlotPicker = mode === HARDWARE_MODES.SHARED

  const filtered = devices.filter((d) => {
    if (hardwareType && d.type !== hardwareType) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      String(d.name || '').toLowerCase().includes(q) ||
      String(d.code || '').toLowerCase().includes(q)
    )
  })

  const selectedDevice = filtered.find((d) => d.id === selectedDeviceId) || null

  if (!scheduleReady) {
    return (
      <p className="text-xs text-slate-500 sm:col-span-2">
        Set working days and shift start/end to load hardware availability.
      </p>
    )
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="staff-hardware-search">Search hardware</Label>
          <Input
            id="staff-hardware-search"
            placeholder="Name or HW ID"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-hardware-type-filter">Hardware type</Label>
          <NativeSelect
            id="staff-hardware-type-filter"
            value={hardwareType || ''}
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
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Checking device availability…</p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="text-xs text-amber-700">No hardware matches this filter.</p>
      ) : null}

      <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {filtered.map((device) => {
          const selectable =
            device.available ||
            device.availability === 'partial' ||
            (Array.isArray(device.freeSlots) && device.freeSlots.length > 0)
          const isSelected = selectedDeviceId === device.id

          return (
            <li
              key={device.id}
              className={`rounded-lg border p-2.5 ${
                isSelected ? 'border-brand-400 bg-brand-50/40' : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {device.imageUrl ? (
                  <img
                    src={device.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-600">
                    {(device.name || 'H').slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {device.name}
                      {device.code ? (
                        <span className="font-normal text-slate-500"> · {device.code}</span>
                      ) : null}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${badgeClass(device)}`}
                    >
                      {availabilityLabel(device)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {device.type || 'Device'}
                    {device.assignedToName ? ` · Occupied: ${device.assignedToName}` : ''}
                  </p>
                  {device.occupiedSlot ? (
                    <p className="text-xs text-slate-500">Busy: {device.occupiedSlot}</p>
                  ) : null}
                  {device.availability === 'available' && device.freeSlots?.[0] ? (
                    <p className="text-xs text-emerald-700">
                      Available: {formatSlotLabel(device.freeSlots[0].start, device.freeSlots[0].end)}
                    </p>
                  ) : null}
                  {device.availability === 'partial' && device.freeSlots?.length ? (
                    <p className="text-xs text-emerald-700">
                      Free slots:{' '}
                      {device.freeSlots
                        .map((s) => formatSlotLabel(s.start, s.end))
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? 'brand' : 'outline'}
                  disabled={!selectable}
                  onClick={() => onSelectDevice?.(device)}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </Button>
              </div>

              {showSlotPicker && isSelected && selectable ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">Available slots</p>
                  <div className="flex flex-wrap gap-2">
                    {(device.freeSlots || []).map((slot) => {
                      const key = formatSlotKey(slot.start, slot.end)
                      const active = selectedSlotKey === key
                      return (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={active ? 'brand' : 'outline'}
                          onClick={() => onSelectSlot?.(device, slot)}
                        >
                          {formatClockTime(slot.start)} – {formatClockTime(slot.end)}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      {selectedDeviceId ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onClearSelection?.()}>
          Clear hardware selection
        </Button>
      ) : null}
    </div>
  )
}
