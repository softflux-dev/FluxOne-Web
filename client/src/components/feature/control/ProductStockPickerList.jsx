import { Package } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { displayItemCode } from '@/lib/formatDisplayId'
import { money, PRODUCT_TYPES } from '@/lib/mapProduct'
import { cn } from '@/lib/utils'

// Scrollable checkbox list — selected rows expose qty + purchase/selling overrides.
export function ProductStockPickerList({
  products = [],
  selected = {},
  onToggle,
  onLineChange,
  loading = false,
  className,
}) {
  const list = Array.isArray(products) ? products : []

  if (loading) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-slate-500">
        Loading products…
      </p>
    )
  }

  if (!list.length) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-slate-500">
        No products match these filters.
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-white">
        {list.map((product) => {
          const isParentVariant = product.type === PRODUCT_TYPES.VARIANT
          if (isParentVariant) return null
          const line = selected[product.id]
          const checked = Boolean(line)
          const meta = [product.scale, displayItemCode(product)].filter(Boolean).join(' · ')

          return (
            <div
              key={product.id}
              className={cn(
                'flex flex-col gap-2 border-b border-border px-3 py-2.5 last:border-b-0 sm:flex-row sm:items-center',
                checked ? 'bg-purple-50/40' : 'hover:bg-slate-50/80',
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Checkbox
                  checked={checked}
                  onChange={() => onToggle?.(product)}
                  aria-label={`Select ${product.productName}`}
                />
                <ProductImageCell src={product.imageUrl} name={product.productName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{product.productName}</p>
                  {/* <p className="truncate text-xs text-slate-500">{meta}</p> */}
                </div>
              </div>

              {checked ? (
                <div className="grid w-full min-w-0 max-w-full grid-cols-3 gap-2 sm:max-w-sm">
                  <div className="min-w-0 space-y-0.5">
                    <Label className="text-[10px] text-slate-400">Purchase</Label>
                    <WholeNumberInput
                      value={line.purchasePrice ?? ''}
                      placeholder={money(product.purchasePrice)}
                      className="w-24 h-8 max-w-full"
                      onChange={(e) =>
                        onLineChange?.(product.id, { purchasePrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <Label className="text-[10px] text-slate-400">Selling</Label>
                    <WholeNumberInput
                      value={line.sellingPrice ?? ''}
                      placeholder={money(product.sellingPrice)}
                      className="w-16 h-8 max-w-full"
                      onChange={(e) =>
                        onLineChange?.(product.id, { sellingPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <Label className="text-[10px] text-slate-400">Qty</Label>
                    <WholeNumberInput
                      min={1}
                      value={line.quantity ?? '1'}
                      className="w-16 h-8 max-w-full"
                      onChange={(e) => onLineChange?.(product.id, { quantity: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Package className="size-3.5 shrink-0" />
        Choose individual items, bundles, or variant SKUs. Previous prices show as placeholders.
      </p>
    </div>
  )
}

export default ProductStockPickerList
