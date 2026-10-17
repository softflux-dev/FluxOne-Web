import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { normalizeDefaultTaxPercent } from '@/lib/imTaxProfitPolicy'
import { cn } from '@/lib/utils'

/**
 * // as per company code policy — IM may only apply or exempt Admin default tax;
 * // tax % itself is configured on Admin Tax & Profit page.
 */
export function ApplyDefaultTaxField({
  id = 'apply-default-tax',
  checked = false,
  onCheckedChange,
  defaultTaxPercent = 0,
  disabled = false,
  className,
}) {
  const rate = normalizeDefaultTaxPercent(defaultTaxPercent)

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-start gap-2.5">
        <Checkbox
          id={id}
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="mt-0.5"
        />
        <div className="min-w-0 space-y-1">
          <Label htmlFor={id} className="cursor-pointer text-sm font-medium leading-none">
            Apply Default Tax
          </Label>
          <p className="text-[11px] leading-snug text-slate-400">
            {checked
              ? rate > 0
                ? `Admin default tax (${rate}%) will be applied to this product’s pricing.`
                : 'Admin default tax is 0% — product will be saved without tax.'
              : 'Tax exempt — Admin default tax will not be applied.'}
          </p>
        </div>
      </div>
    </div>
  )
}
