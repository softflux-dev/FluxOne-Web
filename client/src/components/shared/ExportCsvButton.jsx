import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UI_RADIUS } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Shared Export action (CSV / Excel / PDF) — consistent h-10 + 8px radius
export function ExportCsvButton({
  onClick,
  disabled = false,
  label = 'Export',
  title,
  // csv | excel | pdf — icon + default title
  format = 'csv',
  className,
  size = 'default',
}) {
  const isPdf = format === 'pdf'
  const Icon = isPdf ? FileText : FileSpreadsheet
  const resolvedTitle =
    title ||
    (isPdf ? 'Export data to PDF' : 'Export data to Excel / CSV')

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      title={resolvedTitle}
      className={cn(
        'h-10 cursor-pointer gap-2 px-4 text-sm font-semibold',
        UI_RADIUS,
        'border-slate-200 text-slate-700 shadow-2xs dark:border-border dark:text-slate-200',
        'hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-muted dark:hover:text-slate-100',
        'disabled:opacity-50',
        className,
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          isPdf ? 'text-purple-600' : 'text-emerald-600',
        )}
      />
      {label}
    </Button>
  )
}

export default ExportCsvButton
