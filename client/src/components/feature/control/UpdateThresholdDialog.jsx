import { useEffect, useMemo, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/shared/FieldError'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { BRAND } from '@/lib/constants'
import { fetchControlProductDetail } from '@/hooks/useInventoryControl'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'

const FIELD_IDS = { threshold: 'upd-threshold-qty' }

// Inline Update Threshold — minimum stock qty for the row product/variant
export function UpdateThresholdDialog({
  open,
  onOpenChange,
  row = null,
  loading = false,
  onSubmit,
}) {
  const [threshold, setThreshold] = useState('0')
  const [currentStock, setCurrentStock] = useState(null)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const formSnapshot = useMemo(() => ({ threshold }), [threshold])

  useEffect(() => {
    if (!open || !row?.productId) return undefined
    let cancelled = false

    void (async () => {
      resetErrors()
      await Promise.resolve()
      if (cancelled) return
      setLoadingProduct(true)
      const res = await fetchControlProductDetail(row.productId)
      if (cancelled) return
      const product = res.success ? res.data : null
      const next =
        product?.reorderPoint != null ? String(product.reorderPoint) : '0'
      setThreshold(next)
      setCurrentStock(product?.quantity != null ? Number(product.quantity) : null)
      setLoadingProduct(false)
      captureBaseline({ threshold: next })
    })()

    return () => {
      cancelled = true
    }
  }, [open, row?.productId, resetErrors, captureBaseline])

  async function handleSave() {
    resetErrors()
    const value = Number(threshold)
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      applyErrors(
        { threshold: 'Enter a non-negative whole number' },
        FIELD_IDS,
        ['threshold'],
      )
      return
    }
    if (!row?.productId) {
      setFormError('Missing product')
      return
    }
    const result = await onSubmit?.({
      productId: row.productId,
      reorderPoint: value,
    })
    if (result && result.success === false) {
      setFormError(result.error || 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(formSnapshot)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update threshold</DialogTitle>
          <DialogDescription>
            Minimum stock for {row?.productName || 'this item'}
            {row?.variantLabel ? ` · ${row.variantLabel}` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          ) : null}
          {currentStock != null ? (
            <p className="text-sm text-slate-600">
              Current stock:{' '}
              <span className="font-semibold text-slate-900">{currentStock}</span>
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={FIELD_IDS.threshold}>Minimum threshold quantity</Label>
            <WholeNumberInput
              id={FIELD_IDS.threshold}
              value={threshold}
              min={0}
              disabled={loadingProduct}
              onChange={(e) => {
                clearField('threshold')
                setThreshold(e.target.value)
              }}
              className={fieldErrorClass(fieldErrors.threshold)}
            />
            <FieldError message={fieldErrors.threshold} />
          </div>
        </div>

        <DialogFooter>
          <DialogCancelButton />
          <Button
            type="button"
            variant="brand"
            style={{ background: BRAND.purple }}
            loading={loading}
            disabled={loadingProduct}
            onClick={() => void handleSave()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UpdateThresholdDialog
