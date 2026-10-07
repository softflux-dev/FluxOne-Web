import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import {
  CombinationTable,
  NormalProductFields,
  TaxProfitFields,
} from '@/components/feature/products/add-item/CombinationTable'
import { SearchableMultiSelect } from '@/components/feature/products/add-item/SearchableMultiSelect'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useProducts } from '@/hooks/useProducts'
import {
  ADD_ITEM_TABS,
  PRODUCT_KIND,
  assertSellingGtePurchase,
  buildCombinations,
  buildEditItemApiPayload,
  combinationMatchKey,
  hydrateVariantSelectionFromRows,
  mergeCombinationMatrix,
  variantsToCombinationRows,
} from '@/lib/addItem'
import { PRODUCT_TYPES } from '@/lib/mapProduct'
import { BRAND } from '@/lib/constants'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess, toastInfo } from '@/lib/toast'
import { validatePercentage } from '@/lib/validation/formValidators'
import { cn } from '@/lib/utils'

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emptyForm() {
  return {
    name: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    productKind: '',
    sku: '',
    barcode: '',
    purchasePrice: '',
    sellingPrice: '',
    openingStock: '0',
    lowStockThreshold: '',
    dailyPriceChange: false,
    offerId: '',
    discountPercent: '',
    offerName: '',
    taxPercent: '',
    profitPercent: '',
    status: 'active',
    image: null,
    imageUrl: null,
  }
}

export function EditItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { catalog, catalogLoading, fetchProductDetail, updateProduct } = useProducts(
    {},
    { skipList: true },
  )

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('basic')
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [variantsLoading, setVariantsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  const [variantTypes, setVariantTypes] = useState([])
  const [selectedTypeIds, setSelectedTypeIds] = useState([])
  const [selectedValuesByType, setSelectedValuesByType] = useState({})
  const [combinations, setCombinations] = useState([])
  const [selectedComboKeys, setSelectedComboKeys] = useState([])

  const isVariant = form.productKind === PRODUCT_KIND.VARIANT
  const isNormal = form.productKind === PRODUCT_KIND.NORMAL

  // One gate for the whole page — avoid section-by-section flashes
  const pageReady =
    !loading &&
    !catalogLoading &&
    Boolean(form.productKind) &&
    (form.productKind !== PRODUCT_KIND.VARIANT || hydrated)

  const categories = catalog.parents || []
  const subcategories = useMemo(() => {
    if (!form.categoryId) return []
    return catalog.childrenByParent?.get?.(form.categoryId) || []
  }, [catalog.childrenByParent, form.categoryId])

  const visibleTabs = useMemo(
    () => ADD_ITEM_TABS.filter((t) => !t.variantOnly || isVariant),
    [isVariant],
  )

  const typeOptions = useMemo(
    () => variantTypes.map((t) => ({ id: t.id, label: t.name, isCustom: t.isCustom })),
    [variantTypes],
  )

  const selectedTypes = useMemo(
    () =>
      selectedTypeIds
        .map((id) => variantTypes.find((t) => t.id === id))
        .filter(Boolean),
    [variantTypes, selectedTypeIds],
  )

  // Load catalog variant types once
  useEffect(() => {
    let cancelled = false
    async function loadVariantTypes() {
      setVariantsLoading(true)
      const res = await apiClient.get(endpoints.branch.resources.variantTypes.list, {
        active: 'active',
        includeValues: true,
      })
      if (cancelled) return
      if (!res.success) {
        toastError(res.error || 'Failed to load variant types')
        setVariantTypes([])
        setVariantsLoading(false)
        return
      }
      const rows = Array.isArray(res.data) ? res.data : []
      setVariantTypes(
        rows.map((t) => ({
          id: t.id,
          name: t.name,
          isCustom: false,
          values: (t.values || [])
            .filter((v) => v.isActive !== false)
            .map((v) => ({ id: v.id, name: v.name, isCustom: false })),
        })),
      )
      setVariantsLoading(false)
    }
    void loadVariantTypes()
    return () => {
      cancelled = true
    }
  }, [])

  // Load product detail once per id (stable deps — avoid re-fetch flicker)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setHydrated(false)
      setTab('basic')
      setError(null)
      const result = await fetchProductDetail(id)
      if (cancelled) return
      if (!result.success) {
        toastError(result.error || 'Product not found')
        navigate(PATHS.inventory.products)
        return
      }
      const product = result.data || {}
      if (product.type === PRODUCT_TYPES.BUNDLE) {
        navigate(PATHS.inventory.bundlesEdit(product.id))
        return
      }
      if (product.parentId) {
        toastInfo('Open the parent variant product to edit SKUs.')
        navigate(PATHS.inventory.productsEdit(product.parentId))
        return
      }

      const kind =
        product.type === PRODUCT_TYPES.VARIANT ? PRODUCT_KIND.VARIANT : PRODUCT_KIND.NORMAL

      setForm({
        name: product.name || '',
        description: product.description || '',
        categoryId: product.categoryId || '',
        subcategoryId: product.subcategoryId || '',
        productKind: kind,
        sku: product.itemCode || '',
        barcode: product.barcode || '',
        purchasePrice:
          product.purchasePrice === '' || product.purchasePrice == null
            ? ''
            : String(Math.round(Number(product.purchasePrice) || 0)),
        sellingPrice:
          product.sellingPrice === '' || product.sellingPrice == null
            ? ''
            : String(Math.round(Number(product.sellingPrice) || 0)),
        openingStock: String(product.quantity ?? 0),
        lowStockThreshold:
          product.reorderPoint === 0 || product.reorderPoint
            ? String(product.reorderPoint)
            : '',
        dailyPriceChange: Boolean(product.dailyPriceChange),
        offerId: product.offerId || '',
        discountPercent:
          product.discountPercent === 0 || product.discountPercent
            ? String(Math.round(Number(product.discountPercent)))
            : '',
        offerName: product.offerName || '',
        taxPercent: String(Math.round(Number(product.taxPercent) || 0)),
        profitPercent: String(Math.round(Number(product.profitPercent) || 0)),
        status: product.status === 'inactive' ? 'inactive' : 'active',
        image: null,
        imageUrl: product.imageUrl || null,
      })

      if (kind === PRODUCT_KIND.VARIANT) {
        const rows = variantsToCombinationRows(product.variants || [])
        setCombinations(rows)
        // Hydration of types waits until catalog variant types finish loading
        setHydrated(false)
      } else {
        setCombinations([])
        setSelectedTypeIds([])
        setSelectedValuesByType({})
        setHydrated(true)
      }

      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-load when route id changes
  }, [id])

  // Merge existing combination parts into variant type catalog after both loaded
  useEffect(() => {
    if (loading || variantsLoading) return
    if (form.productKind !== PRODUCT_KIND.VARIANT) return
    if (hydrated) return
    if (!combinations.length && !variantTypes.length) {
      setHydrated(true)
      return
    }

    const { variantTypes: merged, selectedTypeIds: typeIds, selectedValuesByType: valuesMap } =
      hydrateVariantSelectionFromRows(combinations, variantTypes)

    setVariantTypes(merged)
    setSelectedTypeIds(typeIds)
    setSelectedValuesByType(valuesMap)
    // Re-key with order-independent match so rebuild can coalesce old SKUs
    setCombinations((prev) =>
      prev.map((row) => ({
        ...row,
        key: combinationMatchKey(row.parts) || row.key,
      })),
    )
    setHydrated(true)
  }, [loading, variantsLoading, form.productKind, combinations, variantTypes, hydrated])

  useEffect(() => {
    setSelectedValuesByType((prev) => {
      const next = {}
      for (const tid of selectedTypeIds) {
        next[tid] = prev[tid] || []
      }
      return next
    })
  }, [selectedTypeIds])

  // Rebuild matrix when values change — coalesce existing SKUs (order-independent)
  useEffect(() => {
    if (!isVariant || !hydrated) return
    const forBuild = selectedTypes.map((t) => ({
      typeId: t.id,
      typeName: t.name,
      isCustom: Boolean(t.isCustom),
      values: (t.values || []).filter((v) => (selectedValuesByType[t.id] || []).includes(v.id)),
    }))
    const generated = buildCombinations(forBuild)
    setCombinations((prev) => {
      const next = mergeCombinationMatrix(generated, prev)
      const nextKeys = new Set(next.map((r) => r.key))
      setSelectedComboKeys((keys) => keys.filter((k) => nextKeys.has(k)))
      return next
    })
  }, [isVariant, hydrated, selectedTypes, selectedValuesByType])

  function patch(field, value) {
    setForm((prev) => {
      if (field && typeof field === 'object' && value === undefined) {
        return { ...prev, ...field }
      }
      const next = { ...prev, [field]: value }
      if (field === 'categoryId') next.subcategoryId = ''
      return next
    })
    setError(null)
  }

  function addCustomType(name) {
    const tid = newId('custom-type')
    setVariantTypes((prev) => [...prev, { id: tid, name, isCustom: true, values: [] }])
    return tid
  }

  function addCustomValue(typeId, name) {
    const vid = newId('custom-val')
    setVariantTypes((prev) =>
      prev.map((t) =>
        t.id === typeId ? { ...t, values: [...t.values, { id: vid, name, isCustom: true }] } : t,
      ),
    )
    return vid
  }

  function patchCombination(key, patchFields) {
    setCombinations((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patchFields } : row)),
    )
  }

  function validateTab(tabId) {
    if (tabId === 'basic') {
      if (!form.name.trim()) return 'Product name is required'
      if (!form.categoryId) return 'Category is required'
      if (!form.subcategoryId) return 'Sub category is required'
    }
    if (tabId === 'variantTypes') {
      if (!selectedTypeIds.length) return 'Select at least one variant type'
    }
    if (tabId === 'values') {
      for (const t of selectedTypes) {
        if (!(selectedValuesByType[t.id] || []).length) {
          return `Select at least one value for “${t.name}”`
        }
      }
    }
    if (tabId === 'combinations') {
      if (!combinations.length) return 'At least one combination is required'
      for (const row of combinations) {
        if (row.status !== 'active') continue
        if (row.purchasePrice === '' || row.sellingPrice === '') {
          return `Fill purchase & selling price for active row “${row.label}”`
        }
        const priceErr = assertSellingGtePurchase(row.purchasePrice, row.sellingPrice)
        if (priceErr) return `“${row.label}”: ${priceErr}`
      }
      if (!combinations.some((r) => r.status === 'active')) {
        return 'At least one active combination is required'
      }
    }
    if (tabId === 'save') {
      if (form.taxPercent === '' || form.taxPercent == null) {
        return 'Tax percentage is required'
      }
      if (form.profitPercent === '' || form.profitPercent == null) {
        return 'Profit percentage is required'
      }
      const taxErr = validatePercentage(form.taxPercent, {
        min: 0,
        max: 100,
        fieldName: 'Tax percentage',
      })
      if (taxErr) return taxErr
      const profitErr = validatePercentage(form.profitPercent, {
        min: 0,
        max: 100,
        fieldName: 'Profit percentage',
      })
      if (profitErr) return profitErr
      if (isNormal) {
        if (form.purchasePrice === '' || form.sellingPrice === '') {
          return 'Purchase and selling price are required'
        }
        const priceErr = assertSellingGtePurchase(form.purchasePrice, form.sellingPrice)
        if (priceErr) return priceErr
      }
    }
    return null
  }

  function goToTab(nextId) {
    const currentIndex = visibleTabs.findIndex((t) => t.id === tab)
    const nextIndex = visibleTabs.findIndex((t) => t.id === nextId)
    if (nextIndex > currentIndex) {
      const err = validateTab(tab)
      if (err) {
        setError(err)
        toastError(err)
        return
      }
    }
    setError(null)
    setTab(nextId)
  }

  function goNext() {
    const idx = visibleTabs.findIndex((t) => t.id === tab)
    if (idx < 0 || idx >= visibleTabs.length - 1) return
    goToTab(visibleTabs[idx + 1].id)
  }

  function goBack() {
    const idx = visibleTabs.findIndex((t) => t.id === tab)
    if (idx <= 0) return
    setError(null)
    setTab(visibleTabs[idx - 1].id)
  }

  async function handleSave() {
    if (isVariant) {
      const comboErr = validateTab('combinations')
      if (comboErr) {
        setError(comboErr)
        toastError(comboErr)
        setTab('combinations')
        return
      }
    }
    const saveErr = validateTab('save')
    if (saveErr) {
      setError(saveErr)
      toastError(saveErr)
      if (isVariant) setTab('save')
      return
    }

    setSaving(true)
    try {
      const payload = buildEditItemApiPayload({
        form,
        productKind: form.productKind,
        combinations,
        offers: catalog.offers || [],
      })
      if (form.image) payload.image = form.image
      const result = await updateProduct(id, payload)
      if (!result.success) {
        toastError(result.error || 'Failed to update product')
        return
      }
      toastSuccess(isVariant ? 'Variant product updated' : 'Product updated')
      navigate(PATHS.inventory.products)
    } catch (e) {
      toastError(e?.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const tabIndex = visibleTabs.findIndex((t) => t.id === tab)
  const newComboCount = combinations.filter((r) => !r.productId).length

  // Single loading shell until product + catalog (+ variant hydrate) are ready
  if (!pageReady) {
    return (
      <div className="space-y-5 pb-8">
        <PageHeader title="Edit Item" description="Loading product…" />
        <SurfaceCard title="Loading" description="Preparing the edit form.">
          <div className="space-y-3 animate-pulse">
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-24 rounded-lg bg-slate-100" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-10 rounded-lg bg-slate-100" />
              <div className="h-10 rounded-lg bg-slate-100" />
            </div>
            <div className="h-28 rounded-lg bg-slate-100" />
          </div>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Edit Item"
          description="Update product details. Stock changes go through Inventory Control."
          actions={
            <Button type="button" variant="outline" asChild>
              <Link to={PATHS.inventory.products}>
                <ArrowLeft className="size-4" />
                Back to products
              </Link>
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal delay={0.02}>
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((t, i) => {
            const active = t.id === tab
            const done = i < tabIndex
            return (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer',
                  active ? 'text-white' : 'hover:border-slate-300',
                )}
                style={active ? { background: BRAND.purple } : undefined}
                onClick={() => goToTab(t.id)}
              >
                {done ? <Check className="size-3.5" /> : null}
                <span className="tabular-nums text-[11px] opacity-70">{i + 1}.</span>
                {t.label}
              </Button>
            )
          })}
        </div>
      </MotionReveal>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <SurfaceCard
          title={visibleTabs.find((t) => t.id === tab)?.label || 'Edit Item'}
          description={
            tab === 'basic'
              ? 'Shared parent fields.'
              : tab === 'type'
                ? 'Product type cannot be changed after creation. To change the product type, deactivate this product and create a new one.'
                : tab === 'variantTypes'
                  ? 'Adjust types or add custom — new value picks create new SKU rows.'
                  : tab === 'values'
                    ? 'Select more values to add combinations to this product.'
                    : tab === 'combinations'
                      ? 'Edit existing SKUs or fill new rows. Stock on existing rows is read-only.'
                      : 'Review and save changes.'
          }
        >
          {tab === 'basic' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-name">Product name</Label>
                <Input
                  id="edit-name"
                  value={form.name}
                  onChange={(e) => patch('name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-desc">Description (optional)</Label>
                <Textarea
                  id="edit-desc"
                  value={form.description}
                  onChange={(e) => patch('description', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-cat">Category</Label>
                <NativeSelect
                  id="edit-cat"
                  value={form.categoryId}
                  onChange={(e) => patch('categoryId', e.target.value)}
                  disabled={catalogLoading}
                >
                  <option value="">
                    {catalogLoading ? 'Loading…' : 'Select category'}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-sub">Sub category</Label>
                <NativeSelect
                  id="edit-sub"
                  value={form.subcategoryId}
                  onChange={(e) => patch('subcategoryId', e.target.value)}
                  disabled={!form.categoryId}
                >
                  <option value="">Select sub category</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {/* Optional product image — Basic Info (parent-level) */}
              <div className="sm:col-span-2">
                <ImageUploadField
                  id="edit-item-image"
                  label="Image"
                  optionalLabel="(optional)"
                  value={form.image}
                  existingImageUrl={form.imageUrl}
                  onChange={(file) => patch('image', file)}
                />
              </div>
            </div>
          ) : null}

          {tab === 'type' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  id: PRODUCT_KIND.NORMAL,
                  title: 'Normal Product',
                  body: 'Single SKU product.',
                },
                {
                  id: PRODUCT_KIND.VARIANT,
                  title: 'Variant Product',
                  body: 'Parent with independent combination SKUs.',
                },
              ].map((opt) => {
                const active = form.productKind === opt.id
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      'rounded-xl border px-4 py-4 text-left',
                      active
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-border bg-slate-50 text-slate-400',
                    )}
                    style={active ? { background: BRAND.purple } : undefined}
                  >
                    <p className={cn('text-sm font-semibold', active ? 'text-white' : '')}>
                      {opt.title}
                    </p>
                    <p className={cn('mt-1 text-xs', active ? 'text-white/85' : '')}>
                      {opt.body}
                    </p>
                    {active ? (
                      <p className="mt-2 text-[11px] text-white/70">Locked for this product</p>
                    ) : (
                      <p className="mt-2 text-[11px]">Unavailable after create</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}

          {tab === 'variantTypes' ? (
            variantsLoading || !hydrated ? (
              <p className="text-sm text-slate-500">Loading variant types…</p>
            ) : (
              <SearchableMultiSelect
                label="Variant types"
                hint="Add types to expand the combination matrix. Existing SKUs are kept when values still match."
                options={typeOptions}
                value={selectedTypeIds}
                onChange={setSelectedTypeIds}
                customLabel="+ Custom Variant Type"
                onAddCustom={addCustomType}
                placeholder="Filter variant types…"
              />
            )
          ) : null}

          {tab === 'values' ? (
            <div className="space-y-6">
              {!selectedTypes.length ? (
                <p className="text-sm text-slate-500">Select at least one variant type.</p>
              ) : (
                selectedTypes.map((t) => (
                  <SearchableMultiSelect
                    key={t.id}
                    label={t.name}
                    hint={`Values for ${t.name}${t.isCustom ? ' (custom type)' : ''}`}
                    options={(t.values || []).map((v) => ({
                      id: v.id,
                      label: v.name,
                      isCustom: v.isCustom,
                    }))}
                    value={selectedValuesByType[t.id] || []}
                    onChange={(ids) =>
                      setSelectedValuesByType((prev) => ({ ...prev, [t.id]: ids }))
                    }
                    customLabel="+ Custom Value"
                    onAddCustom={(name) => addCustomValue(t.id, name)}
                    placeholder={`Filter ${t.name} values…`}
                  />
                ))
              )}
            </div>
          ) : null}

          {tab === 'combinations' ? (
            <CombinationTable
              rows={combinations}
              onChangeRow={patchCombination}
              selectedKeys={selectedComboKeys}
              onSelectedKeysChange={setSelectedComboKeys}
              stockMode="edit"
              offers={catalog.offers || []}
            />
          ) : null}

          {tab === 'save' ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-slate-50/80 px-4 py-3 text-sm">
                <p>
                  <span className="text-slate-500">Name:</span>{' '}
                  <span className="font-semibold">{form.name || '—'}</span>
                </p>
                <p className="mt-1">
                  <span className="text-slate-500">Type:</span>{' '}
                  {isVariant ? 'Variant Product' : isNormal ? 'Normal Product' : '—'}
                </p>
                {isVariant ? (
                  <p className="mt-1">
                    <span className="text-slate-500">Combinations:</span> {combinations.length}
                    {newComboCount ? (
                      <span className="text-violet-600"> ({newComboCount} new)</span>
                    ) : null}
                  </p>
                ) : null}
              </div>

              {isNormal ? (
                <NormalProductFields
                  form={form}
                  patch={patch}
                  stockMode="edit"
                  offers={catalog.offers || []}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Combination SKUs were edited on the Combinations tab. Parent status:
                  </p>
                  <div className="flex gap-2">
                    {['active', 'inactive'].map((s) => {
                      const on = (form.status || 'active') === s
                      return (
                        <button
                          key={s}
                          type="button"
                          className={cn(
                            'cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold capitalize',
                            on ? 'text-white' : 'bg-slate-100 text-slate-600',
                          )}
                          style={on ? { background: BRAND.purple } : undefined}
                          onClick={() => patch('status', s)}
                        >
                          {s === 'active' ? 'Active' : 'Inactive'}
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TaxProfitFields form={form} patch={patch} idPrefix="variant-edit" />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={tabIndex <= 0}
              onClick={goBack}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <div className="flex flex-wrap gap-2">
              {tab !== 'save' ? (
                <Button
                  type="button"
                  className="cursor-pointer text-white"
                  style={{ background: BRAND.purple }}
                  onClick={goNext}
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="cursor-pointer text-white"
                  style={{ background: BRAND.purple }}
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              )}
            </div>
          </div>
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default EditItemPage
