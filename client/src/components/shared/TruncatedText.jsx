import { cn } from '@/lib/utils'

// Clamp text to 1 or 2 lines; full string on native hover tooltip
export function TruncatedText({ text = '', lines = 1, className, as: Comp = 'p', ...props }) {
  const value = text == null ? '' : String(text)
  const clampClass = lines >= 2 ? 'line-clamp-2' : 'truncate'

  return (
    <Comp
      className={cn('min-w-0 break-words', clampClass, className)}
      title={value || undefined}
      {...props}
    >
      {value}
    </Comp>
  )
}

export default TruncatedText
