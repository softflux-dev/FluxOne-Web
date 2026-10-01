// Branch Manager form validators (Resources, Discounts, shared field rules).

import { validatePercentage } from '@/lib/validation/formValidators'
import { firstValidationMessage } from '@/lib/validation/fieldErrors'

// Weekday tokens — match server schedule.validation WEEK_DAYS / branches.working_days
export const WEEK_DAY_OPTIONS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

export const FULL_WEEK_DAYS = WEEK_DAY_OPTIONS.map((d) => d.value)

const WEEK_DAY_SET = new Set(FULL_WEEK_DAYS)

// Normalize to unique lowercase day tokens (invalid dropped).
export function normalizeWorkingDays(value) {
  if (value == null) return []
  let raw = value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      raw = Array.isArray(parsed) ? parsed : trimmed.split(',')
    } catch {
      raw = trimmed.split(',')
    }
  }
  if (!Array.isArray(raw)) return []
  const out = []
  const seen = new Set()
  for (const item of raw) {
    const day = String(item).trim().toLowerCase()
    if (!WEEK_DAY_SET.has(day) || seen.has(day)) continue
    seen.add(day)
    out.push(day)
  }
  return out
}

// Compact label for lists: "Mon–Fri" or "Mon, Wed, Fri"
export function formatWorkingDaysShort(days) {
  const normalized = normalizeWorkingDays(days)
  if (!normalized.length) return null
  if (normalized.length === 7) return 'Mon–Sun'
  const labels = WEEK_DAY_OPTIONS.filter((d) => normalized.includes(d.value)).map((d) => d.label)
  // Contiguous Mon–Fri style ranges
  const indices = normalized.map((d) => FULL_WEEK_DAYS.indexOf(d)).sort((a, b) => a - b)
  let contiguous = indices.length > 1
  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] !== indices[i - 1] + 1) {
      contiguous = false
      break
    }
  }
  if (contiguous && labels.length >= 3) {
    return `${labels[0]}–${labels[labels.length - 1]}`
  }
  return labels.join(', ')
}

export function validateWorkingDaysFields(workingDays, { required = true } = {}) {
  const errors = {}
  const days = normalizeWorkingDays(workingDays)
  if (required && !days.length) {
    errors.workingDays = 'Select at least one working day'
  }
  return errors
}

// Matches branch_hardware.type CHECK constraint
export const HARDWARE_TYPE_OPTIONS = [
  'Computers',
  'Scanners',
  'Printers',
  'Telephone',
  'Other',
]

const HARDWARE_TYPES = new Set(HARDWARE_TYPE_OPTIONS)
const HARDWARE_STATUSES = new Set(['New', 'Used', 'Good', 'Poor'])

export function validateHardwareFormFields(fields = {}, { isCreate = true } = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  const companyName = String(fields.companyName || '').trim()
  const type = fields.type
  const status = fields.status

  if (!isCreate) {
    const code = String(fields.code || '').trim()
    if (!code) errors.code = 'Hardware ID is missing'
  }

  if (!name) errors.name = 'Hardware name is required'
  else if (name.length < 2) errors.name = 'Hardware name must be at least 2 characters'

  if (!companyName) errors.companyName = 'Company / brand name is required'
  if (!type) errors.type = 'Select a device type'
  else if (!HARDWARE_TYPES.has(type)) errors.type = 'Select a valid device type'
  if (!status) errors.status = 'Select a status'
  else if (!HARDWARE_STATUSES.has(status)) errors.status = 'Select a valid status'

  return errors
}

export function validateHardwareForm(fields = {}, opts = {}) {
  return firstValidationMessage(validateHardwareFormFields(fields, opts), [
    'code',
    'name',
    'companyName',
    'type',
    'status',
  ])
}

export function validateItemScaleFormFields(fields = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Scale name is required'
  else if (name.length > 40) errors.name = 'Scale name must be 40 characters or less'
  else if (!/^[A-Za-z0-9.\-/%\s]+$/.test(name)) {
    errors.name = 'Scale name may only contain letters, numbers, spaces, and . - / %'
  }
  return errors
}

export function validateItemScaleForm(fields = {}) {
  return firstValidationMessage(validateItemScaleFormFields(fields), ['name'])
}

const VARIANT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 ._\-/%]*$/

export function validateVariantTypeFormFields(fields = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Variant type name is required'
  else if (name.length > 80) errors.name = 'Name must be 80 characters or less'
  else if (!VARIANT_NAME_RE.test(name)) {
    errors.name = 'Name may only contain letters, numbers, spaces, and . _ - / %'
  }
  return errors
}

export function validateVariantTypeForm(fields = {}) {
  return firstValidationMessage(validateVariantTypeFormFields(fields), ['name'])
}

export function validateVariantValueFormFields(fields = {}, { requireType = true } = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Variant value name is required'
  else if (name.length > 80) errors.name = 'Name must be 80 characters or less'
  else if (!VARIANT_NAME_RE.test(name)) {
    errors.name = 'Name may only contain letters, numbers, spaces, and . _ - / %'
  }
  if (requireType && !fields.variantTypeId) {
    errors.variantTypeId = 'Select a variant type'
  }
  return errors
}

export function validateVariantValueForm(fields = {}, opts = {}) {
  return firstValidationMessage(validateVariantValueFormFields(fields, opts), [
    'variantTypeId',
    'name',
  ])
}

export function validateDiscountFormFields(fields = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Campaign name / explanation is required'
  else if (name.length < 2) errors.name = 'Campaign name must be at least 2 characters'
  else if (name.length > 120) errors.name = 'Campaign name must be 120 characters or less'

  const percentError = validatePercentage(fields.percent, {
    min: 0,
    max: 100,
    fieldName: 'Discount percentage',
  })
  if (percentError) errors.percent = percentError

  return errors
}

export function validateDiscountForm(fields = {}) {
  return firstValidationMessage(validateDiscountFormFields(fields), ['name', 'percent'])
}

export function validateHolidayFormFields(fields = {}) {
  const errors = {}
  const name = String(fields.name || '').trim()
  if (!name) errors.name = 'Holiday name is required'
  if (!fields.startDate) errors.startDate = 'Start date is required'
  if (!fields.endDate) errors.endDate = 'End date is required'
  if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) {
    errors.endDate = 'End date must be on or after start date'
  }
  return errors
}

export function validateHolidayForm(fields = {}) {
  return firstValidationMessage(validateHolidayFormFields(fields), [
    'name',
    'startDate',
    'endDate',
  ])
}

export function validateLeaveFormFields(fields = {}) {
  const errors = {}
  if (!fields.startDate) errors.startDate = 'Start date is required'
  if (!fields.endDate) errors.endDate = 'End date is required'
  if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) {
    errors.endDate = 'End date must be on or after start date'
  }
  return errors
}

export function validateLeaveForm(fields = {}) {
  return firstValidationMessage(validateLeaveFormFields(fields), ['startDate', 'endDate'])
}
