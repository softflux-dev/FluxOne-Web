// Versioned scoring scale — criteria maxes must total exactly 100 (TL).

export const SCALE_MAX_POINTS_MSG =
  'Maximum points must be a whole number greater than 0.'

export const SCALE_SUM_TARGET = 100

export function sumScalePoints(scales = [], excludeId = null) {
  return scales.reduce((sum, scale) => {
    if (excludeId && scale?.id === excludeId) return sum
    return sum + (Number(scale?.maxPoints) || 0)
  }, 0)
}

// Individual criterion: whole numbers only, min 1
export function parseScaleMaxPoints(rawValue) {
  if (rawValue === '' || rawValue == null) {
    return { ok: false, value: null, error: SCALE_MAX_POINTS_MSG }
  }
  const asNumber = Number(rawValue)
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber < 1) {
    return { ok: false, value: null, error: SCALE_MAX_POINTS_MSG }
  }
  return { ok: true, value: asNumber, error: null }
}

export function sumActualPoints(scoresByCriterionId = {}, criteria = []) {
  return criteria.reduce((sum, row) => {
    const points = Number(scoresByCriterionId?.[row.id])
    if (!Number.isFinite(points) || points < 0) return sum
    return sum + points
  }, 0)
}

// Total % when maxes sum to 100 (or any total — still normalize)
export function calcWeightedScorePercent(scoresByCriterionId = {}, criteria = []) {
  const maxTotal = sumScalePoints(criteria)
  if (maxTotal <= 0) return 0
  const actualTotal = sumActualPoints(scoresByCriterionId, criteria)
  return Math.round((actualTotal / maxTotal) * 10000) / 100
}

export function formatScorePercent(value) {
  if (value == null || value === '') return '—'
  return `${Number(value || 0).toFixed(0)}%`
}

export function isScaleSumValid(criteria = []) {
  return sumScalePoints(criteria) === SCALE_SUM_TARGET
}

// Back-compat aliases used by older imports
export function isScaleActive() {
  return true
}

export function activeScales(scales = []) {
  return scales || []
}
