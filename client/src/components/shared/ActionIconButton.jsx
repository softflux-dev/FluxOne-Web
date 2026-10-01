import { Ban, Check, Eye, Pencil, Trash2, Unlock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Standard table row actions — direct icons + hover tooltip (title/aria-label). No ⋮ menus.
const ACTION_STYLES = {
  view: 'text-purple-700 hover:bg-purple-50 hover:text-purple-900 hover:scale-110 active:scale-95',
  edit: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110 active:scale-95',
  delete: 'text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110 active:scale-95',
  approve: 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:scale-110 active:scale-95',
  reject: 'text-red-600 hover:bg-rose-50 hover:text-rose-700 hover:scale-110 active:scale-95',
  // Soft block / deactivate (Ban) — keep separate from hard delete (trash)
  block: 'text-rose-600 hover:bg-rose-50 hover:text-rose-800 hover:scale-110 active:scale-95',
  unblock: 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 hover:scale-110 active:scale-95',
}

const ACTION_ICONS = {
  view: Eye,
  edit: Pencil,
  delete: Trash2,
  approve: Check,
  reject: X,
  block: Ban,
  unblock: Unlock,
}

const ACTION_LABELS = {
  view: 'View',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  reject: 'Reject',
  block: 'Block',
  unblock: 'Unblock',
}

export function ActionIconButton({
  action = 'edit',
  label,
  onClick,
  className,
  iconClassName = 'size-4',
  disabled = false,
  type = 'button',
  ...props
}) {
  const Icon = ACTION_ICONS[action] || Pencil
  const tone = ACTION_STYLES[action] || ACTION_STYLES.edit
  const resolvedLabel = label || ACTION_LABELS[action] || 'Edit'

  return (
    <Button
      type={type}
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={resolvedLabel}
      title={resolvedLabel}
      onClick={onClick}
      className={cn('size-8 cursor-pointer', tone, className)}
      {...props}
    >
      <Icon className={cn(iconClassName, 'transition-transform duration-200')} />
    </Button>
  )
}

// View / Edit / Block|Unblock / Delete (pass only the handlers you need)
export function RowActionButtons({
  onView,
  onEdit,
  onBlock,
  onUnblock,
  isActive = true,
  onDelete,
  viewLabel = 'View',
  editLabel = 'Edit',
  blockLabel = 'Block',
  unblockLabel = 'Unblock',
  deleteLabel = 'Delete',
  className,
  iconClassName,
  disabled = false,
}) {
  // clean and optimized code — Ban when open, Unlock when blocked
  const showBlock = Boolean(onBlock) && isActive
  const showUnblock = Boolean(onUnblock) && !isActive

  return (
    <div className={cn('inline-flex items-center justify-start gap-1', className)}>
      {onView ? (
        <ActionIconButton
          action="view"
          label={viewLabel}
          onClick={onView}
          iconClassName={iconClassName}
          disabled={disabled}
        />
      ) : null}
      {onEdit ? (
        <ActionIconButton
          action="edit"
          label={editLabel}
          onClick={onEdit}
          iconClassName={iconClassName}
          disabled={disabled}
        />
      ) : null}
      {showBlock ? (
        <ActionIconButton
          action="block"
          label={blockLabel}
          onClick={onBlock}
          iconClassName={iconClassName}
          disabled={disabled}
        />
      ) : null}
      {showUnblock ? (
        <ActionIconButton
          action="unblock"
          label={unblockLabel}
          onClick={onUnblock}
          iconClassName={iconClassName}
          disabled={disabled}
        />
      ) : null}
      {onDelete ? (
        <ActionIconButton
          action="delete"
          label={deleteLabel}
          onClick={onDelete}
          iconClassName={iconClassName}
          disabled={disabled}
        />
      ) : null}
    </div>
  )
}

export default ActionIconButton
