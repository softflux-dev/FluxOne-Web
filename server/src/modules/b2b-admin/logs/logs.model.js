import { tenantQuery } from '../../../config/db.js'
import {
  formatActivityMessage,
  formatAffectedItem,
} from '../../../utils/activityLog.util.js'
import { buildAdminLogsListQuery } from './logs.filterSql.js'

function mapRow(row) {
  const details = row.details || {}
  return {
    id: row.id,
    branchId: row.branchId,
    branchName: row.branchName || null,
    actorName: row.actorName,
    actorRole: row.actorRole,
    actorUserId: row.actorUserId,
    action: row.action,
    category: row.category,
    source: row.source,
    entityType: row.entityType,
    entityId: row.entityId,
    details,
    createdAt: row.createdAt,
    message: formatActivityMessage(row.actorName, row.action, details),
    affectedItem: formatAffectedItem(details, row.entityType, row.entityId),
  }
}

/**
 * Company-wide Admin Logs list (read-only).
 * Filters: branchId, dates, category|categories, actor, actions, entityId, productType, q, ids, …
 */
export async function listAdminActivityLogs(tenantId, filters = {}) {
  const { params, whereSql, limit, offset, page } = buildAdminLogsListQuery(filters)

  const { rows: countRows } = await tenantQuery(
    tenantId,
    `
      SELECT count(*)::int AS total
      FROM activity_logs al
      LEFT JOIN branches b
        ON b.id = al.branch_id
       AND b.tenant_id = al.tenant_id
      ${whereSql}
    `,
    params,
  )

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        al.id,
        al.branch_id AS "branchId",
        b.name AS "branchName",
        al.actor_name AS "actorName",
        al.actor_role AS "actorRole",
        al.actor_user_id AS "actorUserId",
        al.action,
        al.category,
        al.source,
        al.entity_type AS "entityType",
        al.entity_id AS "entityId",
        al.details,
        al.created_at AS "createdAt"
      FROM activity_logs al
      LEFT JOIN branches b
        ON b.id = al.branch_id
       AND b.tenant_id = al.tenant_id
      ${whereSql}
      ORDER BY al.created_at DESC
      LIMIT $17 OFFSET $18
    `,
    [...params, limit, offset],
  )

  return {
    items: rows.map(mapRow),
    total: countRows[0]?.total || 0,
    page,
    limit,
  }
}
