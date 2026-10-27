import { formatDateTimeParts } from '@/lib/formatDateTime'

/**
 * Date on top · 12h AM/PM time on bottom (system-wide table/detail rule).
 */
export function DateTimeLines({
  value,
  className = '',
  timeClassName = 'text-[11px] text-muted-foreground',
}) {
  const parts = formatDateTimeParts(value)
  if (parts.date === '—') return '—'

  return (
    <span className={`inline-flex flex-col leading-tight ${className}`.trim()}>
      <span>{parts.date} - {parts.time}</span>
      {/* {parts.time !== '—' ? <span className={timeClassName}>{parts.time}</span> : null} */}
    </span>
  )
}

export default DateTimeLines
