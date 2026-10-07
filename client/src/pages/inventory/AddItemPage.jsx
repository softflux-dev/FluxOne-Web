import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { CombinationTable, NormalProductFields } from '@/components/feature/products/add-item/CombinationTable'
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
  buildAddItemApiPayload,
  buildCombinations,
} from '@/lib/addItem'
import { BRAND } from '@/lib/constants'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess, toastInfo } from '@/lib/toast'
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
    // Optional product image (File) — uploaded after create via PATCH
    image: null,
  }
}

export function AddItemPage() {
  const navigate = useNavigate()
  const { catalog, catalogLoading, createProduct } = useProducts({}, { skipList: true })

  const [tab, setTab] = useState('basic')
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [variantsLoading, setVariantsLoading] = useState(true)

  const [variantTypes, setVariantTypes] = useState([])
  const [selectedTypeIds, setSelectedTypeIds] = useState([])
  const [selectedValuesByType, setSelectedValuesByType] = useState({})
  const [combinations, setCombinations] = useState([])
  const [selectedComboKeys, setSelectedComboKeys] = useState([])

  const isVariant = form.productKind === PRODUCT_KIND.VARIANT
  const isNormal = form.productKind === PRODUCT_KIND.NORMAL

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
    () => variantTypes.filter((t) => selectedTypeIds.includes(t.id)),
    [variantTypes, selectedTypeIds],
  )

  // Load BM variant catalog (IM has resources:read)
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

  useEffect(() => {
    setSelectedValuesByType((prev) => {
      const next = {}
      for (const id of selectedTypeIds) {
        next[id] = prev[id] || []
      }
      return next
    })
  }, [selectedTypeIds])

  useEffect(() => {
    if (!isVariant) {
      setCombinations([])
      setSelectedComboKeys([])
      return
    }
    const forBuild = selectedTypes.map((t) => ({
      typeId: t.id,
      typeName: t.name,
      isCustom: Boolean(t.isCustom),
      values: (t.values || []).filter((v) => (selectedValuesByType[t.id] || []).includes(v.id)),
    }))
    const generated = buildCombinations(forBuild)
    setCombinations((prev) => {
      const byKey = new Map(prev.map((r) => [r.key, r]))
      return generated.map((row) => {
        const existing = byKey.get(row.key)
        return existing ? { ...row, ...existing, label: row.label, parts: row.parts } : row
      })
    })
    setSelectedComboKeys((prev) => prev.filter((k) => generated.some((r) => r.key === k)))
  }, [isVariant, selectedTypes, selectedValuesByType])

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
    if (field === 'productKind' && value === PRODUCT_KIND.NORMAL) {
      setTab((current) => {
        const onlyVariant = ADD_ITEM_TABS.find((t) => t.id === current)?.variantOnly
        return onlyVariant ? 'save' : current
      })
    }
  }

  function addCustomType(name) {
    const id = newId('custom-type')
    setVariantTypes((prev) => [...prev, { id, name, isCustom: true, values: [] }])
    return id
  }

  function addCustomValue(typeId, name) {
    const id = newId('custom-val')
    setVariantTypes((prev) =>
      prev.map((t) =>
        t.id === typeId ? { ...t, values: [...t.values, { id, name, isCustom: true }] } : t,
      ),
    )
    return id
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
    if (tabId === 'type') {
      if (!form.productKind) return 'Select Normal Product or Variant Product'
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
      const active = combinations.filter((r) => r.status === 'active')
      if (!active.length) return 'At least one active combination is required'
      for (const row of active) {
        if (row.purchasePrice === '' || row.sellingPrice === '') {
          return `Fill purchase & selling price for active row “${row.label}”`
        }
        const priceErr = assertSellingGtePurchase(row.purchasePrice, row.sellingPrice)
        if (priceErr) return `“${row.label}”: ${priceErr}`
      }
    }
    if (tabId === 'save' && isNormal) {
      if (form.purchasePrice === '' || form.sellingPrice === '') {
        return 'Purchase and selling price are required'
      }
      const priceErr = assertSellingGtePurchase(form.purchasePrice, form.sellingPrice)
      if (priceErr) return priceErr
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
    } else {
      const saveErr = validateTab('save')
      if (saveErr) {
        setError(saveErr)
        toastError(saveErr)
        return
      }
    }

    setSaving(true)
    try {
      const payload = buildAddItemApiPayload({
        form,
        productKind: form.productKind,
        combinations,
        selectedTypes,
        selectedValuesByType,
        offers: catalog.offers || [],
      })
      // Attach optional image for create → then image PATCH
      if (form.image) payload.image = form.image
      // TEMP: inspect custom meta until BM notify (task 4)
      if (payload._customVariantMeta) {
        console.info('[AddItem custom variant meta]', payload._customVariantMeta)
      }

      const result = await createProduct(payload)
      if (!result.success) {
        toastError(result.error || 'Failed to save product')
        return
      }
      if (result.imageWarning) toastInfo(result.imageWarning)

      const variantCount = result.data?.variants?.length || payload.variants?.length || 0
      toastSuccess(
        isVariant
          ? `Variant product saved (${variantCount} SKUs)`
          : 'Product saved',
      )
      navigate(PATHS.inventory.products)
    } catch (e) {
      toastError(e?.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const tabIndex = visibleTabs.findIndex((t) => t.id === tab)

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Add Item"
          description="Create a Normal or Variant product. Combinations become independent SKUs."
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
          title={visibleTabs.find((t) => t.id === tab)?.label || 'Add Item'}
          description={
            tab === 'basic'
              ? 'Applies to the whole product (parent).'
              : tab === 'type'
                ? 'Normal = single SKU. Variant = combination matrix.'
                : tab === 'variantTypes'
                  ? 'Pick types from Branch Manager catalog, or add a custom type for this product.'
                  : tab === 'values'
                    ? 'Pick values per selected type, or add custom values.'
                    : tab === 'combinations'
                      ? 'Select rows, bulk-apply purchase / selling / stock / threshold, then fine-tune.'
                      : 'Review and save to the catalog.'
          }
        >
          {tab === 'basic' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-name">Product name</Label>
                <Input
                  id="add-name"
                  value={form.name}
                  onChange={(e) => patch('name', e.target.value)}
                  placeholder="e.g. Juice Bottle"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-desc">Description (optional)</Label>
                <Textarea
                  id="add-desc"
                  value={form.description}
                  onChange={(e) => patch('description', e.target.value)}
                  placeholder="General product description"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-cat">Category</Label>
                <NativeSelect
                  id="add-cat"
                  value={form.categoryId}
                  onChange={(e) => patch('categoryId', e.target.value)}
                  disabled={catalogLoading}
                >
                  <option value="">
                    {catalogLoading ? 'Loading categories…' : 'Select category'}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-sub">Sub category</Label>
                <NativeSelect
                  id="add-sub"
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
                  id="add-item-image"
                  label="Image"
                  optionalLabel="(optional)"
                  value={form.image}
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
                  body: 'Single SKU — price & stock on Save; item code & barcode auto-generated.',
                },
                {
                  id: PRODUCT_KIND.VARIANT,
                  title: 'Variant Product',
                  body: 'Multiple SKUs from types × values — combination table next.',
                },
              ].map((opt) => {
                const active = form.productKind === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch('productKind', opt.id)}
                    className={cn(
                      'cursor-pointer rounded-xl border px-4 py-4 text-left transition-colors',
                      active
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-border bg-white hover:border-slate-300',
                    )}
                    style={active ? { background: BRAND.purple } : undefined}
                  >
                    <p className={cn('text-sm font-semibold', active ? 'text-white' : 'text-slate-900')}>
                      {opt.title}
                    </p>
                    <p className={cn('mt-1 text-xs', active ? 'text-white/85' : 'text-slate-500')}>
                      {opt.body}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : null}

          {tab === 'variantTypes' ? (
            variantsLoading ? (
              <p className="text-sm text-slate-500">Loading variant types…</p>
            ) : (
              <SearchableMultiSelect
                label="Variant types"
                hint="Search, multi-select, or add a custom type (Branch Manager notified on save — coming soon)."
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
                <p className="text-sm text-slate-500">Go back and select at least one variant type.</p>
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
                    <span className="text-slate-500">Active combinations:</span>{' '}
                    {combinations.filter((r) => r.status === 'active').length}
                  </p>
                ) : null}
              </div>

              {isNormal ? (
                <NormalProductFields form={form} patch={patch} offers={catalog.offers || []} />
              ) : (
                <p className="text-sm text-slate-600">
                  Variant details were filled on the Combinations tab. Save creates the parent and
                  each active combination as its own SKU (shared batch timestamp).
                </p>
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
                  {saving ? 'Saving…' : 'Save product'}
                </Button>
              )}
            </div>
          </div>
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default AddItemPage
