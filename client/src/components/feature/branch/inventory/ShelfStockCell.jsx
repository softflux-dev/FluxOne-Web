import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { formatShelfQuantity } from '@/lib/shelfStockStatus'
import { ViewVariantsButton } from '@/components/feature/branch/inventory/ViewVariantsButton'

/**
 * Shelf In Stock cell:
 * - Variant parent → View variants (no misleading 0 / Empty)
 * - Single / Bundle → live quantity
 */
export function ShelfStockCell({ product, onViewVariants, className }) {
  if (product?.type === PRODUCT_TYPES.VARIANT) {
    return (
      <ViewVariantsButton
        productName={product.name}
        onClick={() => onViewVariants?.(product)}
        className={className}
      />
    )
  }

  const stock = formatShelfQuantity(product?.quantity)
  return (
    <span className={`font-mono font-bold whitespace-nowrap text-slate-900 ${className || ''}`.trim()}>
      {stock.qty.toLocaleString()}{' '}
      <span className="text-[10px] font-normal text-slate-400">{stock.unit}</span>
    </span>
  )
}

export function isVariantParent(product) {
  return product?.type === PRODUCT_TYPES.VARIANT
}

export default ShelfStockCell
