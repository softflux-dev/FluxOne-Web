import { Button } from '@/components/ui/button'
import { Ban, KeyRound, Pencil, Trash2, Unlock } from 'lucide-react'

export function BranchRowActions({
  branch: b,
  mutating,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}) {
  const isOpen = b.status === 'open'
  return (
    <div className="inline-flex items-center justify-start gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onEdit(b)}
        disabled={mutating}
        title="Edit"
        aria-label={`Edit ${b.name}`}
        className="size-8 text-purple-800 hover:bg-purple-50 hover:text-purple-950"
      >
        <Pencil className="size-4" />
      </Button>
      {b.manager?.id && !b.manager?.credentialsEmailed ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onResetPassword(b)}
          disabled={mutating}
          title="Manage credentials"
          aria-label={`Manage credentials for ${b.name}`}
          className="size-8 text-amber-700 hover:bg-amber-50 hover:text-amber-900"
        >
          <KeyRound className="size-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onToggleStatus(b)}
        disabled={mutating}
        title={isOpen ? 'Block' : 'Unblock'}
        aria-label={isOpen ? `Block ${b.name}` : `Unblock ${b.name}`}
        className={`size-8 ${
          isOpen
            ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-800'
            : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
        }`}
      >
        {isOpen ? <Ban className="size-4" /> : <Unlock className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(b)}
        disabled={mutating}
        title="Delete"
        aria-label={`Delete ${b.name}`}
        className="size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
