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
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { BRAND } from '@/lib/constants'
import { useCurrency } from '@/hooks/useCurrency'
import { finalPriceFromSelling } from '@/lib/pricing'
import {
  EMPTY_DASH,
  formatInventoryStock,
  money,
  PRODUCT_STATUS,
} from '@/lib/mapProduct'
import { displayItemCode } from '@/lib/formatDisplayId'

// "1.5 L – mint": values only (type names are implied by the column), en dash between.
function variantCapsuleLabel(sku) {
  const parts = Array.isArray(sku.parts) ? sku.parts : []
  const values = parts
    .map((part) => String(part.valueName || part.value_name || '').trim())
    .filter(Boolean)
  if (values.length) return values.join(' \u2013 ')
  return sku.variantLabel || 'Variant'
}

function promotionLabel(sku) {
  const offer = Number(sku.offerPercent || 0)
  const discount = Number(sku.discountPercent || 0)
  if (sku.offerName || offer > 0) {
    const name = sku.offerName || 'Offer'
    const showPercent = offer > 0 && !name.includes('%')
    return showPercent ? `${name} \u00b7 ${money(offer)}%` : name
  }
  if (discount > 0) return `${money(discount)}% off`
  return 'No Discount'
}

const STATUS_PILL = {
  in: 'border-transparent bg-emerald-50 text-emerald-700',
  low: 'border-transparent bg-amber-50 text-amber-700',
  out: 'border-transparent bg-rose-50 text-rose-600',
}

const STOCK_NUMBER = {
  in: 'text-emerald-600',
  low: 'text-amber-600',
  out: 'text-rose-600',
}

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
      <DialogContent className="flex max-h-[90vh] w-[96vw] max-w-[96vw] flex-col sm:max-w-6xl md:max-w-6xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8 text-left">
            <ProductImageCell src={parentImage} name={titleName} />
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-bold text-slate-900">
                {titleName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Variants — stock and pricing per SKU
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
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
            <div className="overflow-hidden rounded-xl border border-border">
              <Table className="min-w-[900px] text-sm">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="px-3 py-3">Variant</TableHead>
                    <TableHead className="px-3 py-3">SKU</TableHead>
                    <TableHead className="px-3 py-3">Barcode</TableHead>
                    <TableHead className="px-3 py-3">Purchase</TableHead>
                    <TableHead className="px-3 py-3">Selling</TableHead>
                    <TableHead className="px-3 py-3">Discount / Offer</TableHead>
                    <TableHead className="px-3 py-3">Final price</TableHead>
                    <TableHead className="px-3 py-3">Stock</TableHead>
                    <TableHead className="px-3 py-3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((sku) => {
                    const disc =
                      Number(sku.discountPercent) || Number(sku.offerPercent) || 0
                    // Child detail has no SQL finalPrice, so compute it here
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
                    const hasPromo =
                      disc > 0 || sku.offerName || Number(sku.offerPercent) > 0

                    return (
                      <TableRow key={sku.id} className={inactive ? 'opacity-60' : ''}>
                        <TableCell className="px-3 py-3">
                          <span className="inline-block whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-900">
                            {variantCapsuleLabel(sku)}
                          </span>
                          {inactive ? (
                            <p className="mt-1 text-[11px] font-medium text-slate-400">
                              Closed
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="px-3 py-3 font-mono text-xs whitespace-nowrap text-slate-500">
                          {displayItemCode(sku)}
                        </TableCell>
                        <TableCell className="px-3 py-3 font-mono text-xs whitespace-nowrap text-slate-700">
                          {sku.barcode || EMPTY_DASH}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-800">
                          {formatPlain(sku.purchasePrice)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-800">
                          {formatPlain(sku.sellingPrice)}
                        </TableCell>
                        <TableCell
                          className={`px-3 py-3 ${hasPromo ? 'text-slate-800' : 'text-slate-500'}`}
                        >
                          {promotionLabel(sku)}
                        </TableCell>
                        <TableCell className="px-3 py-3 font-semibold text-slate-900">
                          {formatPlain(finalPrice)}
                        </TableCell>
                        <TableCell
                          className={`px-3 py-3 font-bold ${STOCK_NUMBER[stock.key]}`}
                        >
                          {stock.quantity}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap ${STATUS_PILL[stock.key]}`}
                          >
                            {stock.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer px-8 font-semibold"
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