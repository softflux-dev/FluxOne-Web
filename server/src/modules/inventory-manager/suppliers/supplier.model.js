import { tenantQuery } from '../../../config/db.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'

const supplierSelect = `
  id,
  company_name AS "companyName",
  image_url AS "imageUrl",
  company_phone AS "companyPhone",
  representative_name AS "representativeName",
  representative_phone AS "representativePhone",
  representative_email AS "representativeEmail",
  location,
  tax_paid AS "taxPaid",
  registration_number AS "registrationNumber",
  bank_account_number AS "bankAccountNumber",
  signature_url AS "signatureUrl",
  is_active AS "isActive",
  branch_id AS "branchId"
`

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}


function mapSupplierRow(row) {
  if (!row) return null
  return {
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
    signatureUrl: normalizeImageUrl(row.signatureUrl),
  }
}

function activeSqlClause(active) {
  if (active === 'all') return ''
  if (active === 'inactive') return 'AND is_active = false'
  return 'AND is_active = true'
}

// Branch scope
function branchClause(paramIndex) {
  return `AND ($${paramIndex}::uuid IS NULL OR branch_id = $${paramIndex})`
}

export async function listSuppliers(tenantId, { q, page = 1, limit = 8, active = 'active', branchId = null } = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 8))
  const offset = (safePage - 1) * safeLimit
  const activeClause = activeSqlClause(active)

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${supplierSelect},
        count(*) OVER()::int AS "_total"
      FROM suppliers
      WHERE tenant_id = $1
        ${activeClause}
        ${branchClause(2)}
        AND (
          $3::text IS NULL
          OR company_name ILIKE '%' || $3 || '%'
          OR id::text ILIKE '%' || $3 || '%'
        )
      ORDER BY company_name
      LIMIT $4 OFFSET $5
    `,
    [branchId, q || null, safeLimit, offset],
  )

  const total = rows[0]?._total || 0
  const items = rows.map(({ _total, ...item }) => mapSupplierRow(item))
  return { items, total, page: safePage, limit: safeLimit }
}

export async function createSupplier(tenantId, payload) {
  if (!payload.branchId) {
    const error = new Error('branchId is required to create a supplier')
    error.status = 422
    throw error
  }

  const { rows } = await tenantQuery(
    tenantId,
    `
      INSERT INTO suppliers (
        tenant_id, branch_id, company_name, image_url, company_phone, representative_name,
        representative_phone, representative_email, location, tax_paid,
        registration_number, bank_account_number, signature_url, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING ${supplierSelect}
    `,
    [
      payload.branchId,
      payload.companyName,
      payload.imageUrl || null,
      payload.companyPhone || null,
      payload.representativeName || null,
      payload.representativePhone || null,
      payload.representativeEmail || null,
      payload.location || null,
      payload.taxPaid ?? false,
      payload.registrationNumber || null,
      payload.bankAccountNumber || null,
      payload.signatureUrl || null,
    ],
  )
  return mapSupplierRow(rows[0])
}

export async function updateSupplier(tenantId, id, payload, { branchId = null } = {}) {
  const updatableColumns = {
    companyName: 'company_name',
    companyPhone: 'company_phone',
    representativeName: 'representative_name',
    representativePhone: 'representative_phone',
    representativeEmail: 'representative_email',
    location: 'location',
    taxPaid: 'tax_paid',
    registrationNumber: 'registration_number',
    bankAccountNumber: 'bank_account_number',
    imageUrl: 'image_url',
    signatureUrl: 'signature_url',
    isActive: 'is_active',
  }

  const setClauses = []
  const params = [id, branchId]

  for (const [payloadKey, column] of Object.entries(updatableColumns)) {
    if (!(payloadKey in payload)) continue
    const paramIndex = params.length + 2
    setClauses.push(`${column} = $${paramIndex}`)
    params.push(payload[payloadKey] ?? null)
  }

  if (!setClauses.length) {
    const { rows } = await tenantQuery(
      tenantId,
      `
        SELECT ${supplierSelect}
        FROM suppliers
        WHERE tenant_id = $1 AND id = $2
          ${branchClause(3)}
        LIMIT 1
      `,
      [id, branchId],
    )
    return mapSupplierRow(rows[0] || null)
  }

  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE suppliers
      SET ${setClauses.join(', ')}
      WHERE tenant_id = $1 AND id = $2
        ${branchClause(3)}
      RETURNING ${supplierSelect}
    `,
    params,
  )
  return mapSupplierRow(rows[0] || null)
}

export async function setSupplierActive(tenantId, id, isActive, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      UPDATE suppliers
      SET is_active = $2
      WHERE tenant_id = $1 AND id = $3
        ${branchClause(4)}
      RETURNING ${supplierSelect}
    `,
    [isActive, id, branchId],
  )
  return mapSupplierRow(rows[0] || null)
}

// Hard delete — blocked when referenced by orders / ledger
export async function deleteSupplier(tenantId, id, { branchId = null } = {}) {
  const { rows: refs } = await tenantQuery(
    tenantId,
    `
      SELECT
        EXISTS (
          SELECT 1 FROM purchase_orders
          WHERE tenant_id = $1 AND supplier_id = $2
        ) AS "hasPoHeader",
        EXISTS (
          SELECT 1 FROM purchase_order_suppliers
          WHERE tenant_id = $1 AND supplier_id = $2
        ) AS "hasPoSupplier",
        EXISTS (
          SELECT 1 FROM purchase_order_items
          WHERE tenant_id = $1 AND supplier_id = $2
        ) AS "hasPoItems",
        EXISTS (
          SELECT 1 FROM inventory_ledger
          WHERE tenant_id = $1 AND supplier_id = $2
        ) AS "hasLedger"
    `,
    [id],
  )
  const hit = refs[0]
  if (hit?.hasPoHeader || hit?.hasPoSupplier || hit?.hasPoItems || hit?.hasLedger) {
    throw httpError(
      409,
      'Cannot delete supplier — it is referenced by existing order or stock records. Block the supplier instead.',
    )
  }
  const { rows } = await tenantQuery(
    tenantId,
    `
      DELETE FROM suppliers
      WHERE tenant_id = $1 AND id = $2
        ${branchClause(3)}
      RETURNING id, company_name AS "companyName", branch_id AS "branchId"
    `,
    [id, branchId],
  )
  return rows[0] || null
}

export async function assertSupplierActive(tenantId, id, { branchId = null } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, is_active AS "isActive", company_name AS "companyName", branch_id AS "branchId"
      FROM suppliers
      WHERE tenant_id = $1 AND id = $2
        ${branchClause(3)}
      LIMIT 1
    `,
    [id, branchId],
  )
  const row = rows[0]
  if (!row) {
    const error = new Error('Supplier not found')
    error.status = 404
    throw error
  }
  if (!row.isActive) {
    const error = new Error('Supplier is inactive and cannot be used for new orders')
    error.status = 409
    throw error
  }
  return row
}
