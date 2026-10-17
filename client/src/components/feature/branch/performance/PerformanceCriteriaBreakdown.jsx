import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { trendDisplay } from '@/lib/performanceRatings'

export function PerformanceCriteriaBreakdown({ items = [], previousItems = [] }) {
  const [compare, setCompare] = useState(true)

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 text-sm text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        No criteria breakdown yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Criteria breakdown</h2>
          <p className="text-xs text-slate-500">What drove the latest change (% of max)</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="accent-purple-600"
          />
          <Label className="cursor-pointer text-xs font-normal">
            Compare: Latest vs Previous
          </Label>
        </label>
      </div>

      <div className="space-y-3">
        {items.map((row) => {
          const pct = Number(row.percentOfMax || 0)
          const prevPct = Number(row.previousPercentOfMax || 0)
          const deltaTrend = row.isNew
            ? null
            : trendDisplay(
                row.deltaPercentOfMax > 0
                  ? 'up'
                  : row.deltaPercentOfMax < 0
                    ? 'down'
                    : 'flat',
                row.deltaPercentOfMax,
              )

          return (
            <div key={row.criterionId} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800">{row.criterionName}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-600">
                    {row.points} / {row.maxScore}
                  </span>
                  {row.isNew ? (
                    <Badge className="bg-violet-50 text-violet-800 hover:bg-violet-50">New</Badge>
                  ) : deltaTrend ? (
                    <span className={deltaTrend.className}>{deltaTrend.text}</span>
                  ) : null}
                </div>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                {compare && !row.isNew && previousItems.length ? (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-slate-300/70"
                    style={{ width: `${Math.min(100, prevPct)}%` }}
                  />
                ) : null}
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-purple-500"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PerformanceCriteriaBreakdown
