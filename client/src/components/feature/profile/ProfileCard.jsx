import { Pencil } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { roleDisplayName } from '@/lib/nav'
import { cn } from '@/lib/utils'

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 dark:bg-muted">
      <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="break-all text-sm font-semibold text-slate-900 sm:truncate sm:text-right dark:text-slate-100">
        {value || '—'}
      </span>
    </div>
  )
}

// Reusable profile card for BM / IM / Admin (and any signed-in role).
// No password on the view card — password is only editable in ProfileEditDialog.
export function ProfileCard({
  name,
  loginId,
  role,
  loginExpires,
  onEdit,
  className,
  imageUrl = null,
}) {
  const displayName = name || 'User'
  const roleLabel = roleDisplayName(role)

  return (
    <section
      className={cn(
        'relative w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-8 dark:bg-card dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      {onEdit ? (
        <button
          type="button"
          aria-label="Edit profile"
          onClick={onEdit}
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#8E238F] sm:top-4 sm:right-4 dark:hover:bg-muted dark:hover:text-[#c084c1]"
        >
          <Pencil className="size-4" strokeWidth={1.75} />
        </button>
      ) : null}

      <div className="flex items-center gap-3 pr-10 sm:gap-4">
        <UserAvatar
          name={displayName}
          loginId={loginId}
          imageUrl={imageUrl}
          className="size-14 sm:size-[4.5rem]"
          fallbackClassName="text-base sm:text-xl"
        />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
            {displayName}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{roleLabel}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2.5 sm:mt-8">
        <DetailRow label="Name" value={displayName} />
        <DetailRow label="User ID" value={loginId} />
        <DetailRow label="Role" value={roleLabel} />
        <DetailRow label="Login expires" value={loginExpires} />
      </div>
    </section>
  )
}
