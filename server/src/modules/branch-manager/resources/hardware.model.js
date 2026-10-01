import { tenantQuery } from '../../../config/db.js'
import { normalizeImageUrl } from '../../../utils/uploadUrl.util.js'
import {
  normalizeWorkingDays,
  schedulesConflict,
} from '../staff/schedule.validation.js'

const HARDWARE_TYPES = new Set(['Computers', 'Scanners', 'Printers', 'Telephone', 'Other'])
const HARDWARE_STATUSES = new Set(['New', 'Used', 'Good', 'Poor'])

const hardwareSelect = `
  h.id,
  h.code,
  h.name,
  h.company_name AS "companyName",
  h.type,
  h.status,
  h.access_status AS "accessStatus",
  COALESCE(h.is_active, true) AS "isActive",
  h.image_url AS "imageUrl",
  h.created_at AS "createdAt",
  h.branch_id AS "branchId",
  u.full_name AS "assignedToName",
  s.id AS "assignedToStaffId"
`

function mapHardware(row) {
  if (!row) return null
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    companyName: row.companyName,
    type: row.type,
    status: row.status,
    // System Access: active | blocked (Admin + BM can toggle)
    accessStatus: row.accessStatus === 'blocked' ? 'blocked' : 'active',
    // Soft delete — directory visibility
    isActive: row.isActive !== false,
    image: normalizeImageUrl(row.imageUrl) || '',
    imageUrl: normalizeImageUrl(row.imageUrl) || '',
    createdAt: row.createdAt,
    branchId: row.branchId,
    assignedToName: row.assignedToName || null,
    assignedToStaffId: row.assignedToStaffId || null,
  }
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function formatSeqCode(prefix, n) {
  return `${prefix}-${String(n).padStart(3, '0')}`
}

async function nextHardwareCode(tenantId, branchId) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT COALESCE(
        MAX(
          CASE
            WHEN code ~ '^HW-[0-9]+$'
            THEN NULLIF(regexp_replace(code, '^HW-', ''), '')::int
            ELSE 0
          END
        ),
        0
      ) + 1 AS next_n
      FROM branch_hardware
      WHERE tenant_id = $1
        AND branch_id = $2
    `,
    [branchId],
  )
  return formatSeqCode('HW', rows[0]?.next_n || 1)
}

export function assertHardwareType(type) {
  if (!type) {
    throw httpError(400, 'Select a device type')
  }
  if (!HARDWARE_TYPES.has(type)) {
    throw httpError(400, 'Invalid hardware type')
  }
}

export function assertHardwareStatus(status) {
  if (!HARDWARE_STATUSES.has(status)) {
    throw httpError(400, 'Invalid hardware status')
  }
}

// active defaults to true (hide soft-deleted). Pass active: null for all rows.
// Optional availability: scheduleStart/End + workingDays → hide devices with overlapping staff.
export async function listHardware(
  tenantId,
  {
    branchId,
    type,
    q,
    active = true,
    scheduleStart = null,
    scheduleEnd = null,
    workingDays = null,
    excludeStaffId = null,
  } = {},
) {
  const search = q ? String(q).trim() : null
  const activeFilter = active === null || active === undefined ? null : Boolean(active)
  const days = normalizeWorkingDays(workingDays)
  const checkAvailability = Boolean(
    days.length || (scheduleStart && scheduleEnd),
  )

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${hardwareSelect}
      FROM branch_hardware h
      LEFT JOIN staff s
        ON s.tenant_id = h.tenant_id
       AND s.hardware_device_id = h.id::text
       AND s.status NOT IN ('inactive', 'blocked')
      LEFT JOIN users u
        ON u.id = s.user_id
       AND u.tenant_id = s.tenant_id
      WHERE h.tenant_id = $1
        AND ($2::uuid IS NULL OR h.branch_id = $2)
        AND ($3::text IS NULL OR h.type = $3)
        AND ($4::boolean IS NULL OR COALESCE(h.is_active, true) = $4)
        AND (
          $5::text IS NULL
          OR h.name ILIKE '%' || $5 || '%'
          OR h.code ILIKE '%' || $5 || '%'
          OR h.company_name ILIKE '%' || $5 || '%'
        )
      ORDER BY h.created_at DESC
    `,
    [branchId || null, type || null, activeFilter, search],
  )

  const mapped = rows.map(mapHardware)
  if (!checkAvailability) return mapped

  // Load all active assignments for these devices in one pass
  const deviceIds = mapped.map((h) => h.id)
  if (!deviceIds.length) return mapped

  const { rows: holders } = await tenantQuery(
    tenantId,
    `
      SELECT
        s.id AS "staffId",
        s.hardware_device_id AS "hardwareDeviceId",
        s.schedule_start AS "scheduleStart",
        s.schedule_end AS "scheduleEnd",
        COALESCE(s.working_days, ARRAY[]::text[]) AS "workingDays"
      FROM staff s
      WHERE s.tenant_id = $1
        AND ($2::uuid IS NULL OR s.branch_id = $2)
        AND s.hardware_device_id = ANY($3::text[])
        AND s.status NOT IN ('inactive', 'blocked')
        AND ($4::uuid IS NULL OR s.id <> $4)
    `,
    [branchId || null, deviceIds.map(String), excludeStaffId || null],
  )

  const candidate = {
    workingDays: days,
    scheduleStart,
    scheduleEnd,
  }

  const busy = new Set()
  for (const holder of holders) {
    if (schedulesConflict(candidate, holder)) {
      busy.add(String(holder.hardwareDeviceId))
    }
  }

  return mapped.filter((h) => !busy.has(String(h.id)))
}

export async function getHardwareById(tenantId, id, { branchId } = {}) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT ${hardwareSelect}
      FROM branch_hardware h
      LEFT JOIN staff s
        ON s.tenant_id = h.tenant_id
       AND s.hardware_device_id = h.id::text
      LEFT JOIN users u
        ON u.id = s.user_id
       AND u.tenant_id = s.tenant_id
      WHERE h.tenant_id = $1
        AND h.id = $2
        AND ($3::uuid IS NULL OR h.branch_id = $3)
      LIMIT 1
    `,
    [id, branchId || null],
  )
  return mapHardware(rows[0])
}

export async function createHardware(tenantId, payload) {
  const name = String(payload.name || '').trim()
  const companyName = String(payload.companyName || '').trim()
  const type = payload.type
  const status = payload.status
  const imageUrl = payload.image || payload.imageUrl || null
  const branchId = payload.branchId

  if (!branchId) throw httpError(400, 'branchId is required')
  if (!name) throw httpError(400, 'Hardware name is required')
  if (!companyName) throw httpError(400, 'Company name is required')
  assertHardwareType(type)
  assertHardwareStatus(status)

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = await nextHardwareCode(tenantId, branchId)
    try {
      const { rows } = await tenantQuery(
        tenantId,
        `
          INSERT INTO branch_hardware (
            tenant_id, branch_id, code, name, company_name, type, status, image_url, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
          RETURNING id
        `,
        [branchId, code, name, companyName, type, status, imageUrl || null],
      )
      return getHardwareById(tenantId, rows[0].id, { branchId })
    } catch (err) {
      if (err?.code === '23505' && attempt < 5) continue
      if (err?.code === '23505') {
        throw httpError(409, 'A hardware device with this ID already exists')
      }
      throw err
    }
  }

  throw httpError(500, 'Failed to allocate a unique hardware ID')
}

export async function updateHardware(tenantId, id, payload, { branchId } = {}) {
  const existing = await getHardwareById(tenantId, id, { branchId })
  if (!existing) return null

  const name = payload.name !== undefined ? String(payload.name || '').trim() : existing.name
  const companyName =
    payload.companyName !== undefined
      ? String(payload.companyName || '').trim()
      : existing.companyName
  const type = payload.type !== undefined ? payload.type : existing.type
  const status = payload.status !== undefined ? payload.status : existing.status
  const accessStatus =
    payload.accessStatus !== undefined
      ? payload.accessStatus === 'blocked'
        ? 'blocked'
        : 'active'
      : existing.accessStatus || 'active'
  const imageUrl =
    payload.image !== undefined || payload.imageUrl !== undefined
      ? payload.image || payload.imageUrl || null
      : existing.imageUrl || null

  if (!name) throw httpError(400, 'Hardware name is required')
  if (!companyName) throw httpError(400, 'Company name is required')
  assertHardwareType(type)
  assertHardwareStatus(status)

  await tenantQuery(
    tenantId,
    `
      UPDATE branch_hardware
      SET name = $2,
          company_name = $3,
          type = $4,
          status = $5,
          access_status = $6,
          image_url = $7
      WHERE tenant_id = $1 AND id = $8
        AND ($9::uuid IS NULL OR branch_id = $9)
    `,
    [name, companyName, type, status, accessStatus, imageUrl, id, branchId || null],
  )

  return getHardwareById(tenantId, id, { branchId })
}

// Soft-deactivate hardware (replaces hard delete for client UX).
export async function deleteHardware(tenantId, id, { branchId } = {}) {
  const existing = await getHardwareById(tenantId, id, { branchId })
  if (!existing) return null

  if (existing.assignedToStaffId) {
    throw httpError(
      409,
      'Cannot deactivate hardware. It is currently assigned to a staff member. Unassign it first.',
    )
  }

  const { rowCount } = await tenantQuery(
    tenantId,
    `
      UPDATE branch_hardware
      SET is_active = false
      WHERE tenant_id = $1 AND id = $2
        AND ($3::uuid IS NULL OR branch_id = $3)
        AND COALESCE(is_active, true) = true
    `,
    [id, branchId || null],
  )
  return rowCount > 0 ? { ...existing, isActive: false } : null
}
