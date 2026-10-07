import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { displayItemCode } from '@/lib/formatDisplayId'
import { DAMAGED_LOCATIONS, MOVEMENT_TYPES } from '@/lib/mapStockMovement'

// Control table columns — shared cells + per-tab defs (Phase 3)

const TYPE_LABEL = {
  single: 'Single Item',
  bundle: 'Bundle',
  variant: 'Variant',
}

const SOURCE_LABEL = {
  out: 'Sale / stock out',
  damaged: 'Damaged',
  expired: 'Expired',
}

function typeLabel(type) {
  return TYPE_LABEL[type] || (type ? String(type) : '—')
}

function locationLabel(value) {
  return DAMAGED_LOCATIONS.find((o) => o.value === value)?.label || value || '—'
}

function categoryCell(row) {
  return (
    <div className="min-w-0">
      <p className="text-slate-800">{row.categoryName || '—'}</p>
      {row.subcategoryName ? (
        <p className="text-xs text-slate-400">{row.subcategoryName}</p>
      ) : null}
    </div>
  )
}

function scaleVariantCell(row) {
  const label = row.variantLabel || row.scale || '—'
  return <span className="capitalize text-slate-700">{label}</span>
}

function typeBadge(row) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {typeLabel(row.type)}
    </span>
  )
}

function notesCell(row) {
  const text = row.notes || row.reason || ''
  return <span className="line-clamp-2 text-slate-600">{text || '—'}</span>
}

// Shared leading columns for every Control history table.
export function controlSharedColumns() {
  return [
    {
      key: 'itemId',
      label: 'Item-ID',
      className: 'w-28',
      render: (row) => (
        <span
          className="font-mono text-xs text-slate-600"
          title={row.itemCode || row.productId || ''}
        >
          {displayItemCode({ itemCode: row.itemCode, productId: row.productId })}
        </span>
      ),
    },
    {
      key: 'product',
      label: 'Product',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <ProductImageCell src={row.imageUrl} name={row.productName} />
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{row.productName || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: categoryCell,
    },
    {
      key: 'when',
      label: 'Date · Time',
      className: 'whitespace-nowrap',
      render: (row) => <DateTimeLines value={row.createdAt} />,
    },
    {
      key: 'scale',
      label: 'Scale / Variant',
      render: scaleVariantCell,
    },
  ]
}

export function controlColumnsForTab(tab) {
  const shared = controlSharedColumns()

  if (tab === MOVEMENT_TYPES.IN) {
    return [
      ...shared,
      { key: 'type', label: 'Type', render: typeBadge },
      {
        key: 'qty',
        label: 'Qty in',
        render: (row) => (
          <span className="font-semibold text-emerald-700">+{Number(row.quantity || 0)}</span>
        ),
      },
      {
        key: 'company',
        label: 'Company / Supplier',
        render: (row) => <span className="text-slate-700">{row.companyName || '—'}</span>,
      },
      { key: 'notes', label: 'Notes', render: notesCell },
    ]
  }

  if (tab === MOVEMENT_TYPES.OUT) {
    return [
      ...shared,
      { key: 'type', label: 'Type', render: typeBadge },
      {
        key: 'qty',
        label: 'Qty out',
        render: (row) => (
          <span className="font-semibold text-red-600">
            −{Math.abs(Number(row.quantity || 0))}
          </span>
        ),
      },
      {
        key: 'company',
        label: 'Company',
        render: (row) => (
          <span className="text-slate-700">
            {row.companyName || SOURCE_LABEL[row.movementType] || '—'}
          </span>
        ),
      },
      { key: 'notes', label: 'Notes', render: notesCell },
    ]
  }

  if (tab === MOVEMENT_TYPES.ADJUSTMENT) {
    return [
      ...shared,
      {
        key: 'ledgerKind',
        label: 'Kind',
        render: (row) => (
          <span className="capitalize text-slate-700">{row.movementType || 'adjustment'}</span>
        ),
      },
      { key: 'type', label: 'Type', render: typeBadge },
      {
        key: 'qty',
        label: 'Adjusted qty',
        render: (row) => {
          const q = Number(row.quantity || 0)
          return (
            <span
              className={
                q >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'
              }
            >
              {q >= 0 ? `+${q}` : q}
            </span>
          )
        },
      },
      {
        key: 'reason',
        label: 'Reason',
        render: (row) => (
          <span className="line-clamp-2 text-slate-600">{row.reason || '—'}</span>
        ),
      },
    ]
  }

  if (tab === MOVEMENT_TYPES.DAMAGED) {
    return [
      ...shared,
      { key: 'type', label: 'Type', render: typeBadge },
      {
        key: 'qty',
        label: 'Damaged qty',
        render: (row) => (
          <span className="font-semibold text-amber-700">
            −{Math.abs(Number(row.quantity || 0))}
          </span>
        ),
      },
      {
        key: 'by',
        label: 'Damaged by',
        render: (row) => <span className="text-slate-700">{row.damagedByName || '—'}</span>,
      },
      {
        key: 'where',
        label: 'Where damaged',
        render: (row) => (
          <span className="text-slate-700">{locationLabel(row.damagedLocation)}</span>
        ),
      },
      {
        key: 'reason',
        label: 'Reason',
        render: (row) => (
          <span className="line-clamp-2 text-slate-600">{row.reason || '—'}</span>
        ),
      },
    ]
  }

  if (tab === MOVEMENT_TYPES.EXPIRED) {
    return [
      ...shared,
      { key: 'type', label: 'Type', render: typeBadge },
      {
        key: 'qty',
        label: 'Expired qty',
        render: (row) => (
          <span className="font-semibold text-red-600">
            −{Math.abs(Number(row.quantity || 0))}
          </span>
        ),
      },
      {
        key: 'company',
        label: 'Company / Supplier',
        render: (row) => <span className="text-slate-700">{row.companyName || '—'}</span>,
      },
      { key: 'notes', label: 'Notes', render: notesCell },
    ]
  }

  if (tab === MOVEMENT_TYPES.OTHER) {
    return [
      ...shared,
      { key: 'type', label: 'Type', render: typeBadge },
      {
        key: 'qty',
        label: 'Qty',
        render: (row) => {
          const q = Number(row.quantity || 0)
          return (
            <span
              className={
                q >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'
              }
            >
              {q >= 0 ? `+${q}` : q}
            </span>
          )
        },
      },
      {
        key: 'reason',
        label: 'Reason',
        render: (row) => (
          <span className="line-clamp-2 text-slate-600">{row.reason || '—'}</span>
        ),
      },
    ]
  }

  return shared
}
