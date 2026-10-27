import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function ControlSecondaryActions({
  onExport,
  exportLoading = false,
  className,
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        style={{ color: BRAND.deep }}
        loading={exportLoading}
        onClick={() => onExport?.()}
      >
        <Download className="size-4" />
        Export
      </Button>
    </div>
  )
}
