// Add Item wizard constants + combination builder (API-backed create).
import { roundMoney } from '@/lib/money'

// Form display for prices — whole units only (10, not 10.01)
function formatPriceInput(value) {
  if (value === '' || value == null) return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n))
}

export const ADD_ITEM_TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'type', label: 'Product Type' },
  { id: 'variantTypes', label: 'Variant Type', variantOnly: true },
  { id: 'values', label: 'Values', variantOnly: true },
  { id: 'combinations', label: 'Combinations', variantOnly: true },
  { id: 'save', label: 'Save' },
]

export const PRODUCT_KIND = {
  NORMAL: 'normal',
  VARIANT: 'variant',
}

// Cartesian product of value arrays → combination rows
export function buildCombinations(selectedTypes) {
  // selectedTypes: [{ typeId, typeName, values: [{ id, name }] }]
  const lists = selectedTypes
    .map((t) =>
      (t.values || []).map((v) => ({
        typeId: t.typeId,
        typeName: t.typeName,
        valueId: v.id,
        valueName: v.name,
        isCustomType: Boolean(t.isCustom),
        isCustomValue: Boolean(v.isCustom),
      })),
    )
    .filter((list) => list.length > 0)

  if (!lists.length) return []

  let combos = [[]]
  for (const list of lists) {
    const next = []
    for (const prefix of combos) {
      for (const item of list) {
        next.push([...prefix, item])
      }
    }
    combos = next
  }

  return combos.map((parts) => {
    const label = parts.map((p) => p.valueName).join('–')
    return {
      key: parts.map((p) => p.valueId).join('|'),
      label,
      parts,
      // Assigned by the server on create (same as modal ItemFormDialog)
      sku: '',
      barcode: '',
      purchasePrice: '',
      sellingPrice: '',
      openingStock: '0',
      lowStockThreshold: '',
      dailyPriceChange: false,
      offerId: '',
      discountPercent: '',
      status: 'active',
    }
  })
}

export function formatOfferOptionLabel(offer) {
  if (!offer) return ''
  const name = offer.name || 'Offer'
  const percent = Number(offer.percent)
  if (percent && percent > 0 && !name.includes('%')) {
    return `${name} – ${percent}%`
  }
  return name
}

/** Map selected offer → { offerId, discountPercent } for API (Discount & Offer = one promo). */
export function promoFromOfferId(offerId, offers = []) {
  if (!offerId) return { offerId: null, discountPercent: null }
  const selected = (offers || []).find((o) => o.id === offerId)
  return {
    offerId,
    discountPercent:
      selected?.percent != null && selected.percent !== ''
        ? Math.round(Number(selected.percent))
        : null,
  }
}

export function assertSellingGtePurchase(purchasePrice, sellingPrice) {
  const purchase = Number(purchasePrice)
  const selling = Number(sellingPrice)
  if (!Number.isFinite(purchase) || !Number.isFinite(selling)) return null
  if (selling < purchase) {
    return 'Selling price must be greater than or equal to purchase price'
  }
  return null
}

// Build POST /inventory/products body from wizard state
export function buildAddItemApiPayload({
  form,
  productKind,
  combinations = [],
  selectedTypes = [],
  selectedValuesByType = {},
  offers = [],
}) {
  const name = String(form.name || '').trim()
  const description = String(form.description || '').trim() || undefined
  const categoryId = form.categoryId || undefined
  const subcategoryId = form.subcategoryId || undefined

  if (productKind === PRODUCT_KIND.NORMAL) {
    const itemCode = String(form.sku || '').trim()
    const barcode = String(form.barcode || '').trim()
    const promo = promoFromOfferId(form.offerId, offers)
    return {
      name,
      description,
      categoryId,
      subcategoryId,
      type: 'single',
      scale: 'unit',
      ...(itemCode ? { itemCode } : {}),
      ...(barcode ? { barcode } : {}),
      purchasePrice: roundMoney(form.purchasePrice),
      sellingPrice: roundMoney(form.sellingPrice),
      quantity: Number(form.openingStock) || 0,
      reorderPoint:
        form.lowStockThreshold === '' || form.lowStockThreshold == null
          ? undefined
          : Number(form.lowStockThreshold),
      dailyPriceChange: Boolean(form.dailyPriceChange),
      offerId: promo.offerId,
      discountPercent: promo.discountPercent,
      confirmed: true,
    }
  }

  const activeRows = combinations.filter((row) => row.status === 'active')
  const variants = activeRows.map((row) => {
    const itemCode = String(row.sku || '').trim()
    const barcode = String(row.barcode || '').trim()
    const promo = promoFromOfferId(row.offerId, offers)
    return {
      label: row.label,
      ...(itemCode ? { itemCode } : {}),
      ...(barcode ? { barcode } : {}),
      purchasePrice: roundMoney(row.purchasePrice),
      sellingPrice: roundMoney(row.sellingPrice),
      quantity: Number(row.openingStock) || 0,
      reorderPoint:
        row.lowStockThreshold === '' || row.lowStockThreshold == null
          ? undefined
          : Number(row.lowStockThreshold),
      dailyPriceChange: Boolean(row.dailyPriceChange),
      offerId: promo.offerId,
      discountPercent: promo.discountPercent,
      status: 'active',
      parts: (row.parts || []).map((p) => ({
        typeId: p.typeId,
        typeName: p.typeName,
        valueId: p.valueId,
        valueName: p.valueName,
        isCustomType: Boolean(p.isCustomType),
        isCustomValue: Boolean(p.isCustomValue),
      })),
    }
  })

  // TEMP: custom type/value metadata kept for BM notify (task 4)
  const customMeta = selectedTypes.map((t) => ({
    id: t.id,
    name: t.name,
    isCustom: Boolean(t.isCustom),
    values: (t.values || [])
      .filter((v) => (selectedValuesByType[t.id] || []).includes(v.id))
      .map((v) => ({ id: v.id, name: v.name, isCustom: Boolean(v.isCustom) })),
  }))

  return {
    name,
    description,
    categoryId,
    subcategoryId,
    type: 'variant',
    scale: 'unit',
    confirmed: true,
    variants,
    // Not sent to API — stripped in thunk; useful for console / future notify
    _customVariantMeta: customMeta,
  }
}

// Order-independent identity for a combination (Flavour×Size === Size×Flavour)
export function combinationMatchKey(parts = []) {
  return (parts || [])
    .map((p) => {
      const type = String(p?.typeName || '')
        .trim()
        .toLowerCase()
      const value = String(p?.valueName || p?.valueId || '')
        .trim()
        .toLowerCase()
      if (!value) return null
      return type ? `${type}:${value}` : value
    })
    .filter(Boolean)
    .sort()
    .join('|')
}

// Coalesce previous (loaded) SKUs onto a freshly built matrix by match key
export function mergeCombinationMatrix(generated = [], previous = []) {
  const byMatch = new Map()
  for (const row of previous) {
    const mk = combinationMatchKey(row.parts)
    if (!mk) continue
    // Prefer rows that already have a persisted productId
    const prior = byMatch.get(mk)
    if (!prior || (!prior.productId && row.productId)) {
      byMatch.set(mk, row)
    }
  }

  const byProductId = new Map(
    previous.filter((r) => r.productId).map((r) => [r.productId, r]),
  )

  const usedIds = new Set()
  const next = generated.map((row) => {
    const mk = combinationMatchKey(row.parts)
    const existing = mk ? byMatch.get(mk) : null
    if (!existing) return row
    if (existing.productId) usedIds.add(existing.productId)
    return {
      ...row,
      ...existing,
      // Matrix owns current type order / label / react key
      label: row.label,
      parts: row.parts,
      key: row.key,
      productId: existing.productId || null,
      openingStock: existing.productId
        ? existing.openingStock
        : (existing.openingStock ?? row.openingStock),
    }
  })

  // Keep existing SKUs whose values were deselected from the matrix
  for (const [productId, row] of byProductId) {
    if (usedIds.has(productId)) continue
    next.push({
      ...row,
      key: row.key || combinationMatchKey(row.parts) || productId,
    })
  }

  return next
}

// Map product detail → combination rows (edit)
export function variantsToCombinationRows(variants = []) {
  return (variants || []).map((v) => {
    const parts = (v.parts || []).map((p) => ({
      typeId: p.variantTypeId || p.typeId,
      typeName: p.typeName,
      valueId: p.variantValueId || p.valueId,
      valueName: p.valueName,
      isCustomType: Boolean(p.isCustomType),
      isCustomValue: Boolean(p.isCustomValue),
    }))
    const key =
      combinationMatchKey(parts) ||
      parts.map((p) => p.valueId || p.valueName).join('|') ||
      v.id ||
      `row-${v.variantLabel || v.label}`
    return {
      key,
      productId: v.id || null,
      label: v.variantLabel || v.label || parts.map((p) => p.valueName).join('–'),
      parts,
      sku: v.itemCode || '',
      barcode: v.barcode || '',
      // Whole-unit prices for spinner / typing (10 → 11, never 10.01)
      purchasePrice: formatPriceInput(v.purchasePrice),
      sellingPrice: formatPriceInput(v.sellingPrice),
      openingStock: String(v.quantity ?? 0),
      lowStockThreshold:
        v.reorderPoint === 0 || v.reorderPoint ? String(v.reorderPoint) : '',
      dailyPriceChange: Boolean(v.dailyPriceChange),
      offerId: v.offerId || '',
      offerName: v.offerName || '',
      discountPercent:
        v.discountPercent === 0 || v.discountPercent
          ? String(Math.round(Number(v.discountPercent)))
          : v.offerPercent === 0 || v.offerPercent
            ? String(Math.round(Number(v.offerPercent)))
            : '',
      status: v.status === 'inactive' ? 'inactive' : 'active',
    }
  })
}

// Infer selected types/values from existing child parts (+ merge into catalog list)
export function hydrateVariantSelectionFromRows(rows, catalogTypes = []) {
  const typeMap = new Map()
  for (const t of catalogTypes) {
    typeMap.set(t.id, {
      id: t.id,
      name: t.name,
      isCustom: Boolean(t.isCustom),
      values: [...(t.values || [])],
    })
  }

  const selectedTypeIds = []
  const selectedValuesByType = {}

  for (const row of rows) {
    for (const part of row.parts || []) {
      let typeId = part.typeId
      if (!typeId || !typeMap.has(typeId)) {
        // Custom / missing — key by type name
        const existing = [...typeMap.values()].find(
          (t) => t.name.toLowerCase() === String(part.typeName || '').toLowerCase(),
        )
        if (existing) {
          typeId = existing.id
        } else {
          typeId = part.typeId || `custom-type-${part.typeName}`
          typeMap.set(typeId, {
            id: typeId,
            name: part.typeName,
            isCustom: true,
            values: [],
          })
        }
      }
      const type = typeMap.get(typeId)
      if (!selectedTypeIds.includes(typeId)) selectedTypeIds.push(typeId)

      let valueId = part.valueId
      const valueExists = type.values.some((v) => v.id === valueId)
      if (!valueId || !valueExists) {
        const byName = type.values.find(
          (v) => v.name.toLowerCase() === String(part.valueName || '').toLowerCase(),
        )
        if (byName) {
          valueId = byName.id
        } else {
          valueId = part.valueId || `custom-val-${part.typeName}-${part.valueName}`
          type.values.push({
            id: valueId,
            name: part.valueName,
            isCustom: Boolean(part.isCustomValue) || !part.valueId,
          })
        }
      }
      const bucket = selectedValuesByType[typeId] || []
      if (!bucket.includes(valueId)) bucket.push(valueId)
      selectedValuesByType[typeId] = bucket

      // Keep parts aligned with resolved ids for rebuild matching
      part.typeId = typeId
      part.valueId = valueId
    }
  }

  return {
    variantTypes: [...typeMap.values()],
    selectedTypeIds,
    selectedValuesByType,
  }
}

// PATCH body for Edit Item
export function buildEditItemApiPayload({
  form,
  productKind,
  combinations = [],
  offers = [],
}) {
  const name = String(form.name || '').trim()
  const description = String(form.description || '').trim() || undefined
  const categoryId = form.categoryId || undefined
  const subcategoryId = form.subcategoryId || undefined

  if (productKind === PRODUCT_KIND.NORMAL) {
    const itemCode = String(form.sku || '').trim()
    const barcode = String(form.barcode || '').trim()
    const promo = promoFromOfferId(form.offerId, offers)
    return {
      name,
      description,
      categoryId,
      subcategoryId,
      // type omitted — locked after create (API rejects type changes)
      scale: 'unit',
      ...(itemCode ? { itemCode } : {}),
      ...(barcode ? { barcode } : {}),
      purchasePrice: roundMoney(form.purchasePrice),
      sellingPrice: roundMoney(form.sellingPrice),
      reorderPoint:
        form.lowStockThreshold === '' || form.lowStockThreshold == null
          ? undefined
          : Number(form.lowStockThreshold),
      dailyPriceChange: Boolean(form.dailyPriceChange),
      offerId: promo.offerId,
      discountPercent: promo.discountPercent,
      status: form.status === 'inactive' ? 'inactive' : 'active',
    }
  }

  const variants = combinations.map((row) => {
    const itemCode = String(row.sku || '').trim()
    const barcode = String(row.barcode || '').trim()
    const promo = promoFromOfferId(row.offerId, offers)
    const base = {
      label: row.label,
      ...(itemCode ? { itemCode } : {}),
      ...(barcode ? { barcode } : {}),
      purchasePrice: roundMoney(row.purchasePrice),
      sellingPrice: roundMoney(row.sellingPrice),
      reorderPoint:
        row.lowStockThreshold === '' || row.lowStockThreshold == null
          ? undefined
          : Number(row.lowStockThreshold),
      dailyPriceChange: Boolean(row.dailyPriceChange),
      offerId: promo.offerId,
      discountPercent: promo.discountPercent,
      status: row.status === 'inactive' ? 'inactive' : 'active',
      parts: (row.parts || []).map((p) => ({
        typeId: p.typeId,
        typeName: p.typeName,
        valueId: p.valueId,
        valueName: p.valueName,
        isCustomType: Boolean(p.isCustomType),
        isCustomValue: Boolean(p.isCustomValue),
      })),
    }
    if (row.productId) {
      return { ...base, id: row.productId }
    }
    // New SKU — opening stock allowed; codes generated on server if omitted
    return {
      ...base,
      quantity: Number(row.openingStock) || 0,
    }
  })

  return {
    name,
    description,
    categoryId,
    subcategoryId,
    // type omitted — locked after create (API rejects type changes)
    scale: 'unit',
    status: form.status === 'inactive' ? 'inactive' : 'active',
    variants,
  }
}

