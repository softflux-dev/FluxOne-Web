// Money helpers — whole units only (display & submit: 100, not 100.10).

// Round to nearest whole unit (safe for API submit).
export function roundMoney(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.round(n)
}

// Form display: always whole units.
export function formatMoneyInput(value) {
  if (value === 0 || value === '0') return '0'
  if (value === '' || value == null) return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n))
}

// Typing sanitize: digits + optional one "." + up to 2 fraction digits.
export function sanitizeMoneyInput(raw, { allowNegative = false } = {}) {
  let text = String(raw ?? '')
  const neg = allowNegative && text.trimStart().startsWith('-')
  text = text.replace(/[^\d.]/g, '')
  const firstDot = text.indexOf('.')
  if (firstDot !== -1) {
    const intPart = text.slice(0, firstDot).replace(/\./g, '') || ''
    const fracPart = text.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
    text = `${intPart}.${fracPart}`
  }
  return neg ? `-${text}` : text
}

// Blur / commit normalize to a clean money string (or empty).
export function normalizeMoneyInput(
  raw,
  { min = 0, max = null, allowEmpty = true, emptyAs = '' } = {},
) {
  const text = String(raw ?? '').trim()
  if (text === '' || text === '-' || text === '.') {
    return allowEmpty ? emptyAs : String(min)
  }
  let n = roundMoney(text, Number.NaN)
  if (!Number.isFinite(n)) return allowEmpty ? emptyAs : String(min)
  if (n < min) n = min
  if (max != null && Number.isFinite(Number(max)) && n > Number(max)) n = Number(max)
  return formatMoneyInput(n)
}
