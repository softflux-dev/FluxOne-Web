// Rating bands frozen at score time (TL: Excellent ≥80, Good ≥60, Fair ≥40, Poor <40)

export const RATING_BANDS = [
  { label: 'Excellent', min: 80, max: 100, fill: 'rgba(16, 185, 129, 0.12)' },
  { label: 'Good', min: 60, max: 79.999, fill: 'rgba(59, 130, 246, 0.10)' },
  { label: 'Fair', min: 40, max: 59.999, fill: 'rgba(245, 158, 11, 0.12)' },
  { label: 'Poor', min: 0, max: 39.999, fill: 'rgba(244, 63, 94, 0.10)' },
]

export function ratingLabelFromScore(score) {
  const value = Number(score)
  if (!Number.isFinite(value)) return 'Poor'
  if (value >= 80) return 'Excellent'
  if (value >= 60) return 'Good'
  if (value >= 40) return 'Fair'
  return 'Poor'
}

export function ratingBadgeClass(labelOrScore) {
  const label =
    typeof labelOrScore === 'string' && Number.isNaN(Number(labelOrScore))
      ? labelOrScore
      : ratingLabelFromScore(labelOrScore)
  if (label === 'Excellent') {
    return 'bg-emerald-50 text-emerald-800 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
  }
  if (label === 'Good') {
    return 'bg-sky-50 text-sky-800 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
  }
  if (label === 'Fair') {
    return 'bg-amber-50 text-amber-800 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
  }
  return 'bg-rose-50 text-rose-800 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
}

export function trendDisplay(direction, delta) {
  if (direction === 'none' || delta == null) {
    return { text: '—', className: 'text-slate-400' }
  }
  if (direction === 'first') {
    return { text: '— First', className: 'text-slate-400' }
  }
  if (direction === 'flat' || Number(delta) === 0) {
    return { text: '— 0', className: 'text-slate-400' }
  }
  if (direction === 'up' || Number(delta) > 0) {
    const n = Math.abs(Number(delta))
    return { text: `▲ +${n}`, className: 'font-semibold text-emerald-600' }
  }
  const n = Math.abs(Number(delta))
  return { text: `▼ −${n}`, className: 'font-semibold text-rose-600' }
}

export function formatRelativeScored(value) {
  if (value == null || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(Math.abs(diffMs) / 60000)
  if (minutes < 1) return diffMs >= 0 ? 'just now' : 'in a moment'
  if (minutes < 60) return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return diffMs >= 0 ? `${days} day${days === 1 ? '' : 's'} ago` : `in ${days}d`
  const months = Math.floor(days / 30)
  return diffMs >= 0 ? `${months} mo ago` : `in ${months} mo`
}
