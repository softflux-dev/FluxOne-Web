import {
  createHolidaySchedule,
  listHolidaySchedules,
  getHolidayScheduleById,
  updateHolidaySchedule,
  deleteHolidaySchedule,
} from './holidays.model.js'
import {
  clearHolidayAttendanceByDates,
  batchUpsertHolidayAttendance,
} from '../attendance/attendance.model.js'
import { tenantQuery } from '../../../config/db.js'
import { success, fail, failFromError } from '../../../utils/response.util.js'

function getDatesInRange(startDate, endDate) {
  const dates = []
  if (!startDate) return dates
  const current = new Date(startDate)
  const last = new Date(endDate || startDate)
  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime())) return dates
  // Normalize to UTC date-only to avoid timezone day-shift
  const cursor = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()))
  const end = new Date(Date.UTC(last.getFullYear(), last.getMonth(), last.getDate()))
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

async function resolveTargetStaffIds(tenantId, schedule, employeeIds) {
  if (schedule.isAllEmployees) {
    const { rows: allStaff } = await tenantQuery(
      tenantId,
      `
        SELECT s.id
        FROM staff s
        JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1
          AND s.status = 'active'
          AND u.is_active = true
          AND ($2::uuid IS NULL OR s.branch_id = $2)
      `,
      [schedule.branchId || null],
    )
    return allStaff.map((s) => s.id)
  }
  return Array.isArray(employeeIds) ? employeeIds.filter(Boolean) : []
}

//
// Sync holiday → attendance in 1–2 queries (clear range + batch upsert).
//
async function syncScheduleAttendance(tenantId, userId, schedule, employeeIds) {
  const dates = getDatesInRange(schedule.startDate, schedule.endDate)
  if (!dates.length) return

  const note = schedule.name || null

  if (schedule.status === 'inactive') {
    await clearHolidayAttendanceByDates(tenantId, { dates, note })
    return
  }

  const targetStaffIds = await resolveTargetStaffIds(tenantId, schedule, employeeIds)
  if (!targetStaffIds.length) return

  // Replace prior marks for this holiday name on these dates, then write fresh rows
  await clearHolidayAttendanceByDates(tenantId, { dates, note })
  await batchUpsertHolidayAttendance(tenantId, {
    staffIds: targetStaffIds,
    dates,
    note,
    createdBy: userId,
  })
}

export async function holidaysList(req, res) {
  const rows = await listHolidaySchedules(req.tenantId, { branchId: req.user?.branchId || null })
  return success(res, rows)
}

export async function addHoliday(req, res) {
  const {
    name,
    startDate,
    endDate,
    isAllEmployees = true,
    employeeIds = [],
    status = 'active',
  } = req.validated.body

  try {
    const schedule = await createHolidaySchedule(req.tenantId, {
      name: name.trim(),
      startDate,
      endDate: endDate || startDate,
      isAllEmployees: Boolean(isAllEmployees),
      employeeIds: Array.isArray(employeeIds) ? employeeIds : [],
      status: status || 'active',
      branchId: req.user?.branchId || null,
    })

    await syncScheduleAttendance(
      req.tenantId,
      req.user.id,
      {
        ...schedule,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
      },
      employeeIds,
    )

    return success(res, schedule, 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create holiday schedule')
  }
}

export async function editHoliday(req, res) {
  const { id } = req.validated.params
  const {
    name,
    startDate,
    endDate,
    holidayDate,
    isAllEmployees,
    employeeIds,
    status,
  } = req.validated.body

  try {
    const existing = await getHolidayScheduleById(req.tenantId, id)
    if (!existing) return fail(res, 'Holiday schedule not found', 404)

    // One DELETE for the old date range + old holiday name
    const oldDates = getDatesInRange(existing.startDate, existing.endDate)
    if (oldDates.length) {
      await clearHolidayAttendanceByDates(req.tenantId, {
        dates: oldDates,
        note: existing.name,
      })
    }

    const updated = await updateHolidaySchedule(req.tenantId, id, {
      name: name?.trim(),
      startDate: startDate || holidayDate || existing.startDate,
      endDate: endDate || startDate || holidayDate || existing.endDate,
      isAllEmployees,
      employeeIds,
      status,
      branchId: req.user?.branchId || null,
    })

    if (!updated) return fail(res, 'Failed to update holiday schedule', 500)

    await syncScheduleAttendance(
      req.tenantId,
      req.user.id,
      updated,
      updated.employeeIds,
    )

    return success(res, updated)
  } catch (err) {
    return failFromError(res, err, 'Failed to update holiday schedule')
  }
}

export async function removeHoliday(req, res) {
  const { id } = req.validated.params

  try {
    const existing = await getHolidayScheduleById(req.tenantId, id)
    if (!existing) return fail(res, 'Holiday schedule not found', 404)

    const dates = getDatesInRange(existing.startDate, existing.endDate)
    if (dates.length) {
      await clearHolidayAttendanceByDates(req.tenantId, {
        dates,
        note: existing.name,
      })
    }

    const deleted = await deleteHolidaySchedule(req.tenantId, id)
    return success(res, deleted)
  } catch (err) {
    return failFromError(res, err, 'Failed to delete holiday schedule')
  }
}
