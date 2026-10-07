import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import { money } from '@/lib/mapProduct'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const PO_FIELD_IDS = {
  supplierId: 'po-supplier',
  lines: 'po-lines',
}

const PO_FIELD_ORDER = ['supplierId', 'lines']

// Generate PO: pick supplier, multi products with qty + unit cost (shows last purchase).
export function GenerateOrderDialog({
  open,
  onOpenChange,
  suppliers = [],
  products = [],
  loading = false,
  onSubmit,
}) {
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState([])
  const [explanation, setExplanation] = useState('')
  const { fieldErrors, formError, setFormError, resetErrors, clearField, applyErrors } =
    useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId) || null,
    [suppliers, supplierId],
  )

  useEffect(() => {
    if (!open) return
    resetErrors()
    setExplanation('')
    const snapshot = {
      supplierId: suppliers[0]?.id || '',
      lines: [],
      explanation: '',
    }
    setSupplierId(snapshot.supplierId)
    setLines(snapshot.lines)
    captureBaseline(snapshot)
  }, [open, suppliers])

  function addLine() {
    if (!products.length) return
    clearField('lines')
    setLines((prev) => [
      ...prev,
      {
        productId: '',
        quantity: 1,
        unitCost: '',
        scale: 'unit',
      },
    ])
  }

  function patchLine(index, field, value) {
    clearField('lines')
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const next = { ...row, [field]: value }
        if (field === 'productId') {
          if (!value) {
            next.scale = 'unit'
            next.unitCost = ''
          } else {
            const product = products.find((p) => p.id === value)
            if (product) {
              next.scale = product.scale || 'unit'
              next.unitCost = Number(product.purchasePrice || 0)
            }
          }
        }
        return next
      }),
    )
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function validateOrderForm() {
    const errors = {}
    if (!supplierId) errors.supplierId = 'Select a company / supplier'
    if (!lines.length) errors.lines = 'Add at least one item'
    else {
      for (const line of lines) {
        if (!line.productId || !(Number(line.quantity) > 0)) {
          errors.lines = 'Each line needs a product and positive quantity'
          break
        }
      }
    }
    return errors
  }

  async function handleSave(andPrint) {
    const errors = validateOrderForm()
    if (Object.keys(errors).length) {
      applyErrors(errors, PO_FIELD_IDS, PO_FIELD_ORDER)
      return
    }
    resetErrors()

    const payload = {
      supplierId,
      explanation: explanation.trim() || undefined,
      lines: lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
        scale: line.scale || 'unit',
      })),
      printAfter: andPrint,
    }
    try {
      const result = await onSubmit?.(payload)
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Failed to create order. Please try again.')
    } catch (err) {
      setFormError(err?.message || 'Failed to create order. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={isDirty({ supplierId, lines, explanation })}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate order</DialogTitle>
          <DialogDescription>
            Select a supplier and one or more catalog items. SMS to representative is Phase 2.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="po-supplier">Name of company</Label>
            <NativeSelect
              id="po-supplier"
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value)
                clearField('supplierId')
              }}
              aria-invalid={Boolean(fieldErrors.supplierId)}
              className={fieldErrorClass(fieldErrors.supplierId)}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </NativeSelect>
            {selectedSupplier ? (
              <p className="text-xs text-slate-500">
                Rep: {selectedSupplier.representativeName || '—'} ·{' '}
                {selectedSupplier.representativePhone || '—'}
              </p>
            ) : null}
            {!suppliers.length ? (
              <p className="text-[11px] text-amber-700">
                No suppliers — add one on the Suppliers page first.
              </p>
            ) : null}
            <FieldError message={fieldErrors.supplierId} />
          </div>

          <div id="po-lines" tabIndex={-1} className="outline-none">
            <div className="mb-2 flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={addLine}
                disabled={!products.length}
              >
                <Plus className="size-3.5" />
                Add item
              </Button>
            </div>
            {!products.length ? (
              <p className="text-xs text-slate-400">Create single products before ordering.</p>
            ) : null}
            <div className="space-y-2">
              {lines.map((line, index) => {
                const product = products.find((p) => p.id === line.productId)
                return (
                  <div
                    key={`po-line-${index}`}
                    className="grid gap-2 rounded-xl border border-border bg-slate-50/80 p-3 sm:grid-cols-[1fr_5rem_6rem_auto]"
                  >
                    <NativeSelect
                      value={line.productId}
                      onChange={(e) => patchLine(index, 'productId', e.target.value)}
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={lines.some(
                            (other, i) => i !== index && other.productId === p.id,
                          )}
                        >
                          {p.name} ({p.itemCode}) — last {money(p.purchasePrice)}
                          {lines.some((other, i) => i !== index && other.productId === p.id)
                            ? ' — added'
                            : ''}
                        </option>
                      ))}
                    </NativeSelect>
                    <WholeNumberInput
                      min={1}
                      value={line.quantity}
                      onChange={(e) => patchLine(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                    />
                    <WholeNumberInput
                      min={0}
                      value={line.unitCost}
                      onChange={(e) => patchLine(index, 'unitCost', e.target.value)}
                      placeholder="Price"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="cursor-pointer text-red-600"
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <p className="text-[11px] text-slate-400 sm:col-span-4">
                      Scale: {line.scale}
                      {product
                        ? ` · Catalog last purchase ${money(product.purchasePrice)}`
                        : ''}
                    </p>
                  </div>
                )
              })}
            </div>
            <FieldError message={fieldErrors.lines} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po-explain">
              Explanation (optional — why price increased; used when deal closes)
            </Label>
            <Textarea
              id="po-explain"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Optional note for price changes"
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <DialogCancelButton className="cursor-pointer" />
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={loading}
            onClick={() => handleSave(false)}
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
          <Button
            type="button"
            className="cursor-pointer text-white"
            style={{ background: BRAND.purple }}
            disabled={loading}
            onClick={() => handleSave(true)}
          >
            Save & PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
