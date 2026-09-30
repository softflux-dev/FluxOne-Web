import { StatCard } from '@/components/shared/StatsCards'
import {
  CircleDollarSign,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'

// KPI cards — Total Sales, Profit, Transactions (no Average Ticket)
const KPI_META = [
  {
    key: 'totalSales',
    label: 'Total Sales',
    subtitle: 'Daily branch turnover',
    icon: CircleDollarSign,
    money: true,
  },
  {
    key: 'profit',
    label: 'Profit',
    subtitle: 'Net margin earnings today',
    icon: TrendingUp,
    money: true,
  },
  {
    key: 'saleCount',
    label: 'Transactions',
    subtitle: 'POS checkouts processed',
    icon: Receipt,
    money: false,
  },
]

export function BranchKpiCards({ kpis = {}, className }) {
  const { format } = useCurrency()

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3', className)}>
      {KPI_META.map((meta, index) => {
        const Icon = meta.icon
        const value = kpis[meta.key]
        const display = meta.money
          ? format(value)
          : Number(value || 0).toLocaleString()

        return (
          <StatCard
            key={meta.key}
            index={index}
            label={meta.label}
            value={display}
            // subtitle={meta.subtitle}
            icon={Icon}
          />
        )
      })}
    </div>
  )
}

export default BranchKpiCards
