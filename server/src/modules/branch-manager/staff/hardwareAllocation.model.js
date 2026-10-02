import { tenantClientQuery, tenantQuery } from '../../../config/db.js'
import {
  HARDWARE_MODES,
  hardwareModeForRole,
  isExclusiveHardwareMode,
} from './hardwarePolicy.js'
import {
  assertSlotInFreeList,
  computeFreeSlotsForCandidate,
  slotWithinShift,
} from './hardwareAvailability.js'
import {
  formatAllocatedSlot,
  normalizeWorkingDays,
  schedulesConflict,
} from './schedule.validation.js'
import { ROLES } from '../../../config/constants.js'

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

// Shared conflict copy for concurrent / stale slot picks (QA G3–G4).
export const HARDWARE_SLOT_UNAVAILABLE_MSG =
  'This hardware slot is no longer available. Please select another available slot.'

function hasShift(start, end) {
  return Boolean(start) && Boolean(end) && String(start).trim() && String(end).trim()
}

// Reject assign when schedule is incomplete (any role that picks a device).
export function assertScheduleReadyForHardware({
  workingDays,
  scheduleStart,
  scheduleEnd,
  hardwareDeviceId,
}) {
  if (!hardwareDeviceId) return

  const days = normalizeWorkingDays(workingDays)
  if (!days.length) {
    throw httpError(400, 'Select working days before assigning hardware')
  }
  if (!hasShift(scheduleStart, scheduleEnd)) {
    throw httpError(400, 'Set shift start and end before assigning hardware')
  }
}

function mapAllocationRow(row) {
  if (!row) return null
  const workingDays = Array.isArray(row.workingDays) ? row.workingDays : []
  return {
    id: row.id,
    staffId: row.staffId,
    hardwareId: row.hardwareId,
    workingDays,
    startTime: row.startTime,
    endTime: row.endTime,
    mode: row.mode,
    status: row.status,
    staffName: row.staffName || null,
    staffRole: row.staffRole || null,
    slotLabel: formatAllocatedSlot({
      workingDays,
      scheduleStart: row.startTime,
      scheduleEnd: row.endTime,
    }),
  }
}

// Active allocations for devices in a branch (availability / conflict).
// When `client` is set (inside a write tx), lock rows so concurrent saves serialize.
export async function listActiveAllocationsForDevices(
  tenantId,
  { branchId, hardwareIds, excludeStaffId = null, forUpdate = false },
  client = null,
) {
  if (!hardwareIds?.length) return []
  const lockClause = forUpdate && client ? ' FOR UPDATE OF a' : ''
  const sql = `
    SELECT
      a.id,
      a.staff_id AS "staffId",
      a.hardware_id AS "hardwareId",
      a.working_days AS "workingDays",
      a.start_time AS "startTime",
      a.end_time AS "endTime",
      a.mode,
      a.status,
      u.full_name AS "staffName",
      r.slug AS "staffRole"
    FROM hardware_allocations a
    JOIN staff s ON s.id = a.staff_id AND s.tenant_id = a.tenant_id
    JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
    JOIN roles r ON r.id = u.role_id
    WHERE a.tenant_id = $1
      AND a.branch_id = $2
      AND a.status = 'active'
      AND a.hardware_id = ANY($3::uuid[])
      AND s.status NOT IN ('inactive', 'blocked')
      AND ($4::uuid IS NULL OR a.staff_id <> $4)
    ${lockClause}
  `
  const params = [branchId, hardwareIds, excludeStaffId || null]
  const { rows } = client
    ? await tenantClientQuery(client, tenantId, sql, params)
    : await tenantQuery(tenantId, sql, params)
  return rows.map(mapAllocationRow)
}

export async function getActiveAllocationForStaff(client, tenantId, staffId) {
  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT
        a.id,
        a.staff_id AS "staffId",
        a.hardware_id AS "hardwareId",
        a.working_days AS "workingDays",
        a.start_time AS "startTime",
        a.end_time AS "endTime",
        a.mode,
        a.status
      FROM hardware_allocations a
      WHERE a.tenant_id = $1
        AND a.staff_id = $2
        AND a.status = 'active'
      ORDER BY a.created_at DESC
      LIMIT 1
    `,
    [staffId],
  )
  return mapAllocationRow(rows[0] || null)
}

// Core conflict rules:
// 1) Exclusive (IM) lock on device → nobody else may take it.
// 2) Shared/optional → block only when working days + times overlap.
export async function assertHardwareAllocationAvailable(
  client,
  tenantId,
  {
    branchId,
    hardwareDeviceId,
    role,
    workingDays,
    scheduleStart,
    scheduleEnd,
    allocationStart = null,
    allocationEnd = null,
    excludeStaffId = null,
  },
) {
  if (!hardwareDeviceId) return

  assertScheduleReadyForHardware({
    workingDays,
    scheduleStart,
    scheduleEnd,
    hardwareDeviceId,
  })

  const mode = hardwareModeForRole(role)
  const days = normalizeWorkingDays(workingDays)

  // Cashier with a device must send an explicit allocation window (full shift or sub-slot).
  if (role === ROLES.CASHIER) {
    if (!hasShift(allocationStart, allocationEnd)) {
      throw httpError(
        400,
        'Cashier hardware assignment requires hardwareAllocationStart and hardwareAllocationEnd',
      )
    }
    if (!slotWithinShift(allocationStart, allocationEnd, scheduleStart, scheduleEnd)) {
      throw httpError(400, 'Hardware allocation must stay within the employee shift')
    }
  }

  const windowStart =
    role === ROLES.CASHIER ? allocationStart : scheduleStart
  const windowEnd = role === ROLES.CASHIER ? allocationEnd : scheduleEnd

  // Device must belong to this branch and be active
  const { rows: hwRows } = await tenantClientQuery(
    client,
    tenantId,
    `
      SELECT id, name, COALESCE(is_active, true) AS "isActive"
      FROM branch_hardware
      WHERE tenant_id = $1
        AND id = $2::uuid
        AND branch_id = $3
      LIMIT 1
      FOR UPDATE
    `,
    [hardwareDeviceId, branchId],
  )
  const hardware = hwRows[0]
  if (!hardware) {
    throw httpError(400, 'Hardware does not belong to this branch')
  }
  if (hardware.isActive === false) {
    throw httpError(400, 'Hardware is inactive and cannot be assigned')
  }

  const holders = await listActiveAllocationsForDevices(
    tenantId,
    {
      branchId,
      hardwareIds: [hardwareDeviceId],
      excludeStaffId,
      forUpdate: true,
    },
    client,
  )

  // Claiming exclusive: device must have zero active holders
  if (isExclusiveHardwareMode(mode) && holders.length) {
    const name = holders[0].staffName || 'another staff member'
    throw httpError(
      409,
      `This device is already allocated to ${name}. Inventory Manager hardware must be exclusive.`,
    )
  }

  const candidate = { workingDays: days, scheduleStart, scheduleEnd }
  const { freeSlots, availability } = computeFreeSlotsForCandidate(candidate, holders)

  if (availability === 'locked_exclusive' || availability === 'fully_occupied') {
    throw httpError(409, HARDWARE_SLOT_UNAVAILABLE_MSG)
  }

  const slotProbe = {
    workingDays: days,
    scheduleStart: windowStart,
    scheduleEnd: windowEnd,
  }

  if (role === ROLES.CASHIER) {
    if (!assertSlotInFreeList(freeSlots, allocationStart, allocationEnd)) {
      throw httpError(409, HARDWARE_SLOT_UNAVAILABLE_MSG)
    }
  } else if (!isExclusiveHardwareMode(mode)) {
    for (const holder of holders) {
      const conflicts = schedulesConflict(slotProbe, {
        workingDays: holder.workingDays,
        scheduleStart: holder.startTime,
        scheduleEnd: holder.endTime,
      })
      if (conflicts) {
        throw httpError(409, HARDWARE_SLOT_UNAVAILABLE_MSG)
      }
    }
  }
}

export async function releaseActiveAllocationsForStaff(client, tenantId, staffId) {
  await tenantClientQuery(
    client,
    tenantId,
    `
      UPDATE hardware_allocations
      SET status = 'released',
          released_at = now(),
          updated_at = now()
      WHERE tenant_id = $1
        AND staff_id = $2
        AND status = 'active'
    `,
    [staffId],
  )
}

// Replace staff's active allocation (or clear when hardwareDeviceId is null).
// Release + insert run in the caller's transaction so device change is atomic.
export async function upsertStaffHardwareAllocation(
  client,
  tenantId,
  {
    branchId,
    staffId,
    role,
    hardwareDeviceId,
    workingDays,
    scheduleStart,
    scheduleEnd,
    allocationStart = null,
    allocationEnd = null,
  },
) {
  await releaseActiveAllocationsForStaff(client, tenantId, staffId)

  if (!hardwareDeviceId) return null

  const mode = hardwareModeForRole(role)
  const days = normalizeWorkingDays(workingDays)

  // IM / optional: persist full shift. Cashier: persist selected slot (required).
  const persistStart =
    role === ROLES.CASHIER ? allocationStart : scheduleStart
  const persistEnd = role === ROLES.CASHIER ? allocationEnd : scheduleEnd

  await assertHardwareAllocationAvailable(client, tenantId, {
    branchId,
    hardwareDeviceId,
    role,
    workingDays: days,
    scheduleStart,
    scheduleEnd,
    allocationStart: role === ROLES.CASHIER ? persistStart : null,
    allocationEnd: role === ROLES.CASHIER ? persistEnd : null,
    excludeStaffId: staffId,
  })

  const { rows } = await tenantClientQuery(
    client,
    tenantId,
    `
      INSERT INTO hardware_allocations (
        tenant_id, branch_id, staff_id, hardware_id,
        working_days, start_time, end_time, mode, status
      )
      VALUES ($1, $2, $3, $4::uuid, $5::text[], $6::time, $7::time, $8, 'active')
      RETURNING
        id,
        staff_id AS "staffId",
        hardware_id AS "hardwareId",
        working_days AS "workingDays",
        start_time AS "startTime",
        end_time AS "endTime",
        mode,
        status
    `,
    [
      branchId,
      staffId,
      hardwareDeviceId,
      days,
      persistStart,
      persistEnd,
      mode,
    ],
  )

  return mapAllocationRow(rows[0])
}

// Availability for listHardware (partial slots + IM lock).
export function classifyDeviceAvailability(candidate, holders) {
  const detail = computeFreeSlotsForCandidate(candidate, holders)
  return {
    availability: detail.availability,
    available: detail.available,
    occupiedBy: detail.occupiedBy,
    occupiedSlot: detail.occupiedSlot,
    mode: detail.mode,
    freeSlots: detail.freeSlots,
    occupiedIntervals: detail.occupiedIntervals,
  }
}

export { HARDWARE_MODES, hardwareModeForRole }
