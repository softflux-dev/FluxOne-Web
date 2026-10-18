import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { RATING_BANDS } from '@/lib/performanceRatings'
import { formatScorePercent } from '@/lib/performanceScales'
import { formatDateLine, formatDateTimeInline } from '@/lib/formatDateTime'

const RANGES = ['3M', '6M', '12M', 'All']

function bandColor(score) {
  if (score >= 80) return '#059669'
  if (score >= 60) return '#0284c7'
  if (score >= 40) return '#d97706'
  return '#e11d48'
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-slate-800">{formatDateTimeInline(row.scoredAt)}</p>
      <p className="mt-1 text-slate-600">
        Score: <strong>{formatScorePercent(row.totalScore)}</strong> · {row.ratingLabel}
      </p>
      {row.changeDelta != null ? (
        <p className="mt-0.5 text-slate-600">
          Change: {row.changeDelta > 0 ? '+' : ''}
          {row.changeDelta} pts
        </p>
      ) : (
        <p className="mt-0.5 text-slate-500">First evaluation</p>
      )}
      {row.evaluatorName ? (
        <p className="mt-0.5 text-slate-500">by {row.evaluatorName}</p>
      ) : null}
    </div>
  )
}

// Clickable activeDot so hover + click bind the same evaluationId
function ActiveDot({ cx, cy, payload, onPointClick }) {
  if (cx == null || cy == null || !payload) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill="#4c1d95"
      stroke="#fff"
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        if (payload.evaluationId) onPointClick?.(payload.evaluationId)
      }}
    />
  )
}

export function PerformanceTrendChart({
  chart,
  range,
  onRangeChange,
  chartType,
  onChartTypeChange,
  onPointClick,
}) {
  // Unique X key per evaluation so same-day scores do not collide in Recharts
  const data = useMemo(() => {
    return (chart?.points || []).map((p, index) => ({
      ...p,
      index,
      pointKey: p.evaluationId || `pt-${index}-${p.scoredAt}`,
      label: formatDateLine(p.scoredAt),
    }))
  }, [chart?.points])

  const markers = chart?.scaleMarkers || []

  const markerXKeys = useMemo(() => {
    return markers.map((m) => {
      const match = data.find((d) => new Date(d.scoredAt) >= new Date(m.effectiveFrom))
      return { ...m, xKey: match?.pointKey }
    })
  }, [markers, data])

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Score trend</h2>
          <p className="text-xs text-slate-500">Total score over time (0–100%)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {['line', 'bar'].map((type) => (
              <Button
                key={type}
                size="sm"
                variant={chartType === type ? 'brand' : 'ghost'}
                className="h-8 px-3 text-xs capitalize"
                onClick={() => onChartTypeChange?.(type)}
              >
                {type}
              </Button>
            ))}
          </div>
          <div className="flex rounded-lg border border-border p-0.5">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? 'brand' : 'ghost'}
                className="h-8 px-2.5 text-xs"
                onClick={() => onRangeChange?.(r)}
              >
                {r}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {!data.length ? (
        <p className="py-16 text-center text-sm text-slate-400">No scores in this range</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart
                data={data}
                margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                onClick={(state) => {
                  const id = state?.activePayload?.[0]?.payload?.evaluationId
                  if (id) onPointClick?.(id)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                {RATING_BANDS.map((band) => (
                  <ReferenceArea
                    key={band.label}
                    y1={band.min}
                    y2={band.max === 100 ? 100 : band.max}
                    fill={band.fill}
                    ifOverflow="extendDomain"
                  />
                ))}
                {markerXKeys.map((m) =>
                  m.xKey ? (
                    <ReferenceLine
                      key={m.versionId}
                      x={m.xKey}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{
                        value: m.label,
                        position: 'insideTopRight',
                        fill: '#64748b',
                        fontSize: 10,
                      }}
                    />
                  ) : null,
                )}
                <XAxis
                  dataKey="pointKey"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(_, i) => data[i]?.label || ''}
                  interval="preserveStartEnd"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="totalScore" radius={[4, 4, 0, 0]}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.pointKey}
                      fill={bandColor(entry.totalScore)}
                      stroke={entry.isLatest ? '#4c1d95' : 'transparent'}
                      strokeWidth={entry.isLatest ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart
                data={data}
                margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                onClick={(state) => {
                  const id = state?.activePayload?.[0]?.payload?.evaluationId
                  if (id) onPointClick?.(id)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                {RATING_BANDS.map((band) => (
                  <ReferenceArea
                    key={band.label}
                    y1={band.min}
                    y2={band.max === 100 ? 100 : band.max}
                    fill={band.fill}
                    ifOverflow="extendDomain"
                  />
                ))}
                <XAxis
                  dataKey="pointKey"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(_, i) => data[i]?.label || ''}
                  interval="preserveStartEnd"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="totalScore"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (cx == null || cy == null || !payload) return null
                    return (
                      <g
                        key={payload.pointKey}
                        onClick={(e) => {
                          e.stopPropagation()
                          onPointClick?.(payload.evaluationId)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={payload.isLatest ? 6 : 4}
                          fill={payload.isLatest ? '#4c1d95' : '#7c3aed'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                        <text
                          x={cx}
                          y={cy - 10}
                          textAnchor="middle"
                          fontSize={10}
                          fill="#334155"
                        >
                          {Math.round(payload.totalScore)}
                        </text>
                      </g>
                    )
                  }}
                  activeDot={(props) => (
                    <ActiveDot {...props} onPointClick={onPointClick} />
                  )}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {markers.length ? (
        <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
          {markers.map((m) => (
            <li key={m.versionId} title={m.changeSummary}>
              <span className="font-medium text-slate-700">{m.label}</span>
              {m.changeSummary ? ` — ${m.changeSummary}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default PerformanceTrendChart
