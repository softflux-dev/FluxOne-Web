// Role + branch identity capsules (branch isolation UX)
import { cn } from '@/lib/utils'

const ROLE_STYLES = {
  inventory_manager: 'bg-violet-50 text-violet-800 ring-violet-200',
  branch_manager: 'bg-sky-50 text-sky-800 ring-sky-200',
  b2b_admin: 'bg-amber-50 text-amber-900 ring-amber-200',
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
}

function Capsule({ children, className }) {
  if (!children) return null
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
        className,
      )}
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  )
}

export function RoleCapsule({ role, label, className }) {
  const style = ROLE_STYLES[role] || ROLE_STYLES.default
  return (
    <Capsule className={cn(style, className)}>{label || role || 'Role'}</Capsule>
  )
}

export function BranchCapsule({ branchName, className }) {
  if (!branchName) return null
  return (
    <Capsule
      className={cn('bg-emerald-50 text-emerald-800 ring-emerald-200', className)}
    >
      {branchName}
    </Capsule>
  )
}

// Compact row: role pill + branch pill
export function BranchRoleCapsules({
  role,
  roleLabel,
  branchName,
  className,
  size = 'sm',
}) {
  const gap = size === 'xs' ? 'gap-1' : 'gap-1.5'
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center', gap, className)}>
      <RoleCapsule role={role} label={roleLabel} />
      <BranchCapsule branchName={branchName} />
    </div>
  )
}

export default BranchRoleCapsules
