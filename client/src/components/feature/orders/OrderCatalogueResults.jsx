import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { money } from '@/lib/mapProduct'
import { orderableDisplayName, prevPurchasePrice } from '@/lib/orderGenerate'
import { cn } from '@/lib/utils'

// Child: matching catalogue rows for one company block
export function OrderCatalogueResults({
  items = [],
  addedProductIds = new Set(),
  loading = false,
  onAdd,
  className,
}) {
  if (loading) {
    return (
      <p className={cn('text-sm text-slate-500', className)}>Loading catalogue…</p>
    )
  }

  if (!items.length) {
    return (
      <p className={cn('rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500', className)}>
        No matching items. Adjust filters or clear them to browse the catalogue.
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-slate-500">
        {items.length} matching item{items.length === 1 ? '' : 's'} from the catalogue
      </p>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map((product) => {
          const added = addedProductIds.has(product.id)
          const price = prevPurchasePrice(product)
          return (
            <li
              key={product.id}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {orderableDisplayName(product)}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {product.itemCode ? `${product.itemCode} · ` : ''}
                  {product.parentId ? 'Variant product' : 'Normal product'}
                  {price > 0 ? ` · Prev. price Rs ${money(price)}` : ''}
                </p>
              </div>
              {added ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled
                  className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <Check className="size-3.5" />
                  Added
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 cursor-pointer border-purple-300 text-purple-800 hover:bg-purple-50"
                  onClick={() => onAdd?.(product)}
                >
                  <Plus className="size-3.5" />
                  Add
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default OrderCatalogueResults
