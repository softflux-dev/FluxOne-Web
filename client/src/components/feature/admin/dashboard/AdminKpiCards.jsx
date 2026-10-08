import {
  CircleDollarSign,
  CalendarCheck,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import { StatCard } from '@/components/shared/StatsCards'
import { cn } from '@/lib/utils'

const KPI_CONFIG = [
  {
    key: 'todayEarning',
    title: 'Period Earning',
    subtitle: 'Net earnings for selected From–To range',
    icon: CircleDollarSign,
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    iconGradient: 'from-purple-600 to-indigo-700',
  },
  {
    key: 'lastMonthEarning',
    title: 'Last Month Earning',
    subtitle: 'Closed calendar month earnings',
    icon: CalendarCheck,
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    iconGradient: 'from-blue-600 to-cyan-600',
  },
  {
    key: 'thisYearEarning',
    title: 'This Year Earning',
    subtitle: 'Cumulative earnings year to date',
    icon: TrendingUp,
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    iconGradient: 'from-emerald-600 to-teal-700',
  },
  {
    key: 'totalSale',
    title: 'Total Sale',
    subtitle: 'Consolidated all-time branch sales',
    icon: Receipt,
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    iconGradient: 'from-amber-500 to-orange-600',
  },
]

export function AdminKpiCards({ kpis = {}, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {KPI_CONFIG.map((config, index) => {
        const item = kpis[config.key] || {}
        const displayValue = item.formatted || '—'

        return (
          <StatCard
            key={config.key}
            index={index}
            label={config.title}
            value={displayValue}
            subtitle={config.subtitle}
            icon={config.icon}
            gradient={config.gradient}
            iconGradient={config.iconGradient}
          />
        )
      })}
    </div>
  )
}

export default AdminKpiCards
