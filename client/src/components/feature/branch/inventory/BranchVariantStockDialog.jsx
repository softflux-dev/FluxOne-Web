import { useCallback, useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import {
  Dialog,
  DialogCancelButton,
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
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { displayItemCode } from '@/lib/formatDisplayId'
import { mapProduct, PRODUCT_STATUS } from '@/lib/mapProduct'
import { formatShelfQuantity, getShelfStockStatus } from '@/lib/shelfStockStatus'
import { parentVariantTitle, variantSkuLabel } from '@/lib/variantDisplay'

/** Build stock-request target from a child SKU under a parent product. */
export function toVariantRequestTarget(parent, sku) {
  if (!sku?.id) return null
  const parentName = parent?.name || 'Product'
  return {
    id: sku.id,
    name: parentVariantTitle(parentName, sku),
    quantity: sku.quantity,
    scale: sku.scale || parent?.scale || 'pcs',
    reorderPoint: sku.reorderPoint ?? parent?.reorderPoint,
    sellingPrice: sku.sellingPrice,
    finalPrice: sku.finalPrice,
    itemCode: sku.itemCode,
    variantLabel: variantSkuLabel(sku),
    parentId: parent?.id || null,
    parentName,
  }
}

async function fetchProductWithVariants(productId) {
  const res = await apiClient.get(endpoints.products.detail(productId))
  if (!res.success) return { success: false, error: res.error || 'Failed to load variants' }
  return { success: true, data: mapProduct(res.data) }
}

/**
 * BM shelf: list each variant SKU with stock + per-row Stock Request.
 */
export function BranchVariantStockDialog({
  open,
  product = null,
  onOpenChange,
  onStockRequest,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    if (!open || !product?.id) return
    setLoading(true)
    setError(null)
    setDetail(null)
    const result = await fetchProductWithVariants(product.id)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setDetail(result.data)
  }, [open, product?.id])

  useEffect(() => {
    void load()
  }, [load])

  const variants = Array.isArray(detail?.variants) ? detail.variants : []
  const parentImage = detail?.imageUrl || product?.imageUrl || null
  const titleName = detail?.name || product?.name || 'Product'
  const totalUnits = variants.reduce((sum, sku) => sum + (Number(sku.quantity) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[96vw] max-w-[96vw] flex-col sm:max-w-3xl md:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8 text-left">
            <ProductImageCell src={parentImage} name={titleName} />
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-bold text-slate-900">
                {titleName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {loading
                  ? 'Loading variants…'
                  : `${totalUnits.toLocaleString()} units · ${variants.length} variant${variants.length === 1 ? '' : 's'}`}
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
              <Table className="min-w-[36rem] text-sm">
                <TableHeader>
                  <TableRow className="text-xs uppercase text-slate-500">
                    <TableHead className="px-3 py-3">Image</TableHead>
                    <TableHead className="px-3 py-3">Variant</TableHead>
                    <TableHead className="px-3 py-3">SKU</TableHead>
                    <TableHead className="px-3 py-3">Stock</TableHead>
                    <TableHead className="px-3 py-3">Status</TableHead>
                    <TableHead className="px-3 py-3">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((sku) => {
                    const label = variantSkuLabel(sku)
                    const stock = formatShelfQuantity(sku.quantity, sku.scale || detail?.scale)
                    const status = getShelfStockStatus(sku.quantity, sku.reorderPoint)
                    const inactive = sku.status === PRODUCT_STATUS.INACTIVE

                    return (
                      <TableRow key={sku.id} className={inactive ? 'opacity-60' : ''}>
                        <TableCell className="px-3 py-3">
                          <ProductImageCell src={sku.imageUrl || parentImage} name={label} />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <span className="inline-block whitespace-nowrap rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900">
                            {label}
                          </span>
                          {inactive ? (
                            <p className="mt-1 text-[11px] font-medium text-slate-400">Inactive</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="px-3 py-3 font-mono text-xs whitespace-nowrap text-slate-500">
                          {displayItemCode(sku)}
                        </TableCell>
                        <TableCell className="px-3 py-3 font-mono font-bold whitespace-nowrap text-slate-900">
                          {stock.display}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge variant={status.variant} className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={inactive}
                            className="h-8 text-xs"
                            onClick={() =>
                              onStockRequest?.(toVariantRequestTarget(detail || product, sku))
                            }
                          >
                            <Send className="size-3" />
                            Stock Request
                          </Button>
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
          <DialogCancelButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BranchVariantStockDialog
