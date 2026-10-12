// Staff roster export — split schedule + hardware columns; FluxOne-styled Excel
import { exportRowsToStyledExcel } from '@/lib/csvExport'
import { displayStaffRef } from '@/lib/formatDisplayId'
import { formatClockTime, formatDateTimeInline } from '@/lib/formatDateTime'
import { formatWorkingDaysShort } from '@/lib/validation/branchForms'

const STAFF_EXPORT_HEADERS = [
  'Staff ID',
  'Name',
  'Email / Login ID',
  'Joining Date/Time',
  'Designation',
  'Shift Start Time',
  'Shift End Time',
  'Break Start Time',
  'Break End Time',
  'Working Days',
  'Hardware',
  'Hardware Type',
  'Allocated Time',
  'Allocated Days',
  'Status',
]

function designationLabel(row = {}) {
  if (row.designation) return row.designation
  if (row.role === 'inventory_manager') return 'Inventory Manager'
  if (row.role === 'cashier') return 'Cashier'
  if (row.role === 'website_manager') return 'Website Manager'
  if (row.role === 'production_staff') return 'Production Staff'
  if (row.role === 'delivery_staff') return 'Delivery Staff'
  return ''
}

// 12-hour AM/PM; empty → em dash
function clockOrDash(value) {
  return formatClockTime(value) || '—'
}

function hasHardware(row = {}) {
  return Boolean(row.hardwareName || row.hardwareCode || row.hardwareDeviceId)
}

// "Test-PC3 - HW-010"
function hardwareNameLabel(row = {}) {
  if (!hasHardware(row)) return 'Not Assigned'
  const parts = [row.hardwareName, row.hardwareCode].filter(Boolean)
  return parts.join(' - ') || '—'
}

function hardwareTypeLabel(row = {}) {
  if (!hasHardware(row)) return '—'
  return row.hardwareType || '—'
}

// Prefer allocation window; else staff shift
function allocatedTimeLabel(row = {}) {
  if (!hasHardware(row)) return '—'
  const start = formatClockTime(row.hardwareAllocationStart || row.scheduleStart)
  const end = formatClockTime(row.hardwareAllocationEnd || row.scheduleEnd)
  if (!start && !end) return '—'
  return `${start || '—'} – ${end || '—'}`
}

function allocatedDaysLabel(row = {}) {
  if (!hasHardware(row)) return '—'
  return formatWorkingDaysShort(row.workingDays) || '—'
}

function statusLabel(status) {
  if (status === 'active' || status === 'open') return 'Active'
  if (status === 'inactive' || status === 'blocked') return 'Inactive'
  return status || ''
}

function mapStaffExportRow(row = {}) {
  return [
    displayStaffRef(row),
    row.fullName || '',
    row.email || '',
    formatDateTimeInline(row.joiningDate || row.createdAt),
    designationLabel(row),
    clockOrDash(row.scheduleStart),
    clockOrDash(row.scheduleEnd),
    clockOrDash(row.scheduleBreakStart),
    clockOrDash(row.scheduleBreakEnd),
    formatWorkingDaysShort(row.workingDays) || '',
    hardwareNameLabel(row),
    hardwareTypeLabel(row),
    allocatedTimeLabel(row),
    allocatedDaysLabel(row),
    statusLabel(row.status),
  ]
}

export function exportStaffRosterCsv(rows = []) {
  if (!rows.length) {
    throw new Error('No staff to export')
  }
  const stamp = new Date().toISOString().slice(0, 10)
  exportRowsToStyledExcel({
    filename: `fluxone-staff-roster-${stamp}.xls`,
    sheetName: 'Staff Roster',
    headers: STAFF_EXPORT_HEADERS,
    rows: rows.map(mapStaffExportRow),
  })
  return { exported: rows.length }
}