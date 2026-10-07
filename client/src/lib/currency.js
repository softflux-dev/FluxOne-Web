// Supported system currencies (keep in sync with server/src/utils/currency.util.js)

export const SUPPORTED_CURRENCIES = [
  { code: 'PKR', symbol: '₨', label: 'PKR (₨)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'SAR', symbol: '﷼', label: 'SAR (﷼)' },
]

export const DEFAULT_CURRENCY = 'PKR'

const CODE_SET = new Set(SUPPORTED_CURRENCIES.map((c) => c.code))

export function isSupportedCurrency(code) {
  return CODE_SET.has(String(code || '').toUpperCase())
}

export function normalizeCurrency(code) {
  const upper = String(code || '').trim().toUpperCase()
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY
}

export function getCurrencyMeta(code) {
  const normalized = normalizeCurrency(code)
  return SUPPORTED_CURRENCIES.find((c) => c.code === normalized) || SUPPORTED_CURRENCIES[0]
}

// Display formatting. Amount conversion on currency change is server-side (FX rates).
export function formatMoney(amount, currencyCode = DEFAULT_CURRENCY) {
  const n = Number(amount) || 0
  const code = normalizeCurrency(currencyCode)
  const meta = getCurrencyMeta(code)
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.trunc(n))
  } catch {
    return `${meta.symbol}${n.toLocaleString()}`
  }
}

// Amount only (no currency code) — use when "Currency: PKR" is shown once in the header
export function formatAmount(amount) {
  const n = Number(amount) || 0
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.trunc(n))
}

// Compact label for table headers / exports e.g. "Price (PKR)"
export function currencyAmountLabel(prefix, currencyCode = DEFAULT_CURRENCY) {
  return `${prefix} (${normalizeCurrency(currencyCode)})`
}
