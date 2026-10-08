import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import { NativeSelect } from '@/components/ui/select'
import { ControlCatalogFilters } from '@/components/feature/control/ControlCatalogFilters'
import { ProductStockPickerList } from '@/components/feature/control/ProductStockPickerList'
import { BRAND } from '@/lib/constants'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import {
  fetchControlProductDetail,
  fetchControlProductOptions,
  fetchControlSuppliers,
} from '@/hooks/useInventoryControl'
import { cn } from '@/lib/utils'

// Review is the final step — Save runs here (no separate Confirm).
const STEPS = [
  { id: 1, label: '1. Add items' },
  { id: 2, label: '2. Review' },
]

const emptyFilters = () => ({
  q: '',
  categoryId: '',
  subcategoryId: '',
  productId: '',
  variantTypeId: '',
  variantValueId: '',
  type: '',
})

function lineFromProduct(product) {
  return {
    productId: product.id,
    productName: product.name,
    itemCode: product.itemCode || '',
    scale: product.scale || 'unit',
    quantity: '1',
    purchasePrice: '',
    sellingPrice: '',
    prevPurchase: product.purchasePrice,
    prevSelling: product.sellingPrice,
  }
}

// Multi-item stock-in — supplier + checkbox product table → review & save.
export function AddStockInDialog({
  open,
  onOpenChange,
  catalog,
  loading = false,
  onSubmit,
  initialProduct = null,
  mode = 'create',
  seedRow = null,
}) {
  const isUpdate = mode === 'update'
  const [step, setStep] = useState(1)
  const [filters, setFilters] = useState(emptyFilters())
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selected, setSelected] = useState({})
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const { formError, setFormError, resetErrors } = useFieldErrors()

  const selectedLines = useMemo(() => Object.values(selected), [selected])
  const dirty = selectedLines.length > 0 || Boolean(supplierId) || step > 1

  useEffect(() => {
    if (!open) return
    setStep(1)
    resetErrors()
    setFilters(emptyFilters())
    setSelected({})
    setSupplierId('')

    const seed = seedRow || initialProduct
    if (seed?.productId || seed?.id) {
      const id = seed.productId || seed.id
      setSelected({
        [id]: {
          productId: id,
          productName: seed.productName || seed.name || 'Item',
          itemCode: seed.itemCode || '',
          scale: seed.scale || 'unit',
          quantity: '1',
          purchasePrice: '',
          sellingPrice: '',
        },
      })
    }

    void fetchControlSuppliers().then((res) => {
      if (res.success) setSuppliers(res.items)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open reset
  }, [open, initialProduct?.id, seedRow?.productId])

  // Load selectable SKUs from catalog filters.
  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setProductsLoading(true)

    void (async () => {
      const res = await fetchControlProductOptions({
        categoryId: filters.categoryId || undefined,
        subcategoryId: filters.subcategoryId || undefined,
        q: filters.q || undefined,
        limit: 100,
      })
      if (cancelled) return

      let items = res.success ? res.items : []
      items = items.filter((p) => p.type !== PRODUCT_TYPES.VARIANT)

      if (filters.type) {
        items = items.filter((p) => p.type === filters.type)
      }

      if (filters.productId) {
        const parent = items.find((p) => p.id === filters.productId)
        if (parent?.type === PRODUCT_TYPES.VARIANT) {
          const detail = await fetchControlProductDetail(filters.productId)
          const variants = detail.success && Array.isArray(detail.data?.variants)
            ? detail.data.variants
            : []
          items = variants.map((v) => ({
            id: v.id,
            name: v.variantLabel || v.label || parent.name,
            itemCode: v.itemCode || '',
            scale: v.scale || parent.scale || 'unit',
            type: PRODUCT_TYPES.VARIANT,
            purchasePrice: v.purchasePrice ?? parent.purchasePrice,
            sellingPrice: v.sellingPrice ?? parent.sellingPrice,
            imageUrl: v.imageUrl || parent.imageUrl,
          }))
        } else {
          items = items.filter((p) => p.id === filters.productId)
        }
      }

      if (filters.variantTypeId || filters.variantValueId) {
        items = items.filter((p) => {
          if (!p.parts?.length) return true
          const typeOk =
            !filters.variantTypeId ||
            p.parts.some((part) => (part.variantTypeId || part.typeId) === filters.variantTypeId)
          const valueOk =
            !filters.variantValueId ||
            p.parts.some((part) => (part.variantValueId || part.valueId) === filters.variantValueId)
          return typeOk && valueOk
        })
      }

      setProducts(items)
      setProductsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, filters])

  function toggleProduct(product) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[product.id]) {
        delete next[product.id]
      } else if (isUpdate) {
        return { [product.id]: lineFromProduct(product) }
      } else {
        next[product.id] = lineFromProduct(product)
      }
      return next
    })
  }

  function patchLine(id, patch) {
    setSelected((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }))
  }

  function goNext() {
    if (step !== 1) return
    if (!selectedLines.length) {
      setFormError('Select at least one item')
      return
    }
    resetErrors()
    setStep(2)
  }

  function goBack() {
    resetErrors()
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSave() {
    if (!selectedLines.length) {
      setFormError('Select at least one item')
      setStep(1)
      return
    }
    resetErrors()

    const payload = {
      supplierId: supplierId || undefined,
      lines: selectedLines.map((row) => ({
        productId: row.productId,
        scale: row.scale,
        quantity: Number(row.quantity) || 1,
        unitCost:
          row.purchasePrice === '' || row.purchasePrice == null
            ? undefined
            : Number(row.purchasePrice),
        sellingPrice:
          row.sellingPrice === '' || row.sellingPrice == null
            ? undefined
            : Number(row.sellingPrice),
      })),
    }

    try {
      const result = await onSubmit?.(payload)
      if (result?.success) onOpenChange?.(false)
      else setFormError(result?.error || 'Failed to save stock-in.')
    } catch (err) {
      setFormError(err?.message || 'Failed to save stock-in.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dirty={dirty}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isUpdate ? 'Update stock' : 'Add New Stock'}</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Add quantity and optional price updates for this product.'
              : 'Add one or more items from the same supplier in a single stock-in.'}
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
                  active ? 'text-slate-900' : done ? 'text-emerald-600' : 'text-slate-400',
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
            {!isUpdate ? (
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
              </div>
            ) : null}

            {!isUpdate ? (
              <ControlCatalogFilters catalog={catalog} filters={filters} onChange={setFilters} />
            ) : null}

            <ProductStockPickerList
              products={isUpdate && seedRow ? [{ ...seedRow, id: seedRow.productId || seedRow.id }] : products}
              selected={selected}
              onToggle={toggleProduct}
              onLineChange={patchLine}
              loading={productsLoading && !isUpdate}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3 pt-1">
            <p className="text-sm text-slate-600">
              Review {selectedLines.length} line(s)
              {supplierId ? ' for the selected supplier' : ''}, then save to update stock.
            </p>
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {selectedLines.map((row) => (
                <li key={row.productId} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-semibold text-slate-900">{row.productName}</p>
                  <p className="text-xs text-slate-500">
                    Qty {row.quantity} · {row.scale}
                    {row.purchasePrice !== '' ? ` · Purchase ${row.purchasePrice}` : ''}
                    {row.sellingPrice !== '' ? ` · Selling ${row.sellingPrice}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter>
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={goBack} disabled={loading}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
          ) : (
            <DialogCancelButton disabled={loading} />
          )}
          {step < 2 ? (
            <Button type="button" variant="brand" onClick={goNext} disabled={loading}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" variant="brand" disabled={loading} onClick={handleSave}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddStockInDialog
