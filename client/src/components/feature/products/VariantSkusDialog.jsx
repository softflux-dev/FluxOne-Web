import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { BRAND } from '@/lib/constants'
import { useCurrency } from '@/hooks/useCurrency'
import { finalPriceFromSelling } from '@/lib/pricing'
import {
  formatInventoryStock,
  formatVariantParts,
  money,
  PRODUCT_STATUS,
} from '@/lib/mapProduct'
import { displayItemCode } from '@/lib/formatDisplayId'

export function VariantSkusDialog({
  open,
  onOpenChange,
  product = null,
  fetchProductDetail,
}) {
  const { formatPlain } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!open || !product?.id) return
      setLoading(true)
      setError(null)
      setDetail(null)
      try {
        const result = await fetchProductDetail?.(product.id)
        if (cancelled) return
        if (!result?.success) {
          setError(result?.error || 'Failed to load variants')
          return
        }
        setDetail(result.data || null)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load variants')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, product?.id, fetchProductDetail])

  const variants = Array.isArray(detail?.variants) ? detail.variants : []
  // Parent tax applies to child SKUs for shelf final display
  const taxPercent = Number(detail?.taxPercent ?? product?.taxPercent ?? 0)
  const parentImage = detail?.imageUrl || product?.imageUrl || null
  const titleName = detail?.name || product?.name || 'Product'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-base font-bold lowercase tracking-wide">
            variants
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            {titleName} — stock and pricing per SKU
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading variants…
            </div>
          ) : error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          ) : variants.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No variant SKUs found for this product.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {variants.map((sku) => {
                const attrs =
                  formatVariantParts(sku.parts) ||
                  sku.variantLabel ||
                  'Variant'
                const disc =
                  Number(sku.discountPercent) || Number(sku.offerPercent) || 0
                // Always compute — child detail has no SQL finalPrice; mapProduct
                // falls back to sellingPrice and would ignore discount
                const finalPrice = finalPriceFromSelling(
                  sku.sellingPrice,
                  disc,
                  taxPercent,
                )
                const stock = formatInventoryStock(
                  sku.quantity,
                  sku.reorderPoint,
                  sku.scale || detail?.scale || 'unit',
                )
                const inactive = sku.status === PRODUCT_STATUS.INACTIVE

                return (
                  <li
                    key={sku.id}
                    className={`flex items-start gap-3 py-3.5 ${inactive ? 'opacity-60' : ''}`}
                  >
                    <ProductImageCell src={parentImage} name={titleName} />
                    <div className="min-w-0 flex-1 space-y-1 text-xs leading-snug">
                      <p className="text-sm font-semibold text-slate-900">{attrs}</p>
                      <p className="font-mono text-[11px] text-slate-500">
                        SKU: {displayItemCode(sku)}
                        {sku.barcode ? (
                          <span className="text-slate-400"> · {sku.barcode}</span>
                        ) : null}
                      </p>
                      <p className="text-slate-600">
                        Purchase{' '}
                        <span className="font-medium text-slate-800">
                          {formatPlain(sku.purchasePrice)}
                        </span>
                        {sku.profitPercent > 0 ? (
                          <>
                            {' '}
                            · Profit margin{' '}
                            <span className="font-medium text-slate-800">
                              {money(sku.profitPercent)}%
                            </span>
                          </>
                        ) : null}
                      </p>
                      <p className="text-slate-600">
                        Discount{' '}
                        <span className="font-medium text-slate-800">
                          {disc > 0 ? `${money(disc)}%` : '—'}
                        </span>
                        {' · '}
                        <span className="font-bold text-slate-900">
                          Final {formatPlain(finalPrice)}
                        </span>
                        {' · '}
                        Quantity{' '}
                        <span className={`font-bold ${stock.className}`}>
                          {stock.quantity}
                        </span>
                        <span className={`ml-1 ${stock.className}`}>
                          ({stock.label})
                        </span>
                      </p>
                      {inactive ? (
                        <p className="text-[11px] font-medium text-slate-400">Closed</p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="pt-2 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer font-semibold"
            style={{ color: BRAND.purple, borderColor: BRAND.purple }}
            onClick={() => onOpenChange?.(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
