// Shared row shaping for Sales Transactions table (desktop + mobile).

export function soldLines(sale) {
  return (sale?.items || []).filter((i) => !i.isExchange)
}

export function itemQtyTotal(items) {
  return items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
}

export function itemsLabel(count) {
  const n = Number(count) || 0
  return n === 1 ? '1 item' : `${n} items`
}

export function primaryItemName(items) {
  if (!items.length) return '—'
  if (items.length === 1) return items[0].name || '—'
  return items.map((i) => i.name).filter(Boolean).join(', ') || '—'
}

export function moneyNum(value) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

// PKR 0 / empty → "—" (nothing); otherwise formatted money string
export function moneyOrDash(formatMoney, value, currency) {
  if (moneyNum(value) <= 0) return '—'
  return formatMoney(value, currency)
}

// POS stores cash-back as return_amount; refund flow overwrites it with final_amount.
export function splitReturnAndChange(sale) {
  const amount = moneyNum(sale?.returnAmount ?? sale?.return_amount)
  const refunded = String(sale?.status || '').toLowerCase() === 'refunded'
  if (refunded) {
    return {
      refunded: true,
      returnAmount: amount > 0 ? amount : moneyNum(sale?.finalAmount),
      changeAmount: 0,
    }
  }
  return {
    refunded: false,
    returnAmount: 0,
    changeAmount: amount > 0 ? amount : 0,
  }
}

// Actions pill: Refunded | Change (cash back) | Completed
export function saleActionStatus(sale) {
  const { refunded, changeAmount } = splitReturnAndChange(sale)
  if (refunded) {
    return {
      key: 'refunded',
      label: 'Refunded',
      className: 'bg-rose-50 text-rose-700 ring-rose-200',
    }
  }
  if (changeAmount > 0) {
    return {
      key: 'change',
      label: 'Change',
      className: 'bg-amber-50 text-amber-800 ring-amber-200',
    }
  }
  return {
    key: 'completed',
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  }
}

export function formatFilterDateRange(from, to) {
  if (!from && !to) return null
  const fmt = (iso) => {
    if (!iso) return null
    const d = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const a = fmt(from)
  const b = fmt(to)
  if (a && b) return `${a} - ${b}`
  return a || b
}
