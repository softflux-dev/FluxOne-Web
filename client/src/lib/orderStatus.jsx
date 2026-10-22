import { cn } from '@/lib/utils'

// Shared TL order-request status labels / chips (IM Orders + BM Demand Requests)

export function orderStatusLabel(status) {
  if (status === 'partially_received') return 'Partially Received'
  if (!status) return '—'
  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function orderStatusClass(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700'
  if (status === 'received') return 'bg-sky-50 text-sky-700'
  if (status === 'rejected') return 'bg-rose-50 text-rose-700'
  if (status === 'partially_received') return 'bg-orange-50 text-orange-800'
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500'
  if (status === 'pending') return 'bg-amber-50 text-amber-800'
  return 'bg-slate-100 text-slate-600'
}

export function OrderStatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        orderStatusClass(status),
        className,
      )}
    >
      {orderStatusLabel(status)}
    </span>
  )
}
