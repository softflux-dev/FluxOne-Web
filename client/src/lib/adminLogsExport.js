import { exportRowsToStyledExcel } from '@/lib/csvExport'
import {
  ADMIN_LOG_CATEGORY_LABELS,
  ADMIN_LOG_ROLE_OPTIONS,
  adminLogCategoryLabel,
  adminLogTabFileSlug,
  formatAdminLogTimestamp,
  localDateInputValue,
} from '@/lib/adminLogs'
import { roleDisplayName } from '@/lib/nav'

const EXPORT_HEADERS = [
  'Timestamp',
  'Branch',
  'Actor',
  'Role',
  'Category',
  'Action',
  'Affected Item',
]

function roleLabel(role) {
  if (!role || role === 'unknown') return '—'
  if (role === 'branch_admin') return 'Local Admin'
  const fromList = ADMIN_LOG_ROLE_OPTIONS.find((r) => r.value === role)
  if (fromList) return fromList.label
  return roleDisplayName(role) || role
}

function formatExportDateStamp(from, to) {
  const fmt = (isoDate) => {
    if (!isoDate) return 'All'
    const d = new Date(`${isoDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) return isoDate
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    return day.replace(/\s/g, '')
  }
  return `${fmt(from)}_${fmt(to)}`
}

function buildFilterSummary(filters = {}, branchesById = {}) {
  const parts = []
  const today = localDateInputValue()
  if (filters.from !== today || filters.to !== today) {
    parts.push(`Date ${filters.from || '—'} to ${filters.to || '—'}`)
  } else {
    parts.push('Date Today')
  }
  if (filters.branchId) {
    parts.push(`Branch ${branchesById[filters.branchId] || filters.branchId}`)
  }
  if (filters.actorRole) {
    const role = ADMIN_LOG_ROLE_OPTIONS.find((r) => r.value === filters.actorRole)
    parts.push(`Role ${role?.label || filters.actorRole}`)
  }
  if (filters.actorUserId) parts.push(`Employee filter applied`)
  if (filters.tab === 'all' && filters.categories?.length) {
    parts.push(
      `Categories ${filters.categories.map((c) => ADMIN_LOG_CATEGORY_LABELS[c] || c).join(', ')}`,
    )
  } else if (filters.tab && filters.tab !== 'all') {
    parts.push(`Tab ${ADMIN_LOG_CATEGORY_LABELS[filters.tab] || filters.tab}`)
  }
  if (filters.action) parts.push(`Action type ${filters.action}`)
  if (filters.actions?.length) parts.push(`Actions ${filters.actions.join(', ')}`)
  if (filters.q?.trim()) parts.push(`Search "${filters.q.trim()}"`)
  return parts.length ? parts.join(' · ') : 'All filters default (Today, all branches)'
}

function mapLogExportRow(row) {
  return [
    formatAdminLogTimestamp(row.createdAt),
    row.branchName || '—',
    row.actorName || '—',
    roleLabel(row.actorRole),
    adminLogCategoryLabel(row.category),
    row.message || '—',
    row.affectedItem || '—',
  ]
}

/**
 * Export selected Admin Log rows — Logs_[TabName]_[DateFrom]_[DateTo].xlsx (styled .xls).
 */
export function exportAdminLogsSelection({
  rows = [],
  filters = {},
  branchesById = {},
}) {
  if (!rows.length) throw new Error('No rows to export')

  const tabSlug = adminLogTabFileSlug(filters.tab)
  const dateSlug = formatExportDateStamp(filters.from, filters.to)
  const filename = `Logs_${tabSlug}_${dateSlug}.xlsx`
  const summary = buildFilterSummary(filters, branchesById)

  const dataRows = rows.map(mapLogExportRow)
  const preamble = [[`Active filters: ${summary}`, ...Array(EXPORT_HEADERS.length - 1).fill('')]]

  exportRowsToStyledExcel({
    filename,
    sheetName: tabSlug.slice(0, 31) || 'Logs',
    headers: EXPORT_HEADERS,
    rows: [...preamble, ...dataRows],
    rowStyles: [{ background: '#f1f5f9' }],
    freezeHeader: true,
    enableFilter: true,
  })

  return { filename, exported: rows.length }
}
