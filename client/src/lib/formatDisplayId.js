// Format a UUID as a prefixed display reference (UI only — not stored in DB).
export function referenceFromUuid(id, prefix = 'REF') {
  if (!id) return '—'
  const compact = String(id).replace(/-/g, '').slice(0, 8).toUpperCase()
  return `${prefix}-${compact}`
}

// Strip paste artifacts (ZWSP/BOM/odd dashes) so LV-… / BRN-… searches match.
export function normalizeSearchQuery(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

// Match UUID, compact hex, or UI display ref (e.g. LV-3C72E1AB / BRN-C5C490DB).
export function matchesDisplayRef(entityId, query, prefix) {
  const q = normalizeSearchQuery(query).toLowerCase()
  if (!q || !entityId) return false

  const id = String(entityId).toLowerCase()
  const compact = id.replace(/-/g, '')
  const display = referenceFromUuid(entityId, prefix).toLowerCase()
  const prefixRe = new RegExp(`^${String(prefix).toLowerCase()}[-_\\s]?`)
  const qHex = q.replace(prefixRe, '').replace(/-/g, '')

  if (id.includes(q) || display.includes(q) || compact.includes(q.replace(/-/g, ''))) {
    return true
  }
  // Pasted display ID or hex fragment (min 4 chars to avoid noise)
  return qHex.length >= 4 && compact.includes(qHex)
}

export function displayMovementRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'STK') : '—'
}

export function displaySupplierRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'SUP') : '—'
}

export function displayStaffRef(row = {}) {
  const id = row.id || row.staffId
  return id ? referenceFromUuid(id, 'STF') : '—'
}

// Human-readable branch ref (BRN-XXXXXXXX) — UI only, not stored in DB.
export function displayBranchRef(row = {}) {
  const id = row?.id || row?.branchId
  return id ? referenceFromUuid(id, 'BRN') : '—'
}

export function displayDiscountRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'OFF') : '—'
}

/** Prefer real order_number; fall back to PO-XXXXXXXX from UUID. */
export function displayOrderRef(row = {}) {
  if (row.orderNumber) return String(row.orderNumber)
  const id = row.id || row.orderId
  return id ? referenceFromUuid(id, 'PO') : '—'
}

// Prefer sale_number (e.g. INV-1023) → SAL-INV-1023; fall back to SAL-XXXXXXXX from UUID.
export function displaySaleRef(row = {}) {
  const num = row.saleNumber || row.sale_number
  if (num) {
    const s = String(num).trim()
    if (!s) return '—'
    return /^sal[-_]/i.test(s) ? s.toUpperCase().replace(/^sal[-_]/i, 'SAL-') : `SAL-${s}`
  }
  const id = row.id || row.saleId
  return id ? referenceFromUuid(id, 'SAL') : '—'
}

/** Prefer real product item_code; fall back to ITM-XXXXXXXX from UUID. */
export function displayItemCode(row = {}) {
  const code = row.itemCode || row.item_code
  if (code) return String(code)
  const id = row.id || row.productId
  return id ? referenceFromUuid(id, 'ITM') : '—'
}
