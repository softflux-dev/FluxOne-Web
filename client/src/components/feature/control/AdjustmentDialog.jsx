import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/select'
import { FieldError } from '@/components/shared/FieldError'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { BRAND } from '@/lib/constants'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { DAMAGED_LOCATIONS, MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { deriveVariantAxes } from '@/lib/variantAxes'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import {
  fetchControlProductDetail,
  fetchControlProductOptions,
  fetchControlSuppliers,
  fetchEmployeeLookups,
} from '@/hooks/useInventoryControl'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const OPERATIONS = {
  IN: 'in',
  OUT: 'out',
}

const OUT_REASONS = {
  DAMAGED: MOVEMENT_TYPES.DAMAGED,
  EXPIRED: MOVEMENT_TYPES.EXPIRED,
  OTHER: MOVEMENT_TYPES.OTHER,
}

// Add Adjustment — catalog cascade, operation in/out, conditional stock-out reasons.
export function AdjustmentDialog({
  open,
  onOpenChange,
  catalog,
  loading = false,
  onSubmit,
}) {
  const parents = catalog?.parents || []
  const childrenByParent = catalog?.childrenByParent

  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [products, setProducts] = useState([])
  const [variantSkus, setVariantSkus] = useState([])
  const [productId, setProductId] = useState('')
  const [variantTypeId, setVariantTypeId] = useState('')
  const [variantValueId, setVariantValueId] = useState('')
  const [operation, setOperation] = useState(OPERATIONS.IN)
  const [outReason, setOutReason] = useState(OUT_REASONS.DAMAGED)
  const [quantity, setQuantity] = useState('1')
  const [availableStock, setAvailableStock] = useState(null)
  const [notes, setNotes] = useState('')
  const [damagedByUserId, setDamagedByUserId] = useState('')
  const [damagedLocation, setDamagedLocation] = useState('warehouse')
  const [employees, setEmployees] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)
  const [saving, setSaving] = useState(false)
  const saveRef = useRef(null)

  const subs = useMemo(() => {
    if (!categoryId || !childrenByParent?.get) return []
    return childrenByParent.get(categoryId) || []
  }, [categoryId, childrenByParent])

  const selectedParent = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  )

  const variantAxes = useMemo(() => deriveVariantAxes(variantSkus), [variantSkus])
  const axisValues = useMemo(() => {
    const axis = variantAxes.find((t) => t.id === variantTypeId)
    return axis?.values || []
  }, [variantAxes, variantTypeId])

  const resolvedProductId = useMemo(() => {
    if (!productId) return ''
    if (selectedParent?.type !== PRODUCT_TYPES.VARIANT) return productId
    if (!variantSkus.length) return ''
    const match = variantSkus.find((sku) => {
      const parts = sku.parts || []
      const typeOk =
        !variantTypeId || parts.some((p) => (p.variantTypeId || p.typeId) === variantTypeId)
      const valueOk =
        !variantValueId || parts.some((p) => (p.variantValueId || p.valueId) === variantValueId)
      return typeOk && valueOk
    })
    return match?.id || variantSkus[0]?.id || ''
  }, [productId, selectedParent, variantSkus, variantTypeId, variantValueId])

  const formSnapshot = useMemo(
    () => ({
      categoryId,
      subcategoryId,
      productId,
      variantTypeId,
      variantValueId,
      operation,
      outReason,
      quantity,
      notes,
    }),
    [
      categoryId,
      subcategoryId,
      productId,
      variantTypeId,
      variantValueId,
      operation,
      outReason,
      quantity,
      notes,
    ],
  )

  useEffect(() => {
    if (!open) return
    resetErrors()
    setCategoryId('')
    setSubcategoryId('')
    setProductId('')
    setVariantTypeId('')
    setVariantValueId('')
    setOperation(OPERATIONS.IN)
    setOutReason(OUT_REASONS.DAMAGED)
    setQuantity('1')
    setNotes('')
    setDamagedByUserId('')
    setDamagedLocation('warehouse')
    setSupplierId('')
    setExpiresAt('')
    setAvailableStock(null)
    captureBaseline(formSnapshot)
    void fetchEmployeeLookups().then((res) => {
      if (res.success) setEmployees(res.items)
    })
    void fetchControlSuppliers().then((res) => {
      if (res.success) setSuppliers(res.items)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    void fetchControlProductOptions({
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      limit: 80,
    }).then((res) => {
      if (cancelled) return
      setProducts(res.success ? res.items : [])
    })
    return () => {
      cancelled = true
    }
  }, [open, categoryId, subcategoryId])

  useEffect(() => {
    if (!open || !productId) {
      setVariantSkus([])
      setAvailableStock(null)
      return undefined
    }
    let cancelled = false
    void fetchControlProductDetail(productId).then((res) => {
      if (cancelled) return
      const data = res.success ? res.data : null
      if (data?.type === PRODUCT_TYPES.VARIANT) {
        setVariantSkus(Array.isArray(data.variants) ? data.variants : [])
        setAvailableStock(null)
      } else {
        setVariantSkus([])
        setAvailableStock(data?.quantity ?? 0)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, productId])

  useEffect(() => {
    if (!resolvedProductId || selectedParent?.type !== PRODUCT_TYPES.VARIANT) return undefined
    let cancelled = false
    void fetchControlProductDetail(resolvedProductId).then((res) => {
      if (cancelled || !res.success) return
      setAvailableStock(res.data?.quantity ?? 0)
    })
    return () => {
      cancelled = true
    }
  }, [resolvedProductId, selectedParent?.type])

  function validate() {
    const errors = {}
    if (!resolvedProductId) errors.productId = 'Select a product (and variant if needed)'
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) errors.quantity = 'Enter a positive quantity'
    if (!notes.trim() || notes.trim().length < 3) {
      errors.notes = 'Notes are required (min 3 characters)'
    }
    if (operation === OPERATIONS.OUT && outReason === OUT_REASONS.DAMAGED) {
      if (!damagedByUserId) errors.damagedByUserId = 'Select who reported the damage'
      if (!damagedLocation) errors.damagedLocation = 'Select where damage occurred'
    }
    if (operation === OPERATIONS.OUT && outReason === OUT_REASONS.EXPIRED) {
      if (!expiresAt) errors.expiresAt = 'Expiry date is required'
    }
    return errors
  }

  async function handleSave() {
    if (saveRef.current || loading) return
    const errors = validate()
    if (Object.keys(errors).length) {
      applyErrors(errors, {}, Object.keys(errors))
      return
    }
    resetErrors()
    saveRef.current = true
    setSaving(true)
    const qty = Number(quantity)
    const reasonText = notes.trim()
    let movementType = MOVEMENT_TYPES.ADJUSTMENT
    let body = {
      productId: resolvedProductId,
      quantity: qty,
      reason: reasonText,
    }
    try {
      if (operation === OPERATIONS.IN) {
        // Stock-in path handled by parent via stock-in API.
        const result = await onSubmit?.({
          kind: 'stock_in',
          supplierId: supplierId || undefined,
          lines: [
            {
              productId: resolvedProductId,
              quantity: qty,
              reason: reasonText,
            },
          ],
        })
        if (result?.success) onOpenChange?.(false)
        else setFormError(result?.error || 'Save failed')
        return
      }
      movementType = outReason
      if (outReason === OUT_REASONS.DAMAGED) {
        body = {
          ...body,
          damagedByUserId,
          damagedLocation,
          reason: reasonText,
        }
      } else if (outReason === OUT_REASONS.EXPIRED) {
        body = {
          ...body,
          expiresAt,
          supplierId: supplierId || undefined,
          reason: reasonText,
        }
      } else if (outReason === OUT_REASONS.OTHER) {
        body = {
          ...body,
          quantity: -Math.abs(qty),
          reason: reasonText,
        }
      }
      const result = await onSubmit?.({ kind: 'movement', movementType, body })
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Save failed')
    } catch (err) {
      setFormError(err?.message || 'Save failed')
    } finally {
      saveRef.current = false
      setSaving(false)
    }
  }
  const showVariantFields = selectedParent?.type === PRODUCT_TYPES.VARIANT

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty(formSnapshot)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add adjustment</DialogTitle>
          <DialogDescription>
            Choose product details, operation, and required notes. Stock-out uses damaged, expired,
            or other reasons.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <NativeSelect
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setSubcategoryId('')
                setProductId('')
              }}
            >
              <option value="">All</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Sub category</Label>
            <NativeSelect
              value={subcategoryId}
              disabled={!categoryId}
              onChange={(e) => {
                setSubcategoryId(e.target.value)
                setProductId('')
              }}
            >
              <option value="">All</option>
              {subs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Product</Label>
            <NativeSelect
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                setVariantTypeId('')
                setVariantValueId('')
                clearField('productId')
              }}
              aria-invalid={Boolean(fieldErrors.productId)}
              className={fieldErrorClass(fieldErrors.productId)}
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError message={fieldErrors.productId} />
          </div>

          {showVariantFields ? (
            <>
              <div className="space-y-1.5">
                <Label>Variant type</Label>
                <NativeSelect
                  value={variantTypeId}
                  onChange={(e) => {
                    setVariantTypeId(e.target.value)
                    setVariantValueId('')
                  }}
                >
                  <option value="">Select type</option>
                  {variantAxes.map((axis) => (
                    <option key={axis.id} value={axis.id}>
                      {axis.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Variant value</Label>
                <NativeSelect
                  value={variantValueId}
                  disabled={!variantTypeId}
                  onChange={(e) => setVariantValueId(e.target.value)}
                >
                  <option value="">Select value</option>
                  {axisValues.map((val) => (
                    <option key={val.id} value={val.id}>
                      {val.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label>Operation</Label>
            <NativeSelect value={operation} onChange={(e) => setOperation(e.target.value)}>
              <option value={OPERATIONS.IN}>Stock In</option>
              <option value={OPERATIONS.OUT}>Stock Out</option>
            </NativeSelect>
          </div>

          {operation === OPERATIONS.OUT ? (
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <NativeSelect value={outReason} onChange={(e) => setOutReason(e.target.value)}>
                <option value={OUT_REASONS.DAMAGED}>Damaged</option>
                <option value={OUT_REASONS.EXPIRED}>Expired</option>
                <option value={OUT_REASONS.OTHER}>Others</option>
              </NativeSelect>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <WholeNumberInput
              min={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value)
                clearField('quantity')
              }}
              aria-invalid={Boolean(fieldErrors.quantity)}
              className={fieldErrorClass(fieldErrors.quantity)}
            />
            <FieldError message={fieldErrors.quantity} />
          </div>

          {availableStock != null ? (
            <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Current available stock:{' '}
              <span className="font-semibold text-slate-900">{availableStock}</span>
            </div>
          ) : null}
        </div>

        {operation === OPERATIONS.OUT && outReason === OUT_REASONS.DAMAGED ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Damaged by</Label>
              <NativeSelect
                value={damagedByUserId}
                onChange={(e) => setDamagedByUserId(e.target.value)}
                aria-invalid={Boolean(fieldErrors.damagedByUserId)}
                className={fieldErrorClass(fieldErrors.damagedByUserId)}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.userId} value={emp.userId}>
                    {emp.fullName || emp.email}
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={fieldErrors.damagedByUserId} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Where damaged</Label>
              <NativeSelect
                value={damagedLocation}
                onChange={(e) => setDamagedLocation(e.target.value)}
              >
                {DAMAGED_LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        ) : null}

        {operation === OPERATIONS.OUT && outReason === OUT_REASONS.EXPIRED ? (
          // Manual expired is the supported flow (no expiry capture on stock-in).
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Expired date</Label>
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <FieldError message={fieldErrors.expiresAt} />
            </div>
            <div className="space-y-1.5">
              <Label>Company / Supplier</Label>
              <NativeSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Optional</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName || s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={notes}
            placeholder="Why are you recording this adjustment?"
            onChange={(e) => {
              setNotes(e.target.value)
              clearField('notes')
            }}
            aria-invalid={Boolean(fieldErrors.notes)}
            className={fieldErrorClass(fieldErrors.notes)}
          />
          <FieldError message={fieldErrors.notes} />
        </div>

        <DialogFooter>
          <DialogCancelButton disabled={loading || saving} />
          <Button
            type="button"
            className="text-white"
            style={{ background: BRAND.purple }}
            disabled={loading || saving}
            onClick={handleSave}
          >
            {loading || saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AdjustmentDialog
