import { FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Shared Export action (CSV / Excel / PDF) — use across B2B, IM, BM for consistent size
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
        // Consistent larger control — 8px radius matches filter fields
        'h-10 cursor-pointer gap-2 rounded-lg px-4 text-sm font-semibold',
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
