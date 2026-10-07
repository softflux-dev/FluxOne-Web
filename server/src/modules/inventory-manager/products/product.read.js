import { tenantQuery } from '../../../config/db.js'
import { PRODUCT_TYPES } from '../../../config/constants.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'
import { branchClause } from './product.shared.js'

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
    filters.productId || null,
    filters.variantTypeId || null,
    filters.variantValueId || null,
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
        -- Selling-based final (see pricing.util finalPriceFromSelling): shelf × (1−disc) × (1+tax)
        round(
          (
            p.selling_price
            * (1 - COALESCE(p.discount_percent, o.percent, 0) / 100)
            * (1 + COALESCE(tax.tax_percent, 0) / 100)
          )::numeric,
          0
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
        AND ($9::uuid IS NULL OR p.id = $9)
        AND (
          $10::uuid IS NULL
          OR EXISTS (
            SELECT 1
            FROM products c
            JOIN product_variant_options pvo
              ON pvo.product_id = c.id AND pvo.tenant_id = c.tenant_id
            WHERE c.tenant_id = p.tenant_id
              AND c.parent_id = p.id
              AND pvo.variant_type_id = $10
          )
        )
        AND (
          $11::uuid IS NULL
          OR EXISTS (
            SELECT 1
            FROM products c
            JOIN product_variant_options pvo
              ON pvo.product_id = c.id AND pvo.tenant_id = c.tenant_id
            WHERE c.tenant_id = p.tenant_id
              AND c.parent_id = p.id
              AND pvo.variant_value_id = $11
          )
        )
      ORDER BY p.created_at DESC
      LIMIT $12 OFFSET $13
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
        COALESCE(p.profit_percent, 0) AS "profitPercent",
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
        -- Selling-based final (see pricing.util finalPriceFromSelling)
        round(
          (
            p.selling_price
            * (1 - COALESCE(p.discount_percent, o.percent, 0) / 100)
            * (1 + COALESCE(tax.tax_percent, 0) / 100)
          )::numeric,
          0
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
        cp.quantity AS "itemStock",
        cp.selling_price AS "sellingPrice",
        cp.variant_label AS "variantLabel",
        cp.image_url AS "imageUrl",
        cp.category_id AS "categoryId",
        cp.subcategory_id AS "subcategoryId",
        cp.parent_id AS "parentId",
        cp.scale
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
          c.discount_percent AS "discountPercent",
          c.offer_id AS "offerId",
          o.name AS "offerName",
          o.percent AS "offerPercent",
          c.creation_batch_id AS "creationBatchId",
          c.parent_id AS "parentId",
          c.created_at AS "createdAt"
        FROM products c
        LEFT JOIN offers o ON o.id = c.offer_id AND o.tenant_id = c.tenant_id
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
