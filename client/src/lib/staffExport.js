// Staff roster CSV — maps export API rows → CSV via shared csvExport helpers
import { exportRowsToCsv } from '@/lib/csvExport'
import { displayStaffRef } from '@/lib/formatDisplayId'
import { formatClockTime, formatDateTimeInline } from '@/lib/formatDateTime'
import { formatWorkingDaysShort } from '@/lib/validation/branchForms'

const STAFF_CSV_HEADERS = [
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
  'Assigned Hardware',
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

// 12-hour AM/PM for Excel; empty times show as em dash
function clockOrDash(value) {
  return formatClockTime(value) || '—'
}

function hardwareLabel(row = {}) {
  if (!row.hardwareName && !row.hardwareCode && !row.hardwareDeviceId) {
    return 'Not Assigned'
  }
  const parts = [row.hardwareName, row.hardwareCode, row.hardwareType].filter(Boolean)
  let text = parts.join(' · ')
  if (row.hardwareAllocatedSlot) text += ` | Allocated: ${row.hardwareAllocatedSlot}`
  return text
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
    hardwareLabel(row),
    statusLabel(row.status),
  ]
}

// use reusable csvExport helpers
export function exportStaffRosterCsv(rows = []) {
  if (!rows.length) {
    throw new Error('No staff to export')
  }
  const stamp = new Date().toISOString().slice(0, 10)
  exportRowsToCsv({
    filename: `fluxone-staff-roster-${stamp}.csv`,
    headers: STAFF_CSV_HEADERS,
    rows: rows.map(mapStaffExportRow),
  })
  return { exported: rows.length }
}
