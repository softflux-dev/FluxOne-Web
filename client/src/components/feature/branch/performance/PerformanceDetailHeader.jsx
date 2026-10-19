import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { displayStaffRef } from '@/lib/formatDisplayId'

export function PerformanceDetailHeader({
  employee,
  backHref,
  onScore,
  canScore = true,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={employee?.fullName}
            imageUrl={employee?.imageUrl}
            className="size-14 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-900">
              {employee?.fullName || 'Employee'}
            </h1>
            <p className="mt-0.5 font-mono text-xs font-bold text-purple-800">
              {displayStaffRef({ staffId: employee?.staffId, id: employee?.staffId })}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {[employee?.designation, employee?.branchName].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to={backHref}>
              <ArrowLeft className="size-4" />
              Back to roster
            </Link>
          </Button>
          {canScore ? (
            <Button type="button" variant="brand" onClick={onScore}>
              Score Employee
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PerformanceDetailHeader
