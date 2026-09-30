import { tenantClientQuery, tenantQuery, withTransaction } from '../../../config/db.js'
import { ROLE_IDS } from '../../../config/constants.js'
import {
  CREATABLE_STAFF_ROLES,
  CREATABLE_STAFF_ROLE_SQL,
  STAFF_ROLE_TO_DESIGNATION,
} from './staff.access.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'
import { displayRefSearchHex, normalizeSearchQuery } from '../../../utils/displayRef.util.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

const staffSelect = `
  s.id,
  s.image_url AS "imageUrl",
  COALESCE(s.joined_at, s.created_at) AS "joiningDate",
  s.created_at AS "createdAt",
  s.designation_id AS "designationId",
  COALESCE(d.name, s.designation) AS "designation",
  s.hardware_device_id AS "hardwareDeviceId",
  hw.code AS "hardwareCode",
  hw.name AS "hardwareName",
  s.status,
  s.schedule_start AS "scheduleStart",
  s.schedule_break_start AS "scheduleBreakStart",
  s.schedule_break_end AS "scheduleBreakEnd",
  s.schedule_end AS "scheduleEnd",
  s.branch_id AS "branchId",
  s.user_id AS "userId",
  u.full_name AS "fullName",
  u.email,
  u.phone,
  u.is_active AS "isActive",
  r.slug AS role
`

function mapStaffRow(row) {
  if (!row) return null
  return {
    ...row,
    imageUrl: normalizeImageUrl(row.imageUrl),
  }
}

function mapPgUniqueViolation(err, message) {
  if (err?.code === '23505') {
    throw httpError(409, message)
  }
  throw err
}

export async function listStaff(tenantId, filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 8))
  const offset = (page - 1) * limit

  // STF-XXXXXXXX display refs are UI-only — match via compact UUID hex
  const q = normalizeSearchQuery(filters.q) || null
  const qHex = q ? displayRefSearchHex(q, 'STF') : null

  const params = [
    q,
    qHex,
    filters.designationId || null,
    filters.status || null,
    filters.branchId || null,
    filters.role || null,
  ]

  const { rows: countRows } = await tenantQuery(
    tenantId,
    `
      SELECT count(*)::int AS total
      FROM staff s
      JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
      JOIN roles r ON r.id = u.role_id
      WHERE s.tenant_id = $1
        AND r.slug IN (${CREATABLE_STAFF_ROLE_SQL})
        AND (
          $2::text IS NULL
          OR u.full_name ILIKE '%' || $2 || '%'
          OR u.email ILIKE '%' || $2 || '%'
          OR s.id::text ILIKE '%' || $2 || '%'
          OR (
            $3::text IS NOT NULL
            AND REPLACE(LOWER(s.id::text), '-', '') ILIKE '%' || $3 || '%'
          )
        )
        AND ($4::uuid IS NULL OR s.designation_id = $4)
        AND ($5::text IS NULL OR s.status = $5)
        AND ($6::uuid IS NULL OR s.branch_id = $6)
        AND ($7::text IS NULL OR r.slug = $7)
    `,
    params,
  )

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${staffSelect}
      FROM staff s
      JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN designations d ON d.id = s.designation_id AND d.tenant_id = s.tenant_id
      LEFT JOIN branch_hardware hw
        ON hw.tenant_id = s.tenant_id
       AND hw.id::text = s.hardware_device_id
      WHERE s.tenant_id = $1
        AND r.slug IN (${CREATABLE_STAFF_ROLE_SQL})
        AND (
          $2::text IS NULL
          OR u.full_name ILIKE '%' || $2 || '%'
          OR u.email ILIKE '%' || $2 || '%'
          OR s.id::text ILIKE '%' || $2 || '%'
          OR (
            $3::text IS NOT NULL
            AND REPLACE(LOWER(s.id::text), '-', '') ILIKE '%' || $3 || '%'
          )
        )
        AND ($4::uuid IS NULL OR s.designation_id = $4)
        AND ($5::text IS NULL OR s.status = $5)
        AND ($6::uuid IS NULL OR s.branch_id = $6)
        AND ($7::text IS NULL OR r.slug = $7)
      ORDER BY COALESCE(s.joined_at, s.created_at) DESC, u.full_name
      LIMIT $8 OFFSET $9
    `,
    [...params, limit, offset],
  )

  return { items: rows.map(mapStaffRow), total: countRows[0]?.total || 0, page, limit }
}

export async function getStaffById(tenantId, id, { branchId } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${staffSelect}
      FROM staff s
      JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN designations d ON d.id = s.designation_id AND d.tenant_id = s.tenant_id
      LEFT JOIN branch_hardware hw
        ON hw.tenant_id = s.tenant_id
       AND hw.id::text = s.hardware_device_id
      WHERE s.tenant_id = $1
        AND s.id = $2
        AND ($3::uuid IS NULL OR s.branch_id = $3)
        AND r.slug IN (${CREATABLE_STAFF_ROLE_SQL})
      LIMIT 1
    `,
    [id, branchId || null],
  )
  return mapStaffRow(rows[0] || null)
}

async function lookupDesignation(client, tenantId, { designationId, designationName }) {
  if (designationId) {
    const { rows } = await tenantClientQuery(
      client,
      tenantId,
      `
        SELECT id, name, is_active AS "isActive"
        FROM designations
        WHERE tenant_id = $1 AND id = $2
        LIMIT 1
      `,
      [designationId],
    )
    if (!rows[0]) throw httpError(404, 'Designation not found')
    if (!rows[0].isActive) throw httpError(409, 'Designation is inactive')
    return { designationId: rows[0].id, designationName: rows[0].name }
  }

  if (!designationName?.trim()) {
    return { designationId: null, designationName: null }
  }

  const name = designationName.trim()
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id, name, is_active AS "isActive"
      FROM designations
      WHERE tenant_id = $1 AND name = $2
      LIMIT 1
    `,
    [name],
  )
  if (!rows[0]) {
    throw httpError(
      400,
      `Designation "${name}" is not configured. Ask your B2B Admin to create it.`,
    )
  }
  if (!rows[0].isActive) throw httpError(409, 'Designation is inactive')
  return { designationId: rows[0].id, designationName: rows[0].name }
}

// Ensure fixed staff-role designation exists for this tenant (create if missing).
async function ensureDesignationByName(client, tenantId, name) {
  try {
    return await lookupDesignation(client, tenantId, { designationName: name })
  } catch (err) {
    if (err?.status !== 400) throw err
  }

  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO designations (tenant_id, name, is_active)
      VALUES ($1, $2, TRUE)
      RETURNING id, name
    `,
    [name],
  )
  return { designationId: rows[0].id, designationName: rows[0].name }
}

async function resolveStaffDesignation(client, tenantId, payload) {
  if (payload.designationId) {
    return lookupDesignation(client, tenantId, { designationId: payload.designationId })
  }

  if (payload.designation?.trim()) {
    return lookupDesignation(client, tenantId, { designationName: payload.designation })
  }

  const roleSlug =
    payload.role || Object.keys(ROLE_IDS).find((key) => ROLE_IDS[key] === payload.roleId)
  const mappedName = STAFF_ROLE_TO_DESIGNATION[roleSlug]
  if (mappedName) {
    return ensureDesignationByName(client, tenantId, mappedName)
  }

  throw httpError(400, 'designationId, designation, or a valid staff role is required')
}

export async function createStaffUser(tenantId, payload) {
  if (!payload.branchId) {
    throw httpError(400, 'branchId is required')
  }

  const allowedRoles = CREATABLE_STAFF_ROLES
  const roleSlug =
    payload.role ||
    Object.entries(ROLE_IDS).find(([, id]) => id === payload.roleId)?.[0]
  if (!allowedRoles.includes(roleSlug)) {
    throw httpError(
      400,
      `Staff role must be one of: ${CREATABLE_STAFF_ROLES.join(', ')}`,
    )
  }

  try {
    return await withTransaction(async (client) => {
      const resolved = await resolveStaffDesignation(client, tenantId, {
        ...payload,
        role: roleSlug,
      })

      const { rows: userRows } = await tenantClientQuery(
        client,
        tenantId,
        `
          INSERT INTO users (
            tenant_id, branch_id, role_id, full_name, email, password_hash, phone, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `,
        [
          payload.branchId,
          payload.roleId,
          payload.fullName,
          payload.email,
          payload.passwordHash,
          payload.phone || null,
          payload.status !== 'inactive' && payload.status !== 'blocked',
        ],
      )

      const userId = userRows[0].id

      const { rows: staffRows } = await tenantClientQuery(
        client,
        tenantId,
        `
          INSERT INTO staff (
            tenant_id, user_id, branch_id, designation, designation_id,
            hardware_device_id, image_url, status,
            schedule_start, schedule_break_start, schedule_break_end, schedule_end,
            joined_at, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13::timestamptz, now()), $14)
          RETURNING id
        `,
        [
          userId,
          payload.branchId,
          resolved.designationName,
          resolved.designationId,
          payload.hardwareDeviceId || null,
          payload.imageUrl || null,
          payload.status || 'active',
          payload.scheduleStart || null,
          payload.scheduleBreakStart || null,
          payload.scheduleBreakEnd || null,
          payload.scheduleEnd || null,
          payload.joinedAt || null,
          payload.createdBy || null,
        ],
      )

      return getStaffByIdInTx(client, tenantId, staffRows[0].id)
    })
  } catch (err) {
    mapPgUniqueViolation(err, 'A user with this email already exists')
  }
}

async function getStaffByIdInTx(client, tenantId, id, { branchId } = {}) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT ${staffSelect}
      FROM staff s
      JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN designations d ON d.id = s.designation_id AND d.tenant_id = s.tenant_id
      LEFT JOIN branch_hardware hw
        ON hw.tenant_id = s.tenant_id
       AND hw.id::text = s.hardware_device_id
      WHERE s.tenant_id = $1
        AND s.id = $2
        AND ($3::uuid IS NULL OR s.branch_id = $3)
        AND r.slug IN (${CREATABLE_STAFF_ROLE_SQL})
      LIMIT 1
    `,
    [id, branchId || null],
  )
  return mapStaffRow(rows[0] || null)
}

export async function updateStaff(tenantId, id, payload, { branchId } = {}) {
  try {
    return await withTransaction(async (client) => {
      const existing = await getStaffByIdInTx(client, tenantId, id, { branchId })
      if (!existing) throw httpError(404, 'Staff not found')

      let designationName = existing.designation
      let designationId = existing.designationId
      if (
        payload.designationId !== undefined ||
        payload.designation !== undefined ||
        payload.role !== undefined
      ) {
        const resolved = await resolveStaffDesignation(client, tenantId, {
          designationId: payload.designationId,
          designation: payload.designation,
          role: payload.role || existing.role,
        })
        designationName = resolved.designationName
        designationId = resolved.designationId
      }

      const roleId = payload.role ? ROLE_IDS[payload.role] : null
      const nextBranchId =
        payload.branchId !== undefined ? payload.branchId : existing.branchId

      await tenantClientQuery(
        client,
        tenantId,
        `
          UPDATE users
          SET
            full_name = COALESCE($2, full_name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            branch_id = COALESCE($5, branch_id),
            role_id = COALESCE($6, role_id),
            password_hash = COALESCE($7, password_hash),
            is_active = CASE
              WHEN $8::text IS NULL THEN is_active
              ELSE ($8::text NOT IN ('inactive', 'blocked'))
            END
          WHERE tenant_id = $1 AND id = $9
        `,
        [
          payload.fullName || null,
          payload.email || null,
          payload.phone !== undefined ? payload.phone : null,
          nextBranchId,
          roleId,
          payload.passwordHash || null,
          payload.status || null,
          existing.userId,
        ],
      )

      await tenantClientQuery(
        client,
        tenantId,
        `
          UPDATE staff
          SET
            designation = COALESCE($2, designation),
            designation_id = COALESCE($3, designation_id),
            hardware_device_id = $4,
            image_url = COALESCE($5, image_url),
            status = COALESCE($6, status),
            schedule_start = COALESCE($7, schedule_start),
            schedule_break_start = COALESCE($8, schedule_break_start),
            schedule_break_end = COALESCE($9, schedule_break_end),
            schedule_end = COALESCE($10, schedule_end),
            branch_id = COALESCE($11, branch_id)
          WHERE tenant_id = $1 AND id = $12
        `,
        [
          designationName,
          payload.designationId !== undefined ||
            payload.designation !== undefined ||
            payload.role !== undefined
            ? designationId
            : null,
          payload.hardwareDeviceId !== undefined
            ? payload.hardwareDeviceId || null
            : existing.hardwareDeviceId || null,
          payload.imageUrl || null,
          payload.status || null,
          payload.scheduleStart !== undefined ? payload.scheduleStart : null,
          payload.scheduleBreakStart !== undefined ? payload.scheduleBreakStart : null,
          payload.scheduleBreakEnd !== undefined ? payload.scheduleBreakEnd : null,
          payload.scheduleEnd !== undefined ? payload.scheduleEnd : null,
          nextBranchId,
          id,
        ],
      )

      return getStaffByIdInTx(client, tenantId, id, { branchId })
    })
  } catch (err) {
    mapPgUniqueViolation(err, 'A user with this email already exists')
  }
}

export async function setStaffStatus(tenantId, id, status, { branchId } = {}) {
  return withTransaction(async (client) => {
    const existing = await getStaffByIdInTx(client, tenantId, id, { branchId })
    if (!existing) throw httpError(404, 'Staff not found')

    await tenantClientQuery(
      client,
      tenantId,
      `
        UPDATE staff
        SET status = $2
        WHERE tenant_id = $1 AND id = $3
      `,
      [status, id],
    )

    await tenantClientQuery(
      client,
      tenantId,
      `
        UPDATE users
        SET is_active = ($2::text NOT IN ('inactive', 'blocked'))
        WHERE tenant_id = $1 AND id = $3
      `,
      [status, existing.userId],
    )

    return getStaffByIdInTx(client, tenantId, id, { branchId })
  })
}

// Hard-delete staff user (staff row cascades from user). Branch-scoped for BM.
export async function deleteStaff(tenantId, id, { branchId } = {}) {
  return withTransaction(async (client) => {
    const existing = await getStaffByIdInTx(client, tenantId, id, { branchId })
    if (!existing) throw httpError(404, 'Staff not found')

    await tenantClientQuery(
      client,
      tenantId,
      `
        DELETE FROM users
        WHERE tenant_id = $1 AND id = $2
      `,
      [existing.userId],
    )

    return existing
  })
}

// @deprecated Prefer createStaffUser — kept for any legacy imports
export const createStaff = createStaffUser
