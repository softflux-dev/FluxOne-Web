import { useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatScorePercent } from '@/lib/performanceScales'
import {
  formatRelativeScored,
  ratingBadgeClass,
  trendDisplay,
} from '@/lib/performanceRatings'
import { formatDateTimeInline } from '@/lib/formatDateTime'

export function PerformanceHistoryTimeline({
  timeline,
  expandedId,
  onToggleExpand,
  onPageChange,
  highlightId,
}) {
  const itemRefs = useRef({})

  useEffect(() => {
    if (!highlightId) return
    const el = itemRefs.current[highlightId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId, timeline?.items])

  const items = timeline?.items || []
  const markers = timeline?.scaleMarkers || []

  if (!timeline?.total) {
    return null
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Scoring history</h2>
        <p className="text-xs text-slate-500">Newest first · {timeline.total} evaluation(s)</p>
      </div>

      <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-slate-200">
        {items.map((entry, index) => {
          // Scale-update note between entries when a newer version sits after previous scored_at
          const nextOlder = items[index + 1]
          const noteMarkers = markers.filter((m) => {
            if (!nextOlder) return false
            const t = new Date(m.effectiveFrom).getTime()
            return (
              t < new Date(entry.scoredAt).getTime() &&
              t >= new Date(nextOlder.scoredAt).getTime()
            )
          })

          const trend = entry.isFirst
            ? trendDisplay('first', null)
            : trendDisplay(entry.changeDirection, entry.changeDelta)
          const open = expandedId === entry.id || highlightId === entry.id

          return (
            <div key={entry.id}>
              <div
                ref={(node) => {
                  if (node) itemRefs.current[entry.id] = node
                }}
                className={`relative ml-8 rounded-xl border p-3 ${
                  highlightId === entry.id
                    ? 'border-purple-300 bg-purple-50/40'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <span className="absolute top-4 -left-[27px] size-3 rounded-full border-2 border-white bg-purple-500 ring-1 ring-purple-200" />

                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDateTimeInline(entry.scoredAt)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatRelativeScored(entry.scoredAt)}
                      {entry.evaluatorName ? ` · by ${entry.evaluatorName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {formatScorePercent(entry.totalScore)}
                    </span>
                    <Badge variant="outline" className={ratingBadgeClass(entry.ratingLabel)}>
                      {entry.ratingLabel}
                    </Badge>
                    <span className={`text-xs ${trend.className}`}>
                      {entry.isFirst
                        ? '— First'
                        : `${Number(entry.changeDelta) > 0 ? '▲' : Number(entry.changeDelta) < 0 ? '▼' : '—'} ${entry.changeDelta == null ? '' : `${Number(entry.changeDelta) > 0 ? '+' : ''}${entry.changeDelta} pts`}`}
                    </span>
                  </div>
                </div>

                {entry.remarks ? (
                  <p className="mt-2 text-xs text-slate-600">Remarks: {entry.remarks}</p>
                ) : null}

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-8 px-2 text-xs"
                  onClick={() => onToggleExpand?.(entry.id)}
                >
                  {open ? 'Hide breakdown' : 'View breakdown'}
                </Button>

                {open ? (
                  <ul className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
                    {(entry.items || []).map((item) => (
                      <li key={item.criterionId} className="flex justify-between gap-2">
                        <span>{item.criterionName}</span>
                        <span className="font-mono">
                          {item.points} / {item.maxScore}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {noteMarkers.map((m) => (
                <div
                  key={m.versionId}
                  className="relative ml-8 my-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  title={m.changeSummary}
                >
                  <span className="font-semibold">{m.label}</span>
                  {m.changeSummary ? ` — ${m.changeSummary}` : ''}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {timeline.pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={timeline.page <= 1}
            onClick={() => onPageChange?.(timeline.page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {timeline.page} of {timeline.pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={timeline.page >= timeline.pageCount}
            onClick={() => onPageChange?.(timeline.page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default PerformanceHistoryTimeline
