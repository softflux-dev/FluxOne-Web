import { formatMoney } from '@/lib/currency'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Empty dashboard shape when API has not returned data yet.
export function emptyBranchDashboard(date = new Date().toISOString().slice(0, 10)) {
  return {
    branchName: '',
    date,
    // KPI shape — Profit (not Gross Profit); no Average Ticket on UI
    kpis: {
      totalSales: 0,
      profit: 0,
      saleCount: 0,
      profitChangePct: 0,
      salesChangePct: 0,
    },
    dailySummary: {
      revenue: 0,
      itemsSold: 0,
      orders: 0,
      peakHour: '—',
      peakHourSales: 0,
    },
    salesByHour: [],
    productMix: [], // legacy empty — Mix Chart removed from UI
    topProducts: [],
    lowProducts: [],
    counters: [],
    staff: [],
    inventory: [],
  }
}

// Normalize API payload onto the empty dashboard shape (live data only).
export function mergeBranchDashboard(apiData) {
  const date = apiData?.date || new Date().toISOString().slice(0, 10)
  if (!isPlainObject(apiData)) return emptyBranchDashboard(date)

  const base = emptyBranchDashboard(date)
  const merged = { ...base }

  for (const key of Object.keys(apiData)) {
    const value = apiData[key]
    if (value == null) continue

    if (Array.isArray(value)) {
      merged[key] = value
      continue
    }

    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = { ...base[key], ...value }
      continue
    }

    merged[key] = value
  }

  return merged
}

export function formatCurrency(amount, currency = 'PKR') {
  // Prefer shared formatter so Admin Settings currency applies everywhere
  return formatMoney(amount, currency)
}

export function formatPct(value) {
  const n = Number(value) || 0
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function staffInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'U').slice(0, 2).toUpperCase()
}
