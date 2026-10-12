import { Trash2, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Standardized confirm modal (QA TC-ADMIN-011):
 * red/warning icon + title · confirmation message · muted warning · Cancel + action (right-aligned).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  loading = false,
  variant = 'destructive',
  icon: CustomIcon,
}) {
  function iconShell(toneClass, Icon) {
    return (
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-xs sm:size-11',
          toneClass,
        )}
      >
        <Icon className="size-4 sm:size-5.5" />
      </div>
    )
  }

  function renderIcon() {
    // Custom icon keeps the variant tone (e.g. Ban for block = red, Unlock = purple)
    if (CustomIcon) {
      if (variant === 'destructive') return iconShell('bg-red-600', CustomIcon)
      if (variant === 'warning') return iconShell('bg-amber-500', CustomIcon)
      if (variant === 'success') return iconShell('bg-emerald-600', CustomIcon)
      return iconShell('bg-purple-600', CustomIcon)
    }

    if (variant === 'destructive') return iconShell('bg-red-600', Trash2)
    if (variant === 'warning') return iconShell('bg-amber-500', AlertTriangle)
    if (variant === 'success') return iconShell('bg-emerald-600', CheckCircle2)
    return iconShell('bg-purple-600', HelpCircle)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3 pr-8 sm:items-center sm:gap-3.5 sm:pb-4 dark:border-border">
          {renderIcon()}
          <DialogTitle className="min-w-0 flex-1 break-words text-base font-bold leading-snug text-slate-900 sm:text-lg md:text-xl dark:text-slate-100">
            {title}
          </DialogTitle>
        </div>

        <div className="space-y-2.5 py-3 sm:space-y-2.5 sm:py-4">
          {description ? (
            typeof description === 'string' ? (
              <p className="text-sm leading-relaxed text-slate-800 sm:text-base font-normal dark:text-slate-200">
                {description}
              </p>
            ) : (
              <div className="text-sm leading-relaxed text-slate-800 sm:text-base font-normal dark:text-slate-200">
                {description}
              </div>
            )
          ) : null}

          {warning ? (
            <p className="text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
              {warning}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2.5 sm:pt-4 md:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="h-11 w-full cursor-pointer px-4 font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 sm:h-10 sm:w-auto sm:min-w-[7.5rem]"
            onClick={() => onOpenChange?.(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={loading}
            className={cn(
              'h-11 w-full cursor-pointer px-4 font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0 active:scale-[0.98] sm:h-10 sm:w-auto sm:min-w-[7.5rem]',
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700'
                : variant === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-purple-700 hover:bg-purple-800',
            )}
            onClick={() => onConfirm?.()}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
