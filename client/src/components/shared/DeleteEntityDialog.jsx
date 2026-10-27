import { Ban, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Soft-first delete confirm: prefer Inactive/Block; hard delete only when allowed.
export function DeleteEntityDialog({
  open,
  onOpenChange,
  entityName = 'this item',
  title,
  description,
  softLabel = 'Set Inactive',
  softHint = 'Keeps history. Hides from active lists and can block login when relevant.',
  hardLabel = 'Permanently delete',
  hardHint,
  canHardDelete = false,
  hardDisabledReason = 'Linked records exist — permanent delete is not available.',
  showSoftAction = true,
  loading = false,
  onSoftDelete,
  onHardDelete,
}) {
  const displayName = entityName || 'this item'
  const heading = title || `Remove “${displayName}”?`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Phone: full-width sheet · sm+: capped card · xl: stays readable, not stretched */}
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3 pr-8 sm:items-center sm:gap-3.5 sm:pb-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-xs sm:size-11">
            <Trash2 className="size-4 sm:size-5.5" />
          </div>
          <DialogTitle className="min-w-0 flex-1 break-words text-base font-bold leading-snug text-slate-900 sm:text-lg md:text-xl">
            {heading}
          </DialogTitle>
        </div>

        <div className="space-y-2.5 py-3 sm:space-y-3 sm:py-4">
          {description ? (
            typeof description === 'string' ? (
              <p className="text-sm leading-relaxed text-slate-800 sm:text-base">{description}</p>
            ) : (
              <div className="text-sm leading-relaxed text-slate-800 sm:text-base">{description}</div>
            )
          ) : (
            <p className="text-sm leading-relaxed text-slate-800 sm:text-base">
              Prefer <strong>Inactive / Block</strong> if you only want to hide “{displayName}” or
              stop access. Permanent delete removes the record when the system allows it.
            </p>
          )}

          {showSoftAction ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs leading-relaxed text-emerald-900 sm:py-2.5 sm:text-sm">
              <span className="font-semibold">Recommended: </span>
              {softHint}
            </div>
          ) : null}

          {!canHardDelete ? (
            <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">{hardDisabledReason}</p>
          ) : hardHint ? (
            <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">{hardHint}</p>
          ) : showSoftAction ? null : (
            <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
              This action cannot be undone.
            </p>
          )}
        </div>

        {/* Stack on phone; wrap on tablet if 3 actions; row on desktop */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2.5 sm:pt-4 md:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="h-11 w-full cursor-pointer px-4 font-medium sm:h-10 sm:w-auto sm:min-w-[7.5rem]"
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>

          {showSoftAction && onSoftDelete ? (
            <Button
              type="button"
              loading={loading}
              className="h-11 w-full cursor-pointer px-4 font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0 active:scale-[0.98] sm:h-10 sm:w-auto sm:min-w-[7.5rem]"
              style={{ background: BRAND.purple }}
              onClick={() => onSoftDelete?.()}
            >
              <Ban className="size-4 shrink-0" />
              <span className="truncate">{softLabel}</span>
            </Button>
          ) : null}

          {onHardDelete ? (
            <Button
              type="button"
              variant="destructive"
              loading={loading}
              disabled={!canHardDelete}
              title={!canHardDelete ? hardDisabledReason : undefined}
              className={cn(
                'h-11 w-full cursor-pointer px-4 font-semibold sm:h-10 sm:w-auto sm:min-w-[7.5rem]',
                !canHardDelete && 'opacity-50',
              )}
              onClick={() => {
                if (!canHardDelete) return
                onHardDelete?.()
              }}
            >
              <Trash2 className="size-4 shrink-0" />
              <span className="truncate">{hardLabel}</span>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteEntityDialog
