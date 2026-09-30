import { Clock3, Package, ShoppingBag } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { useCurrency } from '@/hooks/useCurrency'
import { BRAND } from '@/lib/constants'
import { formatClockTime } from '@/lib/formatDateTime'

// Peak window API is 24h ("10:00–11:00") → show 12h AM/PM
function formatPeakWindow(peakHour) {
  if (!peakHour || peakHour === '—') return '—'
  const parts = String(peakHour).split(/[–-]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return formatClockTime(peakHour) || peakHour
  const start = formatClockTime(parts[0]) || parts[0]
  const end = formatClockTime(parts[1]) || parts[1]
  return `${start}–${end}`
}

export function DailySalesSummary({ summary = {}, className }) {
  const { format } = useCurrency()

  const items = [
    {
      label: 'Today revenue',
      value: format(summary.revenue),
      icon: ShoppingBag,
    },
    {
      label: 'Items sold',
      value: Number(summary.itemsSold || 0).toLocaleString(),
      icon: Package,
    },
    {
      label: 'Peak window',
      value: formatPeakWindow(summary.peakHour),
      sub: summary.peakHourSales != null ? format(summary.peakHourSales) : null,
      icon: Clock3,
    },
  ]

  return (
    <SurfaceCard
      className={className}
      title="Daily Sales Summary"
      description="Snapshot of today’s POS throughput"
      actions={
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ background: BRAND.purple }}
        >
          {Number(summary.orders || 0).toLocaleString()} orders
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-3"
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: BRAND.soft, color: BRAND.deep }}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="truncate text-sm font-semibold text-slate-900">{item.value}</p>
                {item.sub ? <p className="text-xs text-slate-400">{item.sub} at peak</p> : null}
              </div>
            </div>
          )
        })}
      </div>
    </SurfaceCard>
  )
}
