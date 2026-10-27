import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Child: export selected rows — Parent: AdminLogsPage
export function AdminLogsExportBar({
  selectedCount = 0,
  disabled = true,
  loading = false,
  onExport,
}) {
  const canExport = !disabled && selectedCount > 0 && !loading

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-slate-500">
        {loading
          ? 'Preparing export…'
          : selectedCount > 0
            ? `${selectedCount} row${selectedCount === 1 ? '' : 's'} selected`
            : 'Select rows to export (header selects all matching filters)'}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        loading={loading}
        disabled={disabled || selectedCount === 0}
        onClick={onExport}
        className="gap-1.5"
      >
        <Download className="size-3.5" />
        Export Selected
      </Button>
    </div>
  )
}

export default AdminLogsExportBar
