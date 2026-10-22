import { CheckCircle2, ClipboardList, Clock3, XCircle } from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/shared/StatsCards'

// Parent: Demand Requests KPI strip (click → status filter)
export function DemandRequestsStats({
  counts = { all: 0, pending: 0, approved: 0, rejected: 0 },
  activeStatus = '',
  onStatusClick,
  className,
}) {
  const cards = [
    {
      key: '',
      label: 'All Requests',
      value: counts.all,
      icon: ClipboardList,
    },
    {
      key: 'pending',
      label: 'Pending',
      value: counts.pending,
      icon: Clock3,
      badge: counts.pending ? 'Review' : undefined,
    },
    {
      key: 'approved',
      label: 'Approved',
      value: counts.approved,
      icon: CheckCircle2,
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: counts.rejected,
      icon: XCircle,
    },
  ]

  return (
    <StatsGrid columns={4} className={className}>
      {cards.map((card, index) => (
        <StatCard
          key={card.key || 'all'}
          index={index}
          label={card.label}
          value={String(card.value ?? 0)}
          icon={card.icon}
          badge={card.badge}
          onClick={() => onStatusClick?.(card.key)}
          className={
            activeStatus === card.key
              ? 'border-purple-300 ring-1 ring-purple-200'
              : undefined
          }
        />
      ))}
    </StatsGrid>
  )
}

export default DemandRequestsStats
