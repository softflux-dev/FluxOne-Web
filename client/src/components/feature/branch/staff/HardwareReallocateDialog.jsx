import { useEffect, useState } from 'react'
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
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { formatSlotKey, formatSlotLabel } from '@/lib/validation/hardwareSlots'
import { toastError, toastSuccess } from '@/lib/toast'

function holderLabel(holder) {
  if (!holder?.staffName) return 'another employee'
  return holder.staffName
}

export function ResourceAssignedDialog({ open, device, onOpenChange, onReallocate }) {
  const holder = device?.holder
  const name = holder?.staffName || device?.assignedToName || 'another employee'
  const when = device?.occupiedSlot ? ` (${device.occupiedSlot})` : ''
  const locked = !holder?.staffId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{locked ? 'Resource unavailable' : 'Resource Already Assigned'}</DialogTitle>
          <DialogDescription>
            {locked
              ? 'This hardware is locked or inactive and cannot be assigned.'
              : `This hardware is currently assigned to ${name}${when}. To use this resource, first reallocate another available hardware to the current employee.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogCancelButton>Cancel</DialogCancelButton>
          {!locked ? (
            <Button type="button" variant="brand" onClick={() => onReallocate?.(device)}>
              Reallocate Hardware
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Pick a free replacement for the current holder, then release their device.
export function HardwareReallocateDialog({ open, holder, onOpenChange, onReallocated }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [slotKey, setSlotKey] = useState('')

  const selected = devices.find((device) => device.id === selectedId) || null

  useEffect(() => {
    if (!open || !holder?.staffId) return undefined
    let cancelled = false
    setSelectedId('')
    setSlotKey('')
    setLoading(true)
    ;(async () => {
      const days = Array.isArray(holder.workingDays) ? holder.workingDays.join(',') : ''
      const res = await apiClient.get(endpoints.branch.resources.hardware.list, {
        scheduleStart: holder.startTime,
        scheduleEnd: holder.endTime,
        workingDays: days || undefined,
        excludeStaffId: holder.staffId,
        forRole: holder.staffRole || undefined,
      })
      if (cancelled) return
      setLoading(false)
      const list = res.success
        ? Array.isArray(res.data)
          ? res.data
          : res.data?.items || []
        : []
      setDevices(list.filter((device) => device.available || device.freeSlots?.length))
      if (!res.success) toastError(res.error || 'Could not load replacement hardware')
    })()
    return () => {
      cancelled = true
    }
  }, [open, holder])

  async function handleConfirm() {
    if (!holder?.staffId || !selectedId) return
    const slot = (selected?.freeSlots || []).find(
      (item) => formatSlotKey(item.start, item.end) === slotKey,
    )
    const needsSlot = holder.staffRole === 'cashier'
    if (needsSlot && !slot) {
      toastError('Select an available time slot for the current employee')
      return
    }

    setSaving(true)
    const res = await apiClient.post(endpoints.branch.staff.reallocate(holder.staffId), {
      hardwareDeviceId: selectedId,
      hardwareAllocationStart: slot?.start,
      hardwareAllocationEnd: slot?.end,
    })
    setSaving(false)
    if (!res.success) {
      toastError(res.error || 'Reallocation failed')
      return
    }
    toastSuccess('Replacement assigned. Previous hardware is now free.')
    onReallocated?.(res.data)
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reallocate hardware</DialogTitle>
          <DialogDescription>
            Assign another available device to {holderLabel(holder)} first. Their current hardware
            stays assigned until the replacement is saved.
          </DialogDescription>
        </DialogHeader>

        {loading ? <p className="text-sm text-slate-500">Loading available hardware…</p> : null}
        {!loading && devices.length === 0 ? (
          <p className="text-sm text-amber-700">No other hardware is free for this employee’s day and time.</p>
        ) : null}

        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {devices.map((device) => {
            const active = selectedId === device.id
            return (
              <li key={device.id} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {device.name}
                    {device.code ? <span className="font-normal text-slate-500"> · {device.code}</span> : null}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant={active ? 'brand' : 'outline'}
                    onClick={() => {
                      setSelectedId(device.id)
                      const slots = device.freeSlots || []
                      setSlotKey(slots.length === 1 ? formatSlotKey(slots[0].start, slots[0].end) : '')
                    }}
                  >
                    {active ? 'Selected' : 'Select'}
                  </Button>
                </div>
                {active && holder?.staffRole === 'cashier' ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(device.freeSlots || []).map((slot) => {
                      const key = formatSlotKey(slot.start, slot.end)
                      return (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={slotKey === key ? 'brand' : 'outline'}
                          onClick={() => setSlotKey(key)}
                        >
                          {formatSlotLabel(slot.start, slot.end)}
                        </Button>
                      )
                    })}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        <DialogFooter>
          <DialogCancelButton disabled={saving}>Cancel</DialogCancelButton>
          <Button
            type="button"
            variant="brand"
            disabled={saving || !selectedId}
            onClick={() => void handleConfirm()}
          >
            {saving ? 'Saving…' : 'Confirm reallocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
