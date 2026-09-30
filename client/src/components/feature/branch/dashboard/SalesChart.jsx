import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { useCurrency } from '@/hooks/useCurrency'
import { BRAND } from '@/lib/constants'
import { formatClockTime } from '@/lib/formatDateTime'

const CHART_H = 260

function SalesTooltip({ active, payload, label }) {
  const { format } = useCurrency()
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  const revenue = Number(row?.revenue ?? row?.sales ?? 0)
  const txCount = Number(row?.txCount ?? 0)
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-slate-600">
        Revenue: <span className="font-semibold text-slate-900">{format(revenue)}</span>
      </p>
      {txCount ? (
        <p className="mt-0.5 text-slate-500">{txCount} transaction{txCount === 1 ? '' : 's'}</p>
      ) : null}
      {row?.topItem ? <p className="mt-0.5 text-slate-400">Top item: {row.topItem}</p> : null}
    </div>
  )
}

function formatAxisTick(value) {
  const n = Number(value) || 0
  if (n >= 100_000) return `${(n / 1000).toFixed(0)}k`
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

export function SalesChart({ series, className }) {
  // API sends 24h labels ("14:00"); convert to 12h AM/PM for display
  const data = (Array.isArray(series) ? series : []).map((row) => ({
    ...row,
    hourLabel: formatClockTime(row.hour) || row.hour,
    chartValue: Number(row.revenue ?? row.sales ?? 0),
    txCount: Number(row.sales ?? 0),
  }))

  return (
    <SurfaceCard
      className={className}
      title="Today's sales by hour"
      description="Hourly revenue (Rs) — when sales increased vs dropped"
    >
      <div className="w-full" style={{ height: CHART_H, minHeight: CHART_H }}>
        <ResponsiveContainer width="100%" height={CHART_H}>
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="salesHourFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND.purple} stopOpacity={0.28} />
                <stop offset="100%" stopColor={BRAND.purple} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e8edf3" />
            <XAxis
              dataKey="hourLabel"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
              label={{
                value: 'Hour of day',
                position: 'insideBottom',
                offset: -2,
                style: { fill: '#94a3b8', fontSize: 10 },
              }}
            />
            <YAxis
              domain={[0, 'auto']}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickCount={6}
              tickFormatter={formatAxisTick}
              label={{
                value: 'Revenue (Rs)',
                angle: -90,
                position: 'insideLeft',
                offset: 8,
                style: { fill: '#64748b', fontSize: 11, fontWeight: 600 },
              }}
            />
            <Tooltip content={<SalesTooltip />} />
            <Area
              type="monotone"
              dataKey="chartValue"
              name="Revenue (Rs)"
              stroke={BRAND.purple}
              strokeWidth={2.5}
              fill="url(#salesHourFill)"
              dot={{ r: 3, fill: BRAND.purple, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: BRAND.purple, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  )
}
