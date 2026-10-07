import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { FieldError } from '@/components/shared/FieldError'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { MotionHeader } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useProducts } from '@/hooks/useProducts'
import {
  PRODUCT_STATUS,
  PRODUCT_TYPES,
  mapProduct,
  money,
  taxIdsForDefaultRate,
} from '@/lib/mapProduct'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { cn } from '@/lib/utils'

function catalogName(catalog, id) {
  if (!id) return '—'
  const row = (catalog.all || []).find((entry) => entry.id === id)
  return row?.name || '—'
}

function variantDisplay(item) {
  if (!item) return '—'
  if (item.variantLabel) return item.variantLabel
  if (item.parentId) return item.scale || 'Variant'
  return item.scale || '—'
}

function findInsufficientComponent(lineDetails, bundleQty) {
  if (!lineDetails.length || !Number.isFinite(bundleQty) || bundleQty <= 0) return null
  for (const row of lineDetails) {
    const onHand = Number(row.item.quantity) || 0
    const deduct = bundleQty * (row.qty || 0)
    if (onHand - deduct < 0) {
      return { name: row.item.name || 'item', onHand, deduct }
    }
  }
  return null
}

function stockInsufficientMessage(lineDetails, bundleQty) {
  const bad = findInsufficientComponent(lineDetails, bundleQty)
  if (!bad) return ''
  return `Insufficient stock for ${bad.name}. Available stock: ${bad.onHand}.`
}

// Shared Add / Edit Bundle page — same layout; edit locks recipe, allows top-up.
export function BundleFormPage({ mode = 'create', initialBundle = null, loadingDetail = false }) {
  const isEdit = mode === 'edit'
  const navigate = useNavigate()
  const {
    catalog,
    catalogLoading,
    mutating,
    bundleOptions,
    bundleOptionsLoading,
    loadBundleOptions,
    createProduct,
    updateProduct,
  } = useProducts({}, { skipList: true })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState(null)
  const [status, setStatus] = useState(PRODUCT_STATUS.ACTIVE)
  // Tax: yes = apply admin default; no = exempt
  const [applyTax, setApplyTax] = useState('yes')
  const [offerId, setOfferId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [productId, setProductId] = useState('')
  const [variantSkuId, setVariantSkuId] = useState('')
  const [variantSkus, setVariantSkus] = useState([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [lines, setLines] = useState([])
  // Resolved SKUs (singles + variant children) keyed by id
  const [itemCache, setItemCache] = useState({})
  const [bundlePrice, setBundlePrice] = useState('')
  // Create: finished qty to assemble. Edit: additional top-up qty.
  const [bundleStock, setBundleStock] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const priceTouched = useRef(false)
  const stockTouched = useRef(false)
  const hydratedRef = useRef(false)

  const currentStock = isEdit ? Number(initialBundle?.quantity) || 0 : 0

  useEffect(() => {
    void loadBundleOptions()
  }, [loadBundleOptions])

  // Hydrate edit form once detail arrives
  useEffect(() => {
    if (!isEdit || !initialBundle?.id || hydratedRef.current) return
    hydratedRef.current = true
    setName(initialBundle.name || '')
    setDescription(initialBundle.description || '')
    setExistingImageUrl(initialBundle.imageUrl || null)
    setStatus(initialBundle.status || PRODUCT_STATUS.ACTIVE)
    setOfferId(initialBundle.offerId || '')
    setApplyTax(initialBundle.taxIds?.length ? 'yes' : 'no')
    setBundlePrice(
      initialBundle.sellingPrice != null ? String(Math.round(Number(initialBundle.sellingPrice))) : '',
    )
    priceTouched.current = true
    setBundleStock('')
    stockTouched.current = true
    const recipe = (initialBundle.bundleItems || []).map((row) => ({
      itemId: row.itemId,
      quantity: Number(row.quantity) || 1,
    }))
    setLines(recipe)
    // Cache component rows from detail payload when present
    const cache = {}
    for (const row of initialBundle.bundleItems || []) {
      if (row.item) cache[row.itemId] = mapProduct(row.item)
      else if (row.itemId) {
        cache[row.itemId] = mapProduct({
          id: row.itemId,
          name: row.itemName || row.name || 'Component',
          sellingPrice: row.sellingPrice ?? row.itemSellingPrice ?? 0,
          quantity: row.itemStock ?? row.itemQuantity ?? 0,
          scale: row.scale || 'unit',
          variantLabel: row.variantLabel || null,
          categoryId: row.categoryId || null,
          subcategoryId: row.subcategoryId || null,
          imageUrl: row.imageUrl || null,
          parentId: row.parentId || null,
        })
      }
    }
    if (Object.keys(cache).length) setItemCache((prev) => ({ ...prev, ...cache }))
  }, [isEdit, initialBundle])

  // Resolve missing component details for edit lines
  useEffect(() => {
    if (!isEdit || !lines.length) return
    const missing = lines.map((l) => l.itemId).filter((id) => id && !itemCache[id])
    if (!missing.length) return
    let cancelled = false
    void (async () => {
      const next = {}
      await Promise.all(
        missing.map(async (id) => {
          const res = await apiClient.get(endpoints.products.detail(id))
          if (res.success && res.data) next[id] = mapProduct(res.data)
        }),
      )
      if (!cancelled && Object.keys(next).length) {
        setItemCache((prev) => ({ ...prev, ...next }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isEdit, lines, itemCache])

  // Default tax = Yes when admin default exists (create only)
  useEffect(() => {
    if (isEdit) return
    const ids = taxIdsForDefaultRate(catalog.taxes, catalog.defaults?.defaultTaxPercent)
    if (!ids[0]) setApplyTax('no')
  }, [isEdit, catalog.taxes, catalog.defaults])

  const parents = (catalog.parents || []).filter((row) => row.isActive !== false)
  const subcategories = useMemo(() => {
    if (!categoryId) return []
    return (catalog.childrenByParent.get(categoryId) || []).filter((row) => row.isActive !== false)
  }, [catalog.childrenByParent, categoryId])

  const selectedIds = useMemo(() => new Set(lines.map((row) => row.itemId)), [lines])

  // Parents for picker: singles + variant parents (not bundles)
  const productChoices = useMemo(() => {
    if (!categoryId) return []
    if (subcategories.length && !subcategoryId) return []
    return bundleOptions.filter((item) => {
      if (item.type === PRODUCT_TYPES.BUNDLE) return false
      if (item.parentId) return false
      if (item.categoryId !== categoryId) return false
      if (subcategories.length && item.subcategoryId !== subcategoryId) return false
      return true
    })
  }, [bundleOptions, categoryId, subcategoryId, subcategories.length])

  const selectedParent = useMemo(
    () => productChoices.find((p) => p.id === productId) || null,
    [productChoices, productId],
  )
  const isVariantParent = selectedParent?.type === PRODUCT_TYPES.VARIANT

  // Load variant SKUs when a variant parent is selected (create only)
  useEffect(() => {
    if (isEdit || !productId || !isVariantParent) {
      setVariantSkus([])
      setVariantSkuId('')
      return undefined
    }
    let cancelled = false
    setVariantsLoading(true)
    void apiClient.get(endpoints.products.detail(productId)).then((res) => {
      if (cancelled) return
      setVariantsLoading(false)
      if (!res.success || !res.data) {
        setVariantSkus([])
        return
      }
      const variants = Array.isArray(res.data.variants)
        ? res.data.variants.map(mapProduct)
        : []
      setVariantSkus(variants)
      setVariantSkuId('')
      setItemCache((prev) => {
        const next = { ...prev }
        for (const v of variants) next[v.id] = v
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [isEdit, productId, isVariantParent])

  const resolveItem = (id) => itemCache[id] || bundleOptions.find((e) => e.id === id) || null

  const lineDetails = useMemo(
    () =>
      lines
        .map((line) => {
          const item = resolveItem(line.itemId)
          if (!item) return null
          const qty = Number(line.quantity) || 0
          const price = Number(item.sellingPrice) || 0
          return { ...line, item, qty, price, lineTotal: price * qty }
        })
        .filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolveItem closes over itemCache/bundleOptions
    [lines, itemCache, bundleOptions],
  )

  const autoTotal = useMemo(
    () => Math.round(lineDetails.reduce((sum, row) => sum + row.lineTotal, 0)),
    [lineDetails],
  )

  // Create: max finished bundles. Edit: max additional top-up from current component stock.
  const maxBundles = useMemo(() => {
    if (!lineDetails.length) return 0
    return lineDetails.reduce((min, row) => {
      const per = row.qty || 1
      const possible = Math.floor((Number(row.item.quantity) || 0) / per)
      return Math.min(min, possible)
    }, Infinity)
  }, [lineDetails])

  const stockQty = Number(bundleStock) || 0
  const stockFieldError = useMemo(() => {
    if (!bundleStock) return ''
    if (Number.isNaN(stockQty) || stockQty < 0) return 'Enter a valid quantity'
    if (isEdit && stockQty === 0) return ''
    if (!isEdit && stockQty <= 0) return 'Bundle stock quantity is required.'
    if (Number.isFinite(maxBundles) && stockQty > maxBundles) {
      return `Cannot exceed maximum available (${maxBundles}).`
    }
    return stockInsufficientMessage(lineDetails, stockQty)
  }, [bundleStock, lineDetails, stockQty, maxBundles, isEdit])

  const stockImpactRows = useMemo(() => {
    if (!lineDetails.length || stockQty <= 0) return []
    return lineDetails.map((row) => {
      const onHand = Number(row.item.quantity) || 0
      const deduct = stockQty * (row.qty || 0)
      const remaining = onHand - deduct
      return {
        itemId: row.itemId,
        name: row.item.name,
        deduct,
        remaining,
        insufficient: remaining < 0,
      }
    })
  }, [lineDetails, stockQty])

  useEffect(() => {
    if (isEdit || priceTouched.current) return
    setBundlePrice(autoTotal > 0 ? String(autoTotal) : '')
  }, [autoTotal, isEdit])

  useEffect(() => {
    if (isEdit || stockTouched.current) return
    setBundleStock(maxBundles > 0 ? String(maxBundles) : '')
  }, [maxBundles, isEdit])

  const adminTaxIds = useMemo(
    () => taxIdsForDefaultRate(catalog.taxes, catalog.defaults?.defaultTaxPercent),
    [catalog.taxes, catalog.defaults],
  )
  const adminTax = (catalog.taxes || []).find((t) => t.id === adminTaxIds[0])
  const selectedOffer = (catalog.offers || []).find((offer) => offer.id === offerId)

  const offerPercent =
    selectedOffer?.percent != null ? Number(selectedOffer.percent) : 0
  const priceNum = Number(bundlePrice) || 0
  const finalAfterOffer = Math.round(priceNum * (1 - offerPercent / 100))
  const taxRate = applyTax === 'yes' && adminTax ? Number(adminTax.ratePercent) || 0 : 0
  const taxAmount = Math.round(finalAfterOffer * (taxRate / 100))

  function resetPicker() {
    setProductId('')
    setVariantSkuId('')
    setVariantSkus([])
  }

  function handleCategoryChange(value) {
    setCategoryId(value)
    setSubcategoryId('')
    resetPicker()
  }

  function addItem() {
    if (!productId) {
      setError('Select a product before adding it to the bundle.')
      return
    }
    if (isVariantParent) {
      if (!variantSkuId) {
        setError('Select the exact variant combination before adding.')
        return
      }
      if (selectedIds.has(variantSkuId)) {
        setError('This item is already in the bundle. Increase its quantity instead.')
        return
      }
      const sku = variantSkus.find((v) => v.id === variantSkuId) || itemCache[variantSkuId]
      if (sku) setItemCache((prev) => ({ ...prev, [sku.id]: sku }))
      setError('')
      setLines((prev) => [...prev, { itemId: variantSkuId, quantity: 1 }])
      resetPicker()
      return
    }

    if (selectedIds.has(productId)) {
      setError('This item is already in the bundle. Increase its quantity instead.')
      return
    }
    const item = selectedParent
    if (item) setItemCache((prev) => ({ ...prev, [item.id]: item }))
    setError('')
    setLines((prev) => [...prev, { itemId: productId, quantity: 1 }])
    resetPicker()
  }

  function patchQty(itemId, quantity) {
    if (isEdit) return
    setLines((prev) =>
      prev.map((row) => (row.itemId === itemId ? { ...row, quantity: Number(quantity) || 1 } : row)),
    )
  }

  function removeLine(itemId) {
    if (isEdit) return
    setLines((prev) => prev.filter((row) => row.itemId !== itemId))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Bundle name is required.')
      return
    }
    if (!isEdit && lineDetails.length < 2) {
      setError('A bundle must contain at least 2 different items.')
      return
    }
    if (isEdit && lines.length < 2) {
      setError('This bundle is missing recipe items.')
      return
    }
    const price = Number(bundlePrice)
    if (!bundlePrice || Number.isNaN(price) || price <= 0) {
      setError('Bundle price is required and cannot be zero.')
      return
    }

    if (!isEdit) {
      const stock = Number(bundleStock)
      if (!bundleStock || Number.isNaN(stock) || stock <= 0) {
        setError('Bundle stock quantity is required.')
        return
      }
      if (stockFieldError) {
        setError(stockFieldError)
        return
      }
    } else if (bundleStock && stockFieldError) {
      setError(stockFieldError)
      return
    }

    const taxIds = applyTax === 'yes' ? adminTaxIds : []
    if (applyTax === 'yes' && !taxIds.length) {
      setError('Admin default tax is not configured. Choose No, or set default tax in Admin.')
      return
    }

    if (isEdit) {
      const topUp = Number(bundleStock) || 0
      const nextQty = currentStock + topUp
      const result = await updateProduct(initialBundle.id, {
        name: name.trim(),
        description: description.trim(),
        status,
        image: image || undefined,
        sellingPrice: price,
        purchasePrice: 0,
        quantity: nextQty,
        taxIds,
        offerId: offerId || null,
        discountPercent:
          offerId && selectedOffer?.percent != null
            ? Math.round(Number(selectedOffer.percent))
            : null,
      })
      if (!result.success) {
        const message = result.error || 'Could not update the bundle'
        setError(message)
        toastError(message)
        return
      }
      toastSuccess('Bundle updated')
      navigate(PATHS.inventory.products)
      return
    }

    const result = await createProduct({
      name: name.trim(),
      type: PRODUCT_TYPES.BUNDLE,
      scale: 'unit',
      description: description.trim(),
      status,
      image,
      sellingPrice: price,
      purchasePrice: 0,
      quantity: Number(bundleStock),
      taxIds,
      offerId: offerId || null,
      discountPercent:
        offerId && selectedOffer?.percent != null
          ? Math.round(Number(selectedOffer.percent))
          : null,
      bundleItems: lineDetails.map((row) => ({
        itemId: row.itemId,
        quantity: row.qty,
      })),
    })

    if (!result.success) {
      const message = result.error || 'Could not save the bundle'
      setError(message)
      toastError(message)
      return
    }

    toastSuccess('Bundle created')
    setSaved(result.data || { name })
  }

  if (isEdit && loadingDetail) {
    return (
      <div className="space-y-5 pb-8">
        <MotionHeader>
          <PageHeader eyebrow="Inventory Manager" title="Edit Bundle" description="Loading…" />
        </MotionHeader>
        <p className="text-sm text-slate-500">Loading bundle details…</p>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="space-y-5 pb-8">
        <MotionHeader>
          <PageHeader
            eyebrow="Inventory Manager"
            title="Bundle saved"
            description="This bundle now has its own stock. Component stock was reserved when you saved."
          />
        </MotionHeader>
        <SurfaceCard title={saved.name || name} description="Item code and barcode are ready.">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Item code</dt>
              <dd className="font-mono font-semibold text-slate-900">{saved.itemCode || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Barcode</dt>
              <dd className="font-mono font-semibold text-slate-900">{saved.barcode || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium capitalize text-slate-900">{status}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="brand" asChild>
              <Link to={PATHS.inventory.bundles}>Add another bundle</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={PATHS.inventory.products}>Back to products</Link>
            </Button>
          </div>
        </SurfaceCard>
      </div>
    )
  }

  const maxLabel = Number.isFinite(maxBundles) ? maxBundles : 0

  return (
    <form className="space-y-5 pb-8" onSubmit={handleSubmit}>
      <MotionHeader>
        <PageHeader
          eyebrow="Inventory Manager"
          title={isEdit ? 'Edit Bundle' : 'Add Bundle'}
          description={
            isEdit
              ? 'Update price, offer, tax, status, or top-up stock. Item composition is locked.'
              : 'Combine two or more items into one sellable unit with its own price and stock.'
          }
          actions={
            <Button type="button" variant="outline" asChild>
              <Link to={PATHS.inventory.products}>Back to products</Link>
            </Button>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <SurfaceCard title="Bundle details" description="These fields apply to the bundle as a whole.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bundle-name">Bundle name</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name shown on the invoice and catalog"
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bundle-description">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="bundle-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is included in this bundle"
            />
          </div>

          <ImageUploadField
            id="bundle-image"
            label="Image"
            optionalLabel="(optional, max 4MB)"
            value={image}
            existingImageUrl={existingImageUrl}
            onChange={setImage}
            className="sm:col-span-2"
          />

          <div className="space-y-1.5">
            <Label htmlFor="bundle-offer">Offer</Label>
            <NativeSelect
              id="bundle-offer"
              value={offerId}
              onChange={(event) => setOfferId(event.target.value)}
            >
              <option value="">No offer</option>
              {(catalog.offers || []).map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                  {offer.percent ? ` ${offer.percent}%` : ''}
                </option>
              ))}
            </NativeSelect>
            <p className="text-[11px] text-slate-400">
              Branch Manager offers only — no manual discount %.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bundle-tax">Tax</Label>
            <NativeSelect
              id="bundle-tax"
              value={applyTax}
              onChange={(event) => setApplyTax(event.target.value)}
            >
              <option value="yes">Yes — Apply Admin Tax</option>
              <option value="no">No — Not Apply Admin Tax</option>
            </NativeSelect>
            <p className="text-[11px] text-slate-400">
              {adminTax
                ? `Admin default: ${adminTax.name} (${adminTax.ratePercent}%).`
                : 'No admin default tax configured.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bundle-status">Status</Label>
            <NativeSelect
              id="bundle-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value={PRODUCT_STATUS.ACTIVE}>Active</option>
              <option value={PRODUCT_STATUS.INACTIVE}>Inactive</option>
            </NativeSelect>
            <p className="text-[11px] text-slate-400">
              {isEdit
                ? 'Setting Inactive dissolves remaining bundle stock back to components.'
                : 'Active bundles are available for sale after save.'}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Bundle items"
        description={
          isEdit
            ? 'Item composition is locked after creation. Delete and recreate to change items.'
            : 'Category → Sub → Product → Variant combination (if needed). At least 2 different items.'
        }
      >
        {!isEdit ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="bundle-category">Category</Label>
              <NativeSelect
                id="bundle-category"
                value={categoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                disabled={catalogLoading}
              >
                <option value="">Select category</option>
                {parents.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bundle-subcategory">Sub category</Label>
              <NativeSelect
                id="bundle-subcategory"
                value={subcategoryId}
                onChange={(event) => {
                  setSubcategoryId(event.target.value)
                  resetPicker()
                }}
                disabled={!categoryId || subcategories.length === 0}
              >
                <option value="">
                  {subcategories.length ? 'Select sub category' : 'No sub categories'}
                </option>
                {subcategories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bundle-product">Product</Label>
              <NativeSelect
                id="bundle-product"
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value)
                  setVariantSkuId('')
                }}
                disabled={
                  !categoryId ||
                  (subcategories.length > 0 && !subcategoryId) ||
                  bundleOptionsLoading
                }
              >
                <option value="">
                  {bundleOptionsLoading ? 'Loading products…' : 'Select product'}
                </option>
                {productChoices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.type === PRODUCT_TYPES.VARIANT ? ' (Variant)' : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bundle-variant">Product variant</Label>
              <NativeSelect
                id="bundle-variant"
                value={variantSkuId}
                onChange={(event) => setVariantSkuId(event.target.value)}
                disabled={!isVariantParent || variantsLoading || variantSkus.length === 0}
              >
                <option value="">
                  {!productId
                    ? 'Select product first'
                    : !isVariantParent
                      ? 'Not a variant product'
                      : variantsLoading
                        ? 'Loading…'
                        : variantSkus.length === 0
                          ? 'No combinations'
                          : 'Select combination'}
                </option>
                {variantSkus.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.variantLabel || sku.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="brand"
                className="w-full"
                onClick={addItem}
                disabled={!productId || (isVariantParent && !variantSkuId)}
              >
                <Plus className="size-4" />
                Add item
              </Button>
            </div>
          </div>
        ) : null}

        <div className={cn(!isEdit && 'mt-4')}>
          {lineDetails.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-slate-500">
              {isEdit ? 'No recipe items found for this bundle.' : 'No items yet. Add at least 2 products.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Item name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Variant / Scale</TableHead>
                  <TableHead>Qty in bundle</TableHead>
                  <TableHead>Item price</TableHead>
                  {!isEdit ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineDetails.map((row) => (
                  <TableRow key={row.itemId}>
                    <TableCell>
                      <ProductImageCell src={row.item.imageUrl} name={row.item.name} />
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {row.item.name}
                      {row.item.variantLabel ? (
                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                          {row.item.variantLabel}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <CategoryLines
                        category={
                          catalogName(catalog, row.item.categoryId) === '—'
                            ? ''
                            : catalogName(catalog, row.item.categoryId)
                        }
                        subcategory={
                          catalogName(catalog, row.item.subcategoryId) === '—'
                            ? ''
                            : catalogName(catalog, row.item.subcategoryId)
                        }
                        emptyLabel="—"
                      />
                    </TableCell>
                    <TableCell>{variantDisplay(row.item)}</TableCell>
                    <TableCell className="w-24">
                      {isEdit ? (
                        <span className="text-sm font-medium text-slate-800">{row.quantity}</span>
                      ) : (
                        <WholeNumberInput
                          min={1}
                          value={row.quantity}
                          onChange={(event) => patchQty(row.itemId, event.target.value)}
                        />
                      )}
                    </TableCell>
                    <TableCell>{money(row.price)}</TableCell>
                    {!isEdit ? (
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => removeLine(row.itemId)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Price"
        description="Auto total is the sum of each item selling price times its quantity. You can override the bundle price."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Auto-calculated total</Label>
            <Input value={autoTotal ? money(autoTotal) : '—'} disabled className="bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bundle-price">Bundle price</Label>
            <WholeNumberInput
              id="bundle-price"
              min={1}
              value={bundlePrice}
              onChange={(event) => {
                priceTouched.current = true
                setBundlePrice(event.target.value)
              }}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Final bundle price</Label>
            <Input
              value={bundlePrice ? money(finalAfterOffer) : '—'}
              disabled
              className="bg-slate-50"
            />
            <p className="text-[11px] text-slate-400">
              Bundle price − offer %
              {offerPercent ? ` (${offerPercent}%)` : ''}.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Tax amount</Label>
            <Input
              value={applyTax === 'yes' && taxRate ? money(taxAmount) : money(0)}
              disabled
              className="bg-slate-50"
            />
            <p className="text-[11px] text-slate-400">
              {applyTax === 'yes' && taxRate
                ? `${taxRate}% of final price (invoice line).`
                : 'Tax not applied.'}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Stock"
        description={
          isEdit
            ? `Current bundle stock: ${currentStock}. Maximum additional from components: ${maxLabel}.`
            : lineDetails.length
              ? `Maximum bundles available based on current stock: ${maxLabel}. You can create up to ${maxLabel} bundles.`
              : 'Add items to calculate how many complete bundles current stock can make.'
        }
      >
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="bundle-stock">
            {isEdit ? 'Additional bundles (top-up)' : 'Bundle stock quantity'}
          </Label>
          <WholeNumberInput
            id="bundle-stock"
            min={isEdit ? 0 : 1}
            value={bundleStock}
            onChange={(event) => {
              stockTouched.current = true
              setError('')
              setBundleStock(event.target.value)
            }}
            aria-invalid={Boolean(stockFieldError)}
            className={fieldErrorClass(stockFieldError)}
            required={!isEdit}
          />
          <FieldError message={stockFieldError} />
          <p className="text-[11px] text-slate-400">
            {isEdit
              ? 'Leave 0 to keep current stock. Top-up deducts from component items.'
              : 'Saving deducts this quantity from each component item. The bundle keeps its own stock.'}
          </p>
        </div>
        {stockImpactRows.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-slate-600">
            {stockImpactRows.map((row) => (
              <li
                key={row.itemId}
                className={cn(
                  row.insufficient && 'rounded-md bg-rose-50 px-2 py-1 font-medium text-rose-700',
                )}
              >
                {row.name}: deduct {row.deduct}, remaining {row.remaining}
              </li>
            ))}
          </ul>
        ) : null}
      </SurfaceCard>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={mutating || Boolean(stockFieldError)}>
          {mutating ? 'Saving…' : isEdit ? 'Save changes' : 'Save bundle'}
        </Button>
      </div>
    </form>
  )
}

export default BundleFormPage
