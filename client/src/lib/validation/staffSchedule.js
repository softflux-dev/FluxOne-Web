import { formatClockTime } from '@/lib/formatDateTime'
import {
  FULL_WEEK_DAYS,
  normalizeWorkingDays,
} from '@/lib/validation/branchForms'

// Parse HH:MM or HH:MM:SS to minutes since midnight; returns null if empty/invalid.
export function parseTimeToMinutes(value) {
  if (value == null || value === '') return null
  const text = String(value).trim()
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function formatMinutesLabel(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return formatClockTime(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`)
}

function hasValue(value) {
  return value != null && String(value).trim() !== ''
}

function isSubsetOfDays(staffDays, branchDays) {
  const branch = new Set(normalizeWorkingDays(branchDays))
  if (!branch.size) return true
  return normalizeWorkingDays(staffDays).every((d) => branch.has(d))
}

// Soft UI note when admin has not configured branch hours yet.
export function getBranchHoursSoftWarning(branchHours) {
  if (!branchHours) return null
  if (hasValue(branchHours.openingTime) && hasValue(branchHours.closingTime)) return null
  return 'Branch opening hours are not set — shift is not limited to a branch window.'
}

// Validate staff working days ⊆ branch calendar
export function validateStaffWorkingDaysFields(fields, branchHours = null) {
  const errors = {}
  const days = normalizeWorkingDays(fields.workingDays)
  if (!days.length) {
    errors.workingDays = 'Select at least one working day'
    return errors
  }
  const branchDays = normalizeWorkingDays(branchHours?.workingDays)
  if (branchDays.length && !isSubsetOfDays(days, branchDays)) {
    errors.workingDays = `Working days must be within branch days (${branchDays.join(', ')})`
  }
  return errors
}

// Validate staff shift + break window → field map
export function validateStaffScheduleFields(fields, branchHours = null) {
  const errors = {}
  const start = parseTimeToMinutes(fields.scheduleStart)
  const end = parseTimeToMinutes(fields.scheduleEnd)
  const breakStart = parseTimeToMinutes(fields.scheduleBreakStart)
  const breakEnd = parseTimeToMinutes(fields.scheduleBreakEnd)

  const hasStart = fields.scheduleStart != null && String(fields.scheduleStart).trim() !== ''
  const hasEnd = fields.scheduleEnd != null && String(fields.scheduleEnd).trim() !== ''
  const hasBreakStart =
    fields.scheduleBreakStart != null && String(fields.scheduleBreakStart).trim() !== ''
  const hasBreakEnd =
    fields.scheduleBreakEnd != null && String(fields.scheduleBreakEnd).trim() !== ''

  if (hasStart !== hasEnd) {
    errors.scheduleEnd = 'Set both start and end time, or leave both empty'
  } else if (hasStart && hasEnd) {
    if (start == null || end == null) {
      errors.scheduleStart = 'Start and end time must be valid (HH:MM)'
    } else if (start >= end) {
      errors.scheduleEnd = 'End time must be after start time'
    } else if (
      branchHours &&
      hasValue(branchHours.openingTime) &&
      hasValue(branchHours.closingTime)
    ) {
      const open = parseTimeToMinutes(branchHours.openingTime)
      const close = parseTimeToMinutes(branchHours.closingTime)
      if (open != null && close != null && (start < open || end > close)) {
        errors.scheduleEnd = `Shift must be within branch hours (${formatMinutesLabel(open)}–${formatMinutesLabel(close)})`
      }
    }
  }

  if (hasBreakStart !== hasBreakEnd) {
    errors.scheduleBreakEnd = 'Set both break start and break end, or leave break empty'
  } else if (hasBreakStart && hasBreakEnd) {
    if (breakStart == null || breakEnd == null) {
      errors.scheduleBreakStart = 'Break times must be valid (HH:MM)'
    } else if (breakStart >= breakEnd) {
      errors.scheduleBreakEnd = 'Break end must be after break start'
    } else if (!hasStart || !hasEnd) {
      errors.scheduleBreakStart = 'Set shift start and end before adding a break'
    } else if (breakStart < start || breakEnd > end) {
      errors.scheduleBreakStart = 'Break must fall within the shift (between start and end time)'
    }
  }

  return errors
}

export function validateStaffSchedule(fields, branchHours = null) {
  const errors = {
    ...validateStaffWorkingDaysFields(fields, branchHours),
    ...validateStaffScheduleFields(fields, branchHours),
  }
  return Object.values(errors)[0] || null
}

export const STAFF_FIELD_ORDER = [
  'fullName',
  'email',
  'password',
  'role',
  'workingDays',
  'scheduleStart',
  'scheduleEnd',
  'scheduleBreakStart',
  'scheduleBreakEnd',
  'hardwareType',
  'hardwareDeviceId',
]

// Staff create/edit → field map
export function validateStaffFormFields(fields, { isEdit = false, branchHours = null } = {}) {
  const errors = {}
  const fullName = String(fields.fullName || '').trim()
  const loginId = String(fields.email || '').trim()

  if (!fullName) errors.fullName = 'Name is required'
  else if (fullName.length < 2) errors.fullName = 'Name must be at least 2 characters'

  if (!loginId) errors.email = 'ID (login) is required'
  else if (loginId.length < 3) errors.email = 'ID (login) must be at least 3 characters'
  else if (/\s/.test(loginId)) errors.email = 'ID (login) cannot contain spaces'

  if (!fields.role) errors.role = 'System role is required'

  if (!isEdit && (!fields.password || String(fields.password).length < 8)) {
    errors.password = 'Password must be at least 8 characters'
  }
  if (isEdit && fields.password && String(fields.password).length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  return {
    ...errors,
    ...validateStaffWorkingDaysFields(fields, branchHours),
    ...validateStaffScheduleFields(fields, branchHours),
  }
}

export function validateStaffForm(fields, opts = {}) {
  const errors = validateStaffFormFields(fields, opts)
  for (const key of STAFF_FIELD_ORDER) {
    if (errors[key]) return errors[key]
  }
  return Object.values(errors)[0] || null
}

// Default staff days: intersection with branch calendar, or full week
export function defaultStaffWorkingDays(branchWorkingDays) {
  const branchDays = normalizeWorkingDays(branchWorkingDays)
  if (branchDays.length) return branchDays
  return [...FULL_WEEK_DAYS]
}
