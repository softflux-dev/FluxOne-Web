import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { splitCategories } from '@/lib/mapProduct'

const TTL_MS = 5 * 60 * 1000

// Query for category list API — use in filter dropdowns across the app.
export const CATEGORY_ACTIVE_QUERY = { active: 'active' }
export const CATEGORY_ALL_QUERY = { active: 'all' }

/** Shared empty defaults — keep RTK slices / asResult / cache in sync. */
export const EMPTY_TAX_PROFIT_DEFAULTS = {
  defaultProfitPercent: 0,
  defaultTaxPercent: 0,
}

export function emptyCatalogDefaults(defaults) {
  return {
    defaultProfitPercent: Number(defaults?.defaultProfitPercent) || 0,
    defaultTaxPercent: Number(defaults?.defaultTaxPercent) || 0,
  }
}

/** Empty catalog shape (Map children for cache; RTK may serialize to plain object). */
export function emptyCatalog({ childrenAsMap = true } = {}) {
  return {
    parents: [],
    childrenByParent: childrenAsMap ? new Map() : {},
    all: [],
    taxes: [],
    offers: [],
    defaults: { ...EMPTY_TAX_PROFIT_DEFAULTS },
  }
}

/** Normalize API/cache catalog into RTK-friendly state (plain childrenByParent object). */
export function catalogToState(catalog) {
  if (!catalog) return emptyCatalog({ childrenAsMap: false })
  const map = catalog.childrenByParent
  return {
    parents: catalog.parents || [],
    childrenByParent:
      map instanceof Map ? Object.fromEntries(map) : map || {},
    all: catalog.all || [],
    taxes: catalog.taxes || [],
    offers: catalog.offers || [],
    defaults: emptyCatalogDefaults(catalog.defaults),
  }
}

// Module-level cache shared across Products + Categories pages (same session).
let cache = {
  data: null,
  fetchedAt: 0,
  inFlight: null,
  categoryActive: 'active',
}
// Bumped on category refresh so a stale full-catalog fetch cannot overwrite delete/status
let cacheGeneration = 0

function isFresh() {
  return Boolean(cache.data) && Date.now() - cache.fetchedAt < TTL_MS
}

function categoryQueryParams(active) {
  return active === 'active' ? CATEGORY_ACTIVE_QUERY : { active }
}

function applyCategories(rows) {
  const split = splitCategories(Array.isArray(rows) ? rows : [])
  const base = cache.data || emptyCatalog()
  cache.data = {
    ...base,
    ...split,
  }
  cache.fetchedAt = Date.now()
  return cache.data
}

function applyFull({ categories, taxes, offers, defaults }) {
  const split = splitCategories(Array.isArray(categories) ? categories : [])
  cache.data = {
    ...split,
    taxes: Array.isArray(taxes) ? taxes : [],
    offers: Array.isArray(offers) ? offers : [],
    defaults: emptyCatalogDefaults(defaults),
  }
  cache.fetchedAt = Date.now()
  return cache.data
}

// Load categories + taxes + offers once; dedupe parallel callers.
// @param {{ force?: boolean, categoryActive?: 'active' | 'inactive' | 'all' }} [options]
export async function getProductCatalog(options = {}) {
  const force = Boolean(options.force)
  const categoryActive = options.categoryActive || 'active'
  cache.categoryActive = categoryActive

  if (!force && isFresh()) return cache.data
  if (!force && cache.inFlight) return cache.inFlight

  const generation = cacheGeneration
  cache.inFlight = (async () => {
    try {
      const [catsRes, taxesRes, offersRes, defaultsRes] = await Promise.all([
        apiClient.get(endpoints.products.categories, categoryQueryParams(categoryActive)),
        apiClient.get(endpoints.products.taxes),
        apiClient.get(endpoints.products.offers),
        apiClient.get(endpoints.products.taxProfitDefaults),
      ])
      // A category CRUD refresh landed first — keep that catalog, drop this stale apply
      if (generation !== cacheGeneration) return cache.data
      return applyFull({
        categories: catsRes.success && Array.isArray(catsRes.data) ? catsRes.data : [],
        taxes: taxesRes.success && Array.isArray(taxesRes.data) ? taxesRes.data : [],
        offers: offersRes.success && Array.isArray(offersRes.data) ? offersRes.data : [],
        defaults: defaultsRes.success ? defaultsRes.data : null,
      })
    } finally {
      if (generation === cacheGeneration) cache.inFlight = null
    }
  })()

  return cache.inFlight
}

// After category/subcategory CRUD — refresh categories only; keep taxes/offers.
export async function refreshProductCategories(categoryActive) {
  const active = categoryActive || cache.categoryActive || 'active'
  cache.categoryActive = active
  // Invalidate in-flight full catalog so it cannot overwrite this refresh
  cacheGeneration += 1
  cache.inFlight = null
  const catsRes = await apiClient.get(endpoints.products.categories, {
    ...categoryQueryParams(active),
    _ts: Date.now(),
  })
  if (!catsRes.success || !Array.isArray(catsRes.data)) {
    // Never wipe a good catalog with null/empty from a failed/stale response
    if (!cache.data) return getProductCatalog({ force: true, categoryActive: active })
    return cache.data
  }
  return applyCategories(catsRes.data)
}

export function peekProductCatalog() {
  return cache.data
}

// Patch isActive on a cached category row without refetching the full catalog.
// When a parent is deactivated, cascade to children (matches server behavior).
export function patchCatalogCategoryActive(id, isActive) {
  if (!cache.data || !id) return
  const parents = cache.data.parents || []
  const isParent = parents.some((row) => row.id === id)

  const shouldPatch = (row) => {
    if (row.id === id) return true
    if (!isActive && isParent && row.parentId === id) return true
    return false
  }
  const patchRow = (row) => (shouldPatch(row) ? { ...row, isActive } : row)

  cache.data.parents = parents.map(patchRow)
  if (cache.data.childrenByParent instanceof Map) {
    for (const [key, rows] of cache.data.childrenByParent.entries()) {
      cache.data.childrenByParent.set(key, (rows || []).map(patchRow))
    }
  }
  cache.data.all = (cache.data.all || []).map(patchRow)
}

export function invalidateProductCatalog() {
  cacheGeneration += 1
  cache = { data: null, fetchedAt: 0, inFlight: null, categoryActive: 'active' }
}
