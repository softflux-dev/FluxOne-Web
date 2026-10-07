// Full-catalog Import / Export — category resolve-or-create, singles / variants / bundles.
import crypto from 'crypto'
import { tenantQuery } from '../../../config/db.js'
import { PRODUCT_TYPES } from '../../../config/constants.js'
import { generateBarcodeValue } from '../../../utils/barcode.util.js'
import { findOrCreateTaxByRate } from '../../../utils/tax.util.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'
import { createCategory, createProduct } from './product.model.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function branchClause(alias, paramIndex) {
  const col = alias ? `${alias}.branch_id` : 'branch_id'
  return `AND ($${paramIndex}::uuid IS NULL OR ${col} = $${paramIndex})`
}

function normName(value) {
  return String(value || '').trim()
}

function catKey(parentId, name) {
  return `${parentId || 'root'}::${normName(name).toLowerCase()}`
}

// Parse "Color:Red|Size:M" → parts for createVariantProduct
export function parseVariantOptions(raw) {
  const text = String(raw || '').trim()
  if (!text) return []
  return text
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':')
      if (idx <= 0) {
        return {
          typeName: 'Option',
          valueName: part,
          isCustomType: true,
          isCustomValue: true,
        }
      }
      return {
        typeName: part.slice(0, idx).trim() || 'Option',
        valueName: part.slice(idx + 1).trim(),
        isCustomType: true,
        isCustomValue: true,
      }
    })
    .filter((p) => p.valueName)
}

export function formatVariantOptions(parts = []) {
  return (parts || [])
    .map((p) => `${p.typeName || p.type_name || 'Option'}:${p.valueName || p.value_name || ''}`)
    .filter((s) => !s.endsWith(':'))
    .join('|')
}

// Find category by name under parent (branch-scoped); create if missing; reactivate if inactive.
async function resolveOrCreateCategory(tenantId, branchId, name, parentId = null, cache) {
  const trimmed = normName(name)
  if (!trimmed) return null

  const key = catKey(parentId, trimmed)
  if (cache.has(key)) return cache.get(key)

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, is_active AS "isActive"
      FROM categories
      WHERE tenant_id = $1
        AND branch_id = $2
        AND lower(name) = lower($3)
        AND (
          ($4::uuid IS NULL AND parent_id IS NULL)
          OR parent_id = $4
        )
      LIMIT 1
    `,
    [branchId, trimmed, parentId],
  )

  if (rows[0]) {
    if (!rows[0].isActive) {
      // Soft-deleted name reuse — reactivate via createCategory path (handles unique)
      const revived = await createCategory(tenantId, {
        name: trimmed,
        parentId,
        branchId,
      })
      cache.set(key, revived.id)
      return revived.id
    }
    cache.set(key, rows[0].id)
    return rows[0].id
  }

  const created = await createCategory(tenantId, {
    name: trimmed,
    parentId,
    branchId,
  })
  cache.set(key, created.id)
  return created.id
}

async function resolveCategoryPair(tenantId, branchId, categoryName, subcategoryName, cache) {
  const catName = normName(categoryName)
  const subName = normName(subcategoryName)
  if (!catName && subName) {
    throw httpError(422, 'Category is required when subcategory is set')
  }
  if (!catName) return { categoryId: undefined, subcategoryId: undefined }

  const categoryId = await resolveOrCreateCategory(tenantId, branchId, catName, null, cache)
  let subcategoryId
  if (subName) {
    subcategoryId = await resolveOrCreateCategory(tenantId, branchId, subName, categoryId, cache)
  }
  return { categoryId, subcategoryId }
}

async function findOfferIdByName(tenantId, offerName) {
  const name = normName(offerName)
  if (!name) return undefined
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id FROM offers
      WHERE tenant_id = $1 AND lower(name) = lower($2)
      LIMIT 1
    `,
    [name],
  )
  return rows[0]?.id
}

async function findProductIdByItemCode(tenantId, branchId, itemCode) {
  const code = normName(itemCode)
  if (!code) return null
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, type, parent_id AS "parentId"
      FROM products
      WHERE tenant_id = $1 AND branch_id = $2 AND lower(item_code) = lower($3)
      LIMIT 1
    `,
    [branchId, code],
  )
  return rows[0] || null
}

async function loadVariantChildren(tenantId, parentId) {
  const { rows: childRows } = await tenantQuery(
    tenantId,
    `
      SELECT
        c.id,
        c.item_code AS "itemCode",
        c.name,
        c.barcode,
        c.scale,
        c.status,
        c.quantity,
        c.reorder_point AS "reorderPoint",
        c.description,
        c.discount_percent AS "discountPercent",
        c.purchase_price AS "purchasePrice",
        c.selling_price AS "sellingPrice",
        c.variant_label AS "variantLabel",
        c.daily_price_change AS "dailyPriceChange"
      FROM products c
      WHERE c.tenant_id = $1 AND c.parent_id = $2
      ORDER BY c.variant_label ASC NULLS LAST, c.created_at ASC
    `,
    [parentId],
  )

  if (!childRows.length) return []

  const ids = childRows.map((c) => c.id)
  const { rows: optRows } = await tenantQuery(
    tenantId,
    `
      SELECT
        product_id AS "productId",
        type_name AS "typeName",
        value_name AS "valueName",
        sort_order AS "sortOrder"
      FROM product_variant_options
      WHERE tenant_id = $1 AND product_id = ANY($2::uuid[])
      ORDER BY product_id, sort_order ASC
    `,
    [ids],
  )

  const optsByProduct = new Map()
  for (const o of optRows) {
    const bucket = optsByProduct.get(o.productId) || []
    bucket.push(o)
    optsByProduct.set(o.productId, bucket)
  }

  return childRows.map((c) => ({
    ...c,
    parts: optsByProduct.get(c.id) || [],
  }))
}

async function loadBundleComponents(tenantId, bundleId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        cp.item_code AS "itemCode",
        bi.quantity
      FROM bundle_items bi
      JOIN products cp ON cp.id = bi.item_id AND cp.tenant_id = bi.tenant_id
      WHERE bi.tenant_id = $1 AND bi.bundle_id = $2
      ORDER BY cp.name
    `,
    [bundleId],
  )
  return rows
}

function emptyExportFields() {
  return {
    rowKind: 'product',
    itemCode: '',
    name: '',
    barcode: '',
    type: 'single',
    scale: 'unit',
    status: 'active',
    category: '',
    subcategory: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    reorderPoint: '',
    description: '',
    discountPercent: '',
    offerName: '',
    taxPercent: '',
    dailyPriceChange: '',
    parentItemCode: '',
    variantLabel: '',
    variantOptions: '',
    componentItemCode: '',
    componentQty: '',
  }
}

// Build flat CSV rows for the whole catalog (parents + variant children + bundle lines).
export async function buildProductExportRows(tenantId, { branchId = null } = {}) {
  const { rows: parents } = await tenantQuery(
    tenantId,
    `
      SELECT
        p.id,
        p.item_code AS "itemCode",
        p.name,
        p.barcode,
        p.type,
        p.scale,
        p.status,
        p.quantity,
        p.reorder_point AS "reorderPoint",
        p.description,
        p.discount_percent AS "discountPercent",
        p.purchase_price AS "purchasePrice",
        p.selling_price AS "sellingPrice",
        p.daily_price_change AS "dailyPriceChange",
        cat.name AS "category",
        sub.name AS "subcategory",
        o.name AS "offerName",
        COALESCE(tax.tax_percent, 0) AS "taxPercent"
      FROM products p
      LEFT JOIN categories cat ON cat.id = p.category_id AND cat.tenant_id = p.tenant_id
      LEFT JOIN categories sub ON sub.id = p.subcategory_id AND sub.tenant_id = p.tenant_id
      LEFT JOIN offers o ON o.id = p.offer_id AND o.tenant_id = p.tenant_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(t.rate_percent), 0) AS tax_percent
        FROM product_taxes pt
        JOIN taxes t ON t.id = pt.tax_id AND t.tenant_id = p.tenant_id
        WHERE pt.tenant_id = p.tenant_id AND pt.product_id = p.id
      ) tax ON true
      WHERE p.tenant_id = $1
        AND p.parent_id IS NULL
        ${branchClause('p', 2)}
      ORDER BY p.created_at DESC
    `,
    [branchId],
  )

  const collected = []
  for (const p of parents) {
    const base = {
      ...emptyExportFields(),
      rowKind: 'product',
      itemCode: p.itemCode || '',
      name: p.name || '',
      barcode: p.barcode || '',
      type: p.type || PRODUCT_TYPES.SINGLE,
      scale: p.scale || 'unit',
      status: p.status === 'inactive' ? 'inactive' : 'active',
      category: p.category || '',
      subcategory: p.subcategory || '',
      purchasePrice: p.purchasePrice ?? 0,
      sellingPrice: p.sellingPrice ?? 0,
      quantity: p.quantity ?? 0,
      reorderPoint: p.reorderPoint ?? 10,
      description: p.description || '',
      discountPercent: p.discountPercent ?? 0,
      offerName: p.offerName || '',
      taxPercent: Number(p.taxPercent || 0),
      dailyPriceChange: Boolean(p.dailyPriceChange),
    }
    collected.push(base)

    if (p.type === PRODUCT_TYPES.VARIANT) {
      const children = await loadVariantChildren(tenantId, p.id)
      for (const child of children) {
        collected.push({
          ...emptyExportFields(),
          rowKind: 'variant',
          itemCode: child.itemCode || '',
          name: child.name || p.name || '',
          barcode: child.barcode || '',
          type: PRODUCT_TYPES.SINGLE,
          scale: child.scale || p.scale || 'unit',
          status: child.status === 'inactive' ? 'inactive' : 'active',
          category: base.category,
          subcategory: base.subcategory,
          purchasePrice: child.purchasePrice ?? 0,
          sellingPrice: child.sellingPrice ?? 0,
          quantity: child.quantity ?? 0,
          reorderPoint: child.reorderPoint ?? 10,
          description: child.description || '',
          discountPercent: child.discountPercent ?? 0,
          taxPercent: base.taxPercent,
          dailyPriceChange: Boolean(child.dailyPriceChange),
          parentItemCode: p.itemCode || '',
          variantLabel: child.variantLabel || '',
          variantOptions: formatVariantOptions(child.parts),
        })
      }
    }

    if (p.type === PRODUCT_TYPES.BUNDLE) {
      const components = await loadBundleComponents(tenantId, p.id)
      for (const comp of components) {
        collected.push({
          ...emptyExportFields(),
          rowKind: 'bundle_item',
          parentItemCode: p.itemCode || '',
          componentItemCode: comp.itemCode || '',
          componentQty: Number(comp.quantity) || 1,
        })
      }
    }
  }

  return collected
}

function groupRows(rows) {
  const products = []
  const variantsByParent = new Map()
  const bundleItemsByParent = new Map()

  for (const row of rows) {
    const kind = String(row.rowKind || 'product').toLowerCase()
    if (kind === 'variant') {
      const parent = normName(row.parentItemCode)
      if (!parent) continue
      const bucket = variantsByParent.get(parent) || []
      bucket.push(row)
      variantsByParent.set(parent, bucket)
      continue
    }
    if (kind === 'bundle_item' || kind === 'bundleitem') {
      const parent = normName(row.parentItemCode)
      if (!parent) continue
      const bucket = bundleItemsByParent.get(parent) || []
      bucket.push(row)
      bundleItemsByParent.set(parent, bucket)
      continue
    }
    products.push(row)
  }

  return { products, variantsByParent, bundleItemsByParent }
}

async function resolveTaxIdsForRow(tenantId, row) {
  if (row.taxPercent === undefined || row.taxPercent === null || row.taxPercent === '') {
    return undefined // tenant default
  }
  const taxId = await findOrCreateTaxByRate(tenantId, row.taxPercent)
  if (taxId === null) return [] // 0% / invalid → exempt
  return [taxId]
}

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'inactive' || s === 'close' ? 'inactive' : 'active'
}

async function importOneSingle(tenantId, branchId, row, categoryCache, createdBy) {
  const sku = normName(row.itemCode || row.sku)
  const existing = await findProductIdByItemCode(tenantId, branchId, sku)
  if (existing) {
    throw httpError(409, `Item code already exists (${sku})`)
  }

  const { categoryId, subcategoryId } = await resolveCategoryPair(
    tenantId,
    branchId,
    row.category,
    row.subcategory,
    categoryCache,
  )
  const offerId = await findOfferIdByName(tenantId, row.offerName)
  const taxIds = await resolveTaxIdsForRow(tenantId, row)

  return createProduct(tenantId, {
    name: normName(row.name),
    categoryId,
    subcategoryId,
    branchId,
    type: PRODUCT_TYPES.SINGLE,
    scale: row.scale || 'unit',
    itemCode: sku,
    barcode: normName(row.barcode) || generateBarcodeValue(),
    purchasePrice: Number(row.purchasePrice) || 0,
    sellingPrice: Number(row.sellingPrice) || 0,
    quantity: Number(row.quantity) || 0,
    reorderPoint: row.reorderPoint == null || row.reorderPoint === '' ? undefined : Number(row.reorderPoint),
    description: row.description || undefined,
    discountPercent: row.discountPercent == null || row.discountPercent === '' ? undefined : Number(row.discountPercent),
    offerId,
    taxIds,
    status: normalizeStatus(row.status),
    dailyPriceChange: Boolean(row.dailyPriceChange),
    createdBy,
  })
}

async function importOneVariant(tenantId, branchId, parentRow, childRows, categoryCache, createdBy) {
  const parentSku = normName(parentRow.itemCode || parentRow.sku)
  const existing = await findProductIdByItemCode(tenantId, branchId, parentSku)
  if (existing) {
    throw httpError(409, `Item code already exists (${parentSku})`)
  }
  if (!childRows.length) {
    throw httpError(422, `Variant “${parentSku}” needs at least one variant row`)
  }

  const { categoryId, subcategoryId } = await resolveCategoryPair(
    tenantId,
    branchId,
    parentRow.category,
    parentRow.subcategory,
    categoryCache,
  )
  const offerId = await findOfferIdByName(tenantId, parentRow.offerName)
  const taxIds = await resolveTaxIdsForRow(tenantId, parentRow)

  const variants = childRows.map((child, index) => {
    const label =
      normName(child.variantLabel) ||
      normName(child.name) ||
      `Variant ${index + 1}`
    const parts = parseVariantOptions(child.variantOptions)
    if (!parts.length) {
      parts.push({
        typeName: 'Option',
        valueName: label,
        isCustomType: true,
        isCustomValue: true,
      })
    }
    return {
      label,
      itemCode: normName(child.itemCode || child.sku),
      barcode: normName(child.barcode) || generateBarcodeValue(),
      purchasePrice: Number(child.purchasePrice) || 0,
      sellingPrice: Number(child.sellingPrice) || 0,
      quantity: Number(child.quantity) || 0,
      reorderPoint:
        child.reorderPoint == null || child.reorderPoint === ''
          ? undefined
          : Number(child.reorderPoint),
      dailyPriceChange: Boolean(child.dailyPriceChange),
      status: normalizeStatus(child.status),
      parts,
    }
  })

  return createProduct(tenantId, {
    name: normName(parentRow.name),
    categoryId,
    subcategoryId,
    branchId,
    type: PRODUCT_TYPES.VARIANT,
    scale: parentRow.scale || 'unit',
    itemCode: parentSku,
    barcode: normName(parentRow.barcode) || generateBarcodeValue(),
    description: parentRow.description || undefined,
    discountPercent:
      parentRow.discountPercent == null || parentRow.discountPercent === ''
        ? undefined
        : Number(parentRow.discountPercent),
    offerId,
    taxIds,
    status: normalizeStatus(parentRow.status),
    variants,
    creationBatchId: crypto.randomUUID(),
    createdBy,
  })
}

async function importOneBundle(tenantId, branchId, parentRow, componentRows, categoryCache, createdBy) {
  const bundleSku = normName(parentRow.itemCode || parentRow.sku)
  const existing = await findProductIdByItemCode(tenantId, branchId, bundleSku)
  if (existing) {
    throw httpError(409, `Item code already exists (${bundleSku})`)
  }
  if (!componentRows.length) {
    throw httpError(422, `Bundle “${bundleSku}” needs at least one bundle_item row`)
  }

  const bundleItems = []
  for (const comp of componentRows) {
    const code = normName(comp.componentItemCode)
    const found = await findProductIdByItemCode(tenantId, branchId, code)
    if (!found) {
      throw httpError(422, `Bundle component not found: ${code}`)
    }
    if (found.type === PRODUCT_TYPES.VARIANT || found.parentId) {
      throw httpError(422, `Bundle component must be a single SKU: ${code}`)
    }
    bundleItems.push({
      itemId: found.id,
      quantity: Math.max(0.001, Number(comp.componentQty) || 1),
    })
  }

  const { categoryId, subcategoryId } = await resolveCategoryPair(
    tenantId,
    branchId,
    parentRow.category,
    parentRow.subcategory,
    categoryCache,
  )
  const offerId = await findOfferIdByName(tenantId, parentRow.offerName)
  const taxIds = await resolveTaxIdsForRow(tenantId, parentRow)

  return createProduct(tenantId, {
    name: normName(parentRow.name),
    categoryId,
    subcategoryId,
    branchId,
    type: PRODUCT_TYPES.BUNDLE,
    scale: parentRow.scale || 'unit',
    itemCode: bundleSku,
    barcode: normName(parentRow.barcode) || generateBarcodeValue(),
    purchasePrice: Number(parentRow.purchasePrice) || 0,
    sellingPrice: Number(parentRow.sellingPrice) || 0,
    quantity: Number(parentRow.quantity) || 0,
    reorderPoint:
      parentRow.reorderPoint == null || parentRow.reorderPoint === ''
        ? undefined
        : Number(parentRow.reorderPoint),
    description: parentRow.description || undefined,
    discountPercent:
      parentRow.discountPercent == null || parentRow.discountPercent === ''
        ? undefined
        : Number(parentRow.discountPercent),
    offerId,
    taxIds,
    status: normalizeStatus(parentRow.status),
    dailyPriceChange: Boolean(parentRow.dailyPriceChange),
    bundleItems,
    createdBy,
  })
}

// Import full catalog rows (create-only; duplicate itemCode → row error).
export async function importCatalogRows(tenantId, rows, { branchId, createdBy = null } = {}) {
  if (!branchId) throw httpError(422, 'branchId is required to import products')
  if (!Array.isArray(rows) || !rows.length) {
    throw httpError(422, 'At least one import row is required')
  }

  const categoryCache = new Map()
  const { products, variantsByParent, bundleItemsByParent } = groupRows(rows)

  const singles = []
  const variants = []
  const bundles = []

  for (const row of products) {
    const type = String(row.type || PRODUCT_TYPES.SINGLE).toLowerCase()
    if (type === PRODUCT_TYPES.VARIANT) variants.push(row)
    else if (type === PRODUCT_TYPES.BUNDLE) bundles.push(row)
    else singles.push(row)
  }

  const created = []
  const errors = []

  // 1) Singles first — bundles may reference them
  for (const [index, row] of singles.entries()) {
    try {
      const product = await importOneSingle(tenantId, branchId, row, categoryCache, createdBy)
      created.push(product)
    } catch (err) {
      errors.push(
        err?.code === '23505'
          ? `Single row ${index + 1}: item code or barcode already exists (${row.itemCode || row.sku})`
          : err?.message || `Single row ${index + 1}: import failed`,
      )
    }
  }

  // 2) Variants (+ child rows keyed by parent itemCode)
  for (const [index, row] of variants.entries()) {
    const parentSku = normName(row.itemCode || row.sku)
    try {
      const children = variantsByParent.get(parentSku) || []
      const product = await importOneVariant(
        tenantId,
        branchId,
        row,
        children,
        categoryCache,
        createdBy,
      )
      created.push(product)
    } catch (err) {
      errors.push(
        err?.code === '23505'
          ? `Variant “${parentSku}”: item code or barcode already exists`
          : err?.message || `Variant row ${index + 1}: import failed`,
      )
    }
  }

  // 3) Bundles (+ component rows)
  for (const [index, row] of bundles.entries()) {
    const bundleSku = normName(row.itemCode || row.sku)
    try {
      const components = bundleItemsByParent.get(bundleSku) || []
      const product = await importOneBundle(
        tenantId,
        branchId,
        row,
        components,
        categoryCache,
        createdBy,
      )
      created.push(product)
    } catch (err) {
      errors.push(
        err?.code === '23505'
          ? `Bundle “${bundleSku}”: item code or barcode already exists`
          : err?.message || `Bundle row ${index + 1}: import failed`,
      )
    }
  }

  // Orphan child rows (parent product row missing)
  for (const [parentSku, children] of variantsByParent.entries()) {
    if (variants.some((v) => normName(v.itemCode || v.sku) === parentSku)) continue
    errors.push(
      `Variant children for “${parentSku}” skipped — add a product row with type=variant`,
    )
    void children
  }
  for (const [parentSku] of bundleItemsByParent.entries()) {
    if (bundles.some((b) => normName(b.itemCode || b.sku) === parentSku)) continue
    errors.push(
      `Bundle items for “${parentSku}” skipped — add a product row with type=bundle`,
    )
  }

  return {
    imported: created.length,
    failed: errors.length,
    errors: errors.length ? errors : undefined,
    items: created.map((p) => ({
      id: p.id,
      name: p.name,
      itemCode: p.itemCode,
      type: p.type,
      imageUrl: normalizeImageUrl(p.imageUrl),
    })),
  }
}
