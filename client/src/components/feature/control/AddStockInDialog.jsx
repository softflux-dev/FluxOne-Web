import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { FieldError } from '@/components/shared/FieldError'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { BRAND } from '@/lib/constants'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { SCALE_OPTIONS } from '@/lib/mapProduct'
import {
  fetchControlProductOptions,
  fetchControlSuppliers,
} from '@/hooks/useInventoryControl'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: '1. Add items' },
  { id: 2, label: '2. Review' },
  { id: 3, label: '3. Confirm' },
]

const STOCKIN_FIELD_IDS = {
  productId: 'stockin-product',
  quantity: 'stockin-quantity',
  expiresAt: 'stockin-expires-at',
  lines: 'stockin-lines',
}

const STOCKIN_FIELD_ORDER = ['productId', 'quantity', 'expiresAt', 'lines']

function getTomorrowDateString() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function validateExpiryDate(expiryDateString) {
  if (!expiryDateString) return true

  const expiryDate = new Date(expiryDateString)
  if (Number.isNaN(expiryDate.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiryDate.setHours(0, 0, 0, 0)
  return expiryDate > today
}

function emptyDraft() {
  return {
    categoryId: '',
    subcategoryId: '',
    productId: '',
    scale: 'unit',
    quantity: '1',
    unitCost: '',
    sellingPrice: '',
    expiresAt: '',
  }
}

// Multi-item stock-in: one supplier, many product lines → single POST /stock-in.
// initialProduct — optional catalog row from Product table “Add Stock” (pre-selects item).
export function AddStockInDialog({
  open,
  onOpenChange,
  catalog,
  loading = false,
  onSubmit,
  initialProduct = null,
}) {
  const parents = catalog?.parents || []
  const childrenByParent = catalog?.childrenByParent

  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState(emptyDraft())
  const [lines, setLines] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()

  // Treat stock-in as dirty once the user added lines or picked a supplier
  const dirty = lines.length > 0 || Boolean(supplierId) || step > 1
  const [loadingOptions, setLoadingOptions] = useState(false)

  const subs = useMemo(() => {
    if (!draft.categoryId || !childrenByParent?.get) return []
    return childrenByParent.get(draft.categoryId) || []
  }, [draft.categoryId, childrenByParent])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === draft.productId) || null,
    [products, draft.productId],
  )

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId) || null,
    [suppliers, supplierId],
  )

  useEffect(() => {
    if (!open) return
    setStep(1)
    resetErrors()
    setLines([])
    setSupplierId('')
    setLoadingOptions(true)

    // Seed from catalog row when opened via Products → Add Stock
    if (initialProduct?.id) {
      setDraft({
        ...emptyDraft(),
        categoryId: initialProduct.categoryId || '',
        subcategoryId: initialProduct.subcategoryId || '',
        productId: initialProduct.id,
        scale: initialProduct.scale || 'unit',
        unitCost:
          initialProduct.purchasePrice != null && initialProduct.purchasePrice !== ''
            ? String(initialProduct.purchasePrice)
            : '',
      })
      setProducts([initialProduct])
    } else {
      setDraft(emptyDraft())
      setProducts([])
    }

    void (async () => {
      const supRes = await fetchControlSuppliers()
      if (supRes.success) setSuppliers(supRes.items)
      setLoadingOptions(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when dialog opens / seed changes
  }, [open, initialProduct?.id])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetchControlProductOptions({
      categoryId: draft.categoryId || undefined,
      subcategoryId: draft.subcategoryId || undefined,
      limit: 50,
    }).then((res) => {
      if (cancelled || !res.success) return
      const seedId = initialProduct?.id
      const merged =
        seedId && !res.items.some((p) => p.id === seedId) && initialProduct
          ? [initialProduct, ...res.items]
          : res.items
      setProducts(merged)
      setDraft((prev) => {
        if (merged.some((p) => p.id === prev.productId)) return prev
        if (seedId && merged.some((p) => p.id === seedId)) {
          return { ...prev, productId: seedId }
        }
        return { ...prev, productId: '' }
      })
    })
    return () => {
      cancelled = true
    }
  }, [open, draft.categoryId, draft.subcategoryId, initialProduct])

  function patchDraft(field, value) {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'categoryId') {
        next.subcategoryId = ''
        next.productId = ''
      }
      if (field === 'subcategoryId') next.productId = ''
      return next
    })
    if (field === 'productId') clearField('productId')
    if (field === 'quantity' || field === 'scale') clearField('quantity')
    if (field === 'expiresAt') clearField('expiresAt')
  }

  function resetDraftAfterAdd() {
    setDraft((prev) => ({
      ...emptyDraft(),
      categoryId: prev.categoryId,
      subcategoryId: prev.subcategoryId,
    }))
  }

  function addLineToCart() {
    const errors = {}
    if (!draft.productId) errors.productId = 'Select a product to add'
    if (!draft.scale || !(Number(draft.quantity) > 0)) {
      errors.quantity = 'Enter a valid scale and positive quantity'
    }
    if (draft.expiresAt && !validateExpiryDate(draft.expiresAt)) {
      errors.expiresAt = 'Expiry must be a future date'
    }
    if (
      draft.productId &&
      lines.some((row) => row.productId === draft.productId)
    ) {
      errors.productId =
        'This product is already in the list — remove it first or pick another item'
    }
    if (Object.keys(errors).length) {
      applyErrors(errors, STOCKIN_FIELD_IDS, STOCKIN_FIELD_ORDER)
      return
    }
    resetErrors()

    const product = selectedProduct || products.find((p) => p.id === draft.productId)
    clearField('lines')
    setLines((prev) => [
      ...prev,
      {
        productId: draft.productId,
        productName: product?.name || 'Item',
        itemCode: product?.itemCode || '',
        scale: draft.scale,
        quantity: Number(draft.quantity),
        unitCost:
          draft.unitCost === '' || draft.unitCost == null
            ? undefined
            : Number(draft.unitCost),
        sellingPrice:
          draft.sellingPrice === '' || draft.sellingPrice == null
            ? undefined
            : Number(draft.sellingPrice),
        expiresAt: draft.expiresAt || undefined,
      },
    ])
    resetDraftAfterAdd()
  }

  function removeLine(productId) {
    setLines((prev) => prev.filter((row) => row.productId !== productId))
    clearField('lines')
  }

  function goNext() {
    if (step === 1) {
      if (!lines.length) {
        applyErrors(
          { lines: 'Add at least one item before continuing' },
          STOCKIN_FIELD_IDS,
          STOCKIN_FIELD_ORDER,
        )
        return
      }
      resetErrors()
      setStep(2)
      return
    }

    if (step === 2) {
      setStep(3)
    }
  }

  function goBack() {
    resetErrors()
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSave() {
    if (!lines.length) {
      applyErrors({ lines: 'Add at least one item' }, STOCKIN_FIELD_IDS, STOCKIN_FIELD_ORDER)
      setStep(1)
      return
    }

    for (const row of lines) {
      if (row.expiresAt && !validateExpiryDate(row.expiresAt)) {
        setFormError(`Invalid expiry date for ${row.productName}`)
        setStep(1)
        return
      }
    }
    resetErrors()

    const payload = {
      supplierId: supplierId || undefined,
      lines: lines.map((row) => ({
        productId: row.productId,
        scale: row.scale,
        quantity: row.quantity,
        unitCost: row.unitCost,
        sellingPrice: row.sellingPrice,
        expiresAt: row.expiresAt,
      })),
    }

    try {
      const result = await onSubmit?.(payload)
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Failed to save stock-in. Please try again.')
    } catch (err) {
      setFormError(err?.message || 'Failed to save stock-in. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={dirty}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Stock</DialogTitle>
          <DialogDescription>
            Add one or more items from the same supplier in a single stock-in.
          </DialogDescription>
        </DialogHeader>

        <nav className="flex gap-1 border-b border-border pb-0" aria-label="Stock-in steps">
          {STEPS.map((s) => {
            const done = step > s.id
            const active = step === s.id
            return (
              <div
                key={s.id}
                className={cn(
                  'flex-1 border-b-2 pb-2 text-center text-sm font-semibold transition-colors',
                  active
                    ? 'border-transparent text-[#8E238F]'
                    : done
                      ? 'border-transparent text-emerald-600'
                      : 'border-transparent text-slate-400',
                )}
                style={
                  active
                    ? { borderBottomColor: BRAND.purple, color: BRAND.purple }
                    : done
                      ? { borderBottomColor: '#16a34a' }
                      : undefined
                }
              >
                {s.label}
              </div>
            )
          })}
        </nav>

        {formError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Company / Supplier</Label>
              <NativeSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier (optional)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName || s.name || s.id}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-[11px] text-slate-500">
                All items in this stock-in use the same vendor.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <NativeSelect
                  value={draft.categoryId}
                  onChange={(e) => patchDraft('categoryId', e.target.value)}
                >
                  <option value="">All categories</option>
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
                  value={draft.subcategoryId}
                  disabled={!draft.categoryId}
                  onChange={(e) => patchDraft('subcategoryId', e.target.value)}
                >
                  <option value="">All</option>
                  {subs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stockin-product">Item</Label>
              <NativeSelect
                id="stockin-product"
                value={draft.productId}
                onChange={(e) => {
                  const id = e.target.value
                  const p = products.find((x) => x.id === id)
                  setDraft((prev) => ({
                    ...prev,
                    productId: id,
                    scale: p?.scale || prev.scale || 'unit',
                    unitCost:
                      p?.purchasePrice != null && prev.unitCost === ''
                        ? String(p.purchasePrice)
                        : prev.unitCost,
                  }))
                  clearField('productId')
                }}
                aria-invalid={Boolean(fieldErrors.productId)}
                className={fieldErrorClass(fieldErrors.productId)}
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={lines.some((l) => l.productId === p.id)}>
                    {p.name}
                    {p.scale ? ` (${p.scale})` : ''}
                    {lines.some((l) => l.productId === p.id) ? ' — added' : ''}
                  </option>
                ))}
              </NativeSelect>
              {!products.length && !loadingOptions ? (
                <p className="text-xs text-amber-700">No products match these filters.</p>
              ) : null}
              <FieldError message={fieldErrors.productId} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Scale</Label>
                <NativeSelect
                  value={draft.scale}
                  onChange={(e) => patchDraft('scale', e.target.value)}
                >
                  {SCALE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stockin-quantity">Quantity</Label>
                <WholeNumberInput
                  id="stockin-quantity"
                  min={1}
                  value={draft.quantity}
                  onChange={(e) => patchDraft('quantity', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.quantity)}
                  className={fieldErrorClass(fieldErrors.quantity)}
                />
                <FieldError message={fieldErrors.quantity} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling price (optional)</Label>
                <WholeNumberInput
                  min={0}
                  value={draft.sellingPrice}
                  onChange={(e) => patchDraft('sellingPrice', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit cost (optional)</Label>
                <WholeNumberInput
                  min={0}
                  value={draft.unitCost}
                  onChange={(e) => patchDraft('unitCost', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stockin-expires-at">Expiry (optional)</Label>
                <Input
                  id="stockin-expires-at"
                  type="date"
                  value={draft.expiresAt}
                  min={getTomorrowDateString()}
                  onChange={(e) => patchDraft('expiresAt', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.expiresAt)}
                  className={fieldErrorClass(fieldErrors.expiresAt)}
                />
                <FieldError message={fieldErrors.expiresAt} />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer"
              style={{ color: BRAND.purple, borderColor: BRAND.purple }}
              onClick={addLineToCart}
            >
              <Plus className="size-4" />
              Add item to list
            </Button>

            <div id="stockin-lines" tabIndex={-1} className="outline-none">
            {lines.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  Items to stock in ({lines.length})
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto">
                  {lines.map((row) => (
                    <li
                      key={row.productId}
                      className="flex items-center gap-2 rounded-lg border border-border bg-slate-50/80 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{row.productName}</p>
                        <p className="text-xs text-slate-500">
                          {row.quantity} {row.scale}
                          {row.itemCode ? ` · ${row.itemCode}` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0 cursor-pointer text-red-600"
                        onClick={() => removeLine(row.productId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No items added yet.</p>
            )}
            <FieldError message={fieldErrors.lines} />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3 pt-2">
            {selectedSupplier ? (
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">Supplier:</span>{' '}
                {selectedSupplier.companyName || selectedSupplier.name}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No supplier selected.</p>
            )}
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {lines.map((row) => (
                <li
                  key={row.productId}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium text-slate-900">{row.productName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.quantity} {row.scale}
                    {row.unitCost != null ? ` · cost ${row.unitCost}` : ''}
                    {row.expiresAt ? ` · expires ${row.expiresAt}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 pt-2">
            <div
              className="rounded-xl px-4 py-4 text-sm leading-relaxed text-slate-700"
              style={{ background: BRAND.soft }}
            >
              <p>
                Stock in{' '}
                <span className="font-bold" style={{ color: BRAND.purple }}>
                  {lines.length} item{lines.length === 1 ? '' : 's'}
                </span>
                {selectedSupplier ? (
                  <>
                    {' '}
                    from{' '}
                    <span className="font-bold" style={{ color: BRAND.purple }}>
                      {selectedSupplier.companyName || selectedSupplier.name}
                    </span>
                  </>
                ) : null}
                ?
              </p>
              <ul className="mt-2 list-inside list-disc text-slate-800">
                {lines.map((row) => (
                  <li key={row.productId}>
                    {row.productName} — {row.quantity} {row.scale}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer transition-none"
              style={{ color: BRAND.purple, borderColor: BRAND.purple }}
              disabled={loading}
              onClick={goBack}
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
          ) : null}
          <DialogCancelButton disabled={loading} className="cursor-pointer" />
          {step < 3 ? (
            <Button
              type="button"
              className="cursor-pointer text-white transition-none"
              style={{ background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.deep})` }}
              disabled={loading || loadingOptions || (step === 1 && !lines.length)}
              onClick={goNext}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="cursor-pointer text-white transition-none"
              style={{ background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.deep})` }}
              disabled={loading}
              onClick={handleSave}
            >
              <Check className="size-4" />
              {loading ? 'Saving…' : `Save ${lines.length} item${lines.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
