import { formatClockTime } from '@/lib/formatDateTime'

export function formatSlotKey(start, end) {
  return `${String(start || '').trim()}|${String(end || '').trim()}`
}

export function parseSlotKey(key) {
  if (!key) return { start: '', end: '' }
  const [start, end] = String(key).split('|')
  return { start: start || '', end: end || '' }
}

export function formatSlotLabel(start, end) {
  if (!start || !end) return ''
  return `${formatClockTime(start)} – ${formatClockTime(end)}`
}

function parseMinutes(value) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

// True when slot [start,end] sits inside employee shift.
export function slotWithinEmployeeShift(slotStart, slotEnd, scheduleStart, scheduleEnd) {
  const s0 = parseMinutes(slotStart)
  const s1 = parseMinutes(slotEnd)
  const w0 = parseMinutes(scheduleStart)
  const w1 = parseMinutes(scheduleEnd)
  if (s0 == null || s1 == null || w0 == null || w1 == null) return false
  return s0 >= w0 && s1 <= w1 && s1 > s0
}

// Cashier must pick a slot when device is partial; full shift auto-picks when only one slot matches shift.
export function resolveCashierAllocationSlot(device, employeeShift) {
  const slots = Array.isArray(device?.freeSlots) ? device.freeSlots : []
  if (!slots.length) return null

  const fullKey = formatSlotKey(employeeShift.start, employeeShift.end)
  const fullMatch = slots.find((s) => formatSlotKey(s.start, s.end) === fullKey)
  if (fullMatch) return fullMatch

  return null
}

// QA conflict copy — keep in sync with server HARDWARE_SLOT_UNAVAILABLE_MSG.
export const HARDWARE_SLOT_UNAVAILABLE_MSG =
  'This hardware slot is no longer available. Please select another available slot.'

export function isHardwareSlotConflictMessage(message) {
  const text = String(message || '')
  return (
    text === HARDWARE_SLOT_UNAVAILABLE_MSG ||
    /no longer available|overlapping|already allocated|locked exclusively/i.test(text)
  )
}
