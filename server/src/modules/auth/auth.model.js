import { query } from '../../config/db.js'
import { normalizeImageUrl } from '../../utils/uploadUrl.util.js'

// Resolve login by User ID (email) only — tenant comes from the matched user row.
// Returns all active matches (normally 0 or 1; >1 if same email exists in multiple tenants).

const AUTH_USER_SELECT = `
  SELECT
    u.id,
    u.tenant_id AS "tenantId",
    u.branch_id AS "branchId",
    u.full_name AS "fullName",
    u.email,
    u.password_hash AS "passwordHash",
    u.is_active AS "isActive",
    r.slug AS role,
    t.slug AS "tenantSlug",
    t.name AS "tenantName",
    COALESCE(t.default_currency, 'PKR') AS "defaultCurrency",
    b.name AS "branchName",
    b.status AS "branchStatus",
    to_char(b.opening_time, 'HH24:MI') AS "openingTime",
    to_char(b.closing_time, 'HH24:MI') AS "closingTime",
    COALESCE(b.working_days, ARRAY[]::text[]) AS "workingDays",
    COALESCE(u.image_url, s.image_url) AS "imageUrl"
  FROM users u
  JOIN roles r ON r.id = u.role_id
  JOIN tenants t ON t.id = u.tenant_id
  LEFT JOIN branches b ON b.id = u.branch_id AND b.tenant_id = u.tenant_id
  LEFT JOIN staff s ON s.user_id = u.id AND s.tenant_id = u.tenant_id
`

function formatTimeValue(value) {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = String(value.getUTCHours()).padStart(2, '0')
    const minutes = String(value.getUTCMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  const text = String(value).trim()
  const match = text.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function mapAuthUser(row) {
  if (!row) return null
  return {
    ...row,
    openingTime: formatTimeValue(row.openingTime),
    closingTime: formatTimeValue(row.closingTime),
    workingDays: Array.isArray(row.workingDays) ? row.workingDays : [],
    imageUrl: normalizeImageUrl(row.imageUrl),
  }
}

export async function findAuthUsersByLoginId(loginId) {
  const { rows } = await query(
    `
      ${AUTH_USER_SELECT}
      WHERE lower(u.email) = lower($1)
        AND u.is_active = true
        AND (
          u.branch_id IS NULL
          OR (b.id IS NOT NULL AND b.status IS DISTINCT FROM 'blocked')
        )
      ORDER BY u.created_at ASC
    `,
    [loginId],
  )
  return rows.map(mapAuthUser)
}

// Same lookup without active/branch filters — used to return a clear blocked-branch error.
export async function findAuthUsersByLoginIdIncludingInactive(loginId) {
  const { rows } = await query(
    `
      ${AUTH_USER_SELECT}
      WHERE lower(u.email) = lower($1)
      ORDER BY u.created_at ASC
    `,
    [loginId],
  )
  return rows.map(mapAuthUser)
}

export async function findAuthUserById(id, tenantId) {
  const { rows } = await query(
    `
      ${AUTH_USER_SELECT}
      WHERE u.id = $1
        AND u.tenant_id = $2
      LIMIT 1
    `,
    [id, tenantId],
  )
  return mapAuthUser(rows[0] || null)
}

export async function updatePasswordHash(userId, tenantId, passwordHash) {
  await query(
    `
      UPDATE users
      SET password_hash = $3
      WHERE id = $1 AND tenant_id = $2
    `,
    [userId, tenantId, passwordHash],
  )
}

// Update display name, login ID (email), and/or profile image.
// Image also syncs to staff.image_url so BM staff lists stay in sync.
export async function updateAuthProfile(userId, tenantId, { fullName, email, imageUrl }) {
  if (email) {
    const { rows: clashes } = await query(
      `
        SELECT id
        FROM users
        WHERE tenant_id = $1
          AND lower(email) = lower($2)
          AND id <> $3
        LIMIT 1
      `,
      [tenantId, email, userId],
    )
    if (clashes[0]) {
      const error = new Error('This User ID is already in use')
      error.status = 409
      throw error
    }
  }

  const { rows } = await query(
    `
      UPDATE users
      SET
        full_name = COALESCE($3, full_name),
        email = COALESCE($4, email),
        image_url = COALESCE($5, image_url)
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `,
    [userId, tenantId, fullName || null, email || null, imageUrl || null],
  )
  if (!rows[0]) return null

  // Mirror photo onto linked staff row (IM / cashier / etc.)
  if (imageUrl) {
    await query(
      `
        UPDATE staff
        SET image_url = $3
        WHERE tenant_id = $1
          AND user_id = $2
      `,
      [tenantId, userId, imageUrl],
    )
  }

  return rows[0]
}
