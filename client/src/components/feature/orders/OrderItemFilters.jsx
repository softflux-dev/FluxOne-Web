import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { cn } from '@/lib/utils'

function FilterSelect({
  id,
  step,
  label,
  value,
  disabled = false,
  placeholder,
  options = [],
  onChange,
  className,
}) {
  return (
    <div className={cn('min-w-0 flex-1 space-y-1.5', className)}>
      <Label htmlFor={id} className="text-xs text-slate-500">
        {step ? `${step}. ${label}` : label}
      </Label>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

// Child: progressive catalogue filters (bundles excluded)
export function OrderItemFilters({
  filters,
  categoryOptions = [],
  subcategoryOptions = [],
  productOptions = [],
  variantTypeOptions = [],
  variantValueOptions = [],
  onChange,
  onClear,
  className,
}) {
  const {
    categoryId = '',
    subcategoryId = '',
    productType = '',
    productId = '',
    variantTypeId = '',
    variantValueId = '',
  } = filters || {}

  const isVariant = productType === PRODUCT_TYPES.VARIANT
  const hasSubs = subcategoryOptions.length > 0

  function patch(next) {
    onChange?.({ ...filters, ...next })
  }

  return (
    <div className={cn('space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">
          Search &amp; filter items — all filters optional · bundles excluded
        </p>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>
          Clear filters
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <FilterSelect
          id={`ord-cat-${categoryId || 'x'}`}
          step={1}
          label="Category"
          value={categoryId}
          placeholder="All categories"
          options={categoryOptions}
          onChange={(next) =>
            patch({
              categoryId: next,
              subcategoryId: '',
              productId: '',
              variantTypeId: '',
              variantValueId: '',
            })
          }
        />
        <FilterSelect
          id="ord-sub"
          step={2}
          label="Sub Category"
          value={subcategoryId}
          disabled={!categoryId || !hasSubs}
          placeholder={!categoryId ? 'Select category' : !hasSubs ? 'No sub-categories' : 'All'}
          options={subcategoryOptions}
          onChange={(next) =>
            patch({
              subcategoryId: next,
              productId: '',
              variantTypeId: '',
              variantValueId: '',
            })
          }
        />
        <FilterSelect
          id="ord-ptype"
          step={3}
          label="Product Type"
          value={productType}
          placeholder="Any type"
          options={[
            { id: PRODUCT_TYPES.SINGLE, label: 'Normal Product' },
            { id: PRODUCT_TYPES.VARIANT, label: 'Variant Product' },
          ]}
          onChange={(next) =>
            patch({
              productType: next,
              productId: '',
              variantTypeId: '',
              variantValueId: '',
            })
          }
        />
        <FilterSelect
          id="ord-product"
          step={4}
          label="Product"
          value={productId}
          placeholder="Any product"
          options={productOptions}
          onChange={(next) =>
            patch({
              productId: next,
              variantTypeId: '',
              variantValueId: '',
            })
          }
        />
        {isVariant ? (
          <>
            <FilterSelect
              id="ord-vtype"
              step={5}
              label="Variant Type"
              value={variantTypeId}
              disabled={!productId}
              placeholder="Any variant type"
              options={variantTypeOptions}
              onChange={(next) => patch({ variantTypeId: next, variantValueId: '' })}
            />
            <FilterSelect
              id="ord-vvalue"
              step={6}
              label="Variant Value"
              value={variantValueId}
              disabled={!variantTypeId}
              placeholder="Any value"
              options={variantValueOptions}
              onChange={(next) => patch({ variantValueId: next })}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

export default OrderItemFilters
