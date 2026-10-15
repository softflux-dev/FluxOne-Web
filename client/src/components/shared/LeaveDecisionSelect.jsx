import { NativeSelect } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export const LEAVE_DECISION_UNSET = ''

export const LEAVE_DECISION_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function isLeaveDecision(value) {
  return value === 'approved' || value === 'rejected'
}

/**
 * Status decision control for leave approval.
 * Closed: shows "pending" placeholder. Open: Approved / Rejected only.
 */
export function LeaveDecisionSelect({
  value = LEAVE_DECISION_UNSET,
  onChange,
  className,
  id,
  disabled = false,
  'aria-label': ariaLabel = 'Leave decision status',
}) {
  const decided = isLeaveDecision(value)

  return (
    <NativeSelect
      id={id}
      value={decided ? value : LEAVE_DECISION_UNSET}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn('capitalize', !decided && 'text-amber-700', className)}
      aria-label={ariaLabel}
    >
      <option value={LEAVE_DECISION_UNSET} disabled hidden>
        pending
      </option>
      {LEAVE_DECISION_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </NativeSelect>
  )
}

export default LeaveDecisionSelect
