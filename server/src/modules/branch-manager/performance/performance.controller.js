import { tenantQuery } from '../../../config/db.js'
import { ROLES } from '../../../config/constants.js'
import { success, fail, failFromError } from '../../../utils/response.util.js'

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
}

const SCALE_RETURNING = `
  id,
  code,
  name,
  max_points AS "maxPoints",
  is_active AS "isActive"
`

// Final % = (Σ actual / Σ max) × 100 — only Enabled (is_active) factors
const WEIGHTED_RATING_SQL = `
  COALESCE(
    ROUND(
      (
        COALESCE((
          SELECT SUM(lp.points)::numeric
          FROM (
            SELECT DISTINCT ON (ps.scale_id) ps.points
            FROM performance_scores ps
            INNER JOIN scoring_scales ss_live
              ON ss_live.id = ps.scale_id
              AND ss_live.tenant_id = ps.tenant_id
              AND ss_live.is_active = true
            WHERE ps.staff_id = s.id AND ps.tenant_id = s.tenant_id
            ORDER BY ps.scale_id, ps.scored_on DESC, ps.id DESC
          ) lp
        ), 0)
        /
        NULLIF((
          SELECT SUM(ss_all.max_points)::numeric
          FROM scoring_scales ss_all
          WHERE ss_all.tenant_id = s.tenant_id
            AND ss_all.is_active = true
        ), 0)
      ) * 100
    , 2)
  , 0)
`

export async function listScales(req, res) {
  const { rows } = await tenantQuery(
    req.tenantId,
    `
      SELECT ${SCALE_RETURNING}
      FROM scoring_scales
      WHERE tenant_id = $1
      ORDER BY name ASC
    `,
  )
  return success(res, rows)
}

export async function createScale(req, res) {
  const { name, maxPoints, isActive } = req.validated.body
  const points = maxPoints
  const code = slugify(name)
  const activeValue = isActive === undefined ? true : isActive

  try {
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        INSERT INTO scoring_scales (tenant_id, code, name, max_points, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, code) DO UPDATE SET
          name = EXCLUDED.name,
          max_points = EXCLUDED.max_points,
          is_active = EXCLUDED.is_active
        RETURNING ${SCALE_RETURNING}
      `,
      [code, name.trim(), points, activeValue],
    )
    return success(res, rows[0], 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to create scale')
  }
}

export async function updateScale(req, res) {
  const { id } = req.validated.params
  const { name, maxPoints, isActive } = req.validated.body
  const activeOnly =
    isActive !== undefined && name === undefined && maxPoints === undefined

  try {
    // Quick Enable / Disable toggle without renaming the factor
    if (activeOnly) {
      const { rows } = await tenantQuery(
        req.tenantId,
        `
          UPDATE scoring_scales
          SET is_active = $2
          WHERE tenant_id = $1 AND id = $3
          RETURNING ${SCALE_RETURNING}
        `,
        [isActive, id],
      )
      if (rows.length === 0) return fail(res, 'Scale not found', 404)
      return success(res, rows[0])
    }

    if (!name || maxPoints === undefined) {
      return fail(res, 'Scale name and max points are required', 400)
    }

    const points = maxPoints
    const code = slugify(name)

    // tenantQuery prepends tenantId as $1 — do not pass it again in params
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        UPDATE scoring_scales
        SET
          name = $2,
          max_points = $3,
          code = $4,
          is_active = CASE WHEN $5::boolean IS NOT NULL THEN $5 ELSE is_active END
        WHERE tenant_id = $1 AND id = $6
        RETURNING ${SCALE_RETURNING}
      `,
      [name.trim(), points, code, isActive === undefined ? null : isActive, id],
    )
    if (rows.length === 0) {
      return fail(res, 'Scale not found', 404)
    }
    return success(res, rows[0])
  } catch (err) {
    return failFromError(res, err, 'Failed to update scale')
  }
}

export async function deleteScale(req, res) {
  const { id } = req.validated.params
  try {
    // Drop related scores so deleted factors leave the weighted calc
    await tenantQuery(
      req.tenantId,
      `DELETE FROM performance_scores WHERE tenant_id = $1 AND scale_id = $2`,
      [id],
    )
    const { rowCount } = await tenantQuery(
      req.tenantId,
      `DELETE FROM scoring_scales WHERE tenant_id = $1 AND id = $2`,
      [id],
    )
    if (rowCount === 0) {
      return fail(res, 'Scale not found', 404)
    }
    return success(res, { message: 'Scale deleted successfully' })
  } catch (err) {
    return failFromError(res, err, 'Failed to delete scale')
  }
}

export async function scoreStaff(req, res) {
  const { staffId, scaleId, points } = req.validated.body
  const numericPoints = points

  try {
    // Block scoring Branch Manager / self — BM evaluates managed staff only
    const { rows: targetRows } = await tenantQuery(
      req.tenantId,
      `
        SELECT
          s.user_id AS "userId",
          r.slug AS role,
          COALESCE(d.name, s.designation) AS "designation"
        FROM staff s
        LEFT JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN designations d ON d.id = s.designation_id
        WHERE s.tenant_id = $1 AND s.id = $2
        LIMIT 1
      `,
      [staffId],
    )
    if (targetRows.length === 0) {
      return fail(res, 'Staff member not found', 404)
    }
    const target = targetRows[0]
    const isSelf = target.userId && req.user?.id && String(target.userId) === String(req.user.id)
    const isBranchManager =
      target.role === ROLES.BRANCH_MANAGER ||
      /branch\s*manager/i.test(String(target.designation || ''))
    if (isSelf || isBranchManager) {
      return fail(res, 'Branch managers cannot be scored in Performance Roster', 403)
    }

    const { rows: scaleRows } = await tenantQuery(
      req.tenantId,
      `
        SELECT max_points AS "maxPoints", is_active AS "isActive"
        FROM scoring_scales
        WHERE tenant_id = $1 AND id = $2
        LIMIT 1
      `,
      [scaleId],
    )
    if (scaleRows.length === 0) {
      return fail(res, 'Scoring scale not found', 404)
    }
    if (scaleRows[0].isActive === false) {
      return fail(res, 'Cannot score against a disabled scoring factor', 400)
    }

    const maxAllowed = Number(scaleRows[0].maxPoints)
    if (numericPoints > maxAllowed) {
      return fail(res, `Points cannot exceed the factor maximum of ${maxAllowed}`, 400)
    }

    // Keep one score row per staff + factor (replace prior value)
    await tenantQuery(
      req.tenantId,
      `DELETE FROM performance_scores WHERE tenant_id = $1 AND staff_id = $2 AND scale_id = $3`,
      [staffId, scaleId],
    )

    const { rows } = await tenantQuery(
      req.tenantId,
      `
        INSERT INTO performance_scores (tenant_id, staff_id, scale_id, points, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, points
      `,
      [staffId, scaleId, numericPoints, req.user.id],
    )
    return success(res, rows[0], 201)
  } catch (err) {
    return failFromError(res, err, 'Failed to score staff')
  }
}

// Aggregated scores for managed staff only — excludes Branch Manager / self
export async function getStaffScores(req, res) {
  try {
    const { rows } = await tenantQuery(
      req.tenantId,
      `
        SELECT 
          s.id AS "staffId",
          s.user_id AS "userId",
          u.full_name AS "fullName",
          s.image_url AS "imageUrl",
          s.designation_id AS "designationId",
          d.name AS "designation",
          r.slug AS role,
          ${WEIGHTED_RATING_SQL} AS "rating"
        FROM staff s
        LEFT JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
        LEFT JOIN roles r ON r.id = u.role_id
        LEFT JOIN designations d ON d.id = s.designation_id
        WHERE s.tenant_id = $1
          AND s.status = 'active'
          AND (r.slug IS NULL OR r.slug <> $2)
          AND ($3::uuid IS NULL OR s.user_id IS DISTINCT FROM $3::uuid)
          AND (d.name IS NULL OR d.name !~* 'branch\\s*manager')
          AND (s.designation IS NULL OR s.designation !~* 'branch\\s*manager')
        ORDER BY u.full_name ASC
      `,
      [ROLES.BRANCH_MANAGER, req.user?.id || null],
    )
    return success(res, rows)
  } catch (err) {
    return failFromError(res, err, 'Failed to fetch performance scores')
  }
}

export { WEIGHTED_RATING_SQL }
