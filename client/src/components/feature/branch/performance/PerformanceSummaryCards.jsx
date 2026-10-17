import { Badge } from '@/components/ui/badge'
import { formatScorePercent } from '@/lib/performanceScales'
import {
  formatRelativeScored,
  ratingBadgeClass,
  trendDisplay,
} from '@/lib/performanceRatings'
import { formatDateLine, formatDateTimeInline } from '@/lib/formatDateTime'

function CardShell({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function PerformanceSummaryCards({ summary }) {
  if (!summary || summary.evaluationCount === 0) {
    return null
  }

  const change = summary.change
  const trend = trendDisplay(
    change?.direction === 'first' ? 'first' : change?.direction,
    change?.delta,
  )

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CardShell title="Current Score">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-bold text-slate-900">
            {formatScorePercent(summary.currentScore)}
          </span>
          {summary.ratingLabel ? (
            <Badge variant="outline" className={ratingBadgeClass(summary.ratingLabel)}>
              {summary.ratingLabel}
            </Badge>
          ) : null}
        </div>
      </CardShell>

      <CardShell title="Change Since Last">
        {change?.direction === 'first' || change?.delta == null ? (
          <p className="text-sm text-slate-500">— First evaluation</p>
        ) : (
          <>
            <p className={`text-lg ${trend.className}`}>
              {Number(change.delta) > 0
                ? `▲ +${change.delta} pts`
                : Number(change.delta) < 0
                  ? `▼ ${change.delta} pts`
                  : '— 0 pts'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              was {formatScorePercent(change.previousScore)} on{' '}
              {formatDateLine(change.previousScoredAt)}
            </p>
          </>
        )}
      </CardShell>

      <CardShell title="Last Scored">
        <p className="text-sm font-semibold text-slate-900">
          {formatDateTimeInline(summary.lastScoredAt)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {formatRelativeScored(summary.lastScoredAt)}
          {summary.lastEvaluatorName ? ` · by ${summary.lastEvaluatorName}` : ''}
        </p>
      </CardShell>

      <CardShell title="Average / Best">
        <p className="text-sm font-semibold text-slate-900">
          Avg {formatScorePercent(summary.averageScore)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Best {formatScorePercent(summary.bestScore)}
          {summary.bestScoredAt
            ? ` (${formatDateLine(summary.bestScoredAt).replace(/^\d{2} /, '').replace(/ (\d{4})$/, ' $1')})`
            : ''}
        </p>
      </CardShell>
    </div>
  )
}

export default PerformanceSummaryCards
