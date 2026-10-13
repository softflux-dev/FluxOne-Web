import { cn } from '@/lib/utils'

// Clamp by lines and/or max character count; full string on native hover tooltip
export function TruncatedText({
  text = '',
  lines = 1,
  maxChars,
  className,
  as: Comp = 'p',
  ...props
}) {
  const value = text == null ? '' : String(text)
  const limit = Number(maxChars)
  const useChars = Number.isFinite(limit) && limit > 0
  const display =
    useChars && value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value
  const clampClass = useChars ? '' : lines >= 2 ? 'line-clamp-2' : 'truncate'

  return (
    <Comp
      className={cn('min-w-0 break-words', clampClass, className)}
      title={value || undefined}
      {...props}
    >
      {display}
    </Comp>
  )
}

export default TruncatedText
