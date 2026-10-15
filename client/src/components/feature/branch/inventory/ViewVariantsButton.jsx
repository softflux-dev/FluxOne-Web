import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

/** Parent variant row CTA — opens SKU stock popup (IM-style View). */
export function ViewVariantsButton({
  productName = 'product',
  variantCount = null,
  onClick,
  className,
  size = 'sm',
}) {
  const countLabel =
    variantCount != null && Number(variantCount) > 0
      ? `View (${Number(variantCount)} variants)`
      : 'View variants'

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onClick}
      aria-label={`View variants for ${productName}`}
      className={cn('h-8 cursor-pointer text-xs font-semibold', className)}
      style={{ color: BRAND.purple, borderColor: BRAND.purple }}
    >
      <Eye className="size-3.5" />
      {countLabel}
    </Button>
  )
}

export default ViewVariantsButton
