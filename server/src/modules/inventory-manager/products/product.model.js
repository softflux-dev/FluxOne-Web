import crypto from 'crypto'
import { tenantClientQuery, tenantQuery, withTransaction } from '../../../config/db.js'
import { MOVEMENT_TYPES, PRODUCT_TYPES } from '../../../config/constants.js'
import { generateBarcodeValue, generateItemCode } from '../../../utils/barcode.util.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'
import {
  assertPriceChangeAllowed,
  insertLedgerEventInTx,
} from '../control/control.model.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

const LOOSE_UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function isLooseUuid(value) {
  return typeof value === 'string' && LOOSE_UUID_RE.test(value)
}

function mapUniqueViolation(err, message = 'Item code or barcode already exists') {
  if (err?.code === '23505') throw httpError(409, message)
  throw err
}

// Branch scope: null = all branches (B2B admin)
function branchClause(alias, paramIndex) {
  const col = alias ? `${alias}.branch_id` : 'branch_id'
  return `AND ($${paramIndex}::uuid IS NULL OR ${col} = $${paramIndex})`
}

export async function listCategories(tenantId, { active = 'active', branchId = null } = {}) {
  const activeClause =
    active === 'all'
      ? ''
      : active === 'inactive'
        ? 'AND is_active = false'
        : 'AND is_active = true'

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
        branch_id AS "branchId"
      FROM categories
      WHERE tenant_id = $1
        ${branchClause('', 2)}
        ${activeClause}
      ORDER BY name
    `,
    [branchId],
  )
  return rows.map((row) => ({
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }))
}

function mapCategoryRow(row) {
  if (!row) return null
  return {
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }
}

export async function createCategory(tenantId, { name, parentId, imageUrl, branchId }) {
  if (!branchId) throw httpError(422, 'branchId is required to create a category')

  if (parentId) {
    const { rows: parents } = await tenantQuery(
      tenantId,
      `
        SELECT id, is_active AS "isActive"
        FROM categories
        WHERE tenant_id = $1 AND id = $2 AND parent_id IS NULL
          AND branch_id = $3
        LIMIT 1
      `,
      [parentId, branchId],
    )
    if (!parents[0]) throw httpError(404, 'Parent category not found')
    if (!parents[0].isActive) throw httpError(409, 'Cannot add subcategory under an inactive category')
  }

  // Soft-deleted row with same name — reactivate instead of INSERT (unique index includes inactive)
  const { rows: existing } = await tenantQuery(
    tenantId,
    `
      SELECT id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
        branch_id AS "branchId"
      FROM categories
      WHERE tenant_id = $1
        AND branch_id = $2
        AND name = $3
        AND (
          ($4::uuid IS NULL AND parent_id IS NULL)
          OR parent_id = $4
        )
      LIMIT 1
    `,
    [branchId, name, parentId || null],
  )

  if (existing[0]) {
    if (existing[0].isActive) {
      throw httpError(409, 'A category with this name already exists')
    }
    const params = [existing[0].id]
    const imageSet = imageUrl ? `, image_url = $3` : ''
    if (imageUrl) params.push(imageUrl)
    const { rows } = await tenantQuery(
      tenantId,
      `
        UPDATE categories
        SET is_active = true${imageSet}
        WHERE tenant_id = $1 AND id = $2
        RETURNING id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
          branch_id AS "branchId"
      `,
      params,
    )
    return mapCategoryRow(rows[0])
  }

  try {
    const { rows } = await tenantQuery(
      tenantId,
      `
        INSERT INTO categories (tenant_id, branch_id, parent_id, name, image_url, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
          branch_id AS "branchId"
      `,
      [branchId, parentId || null, name, imageUrl || null],
    )
    return mapCategoryRow(rows[0])
  } catch (err) {
    mapUniqueViolation(err, 'A category with this name already exists')
  }
}

export async function updateCategory(tenantId, id, { name, imageUrl, isActive, branchId = null }) {
  if (isActive !== undefined) {
    return setCategoryActive(tenantId, id, isActive, { branchId })
  }

  const setClauses = []
  const params = [id, branchId]

  if (name !== undefined) {
    setClauses.push(`name = $${params.length + 2}`)
    params.push(name)
  }
  if (imageUrl !== undefined) {
    setClauses.push(`image_url = $${params.length + 2}`)
    params.push(imageUrl)
  }

  if (!setClauses.length) {
    const { rows } = await tenantQuery(
      tenantId,
      `
        SELECT id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
          branch_id AS "branchId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2
          ${branchClause('', 3)}
        LIMIT 1
      `,
      [id, branchId],
    )
    return mapCategoryRow(rows[0] || null)
  }

  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE categories
      SET ${setClauses.join(', ')}
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      RETURNING id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
        branch_id AS "branchId"
    `,
    params,
  )
  return mapCategoryRow(rows[0] || null)
}

// Soft-disable category.
// - Parent inactive → cascade inactive children; clear product category_id + subcategory_id
// - Subcategory inactive → clear product subcategory_id only
// Products stay active; category shows as N/A.
export async function setCategoryActive(tenantId, id, isActive, { branchId = null } = {}) {
  return withTransaction(async (client) => {
    const { rows: existing } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, parent_id AS "parentId", is_active AS "isActive", branch_id AS "branchId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2
          ${branchClause('', 3)}
        LIMIT 1
      `,
      [id, branchId],
    )
    const row = existing[0]
    if (!row) return null

    if (isActive) {
      if (row.parentId) {
        const { rows: parents } = await tenantClientQuery(
          client,
          tenantId,
          `
            SELECT is_active AS "isActive"
            FROM categories
            WHERE tenant_id = $1 AND id = $2
            LIMIT 1
          `,
          [row.parentId],
        )
        if (parents[0] && !parents[0].isActive) {
          throw httpError(409, 'Activate the parent category first')
        }
      }
      await tenantClientQuery(
        client,
        tenantId,
        `UPDATE categories SET is_active = true WHERE tenant_id = $1 AND id = $2`,
        [id],
      )
    } else {
      const isParent = !row.parentId
      if (isParent) {
        await tenantClientQuery(
          client,
          tenantId,
          `UPDATE categories SET is_active = false WHERE tenant_id = $1 AND (id = $2 OR parent_id = $2)`,
          [id],
        )
        await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE products
            SET category_id = NULL, subcategory_id = NULL
            WHERE tenant_id = $1 AND category_id = $2
          `,
          [id],
        )
      } else {
        await tenantClientQuery(
          client,
          tenantId,
          `UPDATE categories SET is_active = false WHERE tenant_id = $1 AND id = $2`,
          [id],
        )
        await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE products
            SET subcategory_id = NULL
            WHERE tenant_id = $1 AND subcategory_id = $2
          `,
          [id],
        )
      }
    }

    const { rows } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, parent_id AS "parentId", name, image_url AS "imageUrl", is_active AS "isActive",
          branch_id AS "branchId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2
        LIMIT 1
      `,
      [id],
    )
    return rows[0] || null
  })
}

// @deprecated Prefer setCategoryActive — hard delete kept for empty unused categories only
export async function deleteCategory(tenantId, id, { branchId = null } = {}) {
  return setCategoryActive(tenantId, id, false, { branchId })
}

export async function findOrCreateImportedCategory(tenantId, branchId) {
  if (!branchId) throw httpError(422, 'branchId is required to import products')

  const { rows: existing } = await tenantQuery(
    tenantId,
    `
      SELECT id FROM categories
      WHERE tenant_id = $1 AND branch_id = $2 AND name = 'Imported' AND parent_id IS NULL
      LIMIT 1
    `,
    [branchId],
  )
  if (existing[0]) return existing[0]
  return createCategory(tenantId, { name: 'Imported', branchId })
}

export async function listTaxes(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT id, name, rate_percent AS "ratePercent" FROM taxes WHERE tenant_id = $1 ORDER BY name`,
  )
  return rows
}

export async function listOffers(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `SELECT id, name, percent FROM offers WHERE tenant_id = $1 ORDER BY name`,
  )
  return rows
}

export async function listProducts(tenantId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 8))
  const offset = (page - 1) * limit

  const statusFilter =
    !filters.status || filters.status === 'all' ? null : filters.status

  const filterParams = [
    filters.q || null,
    filters.categoryId || null,
    filters.subcategoryId || null,
    filters.type || null,
    filters.scale || null,
    statusFilter,
    filters.branchId || null,
  ]

  // Single round-trip: page rows + total via window count (same response shape).
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        p.id,
        p.name,
        p.item_code AS "itemCode",
        p.barcode,
        p.type,
        p.scale,
        p.quantity,
        p.reorder_point AS "reorderPoint",
        p.status,
        p.image_url AS "imageUrl",
        p.description,
        p.category_id AS "categoryId",
        p.subcategory_id AS "subcategoryId",
        p.branch_id AS "branchId",
        p.purchase_price AS "purchasePrice",
        p.selling_price AS "sellingPrice",
        p.discount_percent AS "discountPercent",
        p.offer_id AS "offerId",
        o.name AS "offerName",
        o.percent AS "offerPercent",
        p.last_purchase_price AS "lastPurchasePrice",
        p.last_selling_price AS "lastSellingPrice",
        last_s.company_name AS "lastPurchaseVendorName",
        curr_s.company_name AS "currentPurchaseVendorName",
        COALESCE(tax.tax_percent, 0) AS "taxPercent",
        COALESCE(tax.tax_names, ARRAY[]::text[]) AS "taxNames",
        round(
          (
            p.selling_price
            * (1 - COALESCE(p.discount_percent, 0) / 100)
            * (1 - COALESCE(o.percent, 0) / 100)
            * (1 + COALESCE(tax.tax_percent, 0) / 100)
          )::numeric,
          2
        ) AS "finalPrice",
        count(*) OVER()::int AS "_total"
      FROM products p
      LEFT JOIN offers o ON o.id = p.offer_id AND o.tenant_id = p.tenant_id
      LEFT JOIN suppliers last_s ON last_s.id = p.last_purchase_supplier_id AND last_s.tenant_id = p.tenant_id
      LEFT JOIN suppliers curr_s ON curr_s.id = p.current_purchase_supplier_id AND curr_s.tenant_id = p.tenant_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(sum(t.rate_percent), 0) AS tax_percent,
          array_remove(array_agg(t.name), NULL) AS tax_names
        FROM product_taxes pt
        JOIN taxes t ON t.id = pt.tax_id AND t.tenant_id = p.tenant_id
        WHERE pt.tenant_id = p.tenant_id AND pt.product_id = p.id
      ) tax ON true
      WHERE p.tenant_id = $1
        AND p.parent_id IS NULL
        AND ($2::text IS NULL OR p.name ILIKE '%' || $2 || '%' OR p.item_code ILIKE '%' || $2 || '%' OR p.barcode ILIKE '%' || $2 || '%')
        AND ($3::uuid IS NULL OR p.category_id = $3)
        AND ($4::uuid IS NULL OR p.subcategory_id = $4)
        AND ($5::text IS NULL OR p.type = $5)
        AND ($6::text IS NULL OR p.scale = $6)
        AND ($7::text IS NULL OR p.status = $7)
        ${branchClause('p', 8)}
      ORDER BY p.created_at DESC
      LIMIT $9 OFFSET $10
    `,
    [...filterParams, limit, offset],
  )

  const total = rows[0]?._total || 0
  const items = rows.map(({ _total, ...item }) => ({
    ...item,
    imageUrl: normalizeImageUrl(item.imageUrl),
  }))
  return { items, total, page, limit }
}

export async function findProductByBarcode(tenantId, barcode, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, name, barcode, item_code AS "itemCode", branch_id AS "branchId"
      FROM products
      WHERE tenant_id = $1 AND barcode = $2
        ${branchClause('', 3)}
      LIMIT 1
    `,
    [barcode, branchId],
  )
  return rows[0] || null
}

export async function getProductById(tenantId, id, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, name, barcode, item_code AS "itemCode", branch_id AS "branchId"
      FROM products
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      LIMIT 1
    `,
    [id, branchId],
  )
  return rows[0] || null
}

export async function getProductDetail(tenantId, id, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        p.id,
        p.name,
        p.item_code AS "itemCode",
        p.barcode,
        p.type,
        p.scale,
        p.quantity,
        p.reorder_point AS "reorderPoint",
        p.status,
        p.image_url AS "imageUrl",
        p.description,
        p.category_id AS "categoryId",
        p.subcategory_id AS "subcategoryId",
        p.branch_id AS "branchId",
        p.parent_id AS "parentId",
        p.creation_batch_id AS "creationBatchId",
        p.variant_label AS "variantLabel",
        p.daily_price_change AS "dailyPriceChange",
        p.purchase_price AS "purchasePrice",
        p.selling_price AS "sellingPrice",
        p.discount_percent AS "discountPercent",
        p.offer_id AS "offerId",
        o.name AS "offerName",
        o.percent AS "offerPercent",
        p.last_purchase_price AS "lastPurchasePrice",
        p.last_selling_price AS "lastSellingPrice",
        last_s.company_name AS "lastPurchaseVendorName",
        curr_s.company_name AS "currentPurchaseVendorName",
        COALESCE(tax.tax_percent, 0) AS "taxPercent",
        COALESCE(tax.tax_names, ARRAY[]::text[]) AS "taxNames",
        COALESCE(tax.tax_ids, ARRAY[]::uuid[]) AS "taxIds",
        round(
          (
            p.selling_price
            * (1 - COALESCE(p.discount_percent, 0) / 100)
            * (1 - COALESCE(o.percent, 0) / 100)
            * (1 + COALESCE(tax.tax_percent, 0) / 100)
          )::numeric,
          2
        ) AS "finalPrice"
      FROM products p
      LEFT JOIN offers o ON o.id = p.offer_id AND o.tenant_id = p.tenant_id
      LEFT JOIN suppliers last_s ON last_s.id = p.last_purchase_supplier_id AND last_s.tenant_id = p.tenant_id
      LEFT JOIN suppliers curr_s ON curr_s.id = p.current_purchase_supplier_id AND curr_s.tenant_id = p.tenant_id
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(sum(t.rate_percent), 0) AS tax_percent,
          array_remove(array_agg(t.name), NULL) AS tax_names,
          array_remove(array_agg(pt.tax_id), NULL) AS tax_ids
        FROM product_taxes pt
        JOIN taxes t ON t.id = pt.tax_id AND t.tenant_id = p.tenant_id
        WHERE pt.tenant_id = p.tenant_id AND pt.product_id = p.id
      ) tax ON true
      WHERE p.tenant_id = $1 AND p.id = $2
        ${branchClause('p', 3)}
      LIMIT 1
    `,
    [id, branchId],
  )
  const product = rows[0]
  if (!product) return null

  const { rows: bundleRows } = await tenantQuery(
    tenantId,
    `
      SELECT
        bi.item_id AS "itemId",
        bi.quantity,
        cp.name AS "itemName",
        cp.item_code AS "itemCode",
        cp.scale AS "itemScale",
        cp.quantity AS "itemStock"
      FROM bundle_items bi
      JOIN products cp ON cp.id = bi.item_id AND cp.tenant_id = bi.tenant_id
      WHERE bi.tenant_id = $1 AND bi.bundle_id = $2
      ORDER BY cp.name
    `,
    [id],
  )

  let variants = []
  if (product.type === PRODUCT_TYPES.VARIANT) {
    const { rows: childRows } = await tenantQuery(
      tenantId,
      `
        SELECT
          c.id,
          c.name,
          c.item_code AS "itemCode",
          c.barcode,
          c.type,
          c.scale,
          c.quantity,
          c.reorder_point AS "reorderPoint",
          c.status,
          c.variant_label AS "variantLabel",
          c.daily_price_change AS "dailyPriceChange",
          c.purchase_price AS "purchasePrice",
          c.selling_price AS "sellingPrice",
          c.creation_batch_id AS "creationBatchId",
          c.parent_id AS "parentId",
          c.created_at AS "createdAt"
        FROM products c
        WHERE c.tenant_id = $1 AND c.parent_id = $2
        ORDER BY c.variant_label ASC NULLS LAST, c.created_at ASC, c.id ASC
      `,
      [id],
    )

    const childIds = childRows.map((r) => r.id)
    let optionsByProduct = new Map()
    if (childIds.length) {
      const { rows: optionRows } = await tenantQuery(
        tenantId,
        `
          SELECT
            product_id AS "productId",
            sort_order AS "sortOrder",
            variant_type_id AS "variantTypeId",
            variant_value_id AS "variantValueId",
            type_name AS "typeName",
            value_name AS "valueName",
            is_custom_type AS "isCustomType",
            is_custom_value AS "isCustomValue"
          FROM product_variant_options
          WHERE tenant_id = $1 AND product_id = ANY($2::uuid[])
          ORDER BY product_id, sort_order ASC
        `,
        [childIds],
      )
      optionsByProduct = new Map()
      for (const opt of optionRows) {
        const list = optionsByProduct.get(opt.productId) || []
        list.push(opt)
        optionsByProduct.set(opt.productId, list)
      }
    }

    variants = childRows.map((child) => ({
      ...child,
      parts: optionsByProduct.get(child.id) || [],
    }))
  }

  return {
    ...product,
    imageUrl: normalizeImageUrl(product.imageUrl),
    bundleItems: bundleRows,
    variants,
  }
}

async function findOrCreateTaxByRate(client, tenantId, taxPercent) {
  const rate = Number(taxPercent)
  const { rows: existing } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id
      FROM taxes
      WHERE tenant_id = $1
        AND rate_percent = $2::numeric
      ORDER BY name ASC, id ASC
      LIMIT 1
    `,
    [rate],
  )
  if (existing[0]?.id) return existing[0].id

  const { rows: created } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO taxes (tenant_id, name, rate_percent)
      VALUES ($1, $2, $3::numeric)
      RETURNING id
    `,
    [`Sales Tax ${rate}%`, rate],
  )
  return created[0].id
}

async function attachTaxes(client, tenantId, productId, taxIds = []) {
  await tenantClientQuery(
    client,
    tenantId,
    `DELETE FROM product_taxes WHERE tenant_id = $1 AND product_id = $2`,
    [productId],
  )
  if (!taxIds.length) return

  const uniqueIds = [...new Set(taxIds)]
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `SELECT id FROM taxes WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
    [uniqueIds],
  )
  if (rows.length !== uniqueIds.length) throw httpError(422, 'One or more taxes do not belong to this tenant')

  await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO product_taxes (tenant_id, product_id, tax_id)
      SELECT $1, $2, x.tax_id
      FROM unnest($3::uuid[]) AS x(tax_id)
    `,
    [productId, rows.map((row) => row.id)],
  )
}

async function attachBundleItems(client, tenantId, bundleId, bundleItems = [], branchId = null) {
  await tenantClientQuery(
    client,
    tenantId,
    `DELETE FROM bundle_items WHERE tenant_id = $1 AND bundle_id = $2`,
    [bundleId],
  )
  if (!bundleItems.length) return

  if (bundleItems.some((item) => item.itemId === bundleId)) {
    throw httpError(422, 'A bundle cannot contain itself as an item')
  }

  const ids = bundleItems.map((item) => item.itemId)
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id FROM products
      WHERE tenant_id = $1 AND id = ANY($2::uuid[])
        ${branchClause('', 3)}
    `,
    [ids, branchId],
  )
  if (rows.length !== new Set(ids).size) {
    throw httpError(422, 'One or more bundle items do not belong to this branch')
  }

  await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO bundle_items (tenant_id, bundle_id, item_id, quantity)
      SELECT $1, $2, x.item_id, x.quantity
      FROM unnest($3::uuid[], $4::numeric[]) AS x(item_id, quantity)
    `,
    [bundleId, ids, bundleItems.map((item) => item.quantity)],
  )
}

// Recipe map: itemId → units required per 1 finished bundle
function recipeQtyMap(bundleItems = []) {
  const map = new Map()
  for (const row of bundleItems) {
    if (!row?.itemId) continue
    map.set(String(row.itemId), Number(row.quantity) || 0)
  }
  return map
}

// Apply assemble / disassemble deltas via Control ledger (Stock Out / Stock In).
// locked units for a component = finishedBundleQty × recipeQty
async function applyBundleAssembleDelta(
  client,
  tenantId,
  {
    bundleId,
    bundleName,
    bundleScale = 'unit',
    oldBundleQty = 0,
    newBundleQty = 0,
    oldItems = [],
    newItems = [],
    createdBy = null,
    scopeBranchId = null,
  },
) {
  const oldMap = recipeQtyMap(oldItems)
  const newMap = recipeQtyMap(newItems)
  const allIds = [...new Set([...oldMap.keys(), ...newMap.keys()])]
  const oldFinished = Math.max(0, Number(oldBundleQty) || 0)
  const newFinished = Math.max(0, Number(newBundleQty) || 0)

  if (allIds.length) {
    const { rows: componentRows } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, name, scale, quantity
        FROM products
        WHERE tenant_id = $1 AND id = ANY($2::uuid[])
        FOR UPDATE
      `,
      [allIds],
    )
    const byId = new Map(componentRows.map((row) => [String(row.id), row]))

    for (const itemId of allIds) {
      const component = byId.get(itemId)
      if (!component) throw httpError(404, 'Bundle component product not found')

      const oldLocked = oldFinished * (oldMap.get(itemId) || 0)
      const newLocked = newFinished * (newMap.get(itemId) || 0)
      const delta = newLocked - oldLocked
      if (delta === 0) continue

      if (delta > 0) {
        await insertLedgerEventInTx(client, tenantId, {
          productId: itemId,
          movementType: MOVEMENT_TYPES.OUT,
          quantity: delta,
          scale: component.scale || 'unit',
          reason: `Assembled into bundle: ${bundleName}`,
          createdBy,
          scopeBranchId,
        })
      } else {
        await insertLedgerEventInTx(client, tenantId, {
          productId: itemId,
          movementType: MOVEMENT_TYPES.IN,
          quantity: Math.abs(delta),
          scale: component.scale || 'unit',
          reason: `Returned from bundle: ${bundleName}`,
          createdBy,
          scopeBranchId,
        })
      }
    }
  }

  const finishedDelta = newFinished - oldFinished
  if (finishedDelta > 0) {
    await insertLedgerEventInTx(client, tenantId, {
      productId: bundleId,
      movementType: MOVEMENT_TYPES.IN,
      quantity: finishedDelta,
      scale: bundleScale || 'unit',
      reason: `Bundle assembled: ${bundleName}`,
      createdBy,
      scopeBranchId,
    })
  } else if (finishedDelta < 0) {
    await insertLedgerEventInTx(client, tenantId, {
      productId: bundleId,
      movementType: MOVEMENT_TYPES.OUT,
      quantity: Math.abs(finishedDelta),
      scale: bundleScale || 'unit',
      reason: `Bundle disassembled: ${bundleName}`,
      createdBy,
      scopeBranchId,
    })
  }
}

async function loadBundleRecipe(client, tenantId, bundleId) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT item_id AS "itemId", quantity
      FROM bundle_items
      WHERE tenant_id = $1 AND bundle_id = $2
    `,
    [bundleId],
  )
  return rows
}

async function validateProductCategories(client, tenantId, { categoryId, subcategoryId, branchId }) {
  if (categoryId) {
    const { rows: cats } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, is_active AS "isActive", parent_id AS "parentId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2 AND branch_id = $3
        LIMIT 1
      `,
      [categoryId, branchId],
    )
    if (!cats[0]) throw httpError(404, 'Category not found')
    if (!cats[0].isActive) throw httpError(409, 'Cannot assign an inactive category')
    if (cats[0].parentId) throw httpError(400, 'categoryId must be a parent category')
  }
  if (subcategoryId) {
    const { rows: subs } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, is_active AS "isActive", parent_id AS "parentId"
        FROM categories
        WHERE tenant_id = $1 AND id = $2 AND branch_id = $3
        LIMIT 1
      `,
      [subcategoryId, branchId],
    )
    if (!subs[0]) throw httpError(404, 'Subcategory not found')
    if (!subs[0].isActive) throw httpError(409, 'Cannot assign an inactive subcategory')
    if (!subs[0].parentId) throw httpError(400, 'subcategoryId must be a subcategory')
    if (categoryId && subs[0].parentId !== categoryId) {
      throw httpError(400, 'Subcategory does not belong to the selected category')
    }
  }
}

async function resolveBundlePrices(client, tenantId, bundleItems = [], branchId = null) {
  if (!bundleItems.length) return { purchasePrice: 0, sellingPrice: 0 }

  const ids = bundleItems.map((item) => item.itemId)
  const qtyById = new Map(bundleItems.map((item) => [item.itemId, Number(item.quantity) || 1]))

  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id, purchase_price AS "purchasePrice", selling_price AS "sellingPrice"
      FROM products
      WHERE tenant_id = $1 AND id = ANY($2::uuid[])
        ${branchClause('', 3)}
    `,
    [ids, branchId],
  )

  let purchasePrice = 0
  let sellingPrice = 0
  for (const row of rows) {
    const qty = qtyById.get(row.id) || 1
    purchasePrice += Number(row.purchasePrice || 0) * qty
    sellingPrice += Number(row.sellingPrice || 0) * qty
  }

  return {
    purchasePrice: Math.round(purchasePrice * 100) / 100,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
  }
}

async function resolveTenantTaxProfitDefaults(client, tenantId) {
  const { rows: tenantRows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT
        COALESCE(default_profit_percent, 0) AS "defaultProfitPercent",
        COALESCE(default_tax_percent, 0) AS "defaultTaxPercent"
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `,
  )
  return {
    defaultProfit: Number(tenantRows[0]?.defaultProfitPercent) || 0,
    defaultTax: Number(tenantRows[0]?.defaultTaxPercent) || 0,
  }
}

// Public read for IM create forms (pre-fill only; never mutates existing products).
export async function getTaxProfitDefaults(tenantId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        COALESCE(default_profit_percent, 0) AS "defaultProfitPercent",
        COALESCE(default_tax_percent, 0) AS "defaultTaxPercent"
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `,
  )
  return {
    defaultProfitPercent: Number(rows[0]?.defaultProfitPercent) || 0,
    defaultTaxPercent: Number(rows[0]?.defaultTaxPercent) || 0,
  }
}

async function loadProductTaxIds(client, tenantId, productId) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT tax_id AS id
      FROM product_taxes
      WHERE tenant_id = $1 AND product_id = $2
      ORDER BY tax_id
    `,
    [productId],
  )
  return rows.map((row) => row.id)
}

// Create only: undefined/null taxIds → tenant default; [] / [ids] → explicit override.
async function resolveTaxIdsForCreate(client, tenantId, payloadTaxIds, defaultTax) {
  if (payloadTaxIds !== undefined && payloadTaxIds !== null) return payloadTaxIds
  if (defaultTax > 0) {
    const defaultTaxId = await findOrCreateTaxByRate(client, tenantId, defaultTax)
    return [defaultTaxId]
  }
  return []
}

async function applyOpeningStockInTx(client, tenantId, {
  productId,
  quantity,
  scale,
  unitCost,
  branchId,
  createdBy,
}) {
  const qty = Math.max(0, Number(quantity) || 0)
  if (qty <= 0) return
  await insertLedgerEventInTx(client, tenantId, {
    productId,
    movementType: MOVEMENT_TYPES.IN,
    quantity: qty,
    scale: scale || 'unit',
    reason: 'Opening stock',
    unitCost: unitCost ?? null,
    branchId: branchId || null,
    scopeBranchId: branchId || null,
    createdBy: createdBy || null,
  })
}

async function insertProductRow(client, tenantId, row) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO products (
        tenant_id, branch_id, category_id, subcategory_id, type, item_code, name, image_url,
        scale, barcode, description, purchase_price, selling_price, profit_percent, offer_id,
        discount_percent, quantity, reorder_point, status, parent_id, creation_batch_id,
        variant_label, daily_price_change, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, COALESCE($24::timestamptz, now())
      )
      RETURNING
        id, name, item_code AS "itemCode", barcode, type, status, branch_id AS "branchId",
        parent_id AS "parentId", creation_batch_id AS "creationBatchId",
        variant_label AS "variantLabel", quantity, reorder_point AS "reorderPoint",
        daily_price_change AS "dailyPriceChange", created_at AS "createdAt"
    `,
    [
      row.branchId,
      row.categoryId || null,
      row.subcategoryId || null,
      row.type,
      row.itemCode,
      row.name,
      row.imageUrl || null,
      row.scale || 'unit',
      row.barcode,
      row.description || null,
      row.purchasePrice ?? 0,
      row.sellingPrice ?? 0,
      row.profitPercent ?? 0,
      row.offerId || null,
      row.discountPercent ?? null,
      row.quantity ?? 0,
      row.reorderPoint ?? 10,
      row.status || 'active',
      row.parentId || null,
      row.creationBatchId || null,
      row.variantLabel || null,
      Boolean(row.dailyPriceChange),
      row.createdAt || null,
    ],
  )
  return rows[0]
}

async function attachVariantOptions(client, tenantId, productId, parts = []) {
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]
    const typeName = String(part.typeName || '').trim()
    const valueName = String(part.valueName || '').trim()
    if (!typeName || !valueName) {
      throw httpError(422, 'Each variant part requires typeName and valueName')
    }

    const typeId = isLooseUuid(part.typeId) ? part.typeId : null
    const valueId = isLooseUuid(part.valueId) ? part.valueId : null
    const isCustomType = Boolean(part.isCustomType) || !typeId
    const isCustomValue = Boolean(part.isCustomValue) || !valueId

    // Catalog FKs only when UUID-shaped (custom temp ids stay denormalized)
    let resolvedTypeId = null
    let resolvedValueId = null
    if (typeId && !isCustomType) {
      const { rows } = await tenantClientQuery(
        client,
        tenantId,
        `SELECT id FROM variant_types WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
        [typeId],
      )
      resolvedTypeId = rows[0]?.id || null
    }
    if (valueId && !isCustomValue) {
      const { rows } = await tenantClientQuery(
        client,
        tenantId,
        `
          SELECT id FROM variant_values
          WHERE tenant_id = $1 AND id = $2
            AND ($3::uuid IS NULL OR variant_type_id = $3)
          LIMIT 1
        `,
        [valueId, resolvedTypeId],
      )
      resolvedValueId = rows[0]?.id || null
    }

    await tenantClientQuery(
      client,
      tenantId,
      `
        INSERT INTO product_variant_options (
          tenant_id, product_id, sort_order, variant_type_id, variant_value_id,
          type_name, value_name, is_custom_type, is_custom_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        productId,
        i,
        resolvedTypeId,
        resolvedValueId,
        typeName,
        valueName,
        isCustomType || !resolvedTypeId,
        isCustomValue || !resolvedValueId,
      ],
    )
  }
}

export async function createVariantProduct(tenantId, payload) {
  if (!payload.branchId) throw httpError(422, 'branchId is required to create a product')
  const variants = Array.isArray(payload.variants) ? payload.variants : []
  if (!variants.length) throw httpError(422, 'Variant products require at least one combination')

  try {
    return await withTransaction(async (client) => {
      if (payload.categoryId || payload.subcategoryId) {
        await validateProductCategories(client, tenantId, {
          categoryId: payload.categoryId,
          subcategoryId: payload.subcategoryId,
          branchId: payload.branchId,
        })
        if (payload.subcategoryId && !payload.categoryId) {
          throw httpError(400, 'categoryId is required when subcategoryId is set')
        }
      }

      const { defaultProfit, defaultTax } = await resolveTenantTaxProfitDefaults(client, tenantId)
      const profitPercent =
        payload.profitPercent !== undefined ? Number(payload.profitPercent) : defaultProfit
      const resolvedTaxIds = await resolveTaxIdsForCreate(client, tenantId, payload.taxIds, defaultTax)

      const createdAt = payload.createdAt || new Date().toISOString()
      const creationBatchId = payload.creationBatchId || crypto.randomUUID()
      const scale = payload.scale || 'unit'

      // Parent holds shared name/category — no sellable stock
      const parent = await insertProductRow(client, tenantId, {
        branchId: payload.branchId,
        categoryId: payload.categoryId,
        subcategoryId: payload.subcategoryId,
        type: PRODUCT_TYPES.VARIANT,
        itemCode: payload.itemCode,
        name: payload.name,
        imageUrl: payload.imageUrl,
        scale,
        barcode: payload.barcode,
        description: payload.description,
        purchasePrice: 0,
        sellingPrice: 0,
        profitPercent,
        offerId: payload.offerId,
        discountPercent: payload.discountPercent,
        quantity: 0,
        reorderPoint: payload.reorderPoint ?? 10,
        status: 'active',
        creationBatchId,
        createdAt,
        dailyPriceChange: false,
      })
      await attachTaxes(client, tenantId, parent.id, resolvedTaxIds)

      const children = []
      for (const [index, variant] of variants.entries()) {
        const label = String(variant.label || '').trim()
        if (!label) throw httpError(422, `Variant #${index + 1}: label is required`)
        const itemCode =
          String(variant.itemCode || variant.sku || '').trim() ||
          `${generateItemCode()}-${index + 1}`
        const barcode =
          String(variant.barcode || '').trim() ||
          `${generateBarcodeValue().slice(0, 11)}${String(index + 1).padStart(2, '0')}`

        const purchasePrice = Number(variant.purchasePrice) || 0
        let sellingPrice = Number(variant.sellingPrice) || 0
        if ((!sellingPrice || sellingPrice === 0) && purchasePrice > 0 && profitPercent > 0) {
          sellingPrice = Math.round(purchasePrice * (1 + profitPercent / 100) * 100) / 100
        }

        const childStatus = variant.status === 'inactive' ? 'inactive' : 'active'
        const openingQty =
          childStatus === 'inactive' ? 0 : Math.max(0, Number(variant.quantity) || 0)
        const child = await insertProductRow(client, tenantId, {
          branchId: payload.branchId,
          categoryId: payload.categoryId,
          subcategoryId: payload.subcategoryId,
          type: PRODUCT_TYPES.SINGLE,
          itemCode,
          name: payload.name,
          imageUrl: payload.imageUrl,
          scale,
          barcode,
          description: payload.description,
          purchasePrice,
          sellingPrice,
          profitPercent,
          offerId: payload.offerId,
          discountPercent: payload.discountPercent,
          quantity: 0,
          reorderPoint:
            variant.reorderPoint === undefined || variant.reorderPoint === null
              ? 10
              : Number(variant.reorderPoint),
          status: childStatus,
          parentId: parent.id,
          creationBatchId,
          variantLabel: label,
          dailyPriceChange: Boolean(variant.dailyPriceChange),
          createdAt,
        })

        await attachTaxes(client, tenantId, child.id, resolvedTaxIds)
        await attachVariantOptions(client, tenantId, child.id, variant.parts || [])
        await applyOpeningStockInTx(client, tenantId, {
          productId: child.id,
          quantity: openingQty,
          scale,
          unitCost: purchasePrice,
          branchId: payload.branchId,
          createdBy: payload.createdBy,
        })

        children.push({
          ...child,
          label,
          parts: variant.parts || [],
        })
      }

      return {
        ...parent,
        creationBatchId,
        variants: children,
      }
    })
  } catch (err) {
    mapUniqueViolation(err, 'A variant SKU or barcode already exists in this branch')
  }
}

export async function createProduct(tenantId, payload) {
  if (!payload.branchId) throw httpError(422, 'branchId is required to create a product')

  if (payload.type === PRODUCT_TYPES.VARIANT) {
    return createVariantProduct(tenantId, payload)
  }

  try {
    return await withTransaction(async (client) => {
      if (payload.categoryId || payload.subcategoryId) {
        await validateProductCategories(client, tenantId, {
          categoryId: payload.categoryId,
          subcategoryId: payload.subcategoryId,
          branchId: payload.branchId,
        })
        if (payload.subcategoryId && !payload.categoryId) {
          throw httpError(400, 'categoryId is required when subcategoryId is set')
        }
      }

      const { defaultProfit, defaultTax } = await resolveTenantTaxProfitDefaults(client, tenantId)
      const profitPercent =
        payload.profitPercent !== undefined ? Number(payload.profitPercent) : defaultProfit

      let purchasePrice = payload.purchasePrice ?? 0
      let sellingPrice = payload.sellingPrice ?? 0
      if (payload.type === PRODUCT_TYPES.BUNDLE && payload.bundleItems?.length) {
        const derived = await resolveBundlePrices(
          client,
          tenantId,
          payload.bundleItems,
          payload.branchId,
        )
        purchasePrice = derived.purchasePrice
        const requestedSelling = Number(payload.sellingPrice)
        sellingPrice = requestedSelling > 0 ? requestedSelling : derived.sellingPrice
      } else if ((!sellingPrice || sellingPrice === 0) && purchasePrice > 0 && profitPercent > 0) {
        sellingPrice = Math.round(purchasePrice * (1 + profitPercent / 100) * 100) / 100
      }

      const isBundle = payload.type === PRODUCT_TYPES.BUNDLE
      const openingQty = isBundle ? 0 : Math.max(0, Number(payload.quantity) || 0)

      const product = await insertProductRow(client, tenantId, {
        branchId: payload.branchId,
        categoryId: payload.categoryId,
        subcategoryId: payload.subcategoryId,
        type: payload.type,
        itemCode: payload.itemCode,
        name: payload.name,
        imageUrl: payload.imageUrl,
        scale: payload.scale || 'unit',
        barcode: payload.barcode,
        description: payload.description,
        purchasePrice,
        sellingPrice,
        profitPercent,
        offerId: payload.offerId,
        discountPercent: payload.discountPercent,
        // Opening stock applied via ledger so qty + branch_inventory stay consistent
        quantity: 0,
        reorderPoint:
          payload.reorderPoint === undefined || payload.reorderPoint === null
            ? 10
            : Number(payload.reorderPoint),
        status: payload.status === 'inactive' ? 'inactive' : 'active',
        dailyPriceChange: Boolean(payload.dailyPriceChange),
      })

      const resolvedTaxIds = await resolveTaxIdsForCreate(client, tenantId, payload.taxIds, defaultTax)
      await attachTaxes(client, tenantId, product.id, resolvedTaxIds)

      if (isBundle) {
        const bundleItems = payload.bundleItems || []
        await attachBundleItems(client, tenantId, product.id, bundleItems, payload.branchId)
        const finishedQty = Math.max(0, Number(payload.quantity) || 0)
        if (finishedQty > 0 || bundleItems.length) {
          await applyBundleAssembleDelta(client, tenantId, {
            bundleId: product.id,
            bundleName: product.name,
            bundleScale: payload.scale || 'unit',
            oldBundleQty: 0,
            newBundleQty: finishedQty,
            oldItems: [],
            newItems: bundleItems,
            createdBy: payload.createdBy || null,
            scopeBranchId: payload.branchId || null,
          })
        }
      } else {
        await applyOpeningStockInTx(client, tenantId, {
          productId: product.id,
          quantity: openingQty,
          scale: payload.scale || 'unit',
          unitCost: purchasePrice,
          branchId: payload.branchId,
          createdBy: payload.createdBy,
        })
      }

      return product
    })
  } catch (err) {
    mapUniqueViolation(err)
  }
}

// Maps camelCase payload keys to SQL column names. Columns whose values can
// legitimately be NULLed by the caller are included here; simple-string fields
// that cannot be set to NULL intentionally are also listed.
const UPDATABLE_COLUMNS = {
  name: 'name',
  categoryId: 'category_id',
  subcategoryId: 'subcategory_id',
  status: 'status',
  scale: 'scale',
  description: 'description',
  purchasePrice: 'purchase_price',
  sellingPrice: 'selling_price',
  discountPercent: 'discount_percent',
  offerId: 'offer_id',
  imageUrl: 'image_url',
  itemCode: 'item_code',
  barcode: 'barcode',
  reorderPoint: 'reorder_point',
  dailyPriceChange: 'daily_price_change',
}

async function syncVariantChildrenInTx(client, tenantId, parent, payload, { branchId, createdBy }) {
  const variants = Array.isArray(payload.variants) ? payload.variants : []
  if (!variants.length) throw httpError(422, 'Variant products require at least one combination')

  const effectiveBranchId = parent.branchId || branchId
  const parentName = payload.name || parent.name
  const parentScale = payload.scale || parent.scale || 'unit'
  // Variants share one product image (no per-SKU upload) — prefer patch, else parent
  const parentImageUrl =
    payload.imageUrl !== undefined ? payload.imageUrl || null : parent.imageUrl || null
  const creationBatchId = parent.creationBatchId || crypto.randomUUID()
  const createdAt = new Date().toISOString()

  // Inherit parent category when not patched on this request
  const categoryId =
    'categoryId' in payload ? payload.categoryId ?? null : parent.categoryId
  const subcategoryId =
    'subcategoryId' in payload ? payload.subcategoryId ?? null : parent.subcategoryId

  // Edit path: inherit parent taxes for new SKUs (do not re-apply tenant defaults).
  const resolvedTaxIds =
    payload.taxIds !== undefined
      ? payload.taxIds
      : await loadProductTaxIds(client, tenantId, parent.id)

  const children = []
  for (const [index, variant] of variants.entries()) {
    const label = String(variant.label || '').trim()
    if (!label) throw httpError(422, `Variant #${index + 1}: label is required`)
    let itemCode = String(variant.itemCode || variant.sku || '').trim()
    let barcode = String(variant.barcode || '').trim()

    const purchasePrice = Number(variant.purchasePrice) || 0
    const sellingPrice = Number(variant.sellingPrice) || 0
    const childStatus = variant.status === 'inactive' ? 'inactive' : 'active'
    const reorderPoint =
      variant.reorderPoint === undefined || variant.reorderPoint === null
        ? 10
        : Number(variant.reorderPoint)

    if (variant.id) {
      // Existing child — update fields; stock stays via Control
      const { rows: owned } = await tenantClientQuery(
        client,
        tenantId,
        `
          SELECT id, item_code AS "itemCode", barcode
          FROM products
          WHERE tenant_id = $1 AND id = $2 AND parent_id = $3
          LIMIT 1
        `,
        [variant.id, parent.id],
      )
      if (!owned[0]) {
        throw httpError(404, `Variant SKU not found under this product (${label})`)
      }
      itemCode = itemCode || owned[0].itemCode
      barcode = barcode || owned[0].barcode

      await tenantClientQuery(
        client,
        tenantId,
        `
          UPDATE products SET
            name = $3,
            item_code = $4,
            barcode = $5,
            purchase_price = $6,
            last_selling_price = CASE
              WHEN selling_price IS DISTINCT FROM $7::numeric THEN selling_price
              ELSE last_selling_price
            END,
            selling_price = $7::numeric,
            reorder_point = $8,
            daily_price_change = $9,
            status = $10,
            variant_label = $11,
            category_id = $12,
            subcategory_id = $13,
            image_url = $14,
            updated_at = now()
          WHERE tenant_id = $1 AND id = $2
        `,
        [
          variant.id,
          parentName,
          itemCode,
          barcode,
          purchasePrice,
          sellingPrice,
          reorderPoint,
          Boolean(variant.dailyPriceChange),
          childStatus,
          label,
          categoryId,
          subcategoryId,
          parentImageUrl,
        ],
      )

      // Replace option parts
      await tenantClientQuery(
        client,
        tenantId,
        `DELETE FROM product_variant_options WHERE tenant_id = $1 AND product_id = $2`,
        [variant.id],
      )
      await attachVariantOptions(client, tenantId, variant.id, variant.parts || [])
      if (payload.taxIds !== undefined) {
        await attachTaxes(client, tenantId, variant.id, resolvedTaxIds)
      }

      children.push({ id: variant.id, label, itemCode, barcode })
    } else {
      // New combination — system generates codes when omitted
      itemCode = itemCode || `${generateItemCode()}-${index + 1}`
      barcode =
        barcode ||
        `${generateBarcodeValue().slice(0, 11)}${String(index + 1).padStart(2, '0')}`

      const child = await insertProductRow(client, tenantId, {
        branchId: effectiveBranchId,
        categoryId,
        subcategoryId,
        type: PRODUCT_TYPES.SINGLE,
        itemCode,
        name: parentName,
        imageUrl: parentImageUrl,
        scale: parentScale,
        barcode,
        description: payload.description !== undefined ? payload.description : parent.description,
        purchasePrice,
        sellingPrice,
        profitPercent: parent.profitPercent ?? 0,
        quantity: 0,
        reorderPoint,
        status: childStatus,
        parentId: parent.id,
        creationBatchId,
        variantLabel: label,
        dailyPriceChange: Boolean(variant.dailyPriceChange),
        createdAt,
      })
      await attachTaxes(client, tenantId, child.id, resolvedTaxIds)
      await attachVariantOptions(client, tenantId, child.id, variant.parts || [])

      const openingQty =
        childStatus === 'inactive' ? 0 : Math.max(0, Number(variant.quantity) || 0)
      await applyOpeningStockInTx(client, tenantId, {
        productId: child.id,
        quantity: openingQty,
        scale: parentScale,
        unitCost: purchasePrice,
        branchId: effectiveBranchId,
        createdBy,
      })

      children.push({ id: child.id, label, itemCode, barcode })
    }
  }

  return children
}

export async function updateProduct(tenantId, id, payload, { branchId = null } = {}) {
  // Normalize sku → itemCode
  if (payload.sku && !payload.itemCode) payload.itemCode = payload.sku

  try {
    return await withTransaction(async (client) => {
      const { rows: existingRows } = await tenantClientQuery(
        client,
        tenantId,
        `
          SELECT
            id,
            name,
            type,
            scale,
            category_id AS "categoryId",
            subcategory_id AS "subcategoryId",
            branch_id AS "branchId",
            quantity,
            image_url AS "imageUrl",
            description,
            creation_batch_id AS "creationBatchId",
            profit_percent AS "profitPercent",
            parent_id AS "parentId"
          FROM products
          WHERE tenant_id = $1 AND id = $2
            ${branchClause('', 3)}
          LIMIT 1
        `,
        [id, branchId],
      )
      const existing = existingRows[0]
      if (!existing) return null

      if (existing.parentId) {
        throw httpError(400, 'Edit the parent variant product to update this SKU')
      }

      // Product type is locked after create (Normal ↔ Variant blocked)
      if (payload.type != null && payload.type !== existing.type) {
        throw httpError(
          400,
          'Product type cannot be changed after creation. Deactivate this product and create a new one.',
        )
      }
      // Ignore type on update so clients cannot mutate it via UPDATABLE_COLUMNS later
      if ('type' in payload) delete payload.type

      // Utilization-gated price: block purchase/sell changes while on-hand remains.
      if ('purchasePrice' in payload || 'sellingPrice' in payload) {
        await assertPriceChangeAllowed(client, tenantId, id, {
          purchasePrice: 'purchasePrice' in payload ? payload.purchasePrice : undefined,
          sellingPrice: 'sellingPrice' in payload ? payload.sellingPrice : undefined,
        })
      }

      const effectiveBranchId = existing.branchId || branchId
      const hasCategoryPatch = 'categoryId' in payload || 'subcategoryId' in payload

      if (hasCategoryPatch) {
        const nextCategoryId =
          'categoryId' in payload ? payload.categoryId ?? null : existing.categoryId
        const nextSubcategoryId =
          'subcategoryId' in payload ? payload.subcategoryId ?? null : undefined

        if (nextSubcategoryId && !nextCategoryId) {
          throw httpError(400, 'categoryId is required when subcategoryId is set')
        }

        if (nextCategoryId || nextSubcategoryId) {
          await validateProductCategories(client, tenantId, {
            categoryId: nextCategoryId,
            subcategoryId: nextSubcategoryId,
            branchId: effectiveBranchId,
          })
        }

        if (
          'categoryId' in payload &&
          !('subcategoryId' in payload) &&
          payload.categoryId !== existing.categoryId
        ) {
          payload.subcategoryId = null
        }
      }

      // Non-bundle: stock is Control-only (ignore quantity on update)
      if (existing.type !== PRODUCT_TYPES.BUNDLE && 'quantity' in payload) {
        delete payload.quantity
      }

      const setClauses = []
      const params = [id, branchId]

      for (const [payloadKey, column] of Object.entries(UPDATABLE_COLUMNS)) {
        if (!(payloadKey in payload)) continue

        const paramIndex = params.length + 2
        const value = payload[payloadKey] ?? null

        if (payloadKey === 'sellingPrice') {
          setClauses.push(`
          last_selling_price = CASE
            WHEN $${paramIndex}::numeric IS NOT NULL AND selling_price IS DISTINCT FROM $${paramIndex}::numeric
              THEN selling_price
            ELSE last_selling_price
          END,
          selling_price = $${paramIndex}::numeric`)
        } else if (payloadKey === 'purchasePrice') {
          setClauses.push(`purchase_price = $${paramIndex}::numeric`)
        } else if (payloadKey === 'discountPercent') {
          setClauses.push(`discount_percent = $${paramIndex}::numeric`)
        } else if (payloadKey === 'offerId') {
          setClauses.push(`offer_id = $${paramIndex}::uuid`)
        } else if (payloadKey === 'categoryId') {
          setClauses.push(`category_id = $${paramIndex}::uuid`)
        } else if (payloadKey === 'subcategoryId') {
          setClauses.push(`subcategory_id = $${paramIndex}::uuid`)
        } else if (payloadKey === 'imageUrl') {
          setClauses.push(`image_url = $${paramIndex}`)
        } else if (payloadKey === 'reorderPoint') {
          setClauses.push(`reorder_point = $${paramIndex}::numeric`)
        } else if (payloadKey === 'dailyPriceChange') {
          setClauses.push(`daily_price_change = $${paramIndex}::boolean`)
          params.push(Boolean(value))
          continue
        } else {
          setClauses.push(`${column} = $${paramIndex}`)
        }

        params.push(value)
      }

      const hasVariantSync =
        existing.type === PRODUCT_TYPES.VARIANT && Array.isArray(payload.variants)

      if (
        !setClauses.length &&
        !payload.taxIds &&
        !payload.bundleItems &&
        !('quantity' in payload) &&
        !hasVariantSync
      ) {
        const { rows: current } = await tenantClientQuery(
          client,
          tenantId,
          `
            SELECT id, name, status, branch_id AS "branchId",
              category_id AS "categoryId", subcategory_id AS "subcategoryId"
            FROM products
            WHERE tenant_id = $1 AND id = $2
              ${branchClause('', 3)}
          `,
          [id, branchId],
        )
        return current[0] || null
      }

      let product = null

      if (setClauses.length) {
        setClauses.push('updated_at = now()')
        // Daily-price products: mark today's price review when purchase/sell changes.
        if ('purchasePrice' in payload || 'sellingPrice' in payload) {
          setClauses.push(`
            daily_price_updated_on = CASE
              WHEN daily_price_change THEN CURRENT_DATE
              ELSE daily_price_updated_on
            END`)
        }
        const { rows } = await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE products SET ${setClauses.join(', ')}
            WHERE tenant_id = $1 AND id = $2
              ${branchClause('', 3)}
            RETURNING id, name, status, branch_id AS "branchId",
              category_id AS "categoryId", subcategory_id AS "subcategoryId"
          `,
          params,
        )
        product = rows[0] || null
        if (!product) return null
      } else {
        const { rows } = await tenantClientQuery(
          client,
          tenantId,
          `
            SELECT id, name, status, branch_id AS "branchId",
              category_id AS "categoryId", subcategory_id AS "subcategoryId"
            FROM products
            WHERE tenant_id = $1 AND id = $2
              ${branchClause('', 3)}
          `,
          [id, branchId],
        )
        product = rows[0] || null
        if (!product) return null
      }

      if (payload.taxIds !== undefined) await attachTaxes(client, tenantId, id, payload.taxIds)

      const isBundle = existing.type === PRODUCT_TYPES.BUNDLE
      const recipeChanging = isBundle && payload.bundleItems !== undefined
      const qtyChanging = isBundle && 'quantity' in payload

      if (recipeChanging || qtyChanging) {
        const oldItems = await loadBundleRecipe(client, tenantId, id)
        const newItems = recipeChanging ? payload.bundleItems : oldItems
        const newBundleQty = qtyChanging
          ? Math.max(0, Number(payload.quantity) || 0)
          : Number(existing.quantity) || 0
        const bundleName = payload.name || existing.name
        const bundleScale = payload.scale || existing.scale || 'unit'

        if (recipeChanging) {
          const recipeBranchId = product.branchId || branchId
          await attachBundleItems(client, tenantId, id, payload.bundleItems, recipeBranchId)
          const derived = await resolveBundlePrices(
            client,
            tenantId,
            payload.bundleItems,
            recipeBranchId,
          )
          await tenantClientQuery(
            client,
            tenantId,
            `
              UPDATE products
              SET purchase_price = $3, selling_price = $4
              WHERE tenant_id = $1 AND id = $2
            `,
            [id, derived.purchasePrice, derived.sellingPrice],
          )
        }

        await applyBundleAssembleDelta(client, tenantId, {
          bundleId: id,
          bundleName,
          bundleScale,
          oldBundleQty: Number(existing.quantity) || 0,
          newBundleQty,
          oldItems,
          newItems,
          createdBy: payload.createdBy || null,
          scopeBranchId: product.branchId || branchId || null,
        })
      }

      if (hasVariantSync) {
        await syncVariantChildrenInTx(client, tenantId, existing, payload, {
          branchId: effectiveBranchId,
          createdBy: payload.createdBy || null,
        })

        // Keep child display names in sync when parent name changes
        if (payload.name) {
          await tenantClientQuery(
            client,
            tenantId,
            `
              UPDATE products
              SET name = $3, updated_at = now()
              WHERE tenant_id = $1 AND parent_id = $2
            `,
            [id, payload.name],
          )
        }
      }

      // Keep child images in sync when parent image is updated
      // (variants have no per-SKU image field — children inherit parent image)
      if (
        existing.type === PRODUCT_TYPES.VARIANT &&
        payload.imageUrl !== undefined
      ) {
        await tenantClientQuery(
          client,
          tenantId,
          `
            UPDATE products
            SET image_url = $3, updated_at = now()
            WHERE tenant_id = $1 AND parent_id = $2
          `,
          [id, payload.imageUrl || null],
        )
      }

      return product
    })
  } catch (err) {
    mapUniqueViolation(err, 'Item code or barcode already exists in this branch')
  }
}

export async function getProductDeleteEligibility(tenantId, id, { branchId = null } = {}) {
  const { rows: products } = await tenantQuery(
    tenantId,
    `
      SELECT id, quantity, status
      FROM products
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      LIMIT 1
    `,
    [id, branchId],
  )
  const product = products[0]
  if (!product) return { found: false, canPermanentDelete: false }

  if (Number(product.quantity) > 0) {
    return {
      found: true,
      canPermanentDelete: false,
      reason: 'Product has stock on hand',
    }
  }

  const { rows: branchStock } = await tenantQuery(
    tenantId,
    `
      SELECT COALESCE(sum(quantity), 0)::numeric AS total
      FROM branch_inventory
      WHERE tenant_id = $1 AND product_id = $2
    `,
    [id],
  )
  if (Number(branchStock[0]?.total || 0) > 0) {
    return {
      found: true,
      canPermanentDelete: false,
      reason: 'Product has branch inventory stock',
    }
  }

  const checks = [
    {
      sql: `SELECT 1 FROM sale_items WHERE tenant_id = $1 AND product_id = $2 LIMIT 1`,
      reason: 'Product has sales history',
    },
    {
      sql: `SELECT 1 FROM inventory_ledger WHERE tenant_id = $1 AND product_id = $2 LIMIT 1`,
      reason: 'Product has inventory ledger history',
    },
    {
      sql: `SELECT 1 FROM bundle_items WHERE tenant_id = $1 AND item_id = $2 LIMIT 1`,
      reason: 'Product is used in a bundle',
    },
    {
      sql: `SELECT 1 FROM purchase_order_items WHERE tenant_id = $1 AND product_id = $2 LIMIT 1`,
      reason: 'Product has purchase order history',
    },
  ]

  for (const check of checks) {
    const { rows } = await tenantQuery(tenantId, check.sql, [id])
    if (rows[0]) {
      return { found: true, canPermanentDelete: false, reason: check.reason }
    }
  }

  return { found: true, canPermanentDelete: true }
}

export async function permanentDeleteProduct(tenantId, id, { branchId = null } = {}) {
  const eligibility = await getProductDeleteEligibility(tenantId, id, { branchId })
  if (!eligibility.found) return null
  if (!eligibility.canPermanentDelete) {
    throw httpError(409, eligibility.reason || 'Product cannot be permanently deleted')
  }

  return withTransaction(async (client) => {
    const { rows } = await tenantClientQuery(
      client,
      tenantId,
      `
        DELETE FROM products
        WHERE tenant_id = $1 AND id = $2
          ${branchClause('', 3)}
        RETURNING id
      `,
      [id, branchId],
    )
    return Boolean(rows[0])
  })
}

export async function deleteProduct(tenantId, id, { branchId = null, permanent = false } = {}) {
  if (permanent) {
    return permanentDeleteProduct(tenantId, id, { branchId })
  }

  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE products
      SET status = 'inactive'
      WHERE tenant_id = $1 AND id = $2
        ${branchClause('', 3)}
      RETURNING id
    `,
    [id, branchId],
  )
  return Boolean(rows[0])
}
