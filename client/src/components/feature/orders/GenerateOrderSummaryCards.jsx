import { Building2, ClipboardList, Clock3, Package } from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/shared/StatsCards'

// Parent: Generate Order page summary strip
export function GenerateOrderSummaryCards({
  companies = 0,
  itemLines = 0,
  totalUnits = 0,
  className,
}) {
  return (
    <StatsGrid columns={4} className={className}>
      <StatCard
        index={0}
        label="Supplier Companies"
        value={String(companies)}
        icon={Building2}
      />
      <StatCard
        index={1}
        label="Item Lines"
        value={String(itemLines)}
        icon={ClipboardList}
      />
      <StatCard
        index={2}
        label="Total Units"
        value={String(totalUnits)}
        icon={Package}
      />
      <StatCard
        index={3}
        label="Status on Submit"
        value="Pending"
        icon={Clock3}
        badge="Awaiting BM"
      />
    </StatsGrid>
  )
}

export default GenerateOrderSummaryCards
