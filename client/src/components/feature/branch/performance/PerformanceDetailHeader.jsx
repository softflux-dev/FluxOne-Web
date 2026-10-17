import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { displayStaffRef } from '@/lib/formatDisplayId'

export function PerformanceDetailHeader({
  employee,
  backHref,
  onScore,
  canScore = true,
}) {
  const initials = String(employee?.fullName || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div className="space-y-3">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <Link to={backHref} className="hover:text-purple-700 hover:underline">
          Performance
        </Link>
        <span>›</span>
        <Link to={backHref} className="hover:text-purple-700 hover:underline">
          Performance Roster
        </Link>
        <span>›</span>
        <span className="font-medium text-slate-800">{employee?.fullName || 'Employee'}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {employee?.imageUrl ? (
            <img
              src={employee.imageUrl}
              alt=""
              className="size-14 rounded-xl object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 ring-1 ring-border">
              {initials}
            </div>
          )}
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
