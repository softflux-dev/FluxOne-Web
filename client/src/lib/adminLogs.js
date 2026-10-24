/** Admin Logs — categories, tabs, labels (docs/Admin Logs Module.md). */

export const ADMIN_LOGS_PAGE_SIZE = 25

/** Max inclusive date span (days) — matches server ADMIN_LOGS_MAX_RANGE_DAYS. */
export const ADMIN_LOGS_MAX_RANGE_DAYS = 366

/** Soft cap for Export Selected / Select All Matching. */
export const ADMIN_LOGS_EXPORT_MAX_ROWS = 5000

/** Persistable category slugs (DB + API). */
export const ADMIN_LOG_CATEGORIES = Object.freeze([
  'stock',
  'pricing',
  'products',
  'bundles',
  'variants',
  'employees',
  'settings',
  'hardware',
  'orders_suppliers',
])

export const ADMIN_LOG_CATEGORY_LABELS = Object.freeze({
  stock: 'Stock',
  pricing: 'Pricing',
  products: 'Products',
  bundles: 'Bundles',
  variants: 'Variants',
  employees: 'Employees',
  settings: 'Settings',
  hardware: 'Hardware',
  orders_suppliers: 'Orders & Suppliers',
})

/** Tab bar: All Activity first, then category tabs in doc order. */
export const ADMIN_LOG_TABS = Object.freeze([
  { id: 'all', label: 'All Activity', category: null },
  ...ADMIN_LOG_CATEGORIES.map((id) => ({
    id,
    label: ADMIN_LOG_CATEGORY_LABELS[id],
    category: id,
  })),
])

/** Badge colours §7.5 — UI differentiation only. */
export const ADMIN_LOG_CATEGORY_BADGE = Object.freeze({
  stock: 'bg-blue-50 text-blue-700 border-blue-200',
  pricing: 'bg-orange-50 text-orange-700 border-orange-200',
  products: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bundles: 'bg-teal-50 text-teal-700 border-teal-200',
  variants: 'bg-[#AA2493]/10 text-[#AA2493] border-[#AA2493]/30',
  employees: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  settings: 'bg-slate-50 text-slate-600 border-slate-200',
  hardware: 'bg-amber-50 text-amber-800 border-amber-200',
  orders_suppliers: 'bg-cyan-50 text-cyan-800 border-cyan-200',
})

/** Designation filter options (universal progressive filter). */
export const ADMIN_LOG_ROLE_OPTIONS = Object.freeze([
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'branch_admin', label: 'Local Admin' },
])

export function adminLogCategoryLabel(category) {
  return ADMIN_LOG_CATEGORY_LABELS[category] || category || '—'
}

export function adminLogCategoryBadgeClass(category) {
  return ADMIN_LOG_CATEGORY_BADGE[category] || 'bg-slate-50 text-slate-600 border-slate-200'
}

/** Local YYYY-MM-DD for default Today range. */
export function localDateInputValue(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Timestamp column: "14 Oct 2026, 02:34:17 PM" */
export function formatAdminLogTimestamp(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    const datePart = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const timePart = date
      .toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())
    return `${datePart}, ${timePart}`
  } catch {
    return '—'
  }
}

/** Export file tab segment: Logs_Stock_… */
export function adminLogTabFileSlug(tabId) {
  if (!tabId || tabId === 'all') return 'AllActivity'
  return String(ADMIN_LOG_CATEGORY_LABELS[tabId] || tabId).replace(/[^a-zA-Z0-9]+/g, '')
}
