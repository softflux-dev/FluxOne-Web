// Money helpers — whole units only (display & submit: 100, not 100.10).

// Round to nearest whole unit (safe for API submit).
export function roundMoney(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.round(n)
}
