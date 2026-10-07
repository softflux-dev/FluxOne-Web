import { PencilIcon } from 'lucide-react'
import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { Button } from '@/components/ui/button'
import { displayItemCode } from '@/lib/formatDisplayId'
import { cn } from '@/lib/utils'

const STATUS_META = {
  in: { label: 'In stock', className: 'bg-emerald-50 text-emerald-700' },
  low: { label: 'Low stock', className: 'bg-amber-50 text-amber-700' },
  out: { label: 'Out of stock', className: 'bg-red-50 text-red-700' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.in
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        meta.className,
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {meta.label}
    </span>
  )
}

const columns = [
  {
    key: 'product',
    label: 'Product',
    render: (row) => (
      <div className="flex min-w-0 items-center gap-2">
        <ProductImageCell src={row.imageUrl} name={row.name} />
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="font-mono text-xs text-slate-400">{displayItemCode(row)}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'onHand',
    label: 'On hand',
    render: (row) => <span className="tabular-nums">{Number(row.quantity ?? 0)}</span>,
  },
  {
    key: 'threshold',
    label: 'Threshold',
    render: (row) => (
      <span className="tabular-nums font-semibold">{Number(row.reorderPoint ?? 0)}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.stockStatus || 'in'} />,
  },
]

// Manage Threshold tab — edit-only rows.
export function ThresholdTable({
  items,
  loading,
  onEdit,
  className,
}) {
  return (
    <MovementHistoryTable
      title="Manage thresholds"
      description="Reorder points for products and variant SKUs"
      items={items}
      loading={loading}
      columns={columns}
      renderRowActions={(row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={() => onEdit?.(row)}
        >
          <PencilIcon className="size-3.5" />
          Edit
        </Button>
      )}
      emptyTitle="No threshold records"
      emptyHint="Products appear here once they exist in your catalog."
      className={className}
    />
  )
}

export default ThresholdTable
